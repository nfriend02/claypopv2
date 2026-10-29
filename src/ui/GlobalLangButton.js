// src/ui/GlobalLangButton.js
// Small top-left language toggle (Ko -> En -> Ja) next to the sound button.
// Shown on every screen after the title screen; the title screen keeps its 3 language pills.

import { i18n } from '../core/i18n.js';
import { soundSynth } from '../audio/SoundSynth.js';

const ORDER = ['ko', 'en', 'ja'];
const LABELS = { ko: 'Ko', en: 'En', ja: 'Ja' };

export class GlobalLangButton {
  constructor(containerEl = document.body) {
    if (document.getElementById('global-lang-btn')) return;
    this.btnEl = document.createElement('button');
    this.btnEl.type = 'button';
    this.btnEl.id = 'global-lang-btn';
    this.btnEl.className = 'corner-btn global-lang-btn';
    this.btnEl.setAttribute('aria-label', 'Language');
    this.btnEl.addEventListener('click', (e) => {
      e.stopPropagation();
      soundSynth.playUiClick();
      const next = ORDER[(ORDER.indexOf(i18n.getLanguage()) + 1) % ORDER.length];
      i18n.setLanguage(next);
    });
    window.addEventListener('claypop_language_changed', () => this.refresh());
    this.refresh();
    containerEl.appendChild(this.btnEl);
  }

  refresh() {
    const lang = i18n.getLanguage();
    this.btnEl.textContent = LABELS[lang] || 'Ko';
    this.btnEl.title = `Language: ${LABELS[lang]} → ${LABELS[ORDER[(ORDER.indexOf(lang) + 1) % ORDER.length]]}`;
  }
}

export const globalLangButton = new GlobalLangButton();
