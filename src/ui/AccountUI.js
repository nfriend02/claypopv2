// src/ui/AccountUI.js
// Signed-in account controls shared by the lobby, setup and result screens:
// top-right [My Page][Logout] bar, the My Page modal and a western-styled confirm dialog.

import { auth, formatPhone } from '../core/firebase.js';
import { cloud } from '../core/cloud.js';
import { saveSystem } from '../core/SaveSystem.js';
import { soundSynth } from '../audio/SoundSynth.js';
import { i18n } from '../core/i18n.js';
import { addPasswordToggles, escapeHtml, icon } from './dom.js';
import { handButtonHtml } from './HandButton.js';

const USER_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4.2" fill="currentColor"/><path d="M3.8 21c.6-4.6 4-7 8.2-7s7.6 2.4 8.2 7z" fill="currentColor"/></svg>`;
const EXIT_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4H5.5A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20H10" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M14.5 7.5 19 12l-4.5 4.5M19 12H9" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const DELETE_WORDS = ['탈퇴', 'DELETE', 'delete', '退会'];

function accountId(user) {
  if (user.loginType === 'phone') return formatPhone(user.phoneNumber);
  if (user.loginType === 'guest') return user.displayName;
  return user.email || user.displayName;
}

export class AccountUI {
  constructor({ onLoggedOut } = {}) {
    this.onLoggedOut = onLoggedOut;
    this.busy = false;

    this.bar = document.createElement('div');
    this.bar.className = 'account-bar';
    document.body.appendChild(this.bar);

    this.modal = this.createBackdrop('mypage-backdrop');
    this.dialog = this.createBackdrop('confirm-backdrop');

    this.renderBar();
    window.addEventListener('claypop_language_changed', () => {
      this.renderBar();
      if (this.isMyPageOpen()) this.openMyPage();
    });
    window.addEventListener('claypop_auth_changed', () => {
      this.renderBar();
      if (!auth.getUser()) this.closeMyPage();
    });
    window.addEventListener('claypop_progress_changed', () => {
      if (this.isMyPageOpen()) this.refreshStats();
    });
  }

  createBackdrop(cls) {
    const el = document.createElement('div');
    el.className = `modal-backdrop ${cls}`;
    el.style.display = 'none';
    el.addEventListener('pointerdown', (e) => {
      if (e.target === el && el === this.modal) this.closeMyPage();
    });
    document.body.appendChild(el);
    return el;
  }

  renderBar() {
    const t = (k) => i18n.t(k);
    this.bar.innerHTML = `
      <button type="button" class="acct-btn" data-act="mypage">${USER_ICON}<span>${t('lobby_mypage')}</span></button>
      <button type="button" class="acct-btn acct-logout" data-act="logout">${EXIT_ICON}<span>${t('logout')}</span></button>
    `;
    this.bar.querySelector('[data-act="mypage"]').addEventListener('click', () => {
      soundSynth.playUiClick();
      this.openMyPage();
    });
    this.bar.querySelector('[data-act="logout"]').addEventListener('click', () => {
      soundSynth.playUiClick();
      this.logout();
    });
  }

  async logout() {
    const user = auth.getUser();
    if (!user || this.busy) return;
    if (user.isAnonymous) {
      const ok = await this.confirm({
        title: i18n.t('guest_logout_title'),
        message: i18n.t('guest_logout_warning', { name: user.displayName }),
        confirmLabel: i18n.t('logout')
      });
      if (!ok) return;
    }
    this.busy = true;
    try {
      await auth.signOut();
    } finally {
      this.busy = false;
    }
    this.closeMyPage();
    this.onLoggedOut?.();
  }

  // ---------- My Page ----------

  isMyPageOpen() {
    return this.modal.style.display !== 'none';
  }

  closeMyPage() {
    this.modal.style.display = 'none';
    this.modal.innerHTML = '';
    document.body.classList.remove('mypage-open');
  }

  passwordRow(user) {
    const t = (k) => i18n.t(k);
    if (user.hasPassword) {
      return `<span class="pw-mask" aria-label="${t('mypage_password')}">●●●●●●●●</span>
        <button type="button" class="btn btn-cream btn-small" data-act="pw-toggle">${t('change')}</button>`;
    }
    return `<span class="muted-text">${t(user.isAnonymous ? 'mypage_pw_guest' : 'mypage_pw_google')}</span>`;
  }

  statsHtml() {
    const d = saveSystem.data;
    const t = (k) => i18n.t(k);
    return `
      <div class="plaque">${icon('star')}<span><small>${t('mileage')}</small><b>${d.mileage.toLocaleString()}</b></span></div>
      <div class="plaque">${icon('trophy')}<span><small>${t('high_score')}</small><b>${d.highScore.toLocaleString()}</b></span></div>`;
  }

