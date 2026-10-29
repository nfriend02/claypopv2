// src/ui/ResultUI.js
// Result screen (after the 3-second ending ceremony) with a 6-second vintage "Shorts" reel card

import { gameState } from '../core/GameState.js';
import { saveSystem } from '../core/SaveSystem.js';
import { soundSynth } from '../audio/SoundSynth.js';
import { i18n } from '../core/i18n.js';
import { icon } from './dom.js';

const discImage = new Image();
discImage.src = '/assets/targets/clay_disc.png';

const HEROES = ['young_cowboy', 'young_cowgirl', 'middle_cowboy'];
const WALK_OUT_MS = 2400;

export class ResultUI {
  constructor(onNextStage, onRetry, onLobby) {
    this.onNextStage = onNextStage;
    this.onRetry = onRetry;
    this.onLobby = onLobby;
    this.replayAnim = null;

    this.el = document.createElement('div');
    this.el.id = 'result-screen';
    this.el.className = 'ui-screen scenic-screen result-screen';
    this.el.style.display = 'none';
    document.body.appendChild(this.el);
  }

  // instant: the ending cutscene already played the ceremony, so open straight on the settled board
  showResult(isClear, { instant = false } = {}) {
    const t = (k) => i18n.t(k);
    const accuracy = gameState.totalShots > 0 ? Math.round((gameState.totalHits / gameState.totalShots) * 100) : 0;
    const earned = saveSystem.updateScore(gameState.score, gameState.totalHits, gameState.totalShots, gameState.maxCombo);
    if (isClear && gameState.currentStageNumber < 5) saveSystem.unlockStage(gameState.currentStageNumber + 1);
    const charId = gameState.selectedCharacter || 'young_cowboy';

    // The hero walks out to centre stage (sulking or cheering) while the other two heroes
    // console with a gentle clap or go wild, then the score card slides in.
    const friends = HEROES.filter((h) => h !== charId);
    const heroPose = isClear ? 'cheer' : 'sad';
    const friendPose = isClear ? 'hype' : 'console';
    const pose = (p, c) => `/assets/characters/result/${p}_${c}.png`;

    this.el.innerHTML = `
      <div class="result-stage ${isClear ? 'is-clear' : 'is-failed'}">
        ${friends.map((f, i) => `<div class="rs-friend friend-${i}"><img src="${pose(friendPose, f)}" alt="" draggable="false"></div>`).join('')}
        <div class="rs-hero"><img src="${pose(heroPose, charId)}" alt="" draggable="false"></div>
      </div>
      <div class="result-card wood-frame">
        <div class="result-head ${isClear ? 'clear' : 'failed'}">
          <img class="result-portrait" src="/assets/characters/${charId}.png" alt="" draggable="false">
          <div>
            <h2 data-i18n="${isClear ? 'ending_clear_title' : 'ending_failed_title'}">${isClear ? t('ending_clear_title') : t('ending_failed_title')}</h2>
            <p><span data-i18n="${isClear ? 'ending_cheer' : 'ending_sulk'}">${isClear ? t('ending_cheer') : t('ending_sulk')}</span> · STAGE ${gameState.currentStageNumber}</p>
          </div>
        </div>

        <div class="paper-sheet">
          <div class="score-spot">
            ${icon('trophy')}
            <div><small data-i18n="result_final_score">${t('result_final_score')}</small><b class="count-up" data-target="${gameState.score}">0</b></div>
          </div>
          <div class="stat-tiles">
            <div><small data-i18n="result_accuracy">${t('result_accuracy')}</small><b>${accuracy}%</b></div>
            <div><small data-i18n="result_hits">${t('result_hits')}</small><b>${gameState.totalHits} / ${gameState.totalShots}</b></div>
            <div><small data-i18n="result_max_combo">${t('result_max_combo')}</small><b>${gameState.maxCombo}</b></div>
            <div><small data-i18n="result_reward_mileage">${t('result_reward_mileage')}</small><b>+${earned} ${icon('star', 'inline')}</b></div>
          </div>
          <div class="shorts-card">
            <span class="shorts-badge">6s SHORTS</span>
            <canvas class="shorts-canvas" width="320" height="110"></canvas>
          </div>
        </div>

        <div class="btn-row">
          ${isClear && gameState.currentStageNumber < 5 ? `<button type="button" class="btn btn-orange" data-act="next">${icon('play')}<span data-i18n="result_next_stage">${t('result_next_stage')}</span></button>` : ''}
          <button type="button" class="btn btn-teal" data-act="retry">${icon('retry')}<span data-i18n="result_retry">${t('result_retry')}</span></button>
          <button type="button" class="btn btn-cream" data-act="lobby">${icon('home')}<span data-i18n="result_lobby">${t('result_lobby')}</span></button>
        </div>
      </div>
    `;

    const bind = (act, cb) => this.el.querySelector(`[data-act="${act}"]`)?.addEventListener('click', () => {
      soundSynth.playUiClick();
      this.hide();
      cb?.();
    });
    bind('next', this.onNextStage);
    bind('retry', this.onRetry);
    bind('lobby', this.onLobby);

    this.el.classList.remove('is-settled');
    this.el.classList.toggle('is-instant', instant);
    this.el.style.display = 'flex';
    if (isClear) soundSynth.playClayShatter(true);
    const settle = () => {
      if (this.el.classList.contains('is-settled')) return;
      clearTimeout(this.settleTimer);
      this.el.classList.add('is-settled');
      this.animateScore();
      this.startShortsReplay();
    };
    if (instant) {
      settle();
      return;
    }
    this.settleTimer = setTimeout(settle, WALK_OUT_MS);
    this.el.querySelector('.result-stage').addEventListener('pointerdown', settle);
  }

