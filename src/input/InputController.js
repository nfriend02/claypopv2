// src/input/InputController.js
// Left fan pad = gun dial, right arrow pad = character movement.
//
// The fan is a polar dial: a cursor confined to the fan picks the gun angle (its direction from the
// fan pivot, snapped to 5-degree steps) and how far up the barrel line the crosshair sits (its
// distance from the pivot).
//  - Desktop: the mouse is pointer-locked during play and only moves a virtual cursor inside the
//    fan; click fires. The arrow pad reacts to the keyboard arrow keys only.
//  - Mobile: two-finger play. One finger is held inside the fan (release fires) while the other
//    works the arrow pad, which only responds within its own buttons.
// Pad sizes come from CSS per body[data-ux] (desktop 300%, mobile 180%).

import { uxMode } from '../core/UXMode.js';
import { AIM_ANGLE_MAX, AIM_ANGLE_STEP, AIM_REACH } from '../entities/PlayerCharacter.js';

const FAN_PIVOT_Y = 0.83; // pivot height inside the pad box (fraction from top), matches .arc-needle
const FAN_RADIUS = 0.95; // usable radius as a fraction of the largest semicircle that fits the pad
const FAN_DEAD_ZONE = 0.18; // inner part of the fan that maps to the shortest reach
const FAN_SWEEP_DEG = 90; // fan half-angle; mapped onto +-AIM_ANGLE_MAX