  refreshStats() {
    const box = this.modal.querySelector('[data-stats]');
    if (box) box.innerHTML = this.statsHtml();
  }

  openMyPage() {
    const user = auth.getUser();
    if (!user) return;
    const t = (k, p) => i18n.t(k, p);
    const avatar = `/assets/characters/${saveSystem.data.selectedCharacter || 'young_cowboy'}.png`;

    this.modal.innerHTML = `
      <div class="modal-card mypage-card wood-frame pop-in" role="dialog" aria-modal="true">
        <div class="modal-head">${icon('star')}<h2>${t('mypage_title')}</h2>
          <button type="button" class="round-btn close-btn" data-act="close" aria-label="${t('close')}">✕</button></div>
        <div class="paper-sheet mypage-sheet">
         <div class="mp-col">
          <div class="profile-head">
            <span class="avatar"><img src="${avatar}" alt="" draggable="false"></span>
            <div class="profile-name">
              <b>${escapeHtml(user.displayName)}</b>
              ${handButtonHtml('small')}
              <span class="type-badge type-${user.loginType}">${t(`login_type_${user.loginType}`)}</span>
              ${auth.isCurrentUserAdmin() ? '<em class="admin-tag">ADMIN</em>' : ''}
            </div>
          </div>

          <div class="mypage-stats plaque-row" data-stats>${this.statsHtml()}</div>

          <dl class="info-grid">
            <dt>${t('mypage_id')}</dt>
            <dd class="id-value">${escapeHtml(accountId(user))}</dd>
            <dt>${t('mypage_password')}</dt>
            <dd class="pw-cell">${this.passwordRow(user)}</dd>
          </dl>
          ${user.hasPassword ? `<p class="field-hint">${t('mypage_pw_hidden_note')}</p>` : ''}
         </div>

         <div class="mp-col">
          ${user.hasPassword ? `
          <form class="pw-form" data-pw-form hidden novalidate>
            <input type="text" name="username" autocomplete="username" value="${escapeHtml(user.email || user.phoneNumber || '')}" hidden>
            <label class="field"><span>${t('mypage_current_pw')}</span><input type="password" name="current" autocomplete="current-password" placeholder="${t('mypage_current_pw')}"></label>
            <label class="field"><span>${t('mypage_new_pw')}</span><input type="password" name="next" autocomplete="new-password" placeholder="${t('mypage_new_pw')}"></label>
            <label class="field"><span>${t('mypage_new_pw_confirm')}</span><input type="password" name="confirm" autocomplete="new-password" placeholder="${t('mypage_new_pw_confirm')}"></label>
            <p class="form-error" data-pw-msg role="alert"></p>
            <button type="submit" class="btn btn-orange btn-block">${t('mypage_change_pw')}</button>
          </form>` : ''}

          <div class="field nick-field">
            <span>${t('mypage_change_nick')}</span>
            <div class="phone-row">
              <input type="text" name="nick" maxlength="10" placeholder="${escapeHtml(user.displayName)}" aria-label="${t('mypage_change_nick')}">
              <button type="button" class="btn btn-teal btn-small" data-act="nick">${t('save')}</button>
            </div>
            <p class="form-error" data-nick-msg role="alert"></p>
          </div>

          <div class="recent-runs">
            <b>${t('mypage_recent_runs')}</b>
            <ul data-runs><li class="muted">${t('mypage_loading')}</li></ul>
          </div>

          ${user.isAnonymous ? `<p class="field-hint guest-expiry">${t('mypage_guest_expiry')}</p>` : ''}

          <div class="mypage-foot">
            <button type="button" class="btn btn-cream" data-act="logout">${EXIT_ICON}<span>${t('logout')}</span></button>
            <button type="button" class="btn-link danger-link" data-act="delete">${t('mypage_delete_account')}</button>
          </div>
         </div>
        </div>
      </div>`;
    this.modal.style.display = 'flex';
    document.body.classList.add('mypage-open');
    this.bindMyPage(user);
    addPasswordToggles(this.modal);
  }

