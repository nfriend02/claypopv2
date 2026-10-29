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
  deleteUser
} from 'firebase/auth';
import { fbAuth } from './firebaseApp.js';
import { cloud } from './cloud.js';
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
  console.warn('[Auth]', err?.code || err);
  return new AuthError(ERROR_CODES[err?.code] || 'unknown');
}

export function normalizeEmail(raw) {
  return String(raw || '').trim().toLowerCase();
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// "+82 10 1234 5678", "010-1234-5678" (cc 82), "1012345678" (cc 82) -> "+821012345678"
export function normalizePhone(countryCode, raw) {
  const text = String(raw || '').trim();
  if (text.startsWith('+')) return '+' + text.replace(/\D/g, '');
  let digits = text.replace(/\D/g, '');
  const cc = String(countryCode || '82').replace(/\D/g, '');
  if (digits.startsWith(cc) && digits.length >= cc.length + 9) return '+' + digits;
  if (digits.startsWith('0')) digits = digits.slice(1);
  return '+' + cc + digits;
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

class AuthManager {
  constructor() {
    this.user = null;
    this.adminVerified = false;
    this.listeners = [];
    this.ready = new Promise((resolve) => { this._resolveReady = resolve; });

    onAuthStateChanged(fbAuth, async (fb) => {
      if (fb && this.user?.uid === fb.uid) return;
      await this.apply(fb);
      this._resolveReady();
    });
  }

  async apply(fb) {
    if (!fb) {
      this.user = null;
      this.adminVerified = false;
      this.notify();
      return null;
    }
    const identity = identityOf(fb);
    const loginType = loginTypeOf(fb, identity);
    const fallbackName = loginType === 'guest' ? 'Guest' : (fb.email || 'Cowboy').split('@')[0];
    this.user = {
      uid: fb.uid,
      identity,
      displayName: fb.displayName || fallbackName,
      loginType,
      isAnonymous: fb.isAnonymous,
      email: loginType === 'phone' ? null : fb.email || null,
      phoneNumber: loginType === 'phone' ? identity.slice('phone:'.length) : null,
      createdAt: Date.parse(fb.metadata.creationTime) || Date.now()
    };
    // Firebase Auth has verified the password for this identity; only whitelisted identities are admins
    this.adminVerified = !!identity && ADMIN_IDENTITIES.has(identity);
    this.notify();
    this.syncFromCloud(this.user);
    return this.user;
  }

  async syncFromCloud(user) {
    try {
      await cloud.upsertProfile(user);
      const progress = await cloud.loadProgress(user.uid);
      if (progress && this.user?.uid === user.uid) saveSystem.mergeFromCloud(progress);
      else if (!progress) await cloud.saveProgress(user.uid, saveSystem.data);
    } catch (err) {
      console.warn('[CloudSave] sync failed:', err.code || err);
    }
  }

  onAuthStateChanged(cb) {
    this.listeners.push(cb);
    cb(this.user);
  }

  notify() {
    this.listeners.forEach((cb) => cb(this.user));
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
    try {
      const cred = await signInWithEmailAndPassword(fbAuth, loginEmail, password);
      return this.apply(cred.user);
    } catch (err) {
      throw toAuthError(err);
    }
  }

  async registerLoginEmail(identity, loginEmail, password, nickname) {
    if (ADMIN_IDENTITIES.has(identity)) throw new AuthError('reserved');
    if (!password || password.length < 6) throw new AuthError('password_short');
    try {
      const cred = await createUserWithEmailAndPassword(fbAuth, loginEmail, password);
      const displayName = String(nickname || '').trim() || identity.split(':')[1].split('@')[0];
      await updateProfile(cred.user, { displayName });
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

  async registerWithEmail(email, password, nickname) {
    const e = normalizeEmail(email);
    if (!isValidEmail(e) || e.endsWith(`@${PHONE_LOGIN_DOMAIN}`)) throw new AuthError('email_format');
    return this.registerLoginEmail(`email:${e}`, e, password, nickname);
  }

  async signInWithPhone(countryCode, phone, password) {
    const p = normalizePhone(countryCode, phone);
    if (p.length < 10) throw new AuthError('phone_format');
    return this.signInWithLoginEmail(phoneLoginEmail(p), password);
  }

  async registerWithPhone(countryCode, phone, password, nickname) {
    const p = normalizePhone(countryCode, phone);
    if (p.length < 10) throw new AuthError('phone_format');
    return this.registerLoginEmail(`phone:${p}`, phoneLoginEmail(p), password, nickname);
  }

  async signInAsGuest(nickname) {
    const nick = String(nickname || '').trim();
    if (nick.length < 2 || nick.length > 10) throw new AuthError('nickname');
    try {
      const cred = await signInAnonymously(fbAuth);
      await updateProfile(cred.user, { displayName: nick });
      return this.apply(cred.user);
    } catch (err) {
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
    await updateProfile(fb, { displayName: newNick });
    await this.apply(fb);
  }

  async signOut() {
    await signOut(fbAuth);
    await this.apply(null);
  }

  // Removes the user's Firestore/Storage data, then the Auth account itself
  async deleteAccount() {
    const fb = fbAuth.currentUser;
    if (!fb) return;
    try {
      await cloud.deleteUserData(fb.uid);
      await deleteUser(fb);
    } catch (err) {
      if (err?.code === 'auth/requires-recent-login') await signOut(fbAuth);
      throw toAuthError(err);
    } finally {
      saveSystem.resetAll();
    }
    await this.apply(null);
  }
}

export const auth = new AuthManager();

window.addEventListener('claypop_request_cloud_sync', (e) => {
  const user = auth.getUser();
  if (!user) return;
  cloud.saveProgress(user.uid, e.detail).catch((err) => console.warn('[CloudSave] save failed:', err.code || err));
});
