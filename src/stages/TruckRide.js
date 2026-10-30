// src/stages/TruckRide.js
// Stage 5 pickup ride: the truck weaves left/right and drifts forward/back down the desert road on
// its own, the arrow pad steers it on top of that, and rocks / potholes scrolling down the road
// jolt the truck (body bounce + crosshair kick) when the wheels run over them. Washboard bumps
// add small random jolts that can't be avoided.

import * as THREE from 'three';
import { GROUND_Y } from '../renderer/ThreeCanvas.js';

// Truck position range in the player's lane / depth units (depth 0.5 keeps the whole pickup on screen)
export const TRUCK_LANE_MAX = 0.55;
export const TRUCK_DEPTH_RANGE = [0.5, 2.0];

const STEER_LANE_SPEED = 0.6; // lane units per second at full arrow
const STEER_DEPTH_SPEED = 0.75;
// Automatic drive: two slow sines left/right, one slower sine forward/back (starts at the bottom)
const WEAVE_LANE = [[0.3, 9.0], [0.1, 4.1]];
const WEAVE_DEPTH = 0.45;
const WEAVE_DEPTH_PERIOD = 13;

const ROAD_SPEED = 9; // m/s, same as the roadside fences
const SPAWN_Z = -46;
// Outer wheel edge of the drawn pickup (it is drawn ~4 m wide to match the 1.95x hero)
const TRUCK_HALF_WIDTH_M = 1.5;
const FRONT_AXLE_M = -1.0; // relative to the hero's feet (negative = ahead)
const REAR_AXLE_M = 1.1;
const CAMERA_FOLLOW_X = 0.35;
const CAMERA_FOLLOW_Z = 0.25;

// Body bounce spring (metres) and crosshair kick spring (pixels)
const LIFT_K = 140;
const LIFT_C = 10;
const JOLT_K = 90;
const JOLT_C = 8;

