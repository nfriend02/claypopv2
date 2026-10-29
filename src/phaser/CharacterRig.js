// src/phaser/CharacterRig.js
// Sprite-sheet character with a 2-part aim rig: the upper body (arms + shotgun) rotates about the
// waist pivot so the barrel line baked into each frame passes exactly through the crosshair.

import Phaser from 'phaser';
import { CHARACTER_STATES } from '../entities/PlayerCharacter.js';

const CELL = 256;
const SHOOT_WINDOW = { start: 24, end: 66, fps: 44 };
const FLINCH_FPS = 48;
const CHEER_FPS = 32;
const LEAN_SHARE = 0.18;
const MAX_LEAN = 0.2;
const RAISE_MIN = -0.35;
const RAISE_MAX = 1.75;
const FACING_HYSTERESIS = 0.08;
const SEAM_OVERLAP = 7;
const SKY_ELEVATION = 0.44;

const STATE_TO_MOTION = {
  [CHARACTER_STATES.IDLE_AIM]: 'idle_aim',
  [CHARACTER_STATES.MOVE_LR]: 'walk_left_right',
  [CHARACTER_STATES.MOVE_UD]: 'walk_up_down',
  [CHARACTER_STATES.SHOOT_RECOIL]: 'shoot_recoil',
  [CHARACTER_STATES.WAVE_FLINCH]: 'wave_flinch',
  [CHARACTER_STATES.CHEER_VICTORY]: 'cheer_victory'
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

function prepareMeta(meta, rigEnabled) {
  const rigs = [];
  let last = null;
  meta.frames.forEach((f) => {
    const r = f.rig;
    let ok = false;
    if (r && r.tip && r.pivot && r.dir) {
      const dist = Math.hypot(r.tip[0] - r.pivot[0], r.tip[1] - r.pivot[1]);
      ok = r.tip[1] < r.cutY + 12 && r.tip[0] < r.pivot[0] + 20 && dist > 30 && dist < 230;
    }
    if (ok) last = r;
    rigs.push(ok ? r : last);
  });
  const firstValid = rigs.find(Boolean) || null;
  for (let i = 0; i < rigs.length && !rigs[i]; i++) rigs[i] = firstValid;
  const elevations = rigs.map((r) => (r ? Math.atan2(-r.dir[1], -r.dir[0]) : 0));
  return { ...meta, rigs, elevations, rigEnabled: rigEnabled && !!firstValid };
}

export class CharacterRig {
  constructor(scene) {
    this.scene = scene;
    this.shadow = scene.add.ellipse(0, 0, 10, 4, 0x000000, 0.28).setDepth(18).setVisible(false);
    this.container = scene.add.container(0, 0).setDepth(20).setVisible(false);
    this.lower = scene.add.image(0, 0, '__DEFAULT');
    this.upper = scene.add.image(0, 0, '__DEFAULT');
    this.container.add([this.lower, this.upper]);

    this.charId = null;
    this.manifest = null;
    this.meta = {};
    this.ready = false;

    this.facing = 1; // +1 = native (facing left), -1 = mirrored (facing right)
    this.alpha = 0;
    this.lastState = null;
    this.motionTime = 0;
    this.poseIndex = 0;
    this.useSkyShot = false;

    this.muzzle = { x: 0, y: 0, dx: -1, dy: 0, valid: false };
    this.sky = null;
    this.walkPhase = 0;
  }

  // Back-view sky-aim pose for a gun angle (deg from vertical, + = right), snapped to the library step
  skyFrame(angleDeg) {
    const sky = this.sky;
    const i = Math.round((angleDeg + sky.maxAngle) / sky.step);
    return clamp(i, 0, sky.frames.length - 1);
  }

  // Screen point of the muzzle for the un-bobbed, un-kicked pose; the crosshair is laid out from here
  skyAimOrigin(angleDeg, feetX, feetY, heightPx) {
    if (!this.ready || !this.sky) return null;
    const f = this.sky.frames[this.skyFrame(angleDeg)];
    const s = heightPx / this.sky.standingHeight;
    return {
      x: feetX + (f.tip[0] - this.sky.foot[0]) * s,
      y: feetY + (f.tip[1] - this.sky.foot[1]) * s,
      dx: f.dir[0],
      dy: f.dir[1]
    };
  }

  async load(charId) {
    if (this.charId === charId && this.ready) return;
    this.charId = charId;
    this.ready = false;

    const manifest = await (await fetch(`/assets/anim/${charId}/manifest.json`)).json();
    const entries = Object.entries(manifest.motions);
    const metas = await Promise.all(entries.map(([, info]) => fetch(info.meta).then((r) => r.json())));
    if (this.charId !== charId) return;

    const meta = {};
    entries.forEach(([name, info], i) => {
      meta[name] = prepareMeta(metas[i], info.rig);
    });

    const loader = this.scene.load;
    let queued = 0;
    entries.forEach(([name, info]) => {
      const key = `${charId}:${name}`;
      if (!this.scene.textures.exists(key)) {
        loader.spritesheet(key, info.sheet, { frameWidth: CELL, frameHeight: CELL });
        queued++;
      }
    });
    let sky = null;
    try {
      const res = await fetch(`/assets/anim/${charId}/sky_back.json`);
      if (res.ok) sky = await res.json();
    } catch {
      sky = null;
    }
    const skyKey = `${charId}:sky_back`;
    if (sky && !this.scene.textures.exists(skyKey)) {
      loader.spritesheet(skyKey, `/assets/anim/${charId}/sky_back_sheet.webp`, { frameWidth: sky.cellW, frameHeight: sky.cellH });
      queued++;
    }
    if (queued > 0) {
      await new Promise((resolve) => {
        loader.once(Phaser.Loader.Events.COMPLETE, resolve);
        loader.start();
      });
    }
    if (this.charId !== charId) return;

    this.sky = sky;
    this.manifest = manifest;
    this.meta = meta;
    this.lastState = null;
    this.ready = true;
  }

  hide() {
    this.container.setVisible(false);
    this.shadow.setVisible(false);
    this.muzzle.valid = false;
  }

  // Local cell point -> screen, through the upper-body (rho) and container (lambda, sigma*s, s) transforms
  toScreen(p, P, F, rho, lam, s, sigma, S) {
    const ux = p[0] - P[0];
    const uy = p[1] - P[1];
    const cr = Math.cos(rho);
    const sr = Math.sin(rho);
    const lx = ((P[0] - F[0]) + cr * ux - sr * uy) * sigma * s;
    const ly = ((P[1] - F[1]) + sr * ux + cr * uy) * s;
    const cl = Math.cos(lam);
    const sl = Math.sin(lam);
    return { x: S.x + cl * lx - sl * ly, y: S.y + sl * lx + cl * ly };
  }

  solveAlpha(rig, F, s, sigma, S, C, start) {
    const d0 = rig.dir;
    const baseAng = Math.atan2(d0[1], sigma * d0[0]);
    const len = rig.barrelLen || 60;
    const tail = [rig.tip[0] - d0[0] * len, rig.tip[1] - d0[1] * len];
    let a = start;
    for (let i = 0; i < 4; i++) {
      const lam = clamp(LEAN_SHARE * a, -MAX_LEAN, MAX_LEAN);
      const rho = sigma * (a - lam);
      const t = this.toScreen(tail, rig.pivot, F, rho, lam, s, sigma, S);
      const want = Math.atan2(C.y - t.y, C.x - t.x);
      const rel = wrapAngle(want - baseAng);
      a = sigma * clamp(sigma * rel, RAISE_MIN, RAISE_MAX);
    }
    return a;
  }

  pickMotion(state, elevation) {
    if (state === CHARACTER_STATES.IDLE_AIM && this.meta.aim_sky_sweep && elevation > SKY_ELEVATION) {
      return 'aim_sky_sweep';
    }
    if (state === CHARACTER_STATES.SHOOT_RECOIL && this.useSkyShot && this.meta.shoot_sky_recoil) {
      return 'shoot_sky_recoil';
    }
    return STATE_TO_MOTION[state] || 'idle_aim';
  }

  pickFrame(motion, meta, state, elevation) {
    const n = meta.frameCount;
    const t = this.motionTime;
    if (state === CHARACTER_STATES.SHOOT_RECOIL) {
      if (motion === 'shoot_recoil') {
        const start = Number.isInteger(meta.shotFrame) ? Math.max(0, meta.shotFrame - 2) : SHOOT_WINDOW.start;
        const end = Math.min(n - 1, start + (SHOOT_WINDOW.end - SHOOT_WINDOW.start));
        return Math.min(end, start + Math.floor(t * SHOOT_WINDOW.fps));
      }
      return Math.min(n - 1, Math.floor(t * (n / 0.95)));
    }
    if (state === CHARACTER_STATES.WAVE_FLINCH) return Math.min(n - 1, Math.floor(t * FLINCH_FPS));
    if (state === CHARACTER_STATES.CHEER_VICTORY) return Math.min(n - 1, Math.floor(t * CHEER_FPS));
    if (meta.poseLibrary) {
      let best = 0;
      let bestErr = Infinity;
      meta.elevations.forEach((e, i) => {
        const err = Math.abs(e - elevation);
        if (err < bestErr) {
          bestErr = err;
          best = i;
        }
      });
      this.poseIndex += clamp(best - this.poseIndex, -2, 2);
      return clamp(Math.round(this.poseIndex), 0, n - 1);
    }
    return Math.floor(t * (meta.fps || 24)) % n;
  }

  /**
   * view: { visible, feetX, feetY, heightPx, aimX, aimY, state }
   * dt is game time (0 while paused)
   */
  update(dt, view) {
    if (!this.ready || !view || !view.visible) {
      this.hide();
      return;
    }
    this.container.setVisible(true);
    this.shadow.setVisible(true);

    const state = view.state;
    if (state !== this.lastState) {
      this.motionTime = 0;
      if (state === CHARACTER_STATES.SHOOT_RECOIL) {
        this.useSkyShot = this.currentElevation(view) > SKY_ELEVATION;
      }
      this.lastState = state;
    } else {
      this.motionTime += dt;
    }

    const S = { x: view.feetX, y: view.feetY };
    const C = { x: view.aimX, y: view.aimY };
    const s = view.heightPx / (this.manifest.standingHeight || 200);
    const actionLocked = state === CHARACTER_STATES.SHOOT_RECOIL
      || state === CHARACTER_STATES.WAVE_FLINCH
      || state === CHARACTER_STATES.CHEER_VICTORY;

    if (this.sky && state !== CHARACTER_STATES.WAVE_FLINCH && state !== CHARACTER_STATES.CHEER_VICTORY) {
      this.updateSky(dt, view, state);
      return;
    }
    if (this.sky) {
      // Front-view event clips face the side the gun was pointing
      this.facing = (view.aimAngle || 0) > 0 ? -1 : 1;
    } else if (!actionLocked) {
      const dxAim = C.x - S.x;
      const hyst = FACING_HYSTERESIS * view.heightPx;
      if (this.facing === 1 && dxAim > hyst) this.facing = -1;
      else if (this.facing === -1 && dxAim < -hyst) this.facing = 1;
    }
    const sigma = this.facing;

    const elevation = this.currentElevation(view);
    const motion = this.pickMotion(state, elevation);
    const meta = this.meta[motion] || this.meta.idle_aim;
    const frame = this.pickFrame(motion, meta, state, elevation);
    const key = `${this.charId}:${motion}`;
    const fr = meta.frames[frame] || meta.frames[0];
    const F = fr.foot || [CELL / 2, meta.footY];
    const rig = meta.rigs[frame];

    this.shadow.setPosition(S.x, S.y).setSize(view.heightPx * 0.42, view.heightPx * 0.075);
    this.container.setPosition(S.x, S.y);

    this.lower.setTexture(key, frame);
    const rigged = rig && meta.rigEnabled
      && state !== CHARACTER_STATES.WAVE_FLINCH
      && state !== CHARACTER_STATES.CHEER_VICTORY;

    if (!rigged) {
      this.alpha *= 0.8;
      this.container.setRotation(0).setScale(sigma * s, s);
      this.lower.setCrop().setOrigin(F[0] / CELL, F[1] / CELL).setPosition(0, 0);
      this.upper.setVisible(false);
      this.muzzle.valid = false;
      return;
    }

    // While recoiling, the aim locked on the first shoot frame is kept so the baked kick plays out
    if (state !== CHARACTER_STATES.SHOOT_RECOIL || this.motionTime === 0) {
      this.alpha = this.solveAlpha(rig, F, s, sigma, S, C, this.alpha);
    }
    const a = this.alpha;
    const lam = clamp(LEAN_SHARE * a, -MAX_LEAN, MAX_LEAN);
    const rho = sigma * (a - lam);
    const P = rig.pivot;
    const cutY = Math.round(rig.cutY);

    this.container.setRotation(lam).setScale(sigma * s, s);
    this.lower
      .setCrop(0, cutY, CELL, CELL - cutY)
      .setOrigin(F[0] / CELL, F[1] / CELL)
      .setPosition(0, 0)
      .setRotation(0);
    this.upper
      .setVisible(true)
      .setTexture(key, frame)
      .setCrop(0, 0, CELL, cutY + SEAM_OVERLAP)
      .setOrigin(P[0] / CELL, P[1] / CELL)
      .setPosition(P[0] - F[0], P[1] - F[1])
      .setRotation(rho);

    const tip = this.toScreen(rig.tip, P, F, rho, lam, s, sigma, S);
    const ang = Math.atan2(rig.dir[1], sigma * rig.dir[0]) + a;
    this.muzzle.x = tip.x;
    this.muzzle.y = tip.y;
    this.muzzle.dx = Math.cos(ang);
    this.muzzle.dy = Math.sin(ang);
    this.muzzle.valid = true;
  }

  updateSky(dt, view, state) {
    const sky = this.sky;
    const frame = this.skyFrame(view.aimAngle || 0);
    const f = sky.frames[frame];
    const s = view.heightPx / sky.standingHeight;
    const H = view.heightPx;

    const moving = state === CHARACTER_STATES.MOVE_LR || state === CHARACTER_STATES.MOVE_UD;
    if (moving) this.walkPhase += dt * 11;
    else this.walkPhase = 0;
    const bob = -Math.abs(Math.sin(this.walkPhase)) * H * 0.022;

    // Recoil slides the whole body back along the barrel line, so the aim line never wobbles
    let kick = 0;
    if (state === CHARACTER_STATES.SHOOT_RECOIL) {
      const t = this.motionTime;
      kick = (t < 0.03 ? t / 0.03 : Math.exp(-(t - 0.03) * 11)) * H * 0.045;
    }
    const ox = -f.dir[0] * kick;
    const oy = -f.dir[1] * kick + bob;

    this.shadow.setPosition(view.feetX, view.feetY).setSize(H * 0.46, H * 0.08);
    this.container.setVisible(true).setPosition(view.feetX + ox, view.feetY + oy).setRotation(0).setScale(s, s);
    this.lower
      .setTexture(`${this.charId}:sky_back`, frame)
      .setCrop()
      .setOrigin(sky.foot[0] / sky.cellW, sky.foot[1] / sky.cellH)
      .setPosition(0, 0)
      .setRotation(0);
    this.upper.setVisible(false);

    this.muzzle.x = view.feetX + ox + (f.tip[0] - sky.foot[0]) * s;
    this.muzzle.y = view.feetY + oy + (f.tip[1] - sky.foot[1]) * s;
    this.muzzle.dx = f.dir[0];
    this.muzzle.dy = f.dir[1];
    this.muzzle.valid = true;
  }

  currentElevation(view) {
    const shoulderX = view.feetX;
    const shoulderY = view.feetY - view.heightPx * 0.72;
    return Math.atan2(shoulderY - view.aimY, Math.abs(view.aimX - shoulderX) + 1e-3);
  }
}
