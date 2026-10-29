// src/ui/StageCutscene.js
// Full-screen per-stage opening / ending clips (public/assets/cutscenes, built by scripts/build_cutscenes.py).
// Nothing else (HUD, notices, result board, buttons) may appear while a clip plays; only the
// sound toggle stays reachable and the clip follows the session's mute state.

import { soundSynth } from '../audio/SoundSynth.js';

const BASE = '/assets/cutscenes';
// Clips are ~3.9s; give slow networks a little room before giving up
const MAX_WAIT_MS = 7000;
const FADE_MS = 260;

export function cutsceneUrl(kind, stage, charId, outcome) {
  const dir = `${BASE}/${kind}/stage${String(stage).padStart(2, '0')}`;
  return kind === 'ending' ? `${dir}/${charId}_${outcome}.mp4` : `${dir}/${charId}.mp4`;
}

export class StageCutscene {
  constructor(containerEl = document.body) {
    this.active = false;
    this.el = document.createElement('div');
    this.el.className = 'stage-cutscene';
    this.el.innerHTML = `
      <div class="stage-cutscene-backdrop"></div>
      <video class="stage-cutscene-video" playsinline preload="auto" disablepictureinpicture></video>
    `;
    this.backdrop = this.el.querySelector('.stage-cutscene-backdrop');
    this.video = this.el.querySelector('video');
    this.video.addEventListener('contextmenu', (e) => e.preventDefault());
    containerEl.appendChild(this.el);

    window.addEventListener('claypop_sound_toggled', (e) => {
      if (this.active) this.video.muted = e.detail.isMuted;
    });
  }

  prefetch(urls) {
    urls.forEach((url) => fetch(url, { priority: 'low' }).catch(() => {}));
  }

  // Resolves when the clip ends (or fails); the layer stays up until hide()
  play(url) {
    clearTimeout(this.fadeTimer);
    this.active = true;
    document.body.classList.add('cutscene-playing');
    const poster = url.replace(/\.mp4$/, '.jpg');
    this.backdrop.style.backgroundImage = `url("${poster}")`;
    this.video.poster = poster;
    this.video.src = url;
    this.video.muted = soundSynth.isMuted();
    this.el.classList.remove('fading');
    this.el.classList.add('visible');

    return new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        this.video.removeEventListener('ended', finish);
        this.video.removeEventListener('error', finish);
        this.video.pause();
        resolve();
      };
      const timer = setTimeout(finish, MAX_WAIT_MS);
      this.video.addEventListener('ended', finish);
      this.video.addEventListener('error', finish);

      this.video.currentTime = 0;
      this.video.play().catch(() => {
        // Autoplay with audio refused: keep the picture, drop the sound for this clip
        this.video.muted = true;
        this.video.play().catch(finish);
      });
    });
  }

  hide() {
    if (!this.active) return;
    this.active = false;
    this.el.classList.add('fading');
    document.body.classList.remove('cutscene-playing');
    this.fadeTimer = setTimeout(() => {
      this.el.classList.remove('visible', 'fading');
      this.video.removeAttribute('src');
      this.video.load();
    }, FADE_MS);
  }
}
