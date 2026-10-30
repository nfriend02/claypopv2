// src/ui/GameSetupUI.js
// Setup screen: character, clay flight mode, stage

import { saveSystem } from '../core/SaveSystem.js';
import { soundSynth } from '../audio/SoundSynth.js';
import { i18n } from '../core/i18n.js';
import { escapeHtml } from './dom.js';
import { handButtonHtml } from './HandButton.js';

const CHARACTERS = [
  { id: 'young_cowboy', color: '#D24625', speed: 3, lead: 3 },
  { id: 'young_cowgirl', color: '#E8A838', speed: 5, lead: 3 },
  { id: 'middle_cowboy', color: '#5A3A22', speed: 2, lead: 5 }
];

const MODES = [
  { id: 'clay_disc', key: 'target_disc', art: ['clay_disc'] },
  { id: 'clay_boomerang', key: 'target_boomerang', art: ['clay_boomerang'] },
  { id: 'clay_ufo', key: 'target_ufo', art: ['clay_ufo'] },
  { id: 'random', key: 'target_random', art: ['clay_disc', 'clay_boomerang', 'clay_ufo'] }
];

const stars = (n) => '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n);

export class GameSetupUI {
  constructor(onStart, onBack) {
    this.onStart = onStart;
    this.onBack = onBack;
    this.selectedChar = saveSystem.data.selectedCharacter || 'young_cowboy';
    this.selectedMode = saveSystem.data.selectedTargetMode || 'clay_disc';
    this.selectedStage = 1;
    this.toast = '';

    this.el = document.createElement('div');
    this.el.id = 'setup-screen';
    this.el.className = 'ui-screen scenic-screen setup-screen';
    this.el.style.display = 'none';
    document.body.appendChild(this.el);
    window.addEventListener('claypop_language_changed', () => {
      if (this.el.style.display !== 'none') this.render();
    });
  }

  render() {
    const t = (k) => i18n.t(k);
    const unlocked = saveSystem.data.unlockedStages || [1];
    if (!unlocked.includes(this.selectedStage)) this.selectedStage = 1;

    this.el.innerHTML = `
      ${this.toast ? `<div class="toast">${escapeHtml(this.toast)}</div>` : ''}
      <div class="setup-card wood-frame">
        <header class="setup-head">
          <button type="button" class="btn btn-cream btn-small" data-act="back">◀ ${t('back')}</button>
          <h2>${t('setup_title')}</h2>
          ${handButtonHtml()}
        </header>

        <div class="setup-scroll">
          <section>
            <h3 class="section-tag">${t('select_character')}</h3>
            <div class="char-grid">
              ${CHARACTERS.map((c) => `
                <button type="button" class="char-card ${this.selectedChar === c.id ? 'on' : ''}" data-char="${c.id}" style="--accent:${c.color}">
                  <span class="char-portrait"><img src="/assets/characters/${c.id}.png" alt="" draggable="false"></span>
                  <b>${t(`char_${c.id}_name`)}</b>
                  <small>${t(`char_${c.id}_desc`)}</small>
                  <span class="char-stats"><i>${t('stat_speed')}</i> ${stars(c.speed)} <i>${t('stat_lead')}</i> ${stars(c.lead)}</span>
                </button>
              `).join('')}
            </div>
          </section>

          <section>
            <h3 class="section-tag">${t('select_clay_mode')}</h3>
            <div class="mode-grid">
              ${MODES.map((m) => `
                <button type="button" class="mode-card ${this.selectedMode === m.id ? 'on' : ''}" data-mode="${m.id}">
                  <span class="mode-art n${m.art.length}">${m.art.map((a) => `<img src="/assets/targets/${a}.png" alt="" draggable="false">`).join('')}</span>
                  <b>${t(`${m.key}_name`)}</b>
                </button>
              `).join('')}
            </div>
          </section>

          <section>
            <h3 class="section-tag">${t('select_stage')}</h3>
            <div class="stage-grid">
              ${[1, 2, 3, 4, 5].map((s) => {
                const locked = !unlocked.includes(s);
                return `
                  <button type="button" class="stage-card ${this.selectedStage === s ? 'on' : ''} ${locked ? 'locked' : ''}" data-stage="${s}" ${locked ? 'disabled' : ''}>
                    <img src="/assets/stages/stage0${s}_sky.png" alt="" draggable="false">
                    <span class="stage-no">${locked ? '🔒' : s}</span>
                  </button>`;
              }).join('')}
            </div>
            <p class="stage-desc"><b>${t(`stage_${this.selectedStage}_name`)}</b> · ${t(`stage_${this.selectedStage}_desc`)}</p>
          </section>
        </div>

        <footer class="setup-foot">
          <button type="button" class="btn btn-orange btn-wide" data-act="start">${t('start_game')}</button>
        </footer>
      </div>
    `;

    const q = (s) => this.el.querySelector(s);
    q('[data-act="back"]').addEventListener('click', () => {
      soundSynth.playUiClick();
      this.onBack?.();
    });
    this.el.querySelectorAll('[data-char]').forEach((b) => b.addEventListener('click', () => {
      soundSynth.playUiClick();
      this.selectedChar = b.dataset.char;
      this.toast = '';
      this.render();
    }));
    this.el.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => {
      soundSynth.playUiClick();
      this.selectedMode = b.dataset.mode;
      this.toast = '';
      this.render();
    }));
    this.el.querySelectorAll('[data-stage]').forEach((b) => b.addEventListener('click', () => {
      soundSynth.playUiClick();
      this.selectedStage = parseInt(b.dataset.stage, 10);
      this.toast = '';
      this.render();
    }));
    q('[data-act="start"]').addEventListener('click', () => {
      soundSynth.playUiClick();
      saveSystem.data.selectedCharacter = this.selectedChar;
      saveSystem.data.selectedTargetMode = this.selectedMode;
      saveSystem.save();
      this.onStart?.(this.selectedChar, this.selectedMode, this.selectedStage);
    });
  }

  show(toast = '') {
    this.toast = toast;
    this.render();
    this.el.style.display = 'flex';
  }

  hide() {
    this.el.style.display = 'none';
  }
}