const OBSTACLES = {
  rock: { lift: 2.4, jolt: 1.25 },
  pothole: { lift: -2.0, jolt: 1.05 }
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function makeRockTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 96;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(40,20,0,0.35)';
  g.beginPath();
  g.ellipse(64, 88, 56, 7, 0, 0, Math.PI * 2);
  g.fill();
  const pts = [[10, 88], [16, 52], [36, 26], [62, 14], [90, 22], [110, 46], [118, 88]];
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
  const grad = g.createLinearGradient(30, 14, 100, 88);
  grad.addColorStop(0, '#C9C0B4');
  grad.addColorStop(0.55, '#8E857B');
  grad.addColorStop(1, '#4E4740');
  g.fillStyle = grad;
  g.fill();
  g.lineWidth = 5;
  g.strokeStyle = '#2B1700';
  g.stroke();
  g.strokeStyle = 'rgba(43,23,0,0.45)';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(58, 20);
  g.lineTo(66, 52);
  g.lineTo(96, 66);
  g.stroke();
  g.fillStyle = 'rgba(255,240,210,0.35)';
  g.beginPath();
  g.ellipse(46, 40, 14, 7, -0.5, 0, Math.PI * 2);
  g.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makePotholeTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d');
  const rim = g.createRadialGradient(64, 64, 30, 64, 64, 63);
  rim.addColorStop(0, 'rgba(140,96,58,0.9)');
  rim.addColorStop(0.75, 'rgba(160,112,70,0.55)');
  rim.addColorStop(1, 'rgba(160,112,70,0)');
  g.fillStyle = rim;
  g.fillRect(0, 0, 128, 128);
  const hole = g.createRadialGradient(60, 70, 4, 64, 64, 44);
  hole.addColorStop(0, '#24140A');
  hole.addColorStop(0.7, '#3E2614');
  hole.addColorStop(1, '#5C3A20');
  g.fillStyle = hole;
  g.beginPath();
  g.ellipse(64, 64, 46, 40, 0.2, 0, Math.PI * 2);
  g.fill();
  g.lineWidth = 4;
  g.strokeStyle = 'rgba(43,23,0,0.8)';
  g.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class TruckRide {
  constructor(three) {
    this.three = three;
    this.active = false;
    this.obstacles = [];
    this.rockTexture = null;
    this.potholeTexture = null;
    this.onBump = null;
    this.reset(false);
  }

  reset(active) {
    this.clearObstacles();
    this.active = active;
    this.t = 0;
    this.centerLane = 0;
    this.centerDepth = TRUCK_DEPTH_RANGE[0] + WEAVE_DEPTH;
    this.lane = 0;
    this.depth = TRUCK_DEPTH_RANGE[0];
    this.lift = 0;
    this.liftVel = 0;
    this.jolt = { x: 0, y: 0, vx: 0, vy: 0 };
    this.spawnTimer = 1.5;
    this.washboardTimer = 3 + Math.random() * 3;
    this.three.truckLift = 0;
    this.three.cameraFollow.set(0, 0, 0);
    this.three.roadSpeed = ROAD_SPEED;
  }

  clearObstacles() {
    this.obstacles.forEach((o) => this.disposeObstacle(o));
    this.obstacles = [];
  }

  disposeObstacle(o) {
    this.three.scene.remove(o.mesh);
    o.mesh.material.dispose();
    // Sprites share one global geometry; only the pothole planes own theirs
    if (o.kind === 'pothole') o.mesh.geometry.dispose();
  }

  weaveLane(t) {
    return WEAVE_LANE.reduce((s, [a, period]) => s + a * Math.sin((2 * Math.PI * t) / period), 0);
  }

  weaveDepth(t) {
    return WEAVE_DEPTH * Math.sin((2 * Math.PI * t) / WEAVE_DEPTH_PERIOD - Math.PI / 2);
  }

  // Crosshair kick in screen pixels (added on top of the barrel-line aim)
  getAimJolt() {
    return this.active ? { x: this.jolt.x, y: this.jolt.y } : { x: 0, y: 0 };
  }

  // move: arrow input (x: -1..1 right, y: -1..1 forward); steer = false while the round is ending
  update(dt, player, move, steer = true) {
    if (!this.active) return;
    this.t += dt;
    const prevZ = this.three.getPlayerLineZ(this.depth);

    if (steer) {
      this.centerLane = clamp(this.centerLane + move.x * STEER_LANE_SPEED * dt, -TRUCK_LANE_MAX, TRUCK_LANE_MAX);
      this.centerDepth = clamp(this.centerDepth + move.y * STEER_DEPTH_SPEED * dt, TRUCK_DEPTH_RANGE[0], TRUCK_DEPTH_RANGE[1]);
    }
    this.lane = clamp(this.centerLane + this.weaveLane(this.t), -TRUCK_LANE_MAX, TRUCK_LANE_MAX);
    this.depth = clamp(this.centerDepth + this.weaveDepth(this.t), TRUCK_DEPTH_RANGE[0], TRUCK_DEPTH_RANGE[1]);
    player.lane = this.lane;
    player.depth = this.depth;

    const truckZ = this.three.getPlayerLineZ(this.depth);
    const truckX = this.three.getPlayerWorld(player).x;
    // Driving forward makes the road stream past faster, backing off slows it
    const forward = dt > 0 ? (prevZ - truckZ) / dt : 0;
    this.three.roadSpeed = Math.max(4, ROAD_SPEED + forward * 1.5);
    const midZ = this.three.getPlayerLineZ((TRUCK_DEPTH_RANGE[0] + TRUCK_DEPTH_RANGE[1]) / 2);
    this.three.cameraFollow.set(truckX * CAMERA_FOLLOW_X, 0, (truckZ - midZ) * CAMERA_FOLLOW_Z);

    this.updateObstacles(dt, truckX, truckZ);
    this.updateWashboard(dt);
    this.updateSprings(dt);
    this.three.truckLift = this.lift;
  }

  updateObstacles(dt, truckX, truckZ) {
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnObstacle();
      this.spawnTimer = 1.6 + Math.random() * 1.8;
    }
    const speed = this.three.roadSpeed;
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i];
      const z0 = o.mesh.position.z;
      const z1 = z0 + speed * dt;
      o.mesh.position.z = z1;
      const inLine = Math.abs(o.mesh.position.x - truckX) < TRUCK_HALF_WIDTH_M + o.halfWidth;
      if (inLine) {
        if (!o.frontHit && z0 < truckZ + FRONT_AXLE_M && z1 >= truckZ + FRONT_AXLE_M) {
          o.frontHit = true;
          this.applyBump(o.kind, 1);
        }
        if (!o.rearHit && z0 < truckZ + REAR_AXLE_M && z1 >= truckZ + REAR_AXLE_M) {
          o.rearHit = true;
          this.applyBump(o.kind, 0.6);
        }
      }
      if (z1 > 4) {
        this.disposeObstacle(o);
        this.obstacles.splice(i, 1);
      }
    }
  }

  // Half the obstacles are dropped where the weaving truck will be when they arrive, so they show
  // up off to the side (the truck art hides the road straight ahead) and drift into its path
  spawnObstacle() {
    const zTruck = this.three.getPlayerLineZ(this.depth);
    const halfLane = this.three.halfWidthAt(zTruck) * 0.8;
    const roadHalf = halfLane * TRUCK_LANE_MAX + TRUCK_HALF_WIDTH_M;
    const arrive = this.t + (zTruck + FRONT_AXLE_M - SPAWN_Z) / this.three.roadSpeed;
    const futureLane = clamp(this.centerLane + this.weaveLane(arrive), -TRUCK_LANE_MAX, TRUCK_LANE_MAX);
    const x = Math.random() < 0.5
      ? clamp(futureLane * halfLane + (Math.random() - 0.5) * 1.2, -roadHalf, roadHalf)
      : (Math.random() * 2 - 1) * roadHalf;
    const kind = Math.random() < 0.55 ? 'rock' : 'pothole';
    let mesh;
    let halfWidth;
    if (kind === 'rock') {
      if (!this.rockTexture) this.rockTexture = makeRockTexture();
      const h = 1.4 + Math.random() * 0.5;
      const mat = new THREE.SpriteMaterial({ map: this.rockTexture, transparent: true, alphaTest: 0.2 });
      mesh = new THREE.Sprite(mat);
      mesh.center.set(0.5, 0.05);
      mesh.scale.set(h * (128 / 96), h, 1);
      mesh.position.set(x, GROUND_Y, SPAWN_Z);
      halfWidth = (h * (128 / 96)) / 2;
    } else {
      if (!this.potholeTexture) this.potholeTexture = makePotholeTexture();
      const w = 2.4 + Math.random() * 0.8;
      const mat = new THREE.MeshBasicMaterial({ map: this.potholeTexture, transparent: true, depthWrite: false });
      mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 0.7), mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(x, GROUND_Y + 0.02, SPAWN_Z);
      mesh.renderOrder = 0;
      halfWidth = w * 0.4;
    }
    this.three.scene.add(mesh);
    this.obstacles.push({ kind, mesh, halfWidth, frontHit: false, rearHit: false });
  }

  updateWashboard(dt) {
    this.washboardTimer -= dt;
    if (this.washboardTimer > 0) return;
    this.washboardTimer = 2.5 + Math.random() * 3;
    this.kick(Math.random() < 0.5 ? 0.9 : -0.7, 0.35);
  }

  applyBump(kind, scale) {
    const def = OBSTACLES[kind];
    this.kick(def.lift * scale, def.jolt * scale);
    this.three.addCameraShake(0.12 * scale);
    this.onBump?.(kind, scale);
  }

  // liftImpulse in m/s on the body spring; jolt as a multiple of the short screen side per second
  kick(liftImpulse, jolt) {
    this.liftVel += liftImpulse;
    // Mostly vertical (up over a rock, down into a hole) with a random sideways part
    const s = jolt * Math.min(this.three.width, this.three.height);
    this.jolt.vx += (Math.random() * 2 - 1) * 0.7 * s;
    this.jolt.vy += -(0.6 + Math.random() * 0.4) * s * (liftImpulse >= 0 ? 1 : -1);
  }

  updateSprings(dt) {
    const steps = Math.max(1, Math.ceil(dt / 0.008));
    const h = dt / steps;
    const j = this.jolt;
    for (let i = 0; i < steps; i++) {
      this.liftVel += (-LIFT_K * this.lift - LIFT_C * this.liftVel) * h;
      this.lift += this.liftVel * h;
      j.vx += (-JOLT_K * j.x - JOLT_C * j.vx) * h;
      j.vy += (-JOLT_K * j.y - JOLT_C * j.vy) * h;
      j.x += j.vx * h;
      j.y += j.vy * h;
    }
  }
}
