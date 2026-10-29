// src/core/UXMode.js
// Device layout profile: desktop | landscape | portrait (drives CSS via body[data-ux] and camera FOV)

export const UX_MODES = {
  DESKTOP: 'desktop',
  LANDSCAPE: 'landscape',
  PORTRAIT: 'portrait'
};

const FOV_BY_MODE = {
  desktop: 55,
  landscape: 60,
  portrait: 75
};

function detectMode() {
  const forced = new URLSearchParams(window.location.search).get('ux');
  if (forced && Object.values(UX_MODES).includes(forced)) return forced;

  const fineHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const isTouchDevice = coarse || (!fineHover && navigator.maxTouchPoints > 0);

  if (!isTouchDevice) {
    return window.innerWidth < window.innerHeight ? UX_MODES.PORTRAIT : UX_MODES.DESKTOP;
  }
  return window.innerWidth >= window.innerHeight ? UX_MODES.LANDSCAPE : UX_MODES.PORTRAIT;
}

class UXModeManager {
  constructor() {
    this.mode = detectMode();
    this.apply();
    window.addEventListener('resize', () => this.refresh());
    window.addEventListener('orientationchange', () => setTimeout(() => this.refresh(), 120));
  }

  refresh() {
    const next = detectMode();
    if (next !== this.mode) {
      this.mode = next;
      this.apply();
      window.dispatchEvent(new CustomEvent('claypop_ux_changed', { detail: { mode: next } }));
    }
  }

  apply() {
    document.body.dataset.ux = this.mode;
  }

  get fov() {
    return FOV_BY_MODE[this.mode] || 60;
  }

  get isDesktop() {
    return this.mode === UX_MODES.DESKTOP;
  }

  get isPortrait() {
    return this.mode === UX_MODES.PORTRAIT;
  }
}

export const uxMode = new UXModeManager();
