// src/ui/AdminPauseButton.js
// Admin-only PAUSE / GO toggle (right of the global sound button) + compact debug dock.
// The elements are created and attached only while a verified admin is in gameplay; otherwise
// they are removed from the DOM entirely, so non-admin users never receive them.

import { i18n } from '../core/i18n.js';

export class AdminPauseButton {
  constructor({ onToggle, onToggleHitbox, onToggleInvincible, onSpawn, onFever }) {
    this.handlers = { onToggle, onToggleHitbox, onToggleInvincible, onSpawn, onFever };
    this.btn = null;
    this.dock = null;
    this.paused = false;
    this.flags = { hitbox: true, invincible: false };
    window.addEventListener('claypop_language_changed', () => this.render());
  }

  mount() {
    if (this.btn) return;
    this.btn = document.createElement('button');
    this.btn.type = 'button';
    this.btn.id = 'admin-pause-btn';
    this.btn.className = 'corner-btn admin-pause-btn';
    // Touch: toggle on pointerdown so it works while other fingers hold the fan / arrow pads
    // (a tap during multi-touch may never produce a click). Mouse/keyboard use click.
    this.btn.style.touchAction = 'manipulation';
    this.btn.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      e.preventDefault();
      e.stopPropagation();
      this.touchToggledAt = performance.now();
      this.handlers.onToggle?.();
    });
    this.btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (performance.now() - (this.touchToggledAt || -1e9) < 700) return;
      this.handlers.onToggle?.();
    });
    document.body.appendChild(this.btn);
    this.render();
  }

  unmount() {
    this.btn?.remove();
    this.dock?.remove();
    this.btn = null;
    this.dock = null;
    this.paused = false;
  }

  setAvailable(available) {
    if (available) this.mount();
    else this.unmount();
  }

  setPaused(paused) {
    this.paused = paused;
    this.render();
  }

  render() {
    if (!this.btn) return;
    const icon = this.paused ? 'play' : 'pause';
    const label = this.paused ? 'GO' : 'PAUSE';
    this.btn.classList.toggle('is-paused', this.paused);
    this.btn.title = this.paused ? i18n.t('admin_resume') : i18n.t('admin_pause');
    this.btn.innerHTML = `<img src="/assets/ui/icons/${icon}.png" alt="" draggable="false"><span>${label}</span>`;

    if (this.paused) this.showDock();
    else this.hideDock();
  }

  showDock() {
    if (!this.dock) {
      this.dock = document.createElement('div');
      this.dock.id = 'admin-dock';
      this.dock.className = 'admin-dock';
      document.body.appendChild(this.dock);
    }
    this.dock.innerHTML = `
      <div class="admin-dock-title">ADMIN · ${i18n.t('admin_paused')}</div>
      <label class="admin-dock-row"><input type="checkbox" data-flag="hitbox" ${this.flags.hitbox ? 'checked' : ''}> ${i18n.t('admin_hitbox')}</label>
      <label class="admin-dock-row"><input type="checkbox" data-flag="invincible" ${this.flags.invincible ? 'checked' : ''}> ${i18n.t('admin_invincible')}</label>
      <div class="admin-dock-actions">
        <button type="button" data-act="spawn">${i18n.t('admin_spawn_clay')}</button>
        <button type="button" data-act="fever">${i18n.t('admin_trigger_fever')}</button>
      </div>
    `;
    this.dock.querySelector('[data-flag="hitbox"]').addEventListener('change', (e) => {
      this.flags.hitbox = e.target.checked;
      this.handlers.onToggleHitbox?.(this.flags.hitbox);
    });
    this.dock.querySelector('[data-flag="invincible"]').addEventListener('change', (e) => {
      this.flags.invincible = e.target.checked;
      this.handlers.onToggleInvincible?.(this.flags.invincible);
    });
    this.dock.querySelector('[data-act="spawn"]').addEventListener('click', () => this.handlers.onSpawn?.());
    this.dock.querySelector('[data-act="fever"]').addEventListener('click', () => this.handlers.onFever?.());
  }

  hideDock() {
    this.dock?.remove();
    this.dock = null;
  }
}
