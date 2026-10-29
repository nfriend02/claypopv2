// src/core/UXMode.js
// Device layout profile: desktop | landscape | portrait.
// The active profile (src/config/uxProfiles.js) is applied as CSS variables + body[data-ux];
// modules read uxMode.profile or subscribe with uxMode.onChange(). Rotation is picked up on the
// orientation media query change event, so the layout flips in the same frame even mid-game.

import { UX_PROFILES } from '../config/uxProfiles.js';

export const UX_MODES = {
  DESKTOP: 'desktop',
  LANDSCAPE: 'landscape',
  PORTRAIT: 'portrait'
};

const forcedMode = () => {
  const forced = new URLSearchParams(window.location.search).get('ux');
  return forced && UX_PROFILES[forced] ? forced : null;
};

function viewportSize() {
  const vv = window.visualViewport;
  return {
    w: Math.round(vv?.width || window.innerWidth),
    h: Math.round(vv?.height || window.innerHeight)
  };
}

function isTouchDevice() {
  const fineHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  return coarse || (!fineHover && navigator.maxTouchPoints > 0);
}

function detectMode() {
  const forced = forcedMode();
  if (forced) return forced;
  const { w, h } = viewportSize();
  if (!isTouchDevice()) return w < h ? UX_MODES.PORTRAIT : UX_MODES.DESKTOP;
  return w >= h ? UX_MODES.LANDSCAPE : UX_MODES.PORTRAIT;
}

class UXModeManager {
  constructor() {
    this.mode = detectMode();
    this.listeners = new Set();
    this.frame = 0;
    this.apply();

    const schedule = () => this.scheduleRefresh();
    window.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('resize', schedule);
    window.matchMedia('(orientation: portrait)').addEventListener?.('change', () => this.refresh());
    window.addEventListener('orientationchange', () => {
      this.refresh();
      setTimeout(() => this.refresh(), 250);
    });
  }

  scheduleRefresh() {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.refresh();
    });
  }

  refresh() {
    const next = detectMode();
    if (next === this.mode) return;
    this.mode = next;
    this.apply();
    this.listeners.forEach((cb) => cb(this.profile, next));
    window.dispatchEvent(new CustomEvent('claypop_ux_changed', { detail: { mode: next, profile: this.profile } }));
  }

  apply() {
    const body = document.body;
    body.dataset.ux = this.mode;
    body.dataset.topRows = String(this.profile.topRows);
    for (const [name, value] of Object.entries(this.profile.vars)) body.style.setProperty(name, value);
  }

  // Subscribe to profile switches; returns an unsubscribe function
  onChange(cb) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  get profile() {
    return UX_PROFILES[this.mode];
  }

  get fov() {
    return this.profile.fov || 60;
  }

  get isDesktop() {
    return this.mode === UX_MODES.DESKTOP;
  }

  get isLandscape() {
    return this.mode === UX_MODES.LANDSCAPE;
  }

  get isPortrait() {
    return this.mode === UX_MODES.PORTRAIT;
  }
}

export const uxMode = new UXModeManager();
