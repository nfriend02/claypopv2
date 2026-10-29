// src/ui/HudUI.js
// Compact top-band HUD (Zero-Occlusion: stays inside the top 0-15% of the screen)

import { gameState } from '../core/GameState.js';
import { i18n } from '../core/i18n.js';
import { icon } from './dom.js';

export class HudUI {
  constructor() {
    this.el = document.createElement('div');
    this.el.id = 'hud-container';
    this.el.className = 'hud-overlay';
    this.el.style.display = 'none';
    this.el.innerHTML = `
      <div class="hud-bar">
        <div class="hud-plaque hud-score">
          ${icon('trophy')}
          <div class="hud-col">
            <small data-i18n="hud_score">${i18n.t('hud_score')}</small>
            <b data-ref="score">0</b>
          </div>
          <span class="combo-badge" data-ref="combo" hidden>x<span data-ref="comboVal">0</span></span>
        </div>

        <div class="hud-plaque hud-timer">
          ${icon('star', 'timer-star')}
          <div class="hud-col">
            <b data-ref="time">75</b>
            <div class="timer-track"><div class="timer-fill" data-ref="timeFill"></div></div>
          </div>
          <span class="stage-tag" data-ref="stage">STAGE 1</span>
        </div>

        <div class="hud-plaque hud-fever" data-ref="feverBox">
          <small>HIGH NOON</small>
          <div class="fever-pips">${'<i></i>'.repeat(5)}</div>
          <div class="fever-track"><div class="fever-fill" data-ref="feverFill"></div></div>
        </div>
      </div>
      <div class="fever-vignette" data-ref="vignette" hidden></div>
    `;
    document.body.appendChild(this.el);

    this.refs = {};
    this.el.querySelectorAll('[data-ref]').forEach((n) => {
      this.refs[n.dataset.ref] = n;
    });
    this.pips = [...this.el.querySelectorAll('.fever-pips i')];
    this.last = {};
  }

  set(key, value, apply) {
    if (this.last[key] === value) return;
    this.last[key] = value;
    apply(value);
  }

  update() {
    if (this.el.style.display === 'none') return;
    const r = this.refs;
    this.set('score', gameState.score, (v) => { r.score.textContent = v.toLocaleString(); });

    const t = Math.max(0, gameState.timeRemaining);
    this.set('time', Math.ceil(t), (v) => { r.time.textContent = v; });
    const pct = Math.round((t / gameState.totalTime) * 1000) / 10;
    this.set('timePct', pct, (v) => {
      r.timeFill.style.width = `${Math.min(100, v)}%`;
      r.timeFill.classList.toggle('urgent', v < 20);
    });

    this.set('combo', gameState.combo, (v) => {
      r.combo.hidden = v < 2;
      r.comboVal.textContent = v;
    });

    const fever = gameState.isFeverActive;
    this.set('fever', fever, (v) => {
      r.feverBox.classList.toggle('active', v);
      r.vignette.hidden = !v;
    });
    if (fever) {
      this.set('feverPct', Math.round((gameState.feverTimer / 6) * 100), (v) => { r.feverFill.style.width = `${v}%`; });
    } else {
      this.set('feverPct', 0, () => { r.feverFill.style.width = '0%'; });
    }
    this.set('chain', fever ? 5 : Math.min(5, gameState.chainHits), (v) => {
      this.pips.forEach((p, i) => p.classList.toggle('on', i < v));
    });
  }

  setStage(stageNum) {
    this.refs.stage.textContent = `STAGE ${stageNum}`;
    this.last = {};
  }

  show() {
    this.last = {};
    this.el.style.display = 'block';
  }

  hide() {
    this.el.style.display = 'none';
  }
}
