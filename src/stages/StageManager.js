// src/stages/StageManager.js
// 5 stage gimmicks + target spawning from the visible clay launchers

import { ClayTarget, TARGET_TYPES } from '../entities/ClayTarget.js';
import { GROUND_Y } from '../renderer/ThreeCanvas.js';

const STAGE_TUNING = {
  1: { interval: 2.4, flight: 1.0 },
  2: { interval: 2.2, flight: 0.82 },
  3: { interval: 2.0, flight: 0.95 },
  4: { interval: 2.0, flight: 0.9 },
  5: { interval: 1.9, flight: 0.85 }
};

// Screen height (fraction from the top) of the clay parabola peaks: `high` = tallest arc,
// `low` = flattest arc. The aim dial spans this band.
export const CLAY_PEAK_V = { high: 0.15, low: 0.32 };

export class StageManager {
  constructor(threeCanvas, overlay, soundSynth, gameState) {
    this.three = threeCanvas;
    this.overlay = overlay;
    this.sound = soundSynth;
    this.state = gameState;

    this.targets = [];
    this.spawnTimer = 0;
    this.fireworkTimer = 0;
    this.specialSpawnCounter = 0;
  }

  startStage(stageNumber) {
    this.clearAllTargets();
    this.three.setStageTheme(stageNumber);
    this.spawnTimer = 1.2;
    this.fireworkTimer = 0.5;
    this.specialSpawnCounter = 0;
  }

  clearAllTargets() {
    this.targets.forEach((t) => t.destroy(this.three.scene));
    this.targets = [];
  }

  update(dt) {
    const stageNum = this.state.currentStageNumber;
    const tuning = STAGE_TUNING[stageNum] || STAGE_TUNING[1];
    const speedScale = this.state.isFeverActive ? 0.6 : 1.0;

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnNextTargetBatch(stageNum);
      this.spawnTimer = this.state.isFeverActive ? 1.1 : tuning.interval * (0.85 + Math.random() * 0.3);
    }

    if (stageNum === 3) {
      this.fireworkTimer -= dt;
      if (this.fireworkTimer <= 0) {
        this.three.triggerFireworks();
        this.sound.playClayShatter(true);
        this.fireworkTimer = 2.5 + Math.random() * 2.0;
      }
    }

    for (let i = this.targets.length - 1; i >= 0; i--) {
      const t = this.targets[i];
      t.update(dt, speedScale);
      if (!t.isAlive) {
        t.destroy(this.three.scene);
        this.targets.splice(i, 1);
      }
    }
  }

  spawnNextTargetBatch(stageNum) {
    this.specialSpawnCounter++;
    let type = this.selectTargetType(stageNum);
    if (this.specialSpawnCounter % 7 === 0) type = TARGET_TYPES.BADGE;
    else if (this.specialSpawnCounter % 11 === 0) type = TARGET_TYPES.DYNAMITE;
    else if (this.specialSpawnCounter % 13 === 0) type = TARGET_TYPES.HAT;

    let sizeLevel;
    if (stageNum === 1) sizeLevel = Math.random() < 0.8 ? (Math.random() < 0.5 ? 1 : 2) : 3;
    else if (stageNum >= 4) sizeLevel = Math.random() < 0.65 ? (Math.random() < 0.5 ? 4 : 5) : 3;
    else sizeLevel = 1 + Math.floor(Math.random() * 5);

    if (stageNum === 2 && Math.random() < 0.5 && type !== TARGET_TYPES.HAT) {
      this.spawnTarget(type, sizeLevel, 'left');
      this.spawnTarget(type, sizeLevel, 'right');
      return;
    }
    this.spawnTarget(type, sizeLevel, Math.random() < 0.5 ? 'left' : 'right');
  }

  selectTargetType(stageNum) {
    const mode = this.state.selectedTargetMode;
    if (mode === TARGET_TYPES.DISC) return TARGET_TYPES.DISC;
    if (mode === TARGET_TYPES.BOOMERANG) return TARGET_TYPES.BOOMERANG;
    if (mode === TARGET_TYPES.UFO) return TARGET_TYPES.UFO;

    if (stageNum === 1) return TARGET_TYPES.DISC;
    if (stageNum === 2) return Math.random() < 0.7 ? TARGET_TYPES.DISC : TARGET_TYPES.BOOMERANG;
    if (stageNum === 3) return Math.random() < 0.5 ? TARGET_TYPES.DISC : TARGET_TYPES.UFO;
    const r = Math.random();
    return r < 0.35 ? TARGET_TYPES.DISC : (r < 0.7 ? TARGET_TYPES.BOOMERANG : TARGET_TYPES.UFO);
  }

  buildPlan(type, side) {
    const stageNum = this.state.currentStageNumber;
    const tuning = STAGE_TUNING[stageNum] || STAGE_TUNING[1];
    const dir = side === 'left' ? 1 : -1;
    const launch = this.three.getLaunchPoint(-dir);
    const end = this.three.getLaunchPoint(dir);
    const span = Math.abs(end.x - launch.x);
    const peakV = CLAY_PEAK_V.high + Math.random() * (CLAY_PEAK_V.low - CLAY_PEAK_V.high);
    const peakY = this.three.unprojectAtZ(0.5, peakV, launch.z).y;

    const plan = {
      start: launch.clone(),
      dir,
      span,
      apex: Math.max(2, peakY - launch.y),
      duration: (3.2 + Math.random() * 0.6) * tuning.flight,
      depthDrift: -Math.random() * 3,
      killY: GROUND_Y - 0.4
    };

    switch (type) {
      case TARGET_TYPES.BADGE:
        plan.duration *= 0.62;
        plan.apex *= 0.8;
        break;
      case TARGET_TYPES.DYNAMITE:
        plan.duration *= 1.2;
        break;
      case TARGET_TYPES.BOOMERANG:
        plan.duration *= 1.2;
        break;
      case TARGET_TYPES.UFO:
        plan.duration *= 1.15;
        break;
      case TARGET_TYPES.HAT: {
        const top = this.three.unprojectAtZ(0.5 + (Math.random() - 0.5) * 0.5, 0.02, launch.z);
        plan.start = top;
        plan.apex = top.y - GROUND_Y;
        plan.duration = 4.2;
        break;
      }
      default:
        break;
    }
    return plan;
  }

  spawnTarget(type, sizeLevel, side) {
    const plan = this.buildPlan(type, side);
    const target = new ClayTarget({
      type,
      sizeLevel,
      plan,
      glow: this.state.currentStageNumber === 3
    });
    this.three.scene.add(target.mesh);
    this.targets.push(target);
    return target;
  }

  destroyAllClaysWithDynamite(onEach) {
    const hits = this.targets.filter((t) => t.isAlive && t.type !== TARGET_TYPES.HAT);
    hits.forEach((t) => {
      if (onEach) onEach(t);
      t.destroy(this.three.scene);
    });
    this.targets = this.targets.filter((t) => t.isAlive);
  }
}
