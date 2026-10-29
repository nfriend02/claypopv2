// src/ui/AuthUI.js
// Sign-in screen: email / phone (+ register), guest with nickname, Google (mock)

import { auth } from '../core/firebase.js';
import { i18n } from '../core/i18n.js';
import { soundSynth } from '../audio/SoundSynth.js';
import { escapeHtml } from './dom.js';

const COUNTRY_CODES = [
  { code: '82', label: '+82 KR' },
  { code: '81', label: '+81 JP' },
  { code: '1', label: '+1 US' }
];

export class AuthUI {
  constructor(onSuccess, onCancel) {
    this.onSuccess = onSuccess;
    this.onCancel = onCancel;
    this.mode = 'login';
    this.tab = 'email';
    this.form = { email: '', phone: '', country: '82', password: '', nickname: '', guestNick: '' };
    this.error = '';
    this.busy = false;

    this.el = document.createElement('div');
    this.el.id = 'auth-screen';
    this.el.className = 'ui-screen scenic-screen auth-screen';
    this.el.style.display = 'none';
    document.body.appendChild(this.el);
    window.addEventListener('claypop_language_changed', () => {
      if (this.el.style.display !== 'none') this.render();
    });
  }

  render() {
    const f = this.form;
    const isLogin = this.mode === 'login';
    const t = (k) => i18n.t(k);
    this.el.innerHTML = `
      <div class="auth-card wood-frame pop-in">
        <button type="button" class="round-btn close-btn" data-act="close" aria-label="${t('close')}">✕</button>
        <img class="auth-logo" src="/assets/ui/logo.png" alt="Claypop Version 2" draggable="false">
        <div class="paper-sheet">
          <div class="seg-tabs" role="tablist">
            <button type="button" class="seg ${this.tab === 'email' ? 'on' : ''}" data-tab="email">${t('login_tab_email')}</button>
            <button type="button" class="seg ${this.tab === 'phone' ? 'on' : ''}" data-tab="phone">${t('login_tab_phone')}</button>
          </div>

          <form class="auth-form" autocomplete="on" novalidate>
            ${this.tab === 'email' ? `
              <label class="field">
                <span>${t('email_label')}</span>
                <input type="email" name="email" autocomplete="username" inputmode="email" placeholder="you@example.com" value="${escapeHtml(f.email)}">
              </label>
            ` : `
              <div class="field">
                <span>${t('phone_label')}</span>
                <div class="phone-row">
                  <select name="country" aria-label="${t('phone_country')}">
                    ${COUNTRY_CODES.map((c) => `<option value="${c.code}" ${f.country === c.code ? 'selected' : ''}>${c.label}</option>`).join('')}
                  </select>
                  <input type="tel" name="phone" autocomplete="tel" inputmode="tel" placeholder="${t('phone_placeholder')}" value="${escapeHtml(f.phone)}">
                </div>
              </div>
            `}
            <label class="field">
              <span>${t('password_label')}</span>
              <input type="password" name="password" autocomplete="${isLogin ? 'current-password' : 'new-password'}" placeholder="••••••" value="${escapeHtml(f.password)}">
            </label>
            ${isLogin ? '' : `
              <label class="field">
                <span>${t('nickname_label')}</span>
                <input type="text" name="nickname" maxlength="10" placeholder="${t('enter_nickname_placeholder')}" value="${escapeHtml(f.nickname)}">
              </label>
            `}
            <p class="form-error" role="alert">${escapeHtml(this.error)}</p>
            <button type="submit" class="btn btn-orange btn-block" ${this.busy ? 'disabled' : ''}>${isLogin ? t('login_btn') : t('register_btn')}</button>
            <button type="button" class="btn-link" data-act="mode">${isLogin ? t('register_switch') : t('login_switch')}</button>
          </form>

          <div class="divider"><span>${t('login_or')}</span></div>

          <div class="guest-row">
            <input type="text" name="guestNick" maxlength="10" placeholder="${t('enter_nickname_placeholder')}" value="${escapeHtml(f.guestNick)}">
            <button type="button" class="btn btn-teal" data-act="guest">${t('login_guest_start')}</button>
          </div>
          <button type="button" class="btn btn-cream btn-block" data-act="google">
            <span class="g-mark">G</span> ${t('login_google')}
          </button>
        </div>
      </div>
    `;
    this.bind();
  }

  bind() {
    const q = (s) => this.el.querySelector(s);
    this.el.querySelectorAll('input, select').forEach((inp) => {
      inp.addEventListener('input', () => {
        this.form[inp.name] = inp.value;
      });
    });
    this.el.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => {
      soundSynth.playUiClick();
      this.tab = b.dataset.tab;
      this.error = '';
      this.render();
    }));
    q('[data-act="close"]').addEventListener('click', () => {
      this.close();
      this.onCancel?.();
    });
    q('[data-act="mode"]').addEventListener('click', () => {
      this.mode = this.mode === 'login' ? 'register' : 'login';
      this.error = '';
      this.render();
    });
    q('.auth-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.submit();
    });
    q('[data-act="guest"]').addEventListener('click', () => this.run(() => auth.signInAsGuest(this.form.guestNick)));
    q('[data-act="google"]').addEventListener('click', () => this.run(() => auth.signInWithGoogle()));
  }

  submit() {
    const f = this.form;
    const id = this.tab === 'email' ? f.email.trim() : f.phone.trim();
    if (!id || !f.password) {
      this.error = i18n.t('auth_err_required');
      this.render();
      return;
    }
    const isLogin = this.mode === 'login';
    this.run(() => {
      if (this.tab === 'email') {
        return isLogin ? auth.signInWithEmail(id, f.password) : auth.registerWithEmail(id, f.password, f.nickname);
      }
      return isLogin
        ? auth.signInWithPhone(f.country, id, f.password)
        : auth.registerWithPhone(f.country, id, f.password, f.nickname);
    });
  }

  async run(action) {
    if (this.busy) return;
    soundSynth.playUiClick();
    this.busy = true;
    this.error = '';
    try {
      const user = await action();
      this.form.password = '';
      this.busy = false;
      this.close();
      this.onSuccess?.(user);
    } catch (err) {
      this.busy = false;
      this.error = i18n.t(`auth_err_${err.code || 'invalid'}`);
      this.render();
    }
  }

  open() {
    this.mode = 'login';
    this.error = '';
    this.form.password = '';
    this.render();
    this.el.style.display = 'flex';
  }

  close() {
    this.el.style.display = 'none';
  }
}
