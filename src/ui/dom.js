// src/ui/dom.js
// Small DOM helpers shared by UI screens

import { i18n } from '../core/i18n.js';

const EYE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3.2"/></svg>';
const EYE_OFF_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3.2"/><path d="M4 20 20 4"/></svg>';

// Eye button inside every password field under `root`: shows / hides what was typed. Fields always
// start masked; the icon shows the current state (slashed eye = masked, open eye = visible).
export function addPasswordToggles(root) {
  root.querySelectorAll('input[type="password"]').forEach((input) => {
    if (input.parentElement.classList.contains('pw-wrap')) return;
    input.type = 'password';
    const wrap = document.createElement('span');
    wrap.className = 'pw-wrap';
    input.replaceWith(wrap);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pw-eye';
    btn.tabIndex = -1;
    const sync = () => {
      const shown = input.type === 'text';
      btn.innerHTML = shown ? EYE_SVG : EYE_OFF_SVG;
      btn.setAttribute('aria-pressed', String(shown));
      btn.setAttribute('aria-label', i18n.t(shown ? 'hide_password' : 'show_password'));
      btn.title = btn.getAttribute('aria-label');
    };
    // keep the focus (and the phone keyboard) on the field
    btn.addEventListener('pointerdown', (e) => e.preventDefault());
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      input.type = input.type === 'password' ? 'text' : 'password';
      sync();
    });
    input.form?.addEventListener('reset', () => {
      input.type = 'password';
      sync();
    });
    sync();
    wrap.append(input, btn);
  });
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function showToast(text, ms = 2800) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), ms + 200);
}

export function icon(name, cls = '') {
  return `<img class="ui-icon ${cls}" src="/assets/ui/icons/${name}.png" alt="" draggable="false">`;
}
