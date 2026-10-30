// src/entities/ClayTarget.js
// Sprite-based targets (AI-generated art) flying analytic trajectories in world space

import * as THREE from 'three';
import {
  TARGET_TYPES,
  TARGET_DEFS,
  SIZE_LEVEL_SCALE,
  BASE_WORLD_RADIUS,
  targetCatalog
} from '../config/targetCatalog.js';

export { TARGET_TYPES };

export const DEBRIS_COLORS = {
  [TARGET_TYPES.DISC]: 0xF0662A,
  [TARGET_TYPES.BOOMERANG]: 0x3C86D8,
  [TARGET_TYPES.UFO]: 0x8BD84E,
  [TARGET_TYPES.BADGE]: 0xFFC928,
  [TARGET_TYPES.DYNAMITE]: 0xD8342A,
  [TARGET_TYPES.HAT]: 0xB98A52
};

const loader = new THREE.TextureLoader();
const textureCache = {};
let glowTexture = null;

function getTargetTexture(type) {
  if (!textureCache[type]) {
    const tex = loader.load(targetCatalog.getMetrics(type).url);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    textureCache[type] = tex;
  }
  return textureCache[type];
}

function getGlowTexture() {
  if (glowTexture) return glowTexture;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,240,180,0.9)');
  grad.addColorStop(0.45, 'rgba(255,200,90,0.35)');
  grad.addColorStop(1, 'rgba(255,160,40,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  glowTexture = new THREE.CanvasTexture(c);
  glowTexture.colorSpace = THREE.SRGBColorSpace;
  return glowTexture;
}

export function preloadTargetTextures() {
  Object.values(TARGET_TYPES).forEach((t) => getTargetTexture(t));
}

/**
 * Flight plan (world units, seconds):
 *  start: THREE.Vector3 launch point, dir: +1 (to the right) | -1,
 *  span: horizontal travel distance, apex: peak height above start,
 *  duration: nominal flight time, depthDrift: z change over the flight
 */
export class ClayTarget {
  constructor({ type = TARGET_TYPES.DISC, sizeLevel = 3, plan, glow = false }) {
    this.type = type;
    const def = TARGET_DEFS[type] || TARGET_DEFS[TARGET_TYPES.DISC];
    this.def = def;
    this.sizeLevel = def.forcedSize || sizeLevel;
    this.worldRadius = BASE_WORLD_RADIUS * (SIZE_LEVEL_SCALE[this.sizeLevel] || 1.0);
    this.plan = plan;
    this.dir = plan.dir;
    this.t = 0;
    this.isAlive = true;
    this.seed = Math.random() * 100;

    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();

    this.mesh = new THREE.Group();
    const size = targetCatalog.getSpriteWorldSize(type, this.worldRadius);
    this.bodyRadius = Math.max(size.width, size.height) / 2;
    this.spriteMaterial = new THREE.SpriteMaterial({
      map: getTargetTexture(type),
      transparent: true,
      depthWrite: false
    });
    this.sprite = new THREE.Sprite(this.spriteMaterial);
    this.sprite.scale.set(size.width, size.height, 1);
    this.sprite.renderOrder = 5;

    if (glow) {
      const glowMat = new THREE.SpriteMaterial({
        map: getGlowTexture(),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      const glowSprite = new THREE.Sprite(glowMat);
      const g = Math.max(size.width, size.height) * 1.7;
      glowSprite.scale.set(g, g, 1);
      glowSprite.renderOrder = 4;
      this.mesh.add(glowSprite);
    }
    this.mesh.add(this.sprite);

    this.sample(0, this.position);
    this.mesh.position.copy(this.position);
  }

  get duration() {
    return this.plan.duration;
  }

  // Analytic position at flight time t
  sample(t, out) {
    const p = this.plan;
    const T = p.duration;
    const u = t / T;
    const s = p.start;
    let x;
    let y;
    let z = s.z + p.depthDrift * u;

    switch (this.type) {
      case TARGET_TYPES.BOOMERANG: {
        // Out to ~70% of the span, banks and returns toward the launch side
        const reach = p.span * 0.72;
        x = s.x + p.dir * reach * Math.sin(Math.PI * Math.min(1, u) * 0.92);
        y = s.y + p.apex * 4 * u * (1 - u) * 1.05;
        z += Math.sin(Math.PI * u) * -2.2;
        break;
      }
      case TARGET_TYPES.UFO: {
        // Rises off the launcher, then zig-zags with sudden bursts
        const burst = u + 0.06 * Math.sin(u * Math.PI * 6 + this.seed);
        x = s.x + p.dir * p.span * burst;
        const rise = 1 - Math.exp(-u * 7);
        y = s.y + p.apex * 0.82 * rise + 0.55 * Math.sin(u * Math.PI * 7 + this.seed) * Math.min(1, u * 4);
        break;
      }
      case TARGET_TYPES.HAT: {
        // Tossed from above, flutters down with sway
        x = s.x + p.dir * p.span * 0.35 * u + Math.sin(t * 2.1 + this.seed) * 0.9;
        y = s.y - p.apex * u;
        break;
      }
      default: {
        x = s.x + p.dir * p.span * u;
        y = s.y + p.apex * 4 * u * (1 - u);
      }
    }
    out.set(x, y, z);
    return out;
  }

  update(dt, speedScale = 1.0) {
    if (!this.isAlive) return;
    const step = dt * speedScale;
    this.t += step;

    const prev = this.position.clone();
    this.sample(this.t, this.position);
    if (step > 0) {
      this.velocity.copy(this.position).sub(prev).divideScalar(step);
    }
    this.mesh.position.copy(this.position);

    // Visual spin only (hit zone uses the area-equivalent radius, which is rotation invariant)
    if (this.type === TARGET_TYPES.UFO || this.type === TARGET_TYPES.HAT) {
      this.spriteMaterial.rotation = Math.sin(this.t * 3 + this.seed) * 0.22;
    } else {
      this.spriteMaterial.rotation -= this.dir * this.def.spin * step;
    }

    if (this.t >= this.plan.duration || this.position.y < this.plan.killY) {
      this.isAlive = false;
    }
  }

  // Screen-space probe for hit evaluation
  getScreenProbe(projector) {
    const c = projector.project(this.position);
    const ahead = projector.project(this.position.clone().addScaledVector(this.velocity, 0.05));
    const edge = projector.project(this.position.clone().add(projector.cameraRight.clone().multiplyScalar(this.worldRadius)));
    const radius = Math.hypot(edge.x - c.x, edge.y - c.y);
    return {
      x: c.x,
      y: c.y,
      vx: (ahead.x - c.x) / 0.05,
      vy: (ahead.y - c.y) / 0.05,
      radius,
      bodyRadius: radius * (this.bodyRadius / this.worldRadius),
      visible: c.visible
    };
  }

  destroy(scene) {
    this.isAlive = false;
    if (scene) scene.remove(this.mesh);
    this.spriteMaterial.dispose();
  }
}
