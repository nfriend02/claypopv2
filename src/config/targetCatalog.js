// src/config/targetCatalog.js
// Target art metrics (measured from the generated PNGs) + per-target hit-zone tuning

export const TARGET_TYPES = {
  DISC: 'clay_disc',
  BOOMERANG: 'clay_boomerang',
  UFO: 'clay_ufo',
  BADGE: 'badge_gold',
  DYNAMITE: 'dynamite_pack',
  HAT: 'cowboy_hat'
};

// Size levels 1..5 (XL..XS) scale the world radius
export const SIZE_LEVEL_SCALE = { 1: 1.4, 2: 1.2, 3: 1.0, 4: 0.8, 5: 0.6 };

// Visual size relative to the previous 0.744 m silhouette, and hit zone relative to the previous zone
export const TARGET_VISUAL_SCALE = 0.7;
export const HIT_ZONE_EASE = 1.5 * 1.2 * 1.2;

// Base world radius (meters) of a size-3 target's visible silhouette
export const BASE_WORLD_RADIUS = 0.62 * 1.2 * TARGET_VISUAL_SCALE;

// The hit zone is measured against the (now smaller) sprite, so it is widened by EASE / VISUAL
// to end up HIT_ZONE_EASE times the previous zone
const HIT_ZONE_SCALE = HIT_ZONE_EASE / TARGET_VISUAL_SCALE;

/*
 * Hit-zone model (screen space, evaluated at the moment of release):
 *   R      = visible silhouette radius on screen (area-equivalent radius of the sprite) * radiusScale
 *   lead   = (M - C) . V_hat           must satisfy leadMin*R <= lead <= leadMax*R
 *   perp   = |(M - C) x V_hat|         must satisfy perp <= perpRatio*R   (spec: R/2)
 *   nose   = |M - (C + V_hat*leadMax*R)|  also a hit when nose <= noseRatio*R (a disc on the front tip,
 *            so shots just ahead of the leading edge count)
 *   body   = the front half of the drawn sprite (lead >= 0 within its half extent) is always a hit
 *   perfect lead when lead is inside [perfectMin*R, perfectMax*R]
 * Targets slower than stillSpeedPx px/s are treated as stationary: |M - C| <= R.
 */
export const HIT_DEFAULTS = {
  radiusScale: 1.0,
  leadMin: 0.0,
  leadMax: 1.0,
  perpRatio: 0.5,
  noseRatio: 0.5,
  perfectMin: 0.35,
  perfectMax: 0.85,
  minRadiusPx: 14,
  stillSpeedPx: 40
};

export const TARGET_DEFS = {
  [TARGET_TYPES.DISC]: {
    points: 100,
    spin: 2.2,
    hit: {}
  },
  [TARGET_TYPES.BOOMERANG]: {
    points: 150,
    spin: 9.0,
    // Spinning V-shape sweeps a disc wider than its static area
    hit: { radiusScale: 1.25, perpRatio: 0.55 }
  },
  [TARGET_TYPES.UFO]: {
    points: 200,
    spin: 0.0,
    hit: { perpRatio: 0.5 }
  },
  [TARGET_TYPES.BADGE]: {
    points: 300,
    spin: 3.5,
    forcedSize: 5,
    hit: { radiusScale: 1.1 }
  },
  [TARGET_TYPES.DYNAMITE]: {
    points: 500,
    spin: 1.4,
    forcedSize: 2,
    hit: { perpRatio: 0.6 }
  },
  [TARGET_TYPES.HAT]: {
    points: -300,
    spin: 1.0,
    forcedSize: 3,
    hit: {}
  }
};

const FALLBACK_METRICS = {
  width: 256,
  height: 256,
  equivalentRadius: 110,
  aspect: 1
};

class TargetCatalog {
  constructor() {
    this.metrics = {};
    this.loaded = false;
  }

  async load() {
    if (this.loaded) return;
    try {
      const res = await fetch('/assets/targets/targets.json');
      this.metrics = await res.json();
    } catch (err) {
      console.warn('[TargetCatalog] targets.json unavailable, using fallback metrics:', err);
    }
    this.loaded = true;
  }

  getMetrics(type) {
    return this.metrics[type] || { ...FALLBACK_METRICS, url: `/assets/targets/${type}.png` };
  }

  getHitTuning(type) {
    const tuning = { ...HIT_DEFAULTS, ...(TARGET_DEFS[type]?.hit || {}) };
    tuning.radiusScale *= HIT_ZONE_SCALE;
    tuning.minRadiusPx *= HIT_ZONE_EASE;
    return tuning;
  }

  // World-space sprite size such that the area-equivalent radius equals worldRadius
  getSpriteWorldSize(type, worldRadius) {
    const m = this.getMetrics(type);
    const width = worldRadius * (m.width / m.equivalentRadius);
    const height = width * (m.height / m.width);
    return { width, height };
  }
}

export const targetCatalog = new TargetCatalog();
