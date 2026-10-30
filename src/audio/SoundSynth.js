// src/audio/SoundSynth.js
// Procedural Web Audio API sound synthesizer for comic western clay shooting

import { saveSystem } from '../core/SaveSystem.js';

class SoundSynthesizer {
  constructor() {
    this.ctx = null;
    this.bgmGain = null;
    this.sfxGain = null;
    this.isBgmPlaying = false;
    this.bgmInterval = null;
    this.bgmNotes = [
      146.83, 164.81, 196.00, 220.00, 246.94, 293.66, 329.63, 392.00 // D minor / Western pentatonic
    ];
    this.bgmStep = 0;
  }

  init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    this.ctx = new AudioContext();

    this.bgmGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();

    this.bgmGain.gain.value = saveSystem.data.settings.bgmVolume * (saveSystem.data.settings.bgmEnabled ? 0.35 : 0);
    this.sfxGain.gain.value = saveSystem.data.settings.sfxVolume * (saveSystem.data.settings.sfxEnabled ? 0.8 : 0);

    this.bgmGain.connect(this.ctx.destination);
    this.sfxGain.connect(this.ctx.destination);
  }

  ensureContext() {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setBgmVolume(val) {
    if (this.bgmGain) {
      this.bgmGain.gain.value = val * (saveSystem.data.settings.bgmEnabled ? 0.35 : 0);
    }
  }

  setSfxVolume(val) {
    if (this.sfxGain) {
      this.sfxGain.gain.value = val * (saveSystem.data.settings.sfxEnabled ? 0.8 : 0);
    }
  }

  isMuted() {
    return !saveSystem.data.settings.bgmEnabled && !saveSystem.data.settings.sfxEnabled;
  }

  setMuted(muted) {
    saveSystem.data.settings.bgmEnabled = !muted;
    saveSystem.data.settings.sfxEnabled = !muted;
    saveSystem.data.settings.userExplicitlyUnmuted = !muted;
    saveSystem.save();

    if (!muted) {
      this.ensureContext();
      if (this.isBgmPlaying && this.bgmInterval === null) {
        this.isBgmPlaying = false;
        this.startWesternBgm();
      }
    }

    if (this.bgmGain) {
      this.bgmGain.gain.value = !muted ? saveSystem.data.settings.bgmVolume * 0.35 : 0;
    }
    if (this.sfxGain) {
      this.sfxGain.gain.value = !muted ? saveSystem.data.settings.sfxVolume * 0.8 : 0;
    }

    window.dispatchEvent(new CustomEvent('claypop_sound_toggled', { detail: { isMuted: muted } }));
  }

  toggleMute() {
    const nextState = !this.isMuted();
    this.setMuted(nextState);
    return nextState;
  }

  // 1. Shotgun Muzzle Blast & Mechanical Reload
  playShotgunBlast() {
    this.ensureContext();
    if (!this.ctx || !saveSystem.data.settings.sfxEnabled) return;
    const now = this.ctx.currentTime;

    // Sub Bass Punch
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.18);
    oscGain.gain.setValueAtTime(0.9, now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.25);

    // Muzzle Flash Noise
    const bufferSize = this.ctx.sampleRate * 0.3;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3200, now);
    filter.frequency.linearRampToValueAtTime(400, now + 0.25);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.8, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noise.start(now);

    // Metallic cocking sound
    setTimeout(() => {
      this.playMetallicClick(now + 0.35);
    }, 180);
  }

  // Stage 5 truck hitting a rock / pothole: low body thump plus a short rattle
  playTruckBump(strength = 1) {
    this.ensureContext();
    if (!this.ctx || !saveSystem.data.settings.sfxEnabled) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(95, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.2);
    g.gain.setValueAtTime(0.75 * strength, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.26);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.28);

    const len = Math.floor(this.ctx.sampleRate * 0.18);
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 700;
    bp.Q.value = 1.4;
    const ng = this.ctx.createGain();
    ng.gain.value = 0.35 * strength;
    noise.connect(bp);
    bp.connect(ng);
    ng.connect(this.sfxGain);
    noise.start(now + 0.02);
  }

  playMetallicClick() {
    if (!this.ctx || !saveSystem.data.settings.sfxEnabled) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(900, now);
    osc.frequency.exponentialRampToValueAtTime(2200, now + 0.05);
    g.gain.setValueAtTime(0.3, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  // 2. Ceramic Clay Shatter (Punchy Crisp Crash)
  playClayShatter(isSpecial = false) {
    this.ensureContext();
    if (!this.ctx || !saveSystem.data.settings.sfxEnabled) return;
    const now = this.ctx.currentTime;

    // High frequency noise burst
    const bufSize = this.ctx.sampleRate * 0.2;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1800, now);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.7, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

    noise.connect(filter);
    filter.connect(g);
    g.connect(this.sfxGain);
    noise.start(now);

    // Ringing ping
    const ping = this.ctx.createOscillator();
    const pingG = this.ctx.createGain();
    ping.type = 'sine';
    ping.frequency.setValueAtTime(isSpecial ? 1600 : 980, now);
    ping.frequency.exponentialRampToValueAtTime(isSpecial ? 2400 : 700, now + 0.3);
    pingG.gain.setValueAtTime(0.5, now);
    pingG.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    ping.connect(pingG);
    pingG.connect(this.sfxGain);
    ping.start(now);
    ping.stop(now + 0.36);
  }

  // 3. High Noon Fever Whistle (Western Morricone Glide)
  playFeverWhistle() {
    this.ensureContext();
    if (!this.ctx || !saveSystem.data.settings.sfxEnabled) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.exponentialRampToValueAtTime(880.00, now + 0.3); // A5
    osc.frequency.linearRampToValueAtTime(587.33, now + 0.6);
    osc.frequency.exponentialRampToValueAtTime(1174.66, now + 1.0); // D6

    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.6, now + 0.1);
    g.gain.setValueAtTime(0.5, now + 0.8);
    g.gain.exponentialRampToValueAtTime(0.01, now + 1.2);

    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 1.25);
  }

  // 4. Wave Splash & Flinch Misfire
  playWaveSplash() {
    this.ensureContext();
    if (!this.ctx || !saveSystem.data.settings.sfxEnabled) return;
    const now = this.ctx.currentTime;

    const bufSize = this.ctx.sampleRate * 0.5;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.7;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.linearRampToValueAtTime(1400, now + 0.25);
    filter.frequency.linearRampToValueAtTime(300, now + 0.5);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.8, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

    noise.connect(filter);
    filter.connect(g);
    g.connect(this.sfxGain);
    noise.start(now);
  }

  // 5. Dynamite Massive Explosion
  playDynamiteBlast() {
    this.ensureContext();
    if (!this.ctx || !saveSystem.data.settings.sfxEnabled) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(20, now + 0.8);
    g.gain.setValueAtTime(1.0, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.9);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.95);

    this.playClayShatter(true);
  }

  // 6. UI Beep
  playUiClick() {
    this.ensureContext();
    if (!this.ctx || !saveSystem.data.settings.sfxEnabled) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    g.gain.setValueAtTime(0.15, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  // 7. Background Music: Western Banjo / Country Rhythm Loop
  startWesternBgm() {
    if (this.isBgmPlaying) return;
    this.ensureContext();
    if (!this.ctx) return;
    this.isBgmPlaying = true;

    const tempoMs = 150; // ~100 BPM 16th notes
    const bassline = [146.83, 146.83, 196.00, 220.00];

    this.bgmInterval = setInterval(() => {
      if (!this.isBgmPlaying || !saveSystem.data.settings.bgmEnabled) return;
      const now = this.ctx.currentTime;
      this.bgmStep = (this.bgmStep + 1) % 16;

      // Bass beat on 0, 4, 8, 12
      if (this.bgmStep % 4 === 0) {
        const bassOsc = this.ctx.createOscillator();
        const bassG = this.ctx.createGain();
        bassOsc.type = 'triangle';
        const root = bassline[Math.floor(this.bgmStep / 4) % bassline.length] / 2;
        bassOsc.frequency.setValueAtTime(root, now);
        bassG.gain.setValueAtTime(0.4, now);
        bassG.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
        bassOsc.connect(bassG);
        bassG.connect(this.bgmGain);
        bassOsc.start(now);
        bassOsc.stop(now + 0.2);
      }

      // Banjo pluck arpeggio
      if (this.bgmStep % 2 === 0 || this.bgmStep === 7 || this.bgmStep === 15) {
        const banjoOsc = this.ctx.createOscillator();
        const banjoG = this.ctx.createGain();
        banjoOsc.type = 'sawtooth';
        const note = this.bgmNotes[(this.bgmStep * 3) % this.bgmNotes.length];
        banjoOsc.frequency.setValueAtTime(note, now);
        banjoG.gain.setValueAtTime(0.18, now);
        banjoG.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        banjoOsc.connect(banjoG);
        banjoG.connect(this.bgmGain);
        banjoOsc.start(now);
        banjoOsc.stop(now + 0.13);
      }
    }, tempoMs);
  }

  stopWesternBgm() {
    this.isBgmPlaying = false;
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }
}

export const soundSynth = new SoundSynthesizer();
