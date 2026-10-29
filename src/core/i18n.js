// src/core/i18n.js
// Internationalization management for ko, en, ja

import { STRINGS } from './strings.js';

class I18nManager {
  constructor() {
    this.currentLang = localStorage.getItem('claypop_lang') || 'ko';
    if (!['ko', 'en', 'ja'].includes(this.currentLang)) {
      this.currentLang = 'ko';
    }
  }

  getLanguage() {
    return this.currentLang;
  }

  setLanguage(lang) {
    if (['ko', 'en', 'ja'].includes(lang)) {
      this.currentLang = lang;
      localStorage.setItem('claypop_lang', lang);
      this.updateDOM();
      window.dispatchEvent(new CustomEvent('claypop_language_changed', { detail: { lang } }));
    }
  }

  t(key, params = {}) {
    const dict = STRINGS[this.currentLang] || STRINGS.ko;
    let str = dict[key] || STRINGS.ko[key] || key;
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
    }
    return str;
  }

  updateDOM() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key) {
        if (el.tagName === 'INPUT' && el.getAttribute('type') === 'text') {
          el.setAttribute('placeholder', this.t(key));
        } else {
          el.innerHTML = this.t(key);
        }
      }
    });

    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      if (key) {
        el.setAttribute('title', this.t(key));
      }
    });
  }
}

export const i18n = new I18nManager();
