// src/ui/IntroCutscene.js
// 6-second intro animation sequence with real MP4 video playback & SKIP button (Form_1_7 Compliant)

import { soundSynth } from '../audio/SoundSynth.js';
import { i18n } from '../core/i18n.js';

export class IntroCutscene {
  constructor(containerEl, onCompleteCallback) {
    this.container = containerEl;
    this.onComplete = onCompleteCallback;
    this.introEl = null;
    this.videoEl = null;
    this.canvas = null;
    this.ctx = null;
    this.timer = 0;
    this.animFrame = null;
    this.isSkipped = false;
    this.isVideoPlaying = false;
    this.init();
  }

  init() {
    this.introEl = document.createElement('div');
    this.introEl.id = 'intro-cutscene';
    this.introEl.className = 'intro-screen';
    this.introEl.innerHTML = `
      <video id="intro-video" class="intro-video-bg" playsinline muted preload="auto">
        <source src="/assets/videos/intro_1960_texas.mp4" type="video/mp4">
      </video>
      <canvas id="intro-canvas" style="display: none;"></canvas>
      <div class="intro-overlay">
        <button type="button" id="btn-skip-intro" class="skip-btn" data-i18n="skip_intro">
          ${i18n.t('skip_intro')}
        </button>
        <div id="intro-logo" class="intro-logo" style="display: none;">
          <img src="/assets/ui/logo.png" alt="Claypop Version 2" draggable="false">
        </div>
      </div>
    `;

    this.container.appendChild(this.introEl);

    this.videoEl = this.introEl.querySelector('#intro-video');
    this.canvas = this.introEl.querySelector('#intro-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.resize();

    const skipBtn = this.introEl.querySelector('#btn-skip-intro');
    skipBtn?.addEventListener('click', () => this.finish());

    // When MP4 video finishes, smoothly finish cutscene
    if (this.videoEl) {
      this.videoEl.addEventListener('ended', () => {
        this.finish();
      });

      this.videoEl.addEventListener('error', () => {
        // Fallback to canvas animation if video fails to load
        this.startCanvasFallback();
      });
    }

    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    if (this.canvas) {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    }
  }

  start() {
    this.timer = 0;
    this.isSkipped = false;
    this.introEl.style.display = 'block';

    if (this.videoEl) {
      this.videoEl.currentTime = 0;
      const playPromise = this.videoEl.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            this.isVideoPlaying = true;
            if (this.canvas) this.canvas.style.display = 'none';
            this.videoEl.style.display = 'block';

            // Schedule SFX sync with the video timeline
            this.syncVideoSounds();
          })
          .catch((err) => {
            console.warn('[IntroCutscene] Video autoplay prevented or failed, using canvas fallback:', err);
            this.startCanvasFallback();
          });
      } else {
        this.isVideoPlaying = true;
      }
    } else {
      this.startCanvasFallback();
    }
  }

  syncVideoSounds() {
    const sfxTimeouts = [
      setTimeout(() => soundSynth.playShotgunBlast(), 1800),
      setTimeout(() => soundSynth.playClayShatter(), 2300),
      setTimeout(() => soundSynth.playShotgunBlast(), 2800),
      setTimeout(() => soundSynth.playClayShatter(), 3300),
      setTimeout(() => soundSynth.playClayShatter(true), 4500)
    ];

    this.sfxTimeouts = sfxTimeouts;
  }

  startCanvasFallback() {
    if (this.isSkipped) return;
    this.isVideoPlaying = false;
    if (this.videoEl) this.videoEl.style.display = 'none';
    if (this.canvas) this.canvas.style.display = 'block';

    let lastShotTime = 0;
    let shotCount = 0;

    const loop = (timestamp) => {
      if (this.isSkipped) return;
      this.timer += 0.016;

      this.renderCanvas(this.timer);

      if (this.timer >= 2.0 && this.timer <= 4.5) {
        if (this.timer - lastShotTime >= 0.5 && shotCount < 5) {
          lastShotTime = this.timer;
          shotCount++;
          soundSynth.playShotgunBlast();
          soundSynth.playClayShatter();
        }
      }

      if (this.timer >= 6.0) {
        this.finish();
        return;
      }

      this.animFrame = requestAnimationFrame(loop);
    };

    this.animFrame = requestAnimationFrame(loop);
  }

  renderCanvas(t) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, w, h);

    const logo = this.introEl.querySelector('#intro-logo');

    if (t < 2.0) {
      ctx.fillStyle = '#87CEEB';
      ctx.fillRect(0, 0, w, h * 0.65);
      ctx.fillStyle = '#6BA347';
      ctx.fillRect(0, h * 0.65, w, h * 0.35);

      ctx.fillStyle = '#A04030';
      ctx.fillRect(w * 0.15, h * 0.55, 180, 70);
      ctx.fillStyle = '#222';
      ctx.beginPath();
      ctx.arc(w * 0.15 + 40, h * 0.65, 25, 0, Math.PI * 2);
      ctx.arc(w * 0.15 + 140, h * 0.65, 25, 0, Math.PI * 2);
      ctx.fill();

      const walkProg = Math.min(1.0, t / 2.0);
      const cowboyX = w * 0.5;
      const cowboyY = h * 0.65 - walkProg * 20;

      ctx.fillStyle = '#D24625';
      ctx.fillRect(cowboyX - 25, cowboyY - 40, 50, 60);
      ctx.fillStyle = '#C29B62';
      ctx.beginPath();
      ctx.ellipse(cowboyX, cowboyY - 60, 40, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (t < 4.5) {
      ctx.fillStyle = '#70A0D0';
      ctx.fillRect(0, 0, w, h * 0.65);
      ctx.fillStyle = '#4E9A45';
      ctx.fillRect(0, h * 0.65, w, h * 0.35);

      const shotIndex = Math.floor((t - 2.0) / 0.5);
      for (let i = 0; i <= shotIndex && i < 5; i++) {
        const cx = w * (0.2 + i * 0.15);
        const cy = h * (0.35 - Math.sin(i * 0.8) * 0.1);
        ctx.fillStyle = '#FF5500';
        ctx.beginPath();
        ctx.arc(cx, cy, 14, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#FFE600';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(cx, cy, 32 + (t % 0.5) * 40, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = '#2B1700';
      ctx.fillRect(0, 0, w, h);

      if (logo) logo.style.display = 'block';
    }
  }

  finish() {
    if (this.isSkipped) return;
    this.isSkipped = true;

    if (this.videoEl) {
      this.videoEl.pause();
    }
    if (this.sfxTimeouts) {
      this.sfxTimeouts.forEach(t => clearTimeout(t));
    }
    if (this.animFrame) cancelAnimationFrame(this.animFrame);

    this.introEl.style.opacity = '0';
    this.introEl.style.transition = 'opacity 0.4s ease';

    setTimeout(() => {
      this.introEl.style.display = 'none';
      if (this.onComplete) this.onComplete();
    }, 400);
  }
}
