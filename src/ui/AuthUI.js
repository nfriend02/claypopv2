// src/ui/AuthUI.js
// Sign-in flow: login (email | mobile + password, guest nickname, Google) -> signup choice ->
// email signup / mobile signup. Mobile numbers are "country code + number : password" logins
// (no SMS); dashes and spaces in the number are ignored.

import { auth } from '../core/firebase.js';
import { i18n } from '../core/i18n.js';
import { soundSynth } from '../audio/SoundSynth.js';
import { escapeHtml } from './dom.js';

const VIEWS = {
  LOGIN: 'login',
  SIGNUP: 'signup',
  SIGNUP_EMAIL: 'signupEmail',
  SIGNUP_PHONE: 'signupPhone'
};

export const HOME_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.2 12 3.5l9 7.7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.6 10v9.6h4.6v-5.4h3.6v5.4h4.6V10" fill="currentColor"/></svg>`;
const MAIL_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="5" width="19" height="14" rx="2.5" fill="currentColor"/><path d="m4 7 8 6 8-6" fill="none" stroke="#7a3d0c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const PHONE_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="2.6" fill="currentColor"/><rect x="8" y="5" width="8" height="12" rx="1" fill="#0d5f73"/><circle cx="12" cy="19.4" r="1.1" fill="#0d5f73"/></svg>`;

export class AuthUI {
  constructor(onSuccess, onCancel) {
    this.onSuccess = onSuccess;
    this.onCancel = onCancel;
    this.view = VIEWS.LOGIN;
    this.tab = 'email';
    this.form = { email: '', phone: '', country: '+82', password: '', confirm: '', guestNick: '' };
    this.error = { area: '', text: '' };
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

  t(key, params) {
    return i18n.t(key, params);
  }

  errorLine(area) {
    const text = this.error.area === area ? this.error.text : '';
    return `<p class="form-error" role="alert">${escapeHtml(text)}</p>`;
  }

  emailField(autocomplete) {
    const t = (k) => this.t(k);
    return `
      <label class="field id-field">
        <span>${t('email_label')}</span>
        <input type="email" name="email" autocomplete="${autocomplete}" inputmode="email" placeholder="you@example.com" value="${escapeHtml(this.form.email)}">
      </label>`;
  }

  phoneField(autocomplete) {
    const t = (k) => this.t(k);
    return `
      <div class="field id-field">
        <span>${t('phone_label')}</span>
        <div class="phone-row">
          <input class="cc-input" type="tel" name="country" inputmode="tel" maxlength="5" aria-label="${t('phone_country')}" value="${escapeHtml(this.form.country)}">
          <input type="tel" name="phone" autocomplete="${autocomplete}" inputmode="tel" placeholder="${t('phone_placeholder')}" aria-label="${t('phone_label')}" value="${escapeHtml(this.form.phone)}">
        </div>
        <small class="field-hint">${t('phone_hint')}</small>
      </div>`;
  }

  passwordField(name, labelKey, placeholderKey, autocomplete) {
    return `
      <label class="field">
        <span>${this.t(labelKey)}</span>
        <input type="password" name="${name}" autocomplete="${autocomplete}" placeholder="${this.t(placeholderKey)}" value="${escapeHtml(this.form[name])}">
      </label>`;
  }

  loginView() {
    const t = (k) => this.t(k);
    return `
      <div class="auth-cols">
        <section class="auth-col">
          <div class="seg-tabs" role="tablist">
            <button type="button" class="seg ${this.tab === 'email' ? 'on' : ''}" data-tab="email">${t('login_tab_email')}</button>
            <button type="button" class="seg ${this.tab === 'phone' ? 'on' : ''}" data-tab="phone">${t('login_tab_phone')}</button>
          </div>
          <form class="auth-form" data-form="login" autocomplete="on" novalidate>
            ${this.tab === 'email' ? this.emailField('username') : this.phoneField('tel')}
            ${this.passwordField('password', 'mypage_password', 'password_label', 'current-password')}
            ${this.errorLine('form')}
            <button type="submit" class="btn btn-orange btn-block" ${this.busy ? 'disabled' : ''}>${t('login_btn')}</button>
          </form>
          <button type="button" class="signup-link" data-act="to-signup">${t('register_switch')}</button>
        </section>

        <div class="divider auth-or"><span>${t('login_or')}</span></div>

        <section class="auth-col">
          <div class="guest-box">
            <div class="guest-row">
              <input type="text" name="guestNick" maxlength="10" aria-label="${t('nickname_label')}" placeholder="${t('enter_nickname_placeholder')}" value="${escapeHtml(this.form.guestNick)}">
              <button type="button" class="btn btn-teal" data-act="guest" ${this.busy ? 'disabled' : ''}>${t('login_guest_start')}</button>
            </div>
            <small class="field-hint">${t('guest_note')}</small>
            ${this.errorLine('guest')}
          </div>
          <button type="button" class="btn btn-cream btn-block" data-act="google" ${this.busy ? 'disabled' : ''}>
            <span class="g-mark">G</span> ${t('login_google')}
          </button>
          ${this.errorLine('google')}
        </section>
      </div>`;
  }

  signupChoiceView() {
    const t = (k) => this.t(k);
    return `
      <div class="signup-choice">
        <h2 class="auth-title">${t('signup_title')}</h2>
        <p class="auth-sub">${t('signup_choose')}</p>
        <button type="button" class="btn btn-orange btn-block choice-btn" data-act="signup-email">
          <span class="choice-ico">${MAIL_ICON}</span><span>${t('signup_email')}</span>
        </button>
        <button type="button" class="btn btn-teal btn-block choice-btn" data-act="signup-phone">
          <span class="choice-ico">${PHONE_ICON}</span><span>${t('signup_phone')}</span>
        </button>
        <button type="button" class="signup-link" data-act="to-login">${t('signup_have_account')}</button>
      </div>`;
  }

  signupFormView(kind) {
    const t = (k) => this.t(k);
    return `
      <form class="auth-form signup-form" data-form="signup" autocomplete="on" novalidate>
        <h2 class="auth-title">${t(kind === 'email' ? 'signup_email' : 'signup_phone')}</h2>
        ${kind === 'email' ? this.emailField('username') : this.phoneField('tel')}
        ${this.passwordField('password', 'mypage_password', 'password_label', 'new-password')}
        ${this.passwordField('confirm', 'password_confirm_label', 'password_confirm_placeholder', 'new-password')}
        ${this.errorLine('form')}
        <button type="submit" class="btn btn-orange btn-block" ${this.busy ? 'disabled' : ''}>${t('signup_submit')}</button>
        <button type="button" class="signup-link" data-act="to-signup">◀ ${t('signup_back_choice')}</button>
      </form>`;
  }

  render() {
    const t = (k) => this.t(k);
    let body;
    if (this.view === VIEWS.SIGNUP) body = this.signupChoiceView();
    else if (this.view === VIEWS.SIGNUP_EMAIL) body = this.signupFormView('email');
    else if (this.view === VIEWS.SIGNUP_PHONE) body = this.signupFormView('phone');
    else body = this.loginView();

    this.el.dataset.view = this.view;
    this.el.innerHTML = `
      <div class="auth-card wood-frame pop-in" data-view="${this.view}">
        <div class="home-hint">
          <span class="speech-bubble">${t('home_bubble')}</span>
          <button type="button" class="round-btn home-btn" data-act="home" aria-label="${t('home_bubble')}">${HOME_ICON}</button>
        </div>
        <img class="auth-logo" src="/assets/ui/logo.png" alt="Claypop Version 2" draggable="false">
        <div class="paper-sheet auth-sheet">${body}</div>
      </div>
    `;
    this.bind();
  }

  setView(view) {
    this.view = view;
    this.error = { area: '', text: '' };
    this.form.password = '';
    this.form.confirm = '';
    this.render();
  }

  bind() {
    const q = (s) => this.el.querySelector(s);
    this.el.querySelectorAll('input').forEach((inp) => {
      inp.addEventListener('input', () => {
        this.form[inp.name] = inp.value;
      });
    });
    this.el.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => {
      soundSynth.playUiClick();
      this.tab = b.dataset.tab;
      this.error = { area: '', text: '' };
      this.render();
    }));

