// src/ui/GlobalSoundButton.js
// Universal top-left floating sound toggle (default: sound OFF)

import { soundSynth } from '../audio/SoundSynth.js';

export class GlobalSoundButton {
  constructor(containerEl = document.body) {
    this.container = containerEl;
    this.btnEl = null;
    this.init();
  }

  init() {
    if (document.getElementById('global-sound-btn')) return;

    this.btnEl = document.createElement('button');
    this.btnEl.type = 'button';
    this.btnEl.id = 'global-sound-btn';
    this.btnEl.className = 'corner-btn global-sound-btn';
    this.btnEl.setAttribute('aria-label', 'Toggle Sound');
    this.updateIcon(soundSynth.isMuted());

    this.btnEl.addEventListener('click', (e) => {
      e.stopPropagation();
      const isMuted = soundSynth.toggleMute();
      this.updateIcon(isMuted);
      const introVideo = document.getElementById('intro-video');
      if (introVideo) introVideo.muted = isMuted;
    });

    window.addEventListener('claypop_sound_toggled', (e) => this.updateIcon(e.detail.isMuted));
    this.container.appendChild(this.btnEl);
  }

  updateIcon(isMuted) {
    if (!this.btnEl) return;
    const waves = isMuted
      ? '<path d="M16 9l5 6M21 9l-5 6"/>'
      : '<path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/>';
    this.btnEl.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/>
        ${waves}
      </svg>`;
    this.btnEl.classList.toggle('sound-off', isMuted);
    this.btnEl.classList.toggle('sound-on', !isMuted);
    this.btnEl.title = isMuted ? 'Sound: OFF' : 'Sound: ON';
  }
}

export const globalSoundButton = new GlobalSoundButton();