  bindMyPage(user) {
    const root = this.modal;
    const q = (s) => root.querySelector(s);
    const t = (k) => i18n.t(k);

    q('[data-act="close"]').addEventListener('click', () => {
      soundSynth.playUiClick();
      this.closeMyPage();
    });

    const list = q('[data-runs]');
    cloud.listRuns(user.uid).then((runs) => {
      if (!list.isConnected) return;
      list.innerHTML = runs.length
        ? runs.map((r) => `<li><span>STAGE ${r.stage} · ${r.clear ? 'CLEAR' : 'FAIL'}</span><b>${Number(r.score).toLocaleString()}</b><small>${r.at ? r.at.toLocaleDateString() : ''}</small></li>`).join('')
        : `<li class="muted">${t('mypage_no_runs')}</li>`;
    }).catch(() => {
      if (list.isConnected) list.innerHTML = `<li class="muted">${t('auth_err_network')}</li>`;
    });

    const pwForm = q('[data-pw-form]');
    q('[data-act="pw-toggle"]')?.addEventListener('click', () => {
      soundSynth.playUiClick();
      pwForm.hidden = !pwForm.hidden;
      q('.mypage-card').classList.toggle('pw-mode', !pwForm.hidden);
      if (!pwForm.hidden) pwForm.querySelector('[name="current"]').focus();
    });
    pwForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = q('[data-pw-msg]');
      const val = (n) => pwForm.querySelector(`[name="${n}"]`).value;
      msg.classList.remove('ok');
      if (val('next') !== val('confirm')) {
        msg.textContent = t('auth_err_pw_mismatch');
        return;
      }
      const btn = pwForm.querySelector('[type="submit"]');
      btn.disabled = true;
      try {
        await auth.changePassword(val('current'), val('next'));
        pwForm.reset();
        msg.textContent = t('mypage_pw_changed');
        msg.classList.add('ok');
      } catch (err) {
        msg.textContent = t(`auth_err_${err.code || 'unknown'}`);
      } finally {
        btn.disabled = false;
      }
    });

    q('[data-act="nick"]').addEventListener('click', async () => {
      const msg = q('[data-nick-msg]');
      const btn = q('[data-act="nick"]');
      msg.classList.remove('ok');
      btn.disabled = true;
      try {
        await auth.updateNickname(q('[name="nick"]').value);
        this.openMyPage();
        const fresh = this.modal.querySelector('[data-nick-msg]');
        fresh.textContent = t('mypage_nick_saved');
        fresh.classList.add('ok');
      } catch (err) {
        msg.textContent = t(`auth_err_${err.code || 'unknown'}`);
        btn.disabled = false;
      }
    });

    q('[data-act="logout"]').addEventListener('click', () => {
      soundSynth.playUiClick();
      this.logout();
    });

    q('[data-act="delete"]').addEventListener('click', async () => {
      soundSynth.playUiClick();
      const ok = await this.confirm({
        title: t('mypage_delete_account'),
        message: `${t('mypage_delete_warning')}\n${t('mypage_delete_confirm_step2')}`,
        confirmLabel: t('mypage_delete_account'),
        danger: true,
        requireWord: true
      });
      if (!ok) return;
      try {
        await auth.deleteAccount();
      } catch (err) {
        await this.confirm({ title: t('mypage_delete_account'), message: t(`auth_err_${err.code || 'unknown'}`), alertOnly: true });
      }
      this.closeMyPage();
      this.onLoggedOut?.();
    });
  }

  // ---------- Confirm dialog ----------

  confirm({ title, message, confirmLabel, danger = false, requireWord = false, alertOnly = false }) {
    const t = (k) => i18n.t(k);
    return new Promise((resolve) => {
      this.dialog.innerHTML = `
        <div class="modal-card confirm-card wood-frame pop-in" role="alertdialog" aria-modal="true">
          <div class="modal-head"><h2>${escapeHtml(title)}</h2></div>
          <div class="paper-sheet">
            <p class="confirm-msg">${escapeHtml(message).replace(/\n/g, '<br>')}</p>
            ${requireWord ? `<input class="confirm-word" type="text" name="word" autocomplete="off" aria-label="${escapeHtml(title)}">` : ''}
            <div class="btn-row">
              ${alertOnly ? '' : `<button type="button" class="btn btn-cream" data-act="no">${t('cancel')}</button>`}
              <button type="button" class="btn ${danger ? 'btn-red' : 'btn-orange'}" data-act="yes">${escapeHtml(alertOnly ? t('confirm') : confirmLabel || t('confirm'))}</button>
            </div>
          </div>
        </div>`;
      this.dialog.style.display = 'flex';
      const done = (value) => {
        this.dialog.style.display = 'none';
        this.dialog.innerHTML = '';
        resolve(value);
      };
      const yes = this.dialog.querySelector('[data-act="yes"]');
      const word = this.dialog.querySelector('[name="word"]');
      if (word) {
        yes.disabled = true;
        word.addEventListener('input', () => { yes.disabled = !DELETE_WORDS.includes(word.value.trim()); });
        word.focus();
      }
      yes.addEventListener('click', () => done(true));
      this.dialog.querySelector('[data-act="no"]')?.addEventListener('click', () => done(false));
    });
  }
}