const ARROW_KEYS = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down'
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export class InputController {
  constructor(player, { onShoot, onTogglePause }) {
    this.player = player;
    this.onShoot = onShoot;
    this.onTogglePause = onTogglePause;
    this.enabled = false;

    this.heldArrows = new Set();
    this.arrowDir = { x: 0, y: 0 };
    this.keyDir = { x: 0, y: 0 };

    this.aimPointerId = null;
    this.arrowPointerId = null;

    // Fan cursor in fan-local units: x, y in [-1, 1] relative to the pivot (y up), radius <= 1
    this.cursor = { x: 0, y: 0.5 };
    this.appliedAim = null;
    this.locked = false;
    this.lockClickPending = false;

    this.buildUI();
    this.bindEvents();
  }

  buildUI() {
    this.root = document.createElement('div');
    this.root.id = 'claypop-controls';
    this.root.className = 'controls-layer';
    this.root.style.display = 'none';

    this.arcPad = document.createElement('div');
    this.arcPad.id = 'arc-touchpad';
    this.arcPad.className = 'arc-pad';
    this.arcPad.innerHTML = `
      <div class="arc-face"></div>
      <div class="arc-needle"></div>
      <div class="arc-cursor"></div>
      <div class="arc-angle">0°</div>
      <div class="arc-label">AIM · RELEASE</div>
    `;
    this.needle = this.arcPad.querySelector('.arc-needle');
    this.cursorEl = this.arcPad.querySelector('.arc-cursor');
    this.angleLabel = this.arcPad.querySelector('.arc-angle');
    this.padLabel = this.arcPad.querySelector('.arc-label');

    this.arrowPad = document.createElement('div');
    this.arrowPad.id = 'arrow-slidepad';
    this.arrowPad.className = 'arrow-pad';
    this.arrowPad.innerHTML = `
      <div class="arrow-row"><button type="button" class="arrow-btn btn-up" data-dir="up" aria-label="Up" tabindex="-1">▲</button></div>
      <div class="arrow-row">
        <button type="button" class="arrow-btn btn-left wide" data-dir="left" aria-label="Left" tabindex="-1">◀</button>
        <button type="button" class="arrow-btn btn-right wide" data-dir="right" aria-label="Right" tabindex="-1">▶</button>
      </div>
      <div class="arrow-row"><button type="button" class="arrow-btn btn-down" data-dir="down" aria-label="Down" tabindex="-1">▼</button></div>
    `;

    this.lockHint = document.createElement('div');
    this.lockHint.className = 'aim-lock-hint';
    this.lockHint.textContent = 'CLICK TO AIM · ESC TO RELEASE';

    this.root.append(this.arcPad, this.arrowPad, this.lockHint);
    document.body.appendChild(this.root);
  }

  bindEvents() {
    window.addEventListener('keydown', (e) => {
      // Typing in a form field (login, My Page) must never trigger game keys
      if (e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable="true"]')) return;
      // P (or F8): admin pause. The mouse is captured in the fan during play, so the
      // on-screen PAUSE button cannot be clicked on desktop.
      if (e.key === 'F8' || e.code === 'KeyP') {
        e.preventDefault();
        if (!e.repeat) this.onTogglePause?.();
        return;
      }
      if (!this.enabled) return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (!e.repeat) this.onShoot?.();
        return;
      }
      if (e.code === 'KeyQ' || e.code === 'KeyE') {
        this.player.stepAimAngle(e.code === 'KeyQ' ? -1 : 1);
        return;
      }
      if (e.code === 'KeyR' || e.code === 'KeyF') {
        this.player.adjustReach(e.code === 'KeyR' ? 0.04 : -0.04);
        return;
      }
      if (ARROW_KEYS[e.key]) {
        e.preventDefault();
        this.heldArrows.add(ARROW_KEYS[e.key]);
        this.refreshKeyDir();
      }
    });
    window.addEventListener('keyup', (e) => {
      if (!ARROW_KEYS[e.key]) return;
      this.heldArrows.delete(ARROW_KEYS[e.key]);
      this.refreshKeyDir();
    });
    window.addEventListener('blur', () => {
      this.heldArrows.clear();
      this.refreshKeyDir();
      this.arrowDir = { x: 0, y: 0 };
    });

    this.bindFanPad();
    this.bindArrowPad();
    this.bindPointerLock();
    this.root.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // ---------- Fan pad (touch, or an unlocked mouse) ----------

  bindFanPad() {
    this.arcPad.addEventListener('pointerdown', (e) => {
      if (!this.enabled || this.locked || this.aimPointerId !== null) return;
      e.preventDefault();
      if (uxMode.isDesktop && e.pointerType === 'mouse') this.requestLock();
      this.aimPointerId = e.pointerId;
      this.arcPad.setPointerCapture(e.pointerId);
      this.arcPad.classList.add('is-active');
      this.moveCursorToClient(e.clientX, e.clientY);
    });
    this.arcPad.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.aimPointerId || this.locked) return;
      e.preventDefault();
      this.moveCursorToClient(e.clientX, e.clientY);
    });
    const endAim = (e, fire) => {
      if (e.pointerId !== this.aimPointerId) return;
      if (this.locked) fire = false;
      this.aimPointerId = null;
      this.arcPad.classList.remove('is-active');
      if (fire && this.enabled) this.onShoot?.();
    };
    this.arcPad.addEventListener('pointerup', (e) => endAim(e, true));
    this.arcPad.addEventListener('pointercancel', (e) => endAim(e, false));
  }

  // Pad geometry in client pixels: pivot point and fan radius
  fanGeometry() {
    const r = this.arcPad.getBoundingClientRect();
    const pivotY = r.top + r.height * FAN_PIVOT_Y;
    const radius = Math.min(r.width / 2, r.height * FAN_PIVOT_Y) * FAN_RADIUS;
    return { rect: r, pivotX: r.left + r.width / 2, pivotY, radius };
  }

  moveCursorToClient(clientX, clientY) {
    const g = this.fanGeometry();
    this.setCursor((clientX - g.pivotX) / g.radius, (g.pivotY - clientY) / g.radius);
  }

  // Keep the cursor inside the fan (upper half-disc of radius 1) and apply it to the aim
  setCursor(x, y) {
    let cy = Math.max(0, y);
    let cx = x;
    const len = Math.hypot(cx, cy);
    if (len > 1) {
      cx /= len;
      cy /= len;
    }
    this.cursor = { x: cx, y: cy };
    this.applyCursor();
  }

  applyCursor() {
    const { x, y } = this.cursor;
    const len = Math.hypot(x, y);
    if (len > 0.04) {
      const fanDeg = (Math.atan2(x, y) * 180) / Math.PI;
      const gunDeg = (fanDeg / FAN_SWEEP_DEG) * AIM_ANGLE_MAX;
      this.player.aimAngle = clamp(Math.round(gunDeg / AIM_ANGLE_STEP) * AIM_ANGLE_STEP, -AIM_ANGLE_MAX, AIM_ANGLE_MAX);
    }
    const f = clamp((len - FAN_DEAD_ZONE) / (1 - FAN_DEAD_ZONE), 0, 1);
    this.player.aimReach = AIM_REACH.min + (AIM_REACH.max - AIM_REACH.min) * f;
    this.appliedAim = { angle: this.player.aimAngle, reach: this.player.aimReach };
    this.refreshDial();
  }

  // Put the cursor where the current aim would be on the dial (after keys, resets, etc.)
  syncCursorFromAim() {
    const p = this.player;
    const fanRad = ((p.aimAngle / AIM_ANGLE_MAX) * FAN_SWEEP_DEG * Math.PI) / 180;
    const f = clamp((p.aimReach - AIM_REACH.min) / (AIM_REACH.max - AIM_REACH.min), 0, 1);
    const len = FAN_DEAD_ZONE + (1 - FAN_DEAD_ZONE) * f;
    this.cursor = { x: Math.sin(fanRad) * len, y: Math.cos(fanRad) * len };
    this.appliedAim = { angle: p.aimAngle, reach: p.aimReach };
  }

  // ---------- Desktop pointer lock: the mouse only steers the fan cursor ----------

  bindPointerLock() {
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.root;
      this.root.classList.toggle('is-locked', this.locked);
      if (this.locked && this.aimPointerId !== null) {
        // The pad press that grabbed the mouse becomes a plain capture click
        this.aimPointerId = null;
        this.arcPad.classList.remove('is-active');
      }
      this.refreshLabels();
    });
    document.addEventListener('pointerlockerror', () => {
      this.locked = false;
      this.lockClickPending = false;
      this.refreshLabels();
    });

    // A click anywhere on the play field (not on UI buttons) captures the mouse
    document.addEventListener('mousedown', (e) => {
      if (!this.enabled || this.locked || !uxMode.isDesktop || e.button !== 0) return;
      if (e.target.closest('button, a, input, .admin-dock, .ui-screen, .arc-pad')) return;
      this.requestLock();
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.locked || !this.enabled) return;
      const g = this.fanGeometry();
      this.setCursor(this.cursor.x + e.movementX / g.radius, this.cursor.y - e.movementY / g.radius);
    });
    document.addEventListener('mousedown', (e) => {
      if (!this.locked || !this.enabled || e.button !== 0) return;
      if (this.lockClickPending) return;
      this.arcPad.classList.add('is-active');
    });
    document.addEventListener('mouseup', (e) => {
      if (!this.locked || !this.enabled || e.button !== 0) return;
      this.arcPad.classList.remove('is-active');
      if (this.lockClickPending) {
        this.lockClickPending = false;
        return;
      }
      this.onShoot?.();
    });
  }

  // fromClick: the click that grabs the mouse must not also fire the gun
  requestLock(fromClick = true) {
    if (!this.root.requestPointerLock || document.body.classList.contains('game-paused')) return false;
    this.lockClickPending = fromClick;
    try {
      const res = this.root.requestPointerLock();
      if (res && typeof res.catch === 'function') {
        res.catch(() => {
          this.lockClickPending = false;
        });
      }
    } catch {
      this.lockClickPending = false;
      return false;
    }
    return true;
  }

  // Re-capture the mouse after an admin resume (the P keypress counts as a user gesture)
  resumeLock() {
    if (this.enabled && uxMode.isDesktop && !this.locked) this.requestLock(false);
  }

  releaseLock() {
    if (document.pointerLockElement === this.root) document.exitPointerLock();
    this.lockClickPending = false;
  }

  // ---------- Arrow pad ----------

  bindArrowPad() {
    const dirFromPoint = (x, y) => {
      const el = document.elementFromPoint(x, y);
      const btn = el ? el.closest('.arrow-btn') : null;
      return btn && this.arrowPad.contains(btn) ? btn.dataset.dir : null;
    };
    const applyDir = (dir) => {
      this.arrowDir = {
        x: dir === 'left' ? -1 : dir === 'right' ? 1 : 0,
        y: dir === 'up' ? 1 : dir === 'down' ? -1 : 0
      };
      this.refreshArrowHighlight();
    };
    // Touch only: a finger can slide between the four buttons; outside them it does nothing
    this.arrowPad.addEventListener('pointerdown', (e) => {
      if (!this.enabled || e.pointerType === 'mouse' || this.arrowPointerId !== null) return;
      e.preventDefault();
      this.arrowPointerId = e.pointerId;
      this.arrowPad.setPointerCapture(e.pointerId);
      applyDir(dirFromPoint(e.clientX, e.clientY));
    });
    this.arrowPad.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.arrowPointerId) return;
      e.preventDefault();
      applyDir(dirFromPoint(e.clientX, e.clientY));
    });
    const endArrow = (e) => {
      if (e.pointerId !== this.arrowPointerId) return;
      this.arrowPointerId = null;
      applyDir(null);
    };
    this.arrowPad.addEventListener('pointerup', endArrow);
    this.arrowPad.addEventListener('pointercancel', endArrow);
  }

  refreshKeyDir() {
    const k = this.heldArrows;
    this.keyDir = {
      x: (k.has('right') ? 1 : 0) - (k.has('left') ? 1 : 0),
      y: (k.has('up') ? 1 : 0) - (k.has('down') ? 1 : 0)
    };
    this.refreshArrowHighlight();
  }

  // Light up the on-screen arrows for both touch and keyboard input
  refreshArrowHighlight() {
    const on = new Set(this.heldArrows);
    if (this.arrowDir.x < 0) on.add('left');
    if (this.arrowDir.x > 0) on.add('right');
    if (this.arrowDir.y > 0) on.add('up');
    if (this.arrowDir.y < 0) on.add('down');
    this.arrowPad.querySelectorAll('.arrow-btn').forEach((b) => b.classList.toggle('is-active', on.has(b.dataset.dir)));
  }

  // ---------- Dial display ----------

  // Called every frame by the game: follows aim changes from keys / resets and redraws the dial
  refreshDial() {
    const p = this.player;
    if (!this.appliedAim || this.appliedAim.angle !== p.aimAngle || Math.abs(this.appliedAim.reach - p.aimReach) > 1e-6) {
      this.syncCursorFromAim();
    }
    const a = p.aimAngle;
    if (a !== this.dialAngle) {
      this.dialAngle = a;
      this.needle.style.transform = `translateX(-50%) rotate(${a}deg)`;
      this.angleLabel.textContent = `${a > 0 ? '+' : ''}${a}°`;
    }
    const cx = 50 + this.cursor.x * 50 * FAN_RADIUS * this.fanAspect();
    const cy = FAN_PIVOT_Y * 100 * (1 - this.cursor.y * FAN_RADIUS * this.fanRadiusOverPivot());
    const key = `${cx.toFixed(2)},${cy.toFixed(2)}`;
    if (key !== this.cursorKey) {
      this.cursorKey = key;
      this.cursorEl.style.left = `${cx}%`;
      this.cursorEl.style.top = `${cy}%`;
    }
  }

  // Fan radius in pad-width halves and in pivot heights, so the cursor dot can be placed in %
  fanAspect() {
    const r = this.arcPad.getBoundingClientRect();
    if (!r.width) return 1;
    return Math.min(r.width / 2, r.height * FAN_PIVOT_Y) / (r.width / 2);
  }

  fanRadiusOverPivot() {
    const r = this.arcPad.getBoundingClientRect();
    if (!r.height) return 1;
    return Math.min(r.width / 2, r.height * FAN_PIVOT_Y) / (r.height * FAN_PIVOT_Y);
  }

  refreshLabels() {
    this.padLabel.textContent = uxMode.isDesktop && this.locked ? 'AIM · CLICK' : 'AIM · RELEASE';
    this.lockHint.classList.toggle('is-visible', this.enabled && uxMode.isDesktop && !this.locked);
  }

  // ---------- Frame / visibility ----------

  getMove() {
    if (!this.enabled) return { x: 0, y: 0 };
    const x = clamp(this.arrowDir.x + this.keyDir.x, -1, 1);
    const y = clamp(this.arrowDir.y + this.keyDir.y, -1, 1);
    return { x, y };
  }

  setVisible(visible) {
    this.enabled = visible;
    this.root.style.display = visible ? 'block' : 'none';
    this.appliedAim = null;
    this.refreshDial();
    if (!visible) {
      this.releaseLock();
      this.aimPointerId = null;
      this.arrowPointerId = null;
      this.arrowDir = { x: 0, y: 0 };
      this.heldArrows.clear();
      this.refreshKeyDir();
    } else if (uxMode.isDesktop) {
      this.requestLock(false);
    }
    this.refreshLabels();
  }
}
