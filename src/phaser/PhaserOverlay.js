// src/phaser/PhaserOverlay.js
// Phaser 3 transparent 2D layer: rigged character, crosshair, muzzle flash/tracer,
// Zero-Occlusion notices, NPC pop-ups, Stage 5 jeep, admin hit-zone debug drawing

import Phaser from 'phaser';
import { CharacterRig } from './CharacterRig.js';

const NOTICE_HOLD_MS = 1000;
const NOTICE_SHRINK_MS = 400;
const NOTICE_END_SCALE = 0.22;

// From public/assets/fixtures/pickup_open.json (scripts/build_pickup.py)
const PICKUP_SEAT_TOP = 0.3264;
// Feet must stay above the gap under the bumper (~0.8 of the image height)
const PICKUP_MIN_WIDTH_PER_HERO = 1.2;
const SEATED_HIP_RATIO = 0.4;

const NOTICE_COLORS = {
  info: '#FFE600',
  bonus: '#7CFF6B',
  penalty: '#FF5A4A'
};

class OverlayScene extends Phaser.Scene {
  constructor(host) {
    super({ key: 'overlay' });
    this.host = host;
  }

  preload() {
    this.load.image('pickup_back', '/assets/fixtures/pickup_open_back.png');
    this.load.image('pickup_front', '/assets/fixtures/pickup_open_front.png');
    this.load.image('npc_angry', '/assets/npc/fellow_angry.png');
    this.load.image('npc_cheer', '/assets/npc/fellow_cheer.png');
    this.load.image('npc_dog', '/assets/npc/ranch_dog.png');
  }

  create() {
    this.jeep = this.add.image(0, 0, 'pickup_back').setOrigin(0.5, 0).setDepth(15).setVisible(false);
    this.jeepFront = this.add.image(0, 0, 'pickup_front').setOrigin(0.5, 0).setDepth(25).setVisible(false);
    this.rig = new CharacterRig(this);
    this.fx = this.add.graphics().setDepth(30);
    this.cross = this.add.graphics().setDepth(40);
    this.debug = this.add.graphics().setDepth(60);
    this.host.onSceneReady(this);
  }

  update(time, delta) {
    this.host.tick(Math.min(0.1, delta / 1000));
  }
}

export class PhaserOverlay {
  constructor(containerEl) {
    this.container = containerEl;
    this.scene = null;
    this.view = null;
    this.paused = false;
    this.flashes = [];
    this.noticeCounter = 0;
    this.activeNotices = [];
    this.pendingNotices = [];
    this.pendingCharacter = null;

    this.ready = new Promise((resolve) => {
      this._resolveReady = resolve;
    });

    this.game = new Phaser.Game({
      type: Phaser.WEBGL,
      parent: containerEl,
      transparent: true,
      banner: false,
      scale: {
        mode: Phaser.Scale.RESIZE,
        width: containerEl.clientWidth || window.innerWidth,
        height: containerEl.clientHeight || window.innerHeight
      },
      input: { keyboard: false, mouse: false, touch: false, gamepad: false },
      audio: { noAudio: true },
      render: { antialias: true, pixelArt: false },
      scene: [new OverlayScene(this)]
    });
  }

  onSceneReady(scene) {
    this.scene = scene;
    this.game.canvas.id = 'phaser-overlay-canvas';
    this._resolveReady(scene);
    if (this.pendingCharacter) this.setCharacter(this.pendingCharacter);
    this.pendingNotices.splice(0).forEach(([text, type]) => this.spawnNotice(text, type));
  }

  get width() {
    return this.game.scale.width;
  }

  get height() {
    return this.game.scale.height;
  }

  get muzzle() {
    return this.scene ? this.scene.rig.muzzle : { valid: false };
  }

  getAimOrigin(angleDeg, feetX, feetY, heightPx) {
    return this.scene ? this.scene.rig.skyAimOrigin(angleDeg, feetX, feetY, heightPx) : null;
  }

  async setCharacter(charId) {
    if (!this.scene) {
      this.pendingCharacter = charId;
      return;
    }
    await this.scene.rig.load(charId);
  }

  setView(view) {
    this.view = view;
  }

  setPaused(paused) {
    this.paused = paused;
    if (!this.scene) return;
    if (paused) this.scene.tweens.pauseAll();
    else this.scene.tweens.resumeAll();
  }

  // ---------- Frame ----------

