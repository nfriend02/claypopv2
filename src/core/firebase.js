// src/core/firebase.js
// Auth manager (local mock of Firebase Auth) with a strict development admin whitelist.
// Production: replace with Firebase Auth + a server-side custom claim ({ admin: true }) checked by rules.

import { saveSystem } from './SaveSystem.js';
import { sha256Hex } from './crypto.js';

const USER_KEY = 'claypopv2_user';
const ACCOUNTS_KEY = 'claypopv2_accounts';
const PASSWORD_SALT = 'claypopv2:';

// Development admins come from .env.local (never committed). Without it nobody is admin.
//   VITE_ADMIN_IDENTITIES=email:someone@example.com,phone:+821000000000
//   VITE_ADMIN_PASSWORD_SHA256=<sha256 hex of the admin password>
const ADMIN_IDENTITIES = new Set(
  String(import.meta.env.VITE_ADMIN_IDENTITIES || '').split(',').map((s) => s.trim()).filter(Boolean)
);
const ADMIN_PASSWORD_SHA256 = String(import.meta.env.VITE_ADMIN_PASSWORD_SHA256 || '').trim().toLowerCase();

export class AuthError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
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

async function hashPassword(password) {
  return sha256Hex(PASSWORD_SALT + password);
}

async function adminProofFor(identity) {
  return sha256Hex(`admin|${identity}|${ADMIN_PASSWORD_SHA256}`);
}

function loadAccounts() {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveAccounts(accounts) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

class AuthManager {
  constructor() {
    this.user = null;
    this.adminVerified = false;
    this.listeners = [];
    try {
      const stored = localStorage.getItem(USER_KEY);
      this.user = stored ? JSON.parse(stored) : null;
    } catch {
      this.user = null;
    }
    localStorage.removeItem('claypop_user');
    this.verifyAdmin();
  }

  async verifyAdmin() {
    const u = this.user;
    let ok = false;
    if (u && u.identity && ADMIN_IDENTITIES.has(u.identity) && u.adminProof) {
      ok = u.adminProof === (await adminProofFor(u.identity));
    }
    if (this.user === u) {
      this.adminVerified = ok;
      this.notify();
    }
  }

  async setUser(user) {
    this.user = user;
    this.adminVerified = false;
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
    await this.verifyAdmin();
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

  async buildUser(identity, loginType, displayName, extra = {}) {
    const user = {
      uid: 'usr_' + (await sha256Hex(identity)).slice(0, 16),
      identity,
      displayName,
      loginType,
      isAnonymous: false,
      createdAt: Date.now(),
      ...extra
    };
    return user;
  }

  async signInWithIdentity(identity, password, loginType, extra) {
    const hash = await hashPassword(password);
    if (ADMIN_IDENTITIES.has(identity)) {
      if (hash !== ADMIN_PASSWORD_SHA256) throw new AuthError('invalid');
      const user = await this.buildUser(identity, loginType, 'Admin Sheriff', extra);
      user.adminProof = await adminProofFor(identity);
      await this.setUser(user);
      return user;
    }
    const account = loadAccounts()[identity];
    if (!account || account.hash !== hash) throw new AuthError('invalid');
    const user = await this.buildUser(identity, loginType, account.displayName, extra);
    await this.setUser(user);
    return user;
  }

  async registerIdentity(identity, password, nickname, loginType, extra) {
    if (ADMIN_IDENTITIES.has(identity)) throw new AuthError('reserved');
    if (!password || password.length < 6) throw new AuthError('password_short');
    const accounts = loadAccounts();
    if (accounts[identity]) throw new AuthError('exists');
    const displayName = (nickname || '').trim() || identity.split(':')[1].split('@')[0];
    accounts[identity] = { hash: await hashPassword(password), displayName, createdAt: Date.now() };
    saveAccounts(accounts);
    const user = await this.buildUser(identity, loginType, displayName, extra);
    await this.setUser(user);
    return user;
  }

  async signInWithEmail(email, password) {
    const e = normalizeEmail(email);
    if (!isValidEmail(e)) throw new AuthError('email_format');
    return this.signInWithIdentity(`email:${e}`, password, 'email', { email: e });
  }

  async registerWithEmail(email, password, nickname) {
    const e = normalizeEmail(email);
    if (!isValidEmail(e)) throw new AuthError('email_format');
    return this.registerIdentity(`email:${e}`, password, nickname, 'email', { email: e });
  }

  async signInWithPhone(countryCode, phone, password) {
    const p = normalizePhone(countryCode, phone);
    if (p.length < 10) throw new AuthError('phone_format');
    return this.signInWithIdentity(`phone:${p}`, password, 'phone', { phoneNumber: p });
  }

  async registerWithPhone(countryCode, phone, password, nickname) {
    const p = normalizePhone(countryCode, phone);
    if (p.length < 10) throw new AuthError('phone_format');
    return this.registerIdentity(`phone:${p}`, password, nickname, 'phone', { phoneNumber: p });
  }

  async signInAsGuest(nickname) {
    const nick = String(nickname || '').trim();
    if (nick.length < 2 || nick.length > 10) throw new AuthError('nickname');
    const user = {
      uid: 'guest_' + Math.random().toString(36).slice(2, 10),
      identity: null,
      displayName: nick,
      loginType: 'guest',
      isAnonymous: true,
      createdAt: Date.now()
    };
    await this.setUser(user);
    return user;
  }

  async signInWithGoogle() {
    const user = {
      uid: 'goog_' + Math.random().toString(36).slice(2, 10),
      identity: null,
      displayName: 'Google Cowboy',
      loginType: 'google',
      isAnonymous: false,
      createdAt: Date.now()
    };
    await this.setUser(user);
    return user;
  }

  async updateNickname(newNick) {
    if (!this.user) return;
    this.user.displayName = newNick;
    if (this.user.identity) {
      const accounts = loadAccounts();
      if (accounts[this.user.identity]) {
        accounts[this.user.identity].displayName = newNick;
        saveAccounts(accounts);
      }
    }
    await this.setUser(this.user);
  }

  async signOut() {
    await this.setUser(null);
  }

  async deleteAccount() {
    if (!this.user) return;
    if (this.user.identity) {
      const accounts = loadAccounts();
      delete accounts[this.user.identity];
      saveAccounts(accounts);
    }
    saveSystem.resetAll();
    await this.setUser(null);
  }
}

export const auth = new AuthManager();

window.addEventListener('claypop_request_cloud_sync', (e) => {
  const user = auth.getUser();
  if (user && !user.isAnonymous) {
    try {
      localStorage.setItem(`claypop_cloud_${user.uid}`, JSON.stringify(e.detail));
    } catch (err) {
      console.warn('[CloudSave] Local cloud-cache failed:', err);
    }
  }
});