  animateScore() {
    const el = this.el.querySelector('.count-up');
    const target = parseInt(el.dataset.target, 10) || 0;
    const start = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - start) / 900);
      el.textContent = Math.round(target * (1 - Math.pow(1 - k, 3))).toLocaleString();
      if (k < 1 && this.el.style.display !== 'none') requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  startShortsReplay() {
    const canvas = this.el.querySelector('.shorts-canvas');
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const t0 = performance.now();
    const loop = (now) => {
      const t = ((now - t0) / 1000) % 6;
      ctx.fillStyle = '#D9B07A';
      ctx.fillRect(0, 0, W, H);
      const u = (t % 3) / 3;
      const x = u * (W + 40) - 20;
      const y = H * 0.82 - Math.sin(u * Math.PI) * H * 0.62;
      const hit = u > 0.48 && u < 0.62;
      if (!hit && discImage.complete) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(u * 12);
        ctx.filter = 'sepia(0.8)';
        ctx.drawImage(discImage, -16, -13, 32, 26);
        ctx.restore();
      }
      ctx.strokeStyle = '#2B1700';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x + 26, y, 11, 0, Math.PI * 2);
      ctx.stroke();
      if (hit) {
        ctx.fillStyle = '#FFF4DC';
        ctx.beginPath();
        for (let i = 0; i < 12; i++) {
          const r = i % 2 ? 9 : 22;
          const a = (i / 12) * Math.PI * 2;
          ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
        }
        ctx.fill();
        ctx.fillStyle = '#2B1700';
        ctx.font = '700 15px Bungee, Impact, sans-serif';
        ctx.fillText('PERFECT LEAD!', W * 0.32, H * 0.22);
      }
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(Math.random() * W, 0, 1.5, H);
      const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.6);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(40,20,0,0.45)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      this.replayAnim = requestAnimationFrame(loop);
    };
    this.replayAnim = requestAnimationFrame(loop);
  }

  hide() {
    clearTimeout(this.settleTimer);
    if (this.replayAnim) cancelAnimationFrame(this.replayAnim);
    this.replayAnim = null;
    this.el.style.display = 'none';
  }
}
