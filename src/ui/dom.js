// src/ui/dom.js
// Small DOM helpers shared by UI screens

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
