// src/entities/PlayerCharacter.js
// 3 player characters: stats, passive skills, state machine, lane position and crosshair

// On-screen size multiplier for every character (worldHeight is the real-life height in metres)
export const CHARACTER_DISPLAY_SCALE = 1.3 * 1.5;

export const CHARACTER_STATS = {
  young_cowboy: {
    id: 'young_cowboy',
    name: 'Billy',
    laneSpeed: 0.62,
    depthSpeed: 0.55,
    aimSensitivity: 1.0,
    leadZoneBonus: 1.0,
    worldHeight: 1.75,
    colorHex: '#D24625',
    accentHex: '#FFE600'
  },
  young_cowgirl: {
    id: 'young_cowgirl',
    name: 'Daisy',
    laneSpeed: 0.87, // +40% movement for dodging Stage 4 waves
    depthSpeed: 0.77,
    aimSensitivity: 1.05,
    leadZoneBonus: 1.0,
    worldHeight: 1.65,
    colorHex: '#E8A838',
    accentHex: '#FFFFFF'
  },
  middle_cowboy: {
    id: 'middle_cowboy',
    name: 'Sheriff Buck',
    laneSpeed: 0.5,
    depthSpeed: 0.45,
    aimSensitivity: 0.92,
    leadZoneBonus: 1.10, // +10% lead-shot radius
    worldHeight: 1.88,
    colorHex: '#3B2314',
    accentHex: '#C0A080'
  }
};

export const CHARACTER_STATES = {
  IDLE_AIM: 'IDLE_AIM',
  MOVE_LR: 'MOVE_LR',
  MOVE_UD: 'MOVE_UD',
  SHOOT_RECOIL: 'SHOOT_RECOIL',
  WAVE_FLINCH: 'WAVE_FLINCH',
  CHEER_VICTORY: 'CHEER_VICTORY'
};

export const STATE_DURATIONS = {
  SHOOT_RECOIL: 0.95,
  WAVE_FLINCH: 2.0,
  CHEER_VICTORY: 3.0
};

export const AIM_BOUNDS = { minU: 0.03, maxU: 0.97, minV: 0.12, minVPortrait: 0.17, maxV: 0.78 };
export const AIM_ANGLE_STEP = 5;
export const AIM_ANGLE_MAX = 75;
// Reach = where the crosshair sits in the aim band: 0 = bottom line (just under the flattest
// clay arc), 1 = top line (peak of the tallest arc)
export const AIM_REACH = { min: 0, max: 1, initial: 0 };

export class PlayerCharacter {
  constructor(charId = 'young_cowboy') {
    this.setCharacter(charId);
    this.reset();
  }

  setCharacter(charId) {
    this.charId = CHARACTER_STATS[charId] ? charId : 'young_cowboy';
    this.stats = CHARACTER_STATS[this.charId];
  }

  reset() {
    // lane: -1 (left edge) .. +1 (right edge); depth: 0 (near camera) .. 1 (far)
    this.lane = 0;
    this.depth = 0.2;
    this.laneLimits = [-1, 1];
    this.depthLimits = [0, 1];

    // Gun angle from vertical in 5-degree steps (+ = right) and the crosshair height inside the
    // aim band (AIM_REACH). aimU / aimV are the resulting crosshair fractions.
    this.aimAngle = -15;
    this.aimReach = AIM_REACH.initial;
    this.aimU = 0.4;
    this.aimV = 0.32;

    this.state = CHARACTER_STATES.IDLE_AIM;
    this.stateTimer = 0;
    this.moveX = 0;
    this.moveY = 0;
  }

  setLimits(laneLimits, depthLimits) {
    this.laneLimits = laneLimits;
    this.depthLimits = depthLimits;
    this.lane = Math.max(laneLimits[0], Math.min(laneLimits[1], this.lane));
    this.depth = Math.max(depthLimits[0], Math.min(depthLimits[1], this.depth));
  }

  isLocked() {
    return this.state === CHARACTER_STATES.WAVE_FLINCH || this.state === CHARACTER_STATES.CHEER_VICTORY;
  }

  setState(newState, duration = 0) {
    this.state = newState;
    this.stateTimer = duration;
  }

  // Swing the gun by whole 5-degree steps; returns true when the angle changed
  stepAimAngle(steps) {
    const next = Math.max(-AIM_ANGLE_MAX, Math.min(AIM_ANGLE_MAX, this.aimAngle + steps * AIM_ANGLE_STEP));
    const changed = next !== this.aimAngle;
    this.aimAngle = next;
    return changed;
  }

  adjustReach(delta) {
    this.aimReach = Math.max(AIM_REACH.min, Math.min(AIM_REACH.max, this.aimReach + delta * this.stats.aimSensitivity));
  }

  // Crosshair = where the barrel line crosses the reach height of the aim band (band.top / band.bottom
  // in screen-height fractions), shortened so it stays inside the aim bounds
  layoutCrosshair(origin, width, height, band) {
    if (!origin) return;
    const minX = AIM_BOUNDS.minU * width;
    const maxX = AIM_BOUNDS.maxU * width;
    const minY = (height > width ? AIM_BOUNDS.minVPortrait : AIM_BOUNDS.minV) * height;
    const maxY = AIM_BOUNDS.maxV * height;
    const targetY = (band.bottom + (band.top - band.bottom) * this.aimReach) * height;
    let len = origin.dy < -1e-4 ? Math.max(0, (origin.y - targetY) / -origin.dy) : 0;
    if (origin.dx > 1e-4) len = Math.min(len, (maxX - origin.x) / origin.dx);
    if (origin.dx < -1e-4) len = Math.min(len, (minX - origin.x) / origin.dx);
    if (origin.dy < -1e-4) len = Math.min(len, (minY - origin.y) / origin.dy);
    if (origin.dy > 1e-4) len = Math.min(len, (maxY - origin.y) / origin.dy);
    len = Math.max(0, len);
    this.aimU = (origin.x + origin.dx * len) / width;
    this.aimV = (origin.y + origin.dy * len) / height;
  }

  triggerShoot() {
    this.setState(CHARACTER_STATES.SHOOT_RECOIL, STATE_DURATIONS.SHOOT_RECOIL);
  }

  triggerFlinch() {
    this.setState(CHARACTER_STATES.WAVE_FLINCH, STATE_DURATIONS.WAVE_FLINCH);
  }

  triggerVictory() {
    this.setState(CHARACTER_STATES.CHEER_VICTORY, STATE_DURATIONS.CHEER_VICTORY);
  }

  // moveX: -1..1 (left/right), moveY: -1..1 (+1 = away from camera)
  update(dt, moveX = 0, moveY = 0) {
    this.moveX = moveX;
    this.moveY = moveY;

    if (this.stateTimer > 0) {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        this.stateTimer = 0;
        this.state = CHARACTER_STATES.IDLE_AIM;
      }
    }

    if (this.isLocked()) return;

    this.lane += moveX * this.stats.laneSpeed * dt;
    this.depth += moveY * this.stats.depthSpeed * dt;
    this.lane = Math.max(this.laneLimits[0], Math.min(this.laneLimits[1], this.lane));
    this.depth = Math.max(this.depthLimits[0], Math.min(this.depthLimits[1], this.depth));

    if (this.state === CHARACTER_STATES.SHOOT_RECOIL) return;

    if (Math.abs(moveX) > 0.1) {
      this.state = CHARACTER_STATES.MOVE_LR;
    } else if (Math.abs(moveY) > 0.1) {
      this.state = CHARACTER_STATES.MOVE_UD;
    } else {
      this.state = CHARACTER_STATES.IDLE_AIM;
    }
  }
}