    const go = (sel, view) => q(sel)?.addEventListener('click', () => {
      soundSynth.playUiClick();
      this.setView(view);
    });
    go('[data-act="to-signup"]', VIEWS.SIGNUP);
    go('[data-act="to-login"]', VIEWS.LOGIN);
    go('[data-act="signup-email"]', VIEWS.SIGNUP_EMAIL);
    go('[data-act="signup-phone"]', VIEWS.SIGNUP_PHONE);

    q('[data-act="home"]').addEventListener('click', () => {
      soundSynth.playUiClick();
      this.close();
      this.onCancel?.();
    });

    q('[data-form="login"]')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitLogin();
    });
    q('[data-form="signup"]')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitSignup();
    });

    const guestStart = () => this.run('guest', () => auth.signInAsGuest(this.form.guestNick));
    q('[data-act="guest"]')?.addEventListener('click', guestStart);
    q('[name="guestNick"]')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') guestStart();
    });
    q('[data-act="google"]')?.addEventListener('click', () => this.run('google', () => auth.signInWithGoogle()));
  }

  fail(area, code) {
    this.error = { area, text: this.t(`auth_err_${code}`) };
    this.render();
  }

  submitLogin() {
    const f = this.form;
    const id = this.tab === 'email' ? f.email.trim() : f.phone.trim();
    if (!id || !f.password) return this.fail('form', 'required');
    return this.run('form', () => (this.tab === 'email'
      ? auth.signInWithEmail(id, f.password)
      : auth.signInWithPhone(f.country, id, f.password)));
  }

  submitSignup() {
    const f = this.form;
    const isEmail = this.view === VIEWS.SIGNUP_EMAIL;
    const id = isEmail ? f.email.trim() : f.phone.trim();
    if (!id || !f.password || !f.confirm) return this.fail('form', 'required');
    if (f.password.length < 6) return this.fail('form', 'password_short');
    if (f.password !== f.confirm) return this.fail('form', 'pw_mismatch');
    return this.run('form', () => (isEmail
      ? auth.registerWithEmail(id, f.password)
      : auth.registerWithPhone(f.country, id, f.password)), { signup: true });
  }

  async run(area, action, meta = {}) {
    if (this.busy) return;
    soundSynth.playUiClick();
    this.busy = true;
    this.error = { area: '', text: '' };
    this.el.querySelectorAll('button').forEach((b) => { b.disabled = true; });
    try {
      const user = await action();
      this.form.password = '';
      this.form.confirm = '';
      this.busy = false;
      this.close();
      this.onSuccess?.(user, meta);
    } catch (err) {
      this.busy = false;
      this.fail(area, err.code || 'unknown');
    }
  }

  open(view = VIEWS.LOGIN) {
    this.view = view;
    this.error = { area: '', text: '' };
    this.form.password = '';
    this.form.confirm = '';
    this.render();
    this.el.style.display = 'flex';
  }

  close() {
    this.el.style.display = 'none';
  }
}
