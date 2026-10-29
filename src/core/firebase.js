// src/core/firebase.js
// Auth manager on Firebase Auth: Email/Password, mobile number + password (no SMS), anonymous guest, Google.
// Admin = a signed-in, password-verified identity on the development whitelist (.env.local).

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteUser
} from 'firebase/auth';
import { fbAuth } from './firebaseApp.js';
import { cloud, NicknameTakenError } from './cloud.js';
import { saveSystem } from './SaveSystem.js';
import { PHONE_LOGIN_DOMAIN } from '../config/firebaseConfig.js';

// Development admins come from .env.local (never committed). Without it nobody is admin.
//   VITE_ADMIN_IDENTITIES=email:someone@example.com,phone:+821000000000
const ADMIN_IDENTITIES = new Set(
  String(import.meta.env.VITE_ADMIN_IDENTITIES || '').split(',').map((s) => s.trim()).filter(Boolean)
);

const ERROR_CODES = {
  'auth/invalid-credential': 'invalid',
  'auth/invalid-login-credentials': 'invalid',
  'auth/wrong-password': 'invalid',
  'auth/user-not-found': 'invalid',
  'auth/user-disabled': 'invalid',
  'auth/email-already-in-use': 'exists',
  'auth/weak-password': 'password_short',
  'auth/invalid-email': 'email_format',
  'auth/missing-password': 'required',
  'auth/too-many-requests': 'too_many',
  'auth/network-request-failed': 'network',
  'auth/popup-closed-by-user': 'popup_closed',
  'auth/cancelled-popup-request': 'popup_closed',
  'auth/popup-blocked': 'popup_closed',
  'auth/operation-not-allowed': 'disabled',
  'auth/admin-restricted-operation': 'disabled',
  'auth/unauthorized-domain': 'domain',
  'auth/requires-recent-login': 'recent_login'
};

export class AuthError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

function toAuthError(err) {
  if (err instanceof AuthError) return err;
  if (err instanceof NicknameTakenError) return new AuthError('nickname_taken');
  console.warn('[Auth]', err?.code || err);
  return new AuthError(ERROR_CODES[err?.code] || 'unknown');
}

