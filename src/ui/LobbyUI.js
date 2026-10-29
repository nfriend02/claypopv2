// src/ui/LobbyUI.js
// Lobby (first screen) + Settings modal. My Page / Logout live in AccountUI.

import { auth } from '../core/firebase.js';
import { saveSystem } from '../core/SaveSystem.js';
import { soundSynth } from '../audio/SoundSynth.js';
import { i18n } from '../core/i18n.js';
import { escapeHtml, icon } from './dom.js';

const LANGS = [
  ['ko', '한국어'],
  ['en', 'English'],
  ['ja', '日本語']
];

export class LobbyUI {
  constructor(onPlay, onOpenAuth, onOpenMyPage) {
    this.onPlay = onPlay;
    this.onOpenAuth = onOpenAuth;
    this.onOpenMyPage = onOpenMyPage;

    this.el = document.createElement('div');
    this.el.id = 'lobby-screen';
    this.el.className = 'ui-screen scenic-screen lobby-screen';
    this.el.style.display = 'none';
    document.body.appendChild(this.el);

    this.modal = document.createElement('div');
    this.modal.className = 'modal-backdrop';
    this.modal.style.display = 'none';
    document.body.appendChild(this.modal);

    window.addEventListener('claypop_auth_changed', () => {
      if (this.el.style.display !== 'none') this.render();
    });
    window.addEventListener('claypop_language_changed', () => {
      if (this.el.style.display !== 'none') this.render();
    });
    window.addEventListener('claypop_progress_changed', () => {
      if (this.el.style.display !== 'none') this.render();
    });
  }

  render() {
    const user = auth.getUser();
    const data = saveSystem.data;
    const t = (k, p) => i18n.t(k, p);
    const avatar = `/assets/characters/${data.selectedCharacter || 'young_cowboy'}.png`;

    this.el.innerHTML = `
      <div class="lobby-hero hero-left"><img src="/assets/characters/lobby_young_cowboy.png" alt="Billy" draggable="false"></div>
      <div class="lobby-hero hero-right"><img src="/assets/characters/lobby_young_cowgirl.png" alt="Daisy" draggable="false"></div>

      <header class="lobby-top">
        <button type="button" class="user-chip" data-act="user">
          <span class="avatar"><img src="${avatar}" alt="" draggable="false"></span>
          <span class="who">
            <b>${user ? escapeHtml(t('lobby_signed_in_as', { name: user.displayName })) : t('lobby_sign_in')}</b>
            ${auth.isCurrentUserAdmin() ? '<em class="admin-tag">ADMIN</em>' : ''}
          </span>
        </button>
        <button type="button" class="round-btn" data-act="settings" aria-label="${t('lobby_settings')}">${icon('settings')}</button>
      </header>

      <main class="lobby-center">
        <img class="lobby-logo float-y" src="/assets/ui/logo.png" alt="Claypop Version 2" draggable="false">
        <p class="ribbon">${t('app_subtitle')}</p>
        <div class="plaque-row">
          <div class="plaque">${icon('trophy')}<span><small>${t('high_score')}</small><b>${data.highScore.toLocaleString()}</b></span></div>
          <div class="plaque">${icon('star')}<span><small>${t('mileage')}</small><b>${data.mileage.toLocaleString()}</b></span></div>
        </div>
        <button type="button" class="btn btn-orange btn-mega pulse" data-act="play">${icon('play')}<span>${t('lobby_play')}</span></button>
      </main>

      <footer class="lobby-foot">
        <div class="lang-pills">
          ${LANGS.map(([code, label]) => `<button type="button" class="pill ${i18n.getLanguage() === code ? 'on' : ''}" data-lang="${code}">${label}</button>`).join('')}
        </div>
      </footer>
    `;

    const q = (s) => this.el.querySelector(s);
    q('[data-act="play"]').addEventListener('click', () => {
      soundSynth.playUiClick();
      this.onPlay?.();
    });
    q('[data-act="user"]').addEventListener('click', () => {
      soundSynth.playUiClick();
      if (auth.getUser()) this.onOpenMyPage?.();
      else this.onOpenAuth?.();
    });
    q('[data-act="settings"]').addEventListener('click', () => {
      soundSynth.playUiClick();
      this.openSettings();
    });
    this.el.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => i18n.setLanguage(b.dataset.lang)));
  }

  openModal(html, bind) {
    this.modal.innerHTML = `<div class="modal-card wood-frame pop-in">${html}</div>`;
    this.modal.style.display = 'flex';
    this.modal.querySelector('[data-act="close"]')?.addEventListener('click', () => this.closeModal());
    bind(this.modal);
  }

  closeModal() {
    this.modal.style.display = 'none';
    this.modal.innerHTML = '';
  }

  openSettings() {
    const s = saveSystem.data.settings;
    const t = (k) => i18n.t(k);
    this.openModal(`
      <div class="modal-head">${icon('settings')}<h2>${t('settings_title')}</h2>
        <button type="button" class="round-btn close-btn" data-act="close">✕</button></div>
      <div class="paper-sheet">
        <label class="slider-row"><span>${t('settings_bgm')}</span><input type="range" name="bgm" min="0" max="1" step="0.05" value="${s.bgmVolume}"></label>
        <label class="slider-row"><span>${t('settings_sfx')}</span><input type="range" name="sfx" min="0" max="1" step="0.05" value="${s.sfxVolume}"></label>
        <div class="slider-row"><span>${t('settings_language')}</span>
          <div class="lang-pills">${LANGS.map(([c, l]) => `<button type="button" class="pill ${i18n.getLanguage() === c ? 'on' : ''}" data-lang="${c}">${l}</button>`).join('')}</div>
        </div>
        <button type="button" class="btn btn-orange btn-block" data-act="save">${t('confirm')}</button>
      </div>
    `, (root) => {
      root.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => {
        i18n.setLanguage(b.dataset.lang);
        this.openSettings();
      }));
      root.querySelector('[data-act="save"]').addEventListener('click', () => {
        const bgm = parseFloat(root.querySelector('[name="bgm"]').value);
        const sfx = parseFloat(root.querySelector('[name="sfx"]').value);
        saveSystem.data.settings.bgmVolume = bgm;
        saveSystem.data.settings.sfxVolume = sfx;
        saveSystem.save();
        soundSynth.setBgmVolume(bgm);
        soundSynth.setSfxVolume(sfx);
        this.closeModal();
      });
    });
  }

  show() {
    this.render();
    this.el.style.display = 'flex';
  }

  hide() {
    this.el.style.display = 'none';
    this.closeModal();
  }
}
