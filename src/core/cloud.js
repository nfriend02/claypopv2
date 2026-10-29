// src/core/cloud.js
// Firestore + Storage data layer. Everything lives under the signed-in user's uid:
//   users/{uid}                 profile + progress (no sound settings: every session starts muted)
//   users/{uid}/runs/{runId}    one document per finished stage
//   Storage users/{uid}/...     per-user files

import {
  doc, getDoc, setDoc, deleteDoc, collection, addDoc, getDocs, query, orderBy, limit, writeBatch, serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { db, storage } from './firebaseApp.js';

const RUNS_PAGE = 5;
const DELETE_BATCH = 400;

const userDoc = (uid) => doc(db, 'users', uid);
const runsCol = (uid) => collection(db, 'users', uid, 'runs');
const userFile = (uid, name) => ref(storage, `users/${uid}/${name}`);

function progressOf(saveData) {
  const { settings = {}, ...rest } = saveData;
  const { bgmEnabled, sfxEnabled, userExplicitlyUnmuted, ...keptSettings } = settings;
  return JSON.parse(JSON.stringify({ ...rest, settings: keptSettings }));
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
      updatedAt: serverTimestamp()
    };
    if (!snap.exists()) profile.createdAt = serverTimestamp();
    await setDoc(userDoc(user.uid), profile, { merge: true });
  },

  async loadProgress(uid) {
    const snap = await getDoc(userDoc(uid));
    return snap.exists() ? snap.data().progress || null : null;
  },

  async saveProgress(uid, saveData) {
    await setDoc(userDoc(uid), { progress: progressOf(saveData), updatedAt: serverTimestamp() }, { merge: true });
  },

  async addRun(uid, run) {
    const res = await addDoc(runsCol(uid), { ...run, at: serverTimestamp() });
    return res.id;
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