export function normalizeEmail(raw) {
  return String(raw || '').trim().toLowerCase();
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Mobile numbers: dashes / spaces are ignored and a leading trunk 0 is dropped.
//   ("+82", "10 1234 5678") / ("82", "010-1234-5678") / ("+82", "+82 10-1234-5678") -> "+821012345678"
export function normalizePhone(countryCode, raw) {
  const text = String(raw || '').trim();
  if (text.startsWith('+')) return '+' + text.replace(/\D/g, '');
  let digits = text.replace(/\D/g, '');
  const cc = String(countryCode || '82').replace(/\D/g, '') || '82';
  if (digits.startsWith(cc) && digits.length >= cc.length + 9) return '+' + digits;
  if (digits.startsWith('0')) digits = digits.slice(1);
  return '+' + cc + digits;
}

const isValidMobile = (e164) => /^\+\d{9,15}$/.test(e164);

// "+821052799244" -> "+82 10-5279-9244" (Korean grouping; other countries keep plain digits)
export function formatPhone(e164) {
  const m = /^\+82(\d{2})(\d{3,4})(\d{4})$/.exec(e164 || '');
  return m ? `+82 ${m[1]}-${m[2]}-${m[3]}` : e164 || '';
}

const phoneLoginEmail = (e164) => `${e164.slice(1)}@${PHONE_LOGIN_DOMAIN}`;

function identityOf(fb) {
  if (!fb || fb.isAnonymous || !fb.email) return null;
  const email = fb.email.toLowerCase();
  if (email.endsWith(`@${PHONE_LOGIN_DOMAIN}`)) return `phone:+${email.split('@')[0]}`;
  return `email:${email}`;
}

function loginTypeOf(fb, identity) {
  if (fb.isAnonymous) return 'guest';
  if (identity?.startsWith('phone:')) return 'phone';
  if (fb.providerData.some((p) => p.providerId === 'google.com')) return 'google';
  return 'email';
}

function defaultDisplayName(fb, loginType, identity) {
  if (loginType === 'guest') return 'Guest';
  if (loginType === 'phone') return `Sheriff ${identity.slice(-4)}`;
  return (fb.email || 'Cowboy').split('@')[0].slice(0, 12);
}

const warnCloud = (label) => (err) => console.warn(`[CloudSave] ${label}:`, err?.code || err);

class AuthManager {
  constructor() {
    this.user = null;
    this.adminVerified = false;
    this.listeners = [];
    this.guestSignInPending = false;
    this.ready = new Promise((resolve) => { this._resolveReady = resolve; });

    onAuthStateChanged(fbAuth, async (fb) => {
      // signInAsGuest applies the user itself once the nickname is claimed
      if (fb?.isAnonymous && this.guestSignInPending) return;
      if (fb && this.user?.uid === fb.uid) return;
      await this.apply(fb);
      this._resolveReady();
    });
  }

  async apply(fb) {
    if (!fb) {
      this.user = null;
      this.adminVerified = false;
      if (saveSystem.data.ownerUid) saveSystem.resetProgress(null);
      this.notify();
      return null;
    }
    const identity = identityOf(fb);
    const loginType = loginTypeOf(fb, identity);
    this.user = {
      uid: fb.uid,
      identity,
      displayName: fb.displayName || defaultDisplayName(fb, loginType, identity),
      loginType,
      isAnonymous: fb.isAnonymous,
      hasPassword: fb.providerData.some((p) => p.providerId === 'password'),
      email: loginType === 'phone' ? null : fb.email || null,
      phoneNumber: loginType === 'phone' ? identity.slice('phone:'.length) : null,
      createdAt: Date.parse(fb.metadata.creationTime) || Date.now()
    };
    // Progress is per account: another account's mileage never carries over
    const switchedAccount = saveSystem.data.ownerUid !== fb.uid;
    if (switchedAccount) saveSystem.resetProgress(fb.uid);
    // Firebase Auth has verified the password for this identity; only whitelisted identities are admins
    this.adminVerified = !!identity && ADMIN_IDENTITIES.has(identity);
    this.notify();
    this.syncFromCloud(this.user, switchedAccount);
    return this.user;
  }

  async syncFromCloud(user, switchedAccount) {
    try {
      await cloud.upsertProfile(user);
      const progress = await cloud.loadProgress(user.uid);
      if (this.user?.uid !== user.uid) return;
      if (progress) {
        if (switchedAccount) saveSystem.adoptCloud(progress, user.uid);
        else saveSystem.mergeFromCloud(progress);
      } else {
        await cloud.saveProgress(user.uid, saveSystem.data, { guest: user.isAnonymous });
      }
    } catch (err) {
      warnCloud('sync failed')(err);
    }
  }

  onAuthStateChanged(cb) {
    this.listeners.push(cb);
    cb(this.user);
  }

  notify() {
    this.listeners.forEach((cb) => cb(this.user));
    document.body.classList.toggle('signed-in', !!this.user);
    window.dispatchEvent(new CustomEvent('claypop_auth_changed', {
      detail: { user: this.user, isAdmin: this.adminVerified }
    }));
  }

  getUser() {
    return this.user;
  }

  isCurrentUserAdmin() {
    return this.adminVerified === true;
  }

  async signInWithLoginEmail(loginEmail, password) {
    if (!password) throw new AuthError('required');
    try {
      const cred = await signInWithEmailAndPassword(fbAuth, loginEmail, password);
      return this.apply(cred.user);
    } catch (err) {
      throw toAuthError(err);
    }
  }

  async registerLoginEmail(identity, loginEmail, password) {
    if (ADMIN_IDENTITIES.has(identity)) throw new AuthError('reserved');
    if (!password || password.length < 6) throw new AuthError('password_short');
    try {
      const cred = await createUserWithEmailAndPassword(fbAuth, loginEmail, password);
      const loginType = identity.startsWith('phone:') ? 'phone' : 'email';
      await updateProfile(cred.user, { displayName: defaultDisplayName(cred.user, loginType, identity) });
      return this.apply(cred.user);
    } catch (err) {
      throw toAuthError(err);
    }
  }

  async signInWithEmail(email, password) {
    const e = normalizeEmail(email);
    if (!isValidEmail(e) || e.endsWith(`@${PHONE_LOGIN_DOMAIN}`)) throw new AuthError('email_format');
    return this.signInWithLoginEmail(e, password);
  }

  async registerWithEmail(email, password) {
    const e = normalizeEmail(email);
    if (!isValidEmail(e) || e.endsWith(`@${PHONE_LOGIN_DOMAIN}`)) throw new AuthError('email_format');
    return this.registerLoginEmail(`email:${e}`, e, password);
  }

  async signInWithPhone(countryCode, phone, password) {
    const p = normalizePhone(countryCode, phone);
    if (!isValidMobile(p)) throw new AuthError('phone_format');
    return this.signInWithLoginEmail(phoneLoginEmail(p), password);
  }

  async registerWithPhone(countryCode, phone, password) {
    const p = normalizePhone(countryCode, phone);
    if (!isValidMobile(p)) throw new AuthError('phone_format');
    return this.registerLoginEmail(`phone:${p}`, phoneLoginEmail(p), password);
  }

  // Guests hold a nickname (unique among active guests) instead of an ID; progress is saved under it
  async signInAsGuest(nickname) {
    const nick = String(nickname || '').trim();
    if (nick.length < 2 || nick.length > 10) throw new AuthError('nickname');
    this.guestSignInPending = true;
    let fb = null;
    try {
      fb = (await signInAnonymously(fbAuth)).user;
      await cloud.claimGuestNickname(fb.uid, nick);
      await updateProfile(fb, { displayName: nick });
      this.guestSignInPending = false;
      return this.apply(fb);
    } catch (err) {
      this.guestSignInPending = false;
      if (fb) await deleteUser(fb).catch(() => signOut(fbAuth));
      throw toAuthError(err);
    }
  }

  async signInWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const cred = await signInWithPopup(fbAuth, provider);
      return this.apply(cred.user);
    } catch (err) {
      throw toAuthError(err);
    }
  }

  async updateNickname(newNick) {
    const fb = fbAuth.currentUser;
    if (!fb) return;
    const nick = String(newNick || '').trim();
    if (nick.length < 2 || nick.length > 10) throw new AuthError('nickname');
    try {
      if (fb.isAnonymous) {
        await cloud.claimGuestNickname(fb.uid, nick);
        if (fb.displayName && fb.displayName.toLowerCase() !== nick.toLowerCase()) {
          await cloud.releaseGuestNickname(fb.uid, fb.displayName).catch(warnCloud('release nickname'));
        }
      }
      await updateProfile(fb, { displayName: nick });
    } catch (err) {
      throw toAuthError(err);
    }
    this.user = { ...this.user, displayName: nick };
    this.notify();
    cloud.upsertProfile(this.user).catch(warnCloud('profile'));
  }

  // Email / mobile accounts only: Firebase keeps a one-way hash, so the old password is
  // re-verified and then replaced; it can never be read back.
  async changePassword(currentPassword, newPassword) {
    const fb = fbAuth.currentUser;
    if (!fb || !this.user?.hasPassword) throw new AuthError('unknown');
    if (!currentPassword || !newPassword) throw new AuthError('required');
    if (newPassword.length < 6) throw new AuthError('password_short');
    try {
      await reauthenticateWithCredential(fb, EmailAuthProvider.credential(fb.email, currentPassword));
    } catch (err) {
      const e = toAuthError(err);
      throw e.code === 'invalid' ? new AuthError('current_pw') : e;
    }
    try {
      await updatePassword(fb, newPassword);
    } catch (err) {
      throw toAuthError(err);
    }
  }

  // Guests: the nickname is released and the anonymous login discarded, so neither the nickname's
  // progress nor the mileage can be reopened; the Firestore copy expires 100 days later (TTL).
  async signOut() {
    const fb = fbAuth.currentUser;
    const user = this.user;
    if (fb && user && saveSystem.takePendingSync()) {
      await cloud.saveProgress(fb.uid, saveSystem.data, { guest: user.isAnonymous }).catch(warnCloud('flush'));
    }
    if (fb?.isAnonymous) {
      if (fb.displayName) await cloud.releaseGuestNickname(fb.uid, fb.displayName).catch(warnCloud('release nickname'));
      await deleteUser(fb).catch(() => signOut(fbAuth));
    } else {
      await signOut(fbAuth);
    }
    await this.apply(null);
  }

  // Removes the user's Firestore/Storage data, then the Auth account itself
  async deleteAccount() {
    const fb = fbAuth.currentUser;
    if (!fb) return;
    try {
      if (fb.isAnonymous && fb.displayName) {
        await cloud.releaseGuestNickname(fb.uid, fb.displayName).catch(warnCloud('release nickname'));
      }
      await cloud.deleteUserData(fb.uid);
      await deleteUser(fb);
    } catch (err) {
      if (err?.code === 'auth/requires-recent-login') await signOut(fbAuth);
      throw toAuthError(err);
    } finally {
      saveSystem.resetProgress(null);
    }
    await this.apply(null);
  }
}

export const auth = new AuthManager();

window.addEventListener('claypop_request_cloud_sync', (e) => {
  const user = auth.getUser();
  if (!user || e.detail?.ownerUid !== user.uid) return;
  cloud.saveProgress(user.uid, e.detail, { guest: user.isAnonymous }).catch(warnCloud('save failed'));
});