  tick(realDt) {
    const scene = this.scene;
    if (!scene) return;
    const dt = this.paused ? 0 : realDt;
    const v = this.view;

    if (!v || !v.active) {
      scene.rig.hide();
      scene.jeep.setVisible(false);
      scene.jeepFront.setVisible(false);
      scene.cross.clear();
      scene.fx.clear();
      scene.debug.clear();
      return;
    }

    if (v.jeep && v.character) {
      // Hero sits on the rear bench: the bench backrest top lines up just above the hero's hips,
      // and the front layer (backrest, tailgate, wheels) hides everything below it.
      const ch = v.character;
      const width = Math.max(v.jeep.width, ch.heightPx * PICKUP_MIN_WIDTH_PER_HERO);
      const height = width * (scene.jeep.height / scene.jeep.width);
      const bob = this.paused ? 0 : Math.sin(performance.now() * 0.02) * width * 0.004;
      const seatY = ch.feetY - ch.heightPx * SEATED_HIP_RATIO;
      const top = seatY - PICKUP_SEAT_TOP * height + bob;
      [scene.jeep, scene.jeepFront].forEach((img) => {
        img.setVisible(true).setPosition(v.jeep.x, top).setDisplaySize(width, height);
      });
    } else {
      scene.jeep.setVisible(false);
      scene.jeepFront.setVisible(false);
    }

    scene.rig.update(dt, v.character);
    this.drawFlashes(dt);
    this.drawCrosshair(v);
    this.drawDebug(v.debug);
  }

  drawCrosshair(v) {
    const g = this.scene.cross;
    g.clear();
    if (!v.crosshair) return;
    const { x, y } = v.crosshair;
    const r = Math.max(16, Math.min(this.width, this.height) * 0.032);
    const gold = v.fever ? 0xFFB300 : 0xFFE600;

    g.lineStyle(6, 0x2B1700, 0.55);
    g.strokeCircle(x, y, r);
    g.lineStyle(3, gold, 1);
    g.strokeCircle(x, y, r);

    g.lineStyle(3, 0xFFFFFF, 0.95);
    const a = r * 0.55;
    const b = r * 1.35;
    g.lineBetween(x - b, y, x - a, y);
    g.lineBetween(x + a, y, x + b, y);
    g.lineBetween(x, y - b, x, y - a);
    g.lineBetween(x, y + a, x, y + b);

    g.fillStyle(0xFF3300, 1);
    g.fillCircle(x, y, Math.max(3, r * 0.16));
  }

  // ---------- Muzzle flash & tracer from the character's own barrel tip ----------

  spawnMuzzleFlash(target) {
    const m = this.muzzle;
    if (!m.valid) return;
    this.flashes.push({
      x: m.x,
      y: m.y,
      dx: m.dx,
      dy: m.dy,
      tx: target ? target.x : m.x + m.dx * 2000,
      ty: target ? target.y : m.y + m.dy * 2000,
      life: 0.14,
      max: 0.14,
      size: Math.max(14, (this.view?.character?.heightPx || 200) * 0.11)
    });
  }

  drawFlashes(dt) {
    const g = this.scene.fx;
    g.clear();
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i];
      f.life -= dt;
      if (f.life <= 0) {
        this.flashes.splice(i, 1);
        continue;
      }
      const k = f.life / f.max;

      g.lineStyle(Math.max(1.5, f.size * 0.12 * k), 0xFFF2B0, 0.85 * k);
      g.lineBetween(f.x, f.y, f.tx, f.ty);

