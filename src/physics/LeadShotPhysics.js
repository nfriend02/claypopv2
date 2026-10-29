// src/physics/LeadShotPhysics.js
// Screen-space lead-shot evaluation: 0 <= (M - C) . V_hat <= R  and  |perp| <= R/2

import { HIT_DEFAULTS } from '../config/targetCatalog.js';

export class LeadShotPhysics {
  /**
   * @param {{x:number,y:number,vx:number,vy:number,radius:number}} probe  projected target (px, px/s)
   * @param {{x:number,y:number}} crosshair  M in px
   * @param {object} tuning  hit tuning (see HIT_DEFAULTS)
   * @param {number} bonus   character lead-zone multiplier (Sheriff Buck = 1.1)
   */
  static evaluate(probe, crosshair, tuning = HIT_DEFAULTS, bonus = 1.0) {
    const R = Math.max(tuning.minRadiusPx, probe.radius * tuning.radiusScale) * bonus;
    const dx = crosshair.x - probe.x;
    const dy = crosshair.y - probe.y;
    const speed = Math.hypot(probe.vx, probe.vy);

    if (speed < tuning.stillSpeedPx) {
      const dist = Math.hypot(dx, dy);
      const isHit = dist <= R;
      return { isHit, isPerfectLead: false, lead: 0, perp: dist, R, score: isHit ? dist / R : Infinity };
    }

    const ux = probe.vx / speed;
    const uy = probe.vy / speed;
    const lead = dx * ux + dy * uy;
    const perp = Math.abs(dx * -uy + dy * ux);

    const inLead = lead >= tuning.leadMin * R && lead <= tuning.leadMax * R;
    const inPerp = perp <= tuning.perpRatio * R;
    const isHit = inLead && inPerp;
    const isPerfectLead = isHit && lead >= tuning.perfectMin * R && lead <= tuning.perfectMax * R;

    // Lower score = better candidate when several targets qualify
    const score = Math.abs(lead / R - 0.6) + perp / R;
    return { isHit, isPerfectLead, lead, perp, R, score };
  }
}
