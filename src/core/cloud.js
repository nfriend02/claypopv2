// src/core/cloud.js
// Firestore + Storage data layer. Everything lives under the signed-in user's uid:
//   users/{uid}                 profile + progress (no sound settings: every session starts muted)
//   users/{uid}/runs/{runId}    one document per finished stage
//   guestNicknames/{key}        nickname held by an active guest (released on guest logout)
//   Storage users/{uid}/...     per-user files
// Guest documents carry expireAt (last activity + 100 days); Firestore TTL policies on
// users / runs / guestNicknames delete them automatically after that.

import {
  doc, getDoc, setDoc, deleteDoc, collection, addDoc, getDocs, query, orderBy, limit, writeBatch,
  serverTimestamp, runTransaction, Timestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { db, storage } from './firebaseApp.js';

const RUNS_PAGE = 5;
const DELETE_BATCH = 400;
export const GUEST_RETENTION_DAYS = 100;

const userDoc = (uid) => doc(db, 'users', uid);
const runsCol = (uid) => collection(db, 'users', uid, 'runs');
const userFile = (uid, name) => ref(storage, `users/${uid}/${name}`);
const nicknameDoc = (nickname) => doc(db, 'guestNicknames', nicknameKey(nickname));

export const nicknameKey = (nickname) => encodeURIComponent(String(nickname).trim().toLowerCase());

const guestExpiry = () => Timestamp.fromMillis(Date.now() + GUEST_RETENTION_DAYS * 86400000);
const expiryFields = (isGuest) => (isGuest ? { expireAt: guestExpiry() } : {});

function progressOf(saveData) {
  const { settings = {}, ownerUid, ...rest } = saveData;
  const { bgmEnabled, sfxEnabled, userExplicitlyUnmuted, ...keptSettings } = settings;
  return JSON.parse(JSON.stringify({ ...rest, settings: keptSettings }));
}

export class NicknameTakenError extends Error {
  constructor() {
    super('nickname_taken');
    this.code = 'nickname_taken';
  }
}

export const cloud = {
  async upsertProfile(user) {
    const snap = await getDoc(userDoc(user.uid));
    const profile = {
      displayName: user.displayName,
      loginType: user.loginType,
      email: user.email || null,
      phoneNumber: user.phoneNumber || null,
      isAnonymous: !!user.isAnonymous,
      updatedAt: serverTimestamp(),
      ...expiryFields(user.isAnonymous)
    };
    if (!snap.exists()) profile.createdAt = serverTimestamp();
    await setDoc(userDoc(user.uid), profile, { merge: true });
  },

  async loadProgress(uid) {
    const snap = await getDoc(userDoc(uid));
    return snap.exists() ? snap.data().progress || null : null;
  },

  async saveProgress(uid, saveData, { guest = false } = {}) {
    await setDoc(userDoc(uid), {
      progress: progressOf(saveData),
      updatedAt: serverTimestamp(),
      ...expiryFields(guest)
    }, { merge: true });
  },

  async addRun(uid, run, { guest = false } = {}) {
    const res = await addDoc(runsCol(uid), { ...run, at: serverTimestamp(), ...expiryFields(guest) });
    return res.id;
  },

  // A guest nickname is unique among active guests; an expired or released one can be taken again
  async claimGuestNickname(uid, nickname) {
    const target = nicknameDoc(nickname);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(target);
      if (snap.exists()) {
        const held = snap.data();
        const expired = held.expireAt && held.expireAt.toMillis() < Date.now();
        if (held.uid !== uid && !expired) throw new NicknameTakenError();
      }
      tx.set(target, { uid, nickname: String(nickname).trim(), expireAt: guestExpiry() });
    });
  },

  async releaseGuestNickname(uid, nickname) {
    const target = nicknameDoc(nickname);
    const snap = await getDoc(target);
    if (snap.exists() && snap.data().uid === uid) await deleteDoc(target);
  },

  async listRuns(uid, count = RUNS_PAGE) {
    const snap = await getDocs(query(runsCol(uid), orderBy('at', 'desc'), limit(count)));
    return snap.docs.map((d) => ({ id: d.id, ...d.data(), at: d.data().at?.toDate?.() || null }));
  },

  deleteRun(uid, runId) {
    return deleteDoc(doc(db, 'users', uid, 'runs', runId));
  },

  async uploadUserFile(uid, name, blob, contentType) {
    const r = userFile(uid, name);
    await uploadBytes(r, blob, contentType ? { contentType } : undefined);
    return getDownloadURL(r);
  },

  getUserFileUrl(uid, name) {
    return getDownloadURL(userFile(uid, name));
  },

  deleteUserFile(uid, name) {
    return deleteObject(userFile(uid, name));
  },

  // Removes every record of the user (runs, files, profile). Auth account removal is separate.
  async deleteUserData(uid) {
    for (;;) {
      const snap = await getDocs(query(runsCol(uid), limit(DELETE_BATCH)));
      if (snap.empty) break;
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }

    const removeFolder = async (folderRef) => {
      const listing = await listAll(folderRef);
      await Promise.all(listing.items.map((item) => deleteObject(item)));
      await Promise.all(listing.prefixes.map(removeFolder));
    };
    await removeFolder(ref(storage, `users/${uid}`)).catch((err) => console.warn('[cloud] storage cleanup:', err.code || err));

    const batch = writeBatch(db);
    batch.delete(userDoc(uid));
    await batch.commit();
  }
};
