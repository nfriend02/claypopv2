// src/ui/HandButton.js
// Handedness (a device preference): 'right' (default) = fan pad under the right thumb and arrows under
// the left; 'left' = the mirrored layout. Applied as body[data-hand]; every thumb button toggles it.

import { i18n } from '../core/i18n.js';
import { soundSynth } from '../audio/SoundSynth.js';
import { escapeHtml, showToast } from './dom.js';

const KEY = 'claypop_handedness';

export function getHand() {
  try {
    return localStorage.getItem(KEY) === 'left' ? 'left' : 'right';
  } catch {
    return 'right';
  }
}

function setHand(hand) {
  try {
    localStorage.setItem(KEY, hand);
  } catch {
    // private mode: the choice lasts for this page only
  }
  document.body.dataset.hand = hand;
}

// Open hand with the thumb out (drawn as the right hand, mirrored for the left) and an L / R badge
function handSvg(hand) {
  const shapes = `
    <rect x="11" y="13" width="15" height="14" rx="5"/>
    <rect x="11.2" y="6.5" width="3.6" height="11" rx="1.8"/>
    <rect x="14.9" y="4" width="3.6" height="13" rx="1.8"/>
    <rect x="18.6" y="4.6" width="3.6" height="12.5" rx="1.8"/>
    <rect x="22.3" y="7.4" width="3.6" height="10" rx="1.8"/>
    <rect x="3.2" y="14.2" width="12.3" height="5.6" rx="2.8" transform="rotate(-32 11 17)"/>`;
  const mirror = hand === 'left' ? ' transform="translate(32 0) scale(-1 1)"' : '';
  return `<svg viewBox="0 0 32 32" aria-hidden="true">
    <g${mirror}>
      <g fill="#2B1700" stroke="#2B1700" stroke-width="3" stroke-linejoin="round">${shapes}</g>
      <g fill="#FFF4DC">${shapes}</g>
    </g>
    <circle cx="25" cy="25" r="6.3" fill="#FF7A1A" stroke="#2B1700" stroke-width="1.6"/>
    <text x="25" y="28.4" text-anchor="middle" font-family="Bungee, 'Arial Black', sans-serif" font-size="9.5" font-weight="900" fill="#fff">${hand === 'left' ? 'L' : 'R'}</text>
  </svg>`;
}

function labelFor(hand) {
  return `${i18n.t(hand === 'left' ? 'hand_left' : 'hand_right')} · ${i18n.t('hand_toggle_hint')}`;
}

export function handButtonHtml(cls = '') {
  const hand = getHand();
  const label = escapeHtml(labelFor(hand));
  return `<button type="button" class="hand-btn ${cls}" data-hand="${hand}" title="${label}" aria-label="${label}">${handSvg(hand)}</button>`;
}

function refreshButtons() {
  const hand = getHand();
  const label = labelFor(hand);
  document.querySelectorAll('.hand-btn').forEach((b) => {
    b.dataset.hand = hand;
    b.title = label;
    b.setAttribute('aria-label', label);
    b.innerHTML = handSvg(hand);
  });
}

export function initHandedness() {
  document.body.dataset.hand = getHand();
  document.addEventListener('click', (e) => {
    if (!(e.target instanceof Element) || !e.target.closest('.hand-btn')) return;
    soundSynth.playUiClick();
    const next = getHand() === 'left' ? 'right' : 'left';
    setHand(next);
    refreshButtons();
    showToast(i18n.t(next === 'left' ? 'hand_left' : 'hand_right'));
  });
}