      const len = f.size * (0.9 + (1 - k) * 0.6);
      const nx = -f.dy;
      const ny = f.dx;
      const cx = f.x + f.dx * len * 0.35;
      const cy = f.y + f.dy * len * 0.35;
      g.fillStyle(0xFF9A1F, 0.95 * k);
      g.fillTriangle(
        f.x + nx * len * 0.32, f.y + ny * len * 0.32,
        f.x - nx * len * 0.32, f.y - ny * len * 0.32,
        f.x + f.dx * len * 1.4, f.y + f.dy * len * 1.4
      );
      g.fillStyle(0xFFF6C8, k);
      g.fillCircle(cx, cy, len * 0.32);
    }
  }

  // ---------- Admin hit-zone debug (drawn only while an admin has the game paused) ----------

  drawDebug(debug) {
    const g = this.scene.debug;
    g.clear();
    if (!debug) return;

    debug.targets.forEach((t) => {
      const R = t.R;
      g.lineStyle(2, 0xFFFFFF, 0.9);
      g.strokeCircle(t.x, t.y, t.radius);
      g.lineStyle(1, 0xFFFFFF, 0.5);
      g.strokeCircle(t.x, t.y, R);

      const sp = Math.hypot(t.vx, t.vy);
      if (sp < 1e-3) return;
      const ux = t.vx / sp;
      const uy = t.vy / sp;
      const nx = -uy;
      const ny = ux;
      const quad = (l0, l1, w, color, alpha) => {
        const p = [
          [t.x + ux * l0 + nx * w, t.y + uy * l0 + ny * w],
          [t.x + ux * l1 + nx * w, t.y + uy * l1 + ny * w],
          [t.x + ux * l1 - nx * w, t.y + uy * l1 - ny * w],
          [t.x + ux * l0 - nx * w, t.y + uy * l0 - ny * w]
        ];
        g.fillStyle(color, alpha);
        g.fillPoints(p.map(([x, y]) => new Phaser.Math.Vector2(x, y)), true);
      };
      quad(t.leadMin * R, t.leadMax * R, t.perpRatio * R, 0x00FF66, 0.28);
      quad(t.perfectMin * R, t.perfectMax * R, t.perpRatio * R, 0xFFE600, 0.32);

      g.lineStyle(2, 0x00E0FF, 1);
      g.lineBetween(t.x, t.y, t.x + ux * R * 1.6, t.y + uy * R * 1.6);
    });

    if (debug.muzzle && debug.muzzle.valid && debug.crosshair) {
      g.lineStyle(2, 0xFF2020, 0.9);
      g.lineBetween(debug.muzzle.x, debug.muzzle.y, debug.crosshair.x, debug.crosshair.y);
      g.fillStyle(0xFF2020, 1);
      g.fillCircle(debug.muzzle.x, debug.muzzle.y, 4);
    }
    if (debug.waveLine) {
      g.lineStyle(3, 0x00B0FF, 0.9);
      g.lineBetween(debug.waveLine[0].x, debug.waveLine[0].y, debug.waveLine[1].x, debug.waveLine[1].y);
    }
  }

  // ---------- Zero-Occlusion notices: hold 1.0s, shrink to 0.22 over 0.4s into alternating top corners ----------

  spawnNotice(text, type = 'info') {
    const scene = this.scene;
    if (!scene) {
      this.pendingNotices.push([text, type]);
      return;
    }
    this.noticeCounter++;
    const toLeft = this.noticeCounter % 2 === 1;
    const w = this.width;
    const h = this.height;
    const stackIndex = this.activeNotices.length;
    const fontSize = Math.round(Math.max(20, Math.min(40, Math.min(w, h) * 0.06)));

    const label = scene.add.text(w * 0.5, h * 0.28 + stackIndex * fontSize * 1.25, text, {
      fontFamily: '"Bungee", "Impact", "Arial Black", sans-serif',
      fontSize: `${fontSize}px`,
      color: NOTICE_COLORS[type] || NOTICE_COLORS.info,
      stroke: '#3B1700',
      strokeThickness: Math.round(fontSize * 0.22),
      align: 'center'
    })
      .setOrigin(0.5)
      .setDepth(80)
      .setShadow(0, 3, 'rgba(0,0,0,0.45)', 4, true, true);

    this.activeNotices.push(label);
    label.setScale(0.6);
    scene.tweens.add({ targets: label, scale: 1, duration: 120, ease: 'Back.Out' });
    scene.tweens.add({
      targets: label,
      delay: NOTICE_HOLD_MS,
      duration: NOTICE_SHRINK_MS,
      x: toLeft ? w * 0.1 : w * 0.9,
      y: h * 0.07,
      scale: NOTICE_END_SCALE,
      alpha: 0,
      ease: 'Cubic.In',
      onComplete: () => {
        this.activeNotices = this.activeNotices.filter((n) => n !== label);
        label.destroy();
      }
    });
  }

  // NPC reaction pop-up in a bottom corner (outside the golden 20%-75% band)
  popNpc(key, side = 'left') {
    const scene = this.scene;
    if (!scene || !scene.textures.exists(key)) return;
    const h = this.height;
    const w = this.width;
    const size = h * 0.24;
    const x = side === 'left' ? w * 0.06 + size * 0.35 : w * 0.94 - size * 0.35;
    const img = scene.add.image(x, h + size, key).setDepth(50).setOrigin(0.5, 1);
    img.setScale(size / img.height);
    if (side === 'right') img.setFlipX(true);
    scene.tweens.add({
      targets: img,
      y: h * 0.99,
      duration: 180,
      ease: 'Back.Out',
      yoyo: true,
      hold: 900,
      onComplete: () => img.destroy()
    });
  }

  clearTransient() {
    this.flashes = [];
    this.activeNotices.forEach((n) => n.destroy());
    this.activeNotices = [];
  }
}
