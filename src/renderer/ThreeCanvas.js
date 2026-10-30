// src/renderer/ThreeCanvas.js
// Three.js 3D layer: stage world, sprite props/launchers, targets, 30-piece debris, waves, fireworks

import * as THREE from 'three';
import { uxMode } from '../core/UXMode.js';

export const GROUND_Y = -1.2;
const CAMERA_POS = new THREE.Vector3(0, 1.8, 4.0);
const LOOK_AT = new THREE.Vector3(0, 2.6, -20);
const LAUNCH_Z = -12;
export const STAGE5_BED_HEIGHT = 1.05;

const STAGE_PROPS = {
  1: [
    { tex: 'fixtures/fence', side: -1, fx: 0.62, z: -9, h: 1.3 },
    { tex: 'fixtures/fence', side: 1, fx: 0.62, z: -9, h: 1.3 },
    { tex: 'fixtures/hay_bale', side: -1, fx: 0.86, z: -7, h: 1.2 },
    { tex: 'fixtures/barrel', side: 1, fx: 0.84, z: -6.5, h: 1.15 },
    { tex: 'fixtures/signpost', side: 1, fx: 0.55, z: -15, h: 2.4 },
    { tex: 'npc/fellow_cheer', side: -1, fx: 0.7, z: -14, h: 1.8 },
    { tex: 'npc/ranch_dog', side: -1, fx: 0.52, z: -13, h: 0.8 }
  ],
  2: [
    { tex: 'fixtures/target_stand', side: -1, fx: 0.55, z: -16, h: 2.2 },
    { tex: 'fixtures/target_stand', side: 1, fx: 0.55, z: -16, h: 2.2 },
    { tex: 'fixtures/fence', side: -1, fx: 0.75, z: -8, h: 1.3 },
    { tex: 'fixtures/fence', side: 1, fx: 0.75, z: -8, h: 1.3 },
    { tex: 'fixtures/crates', side: 1, fx: 0.86, z: -6.5, h: 1.2 },
    { tex: 'npc/fellow_cheer', side: 1, fx: 0.66, z: -13, h: 1.8 }
  ],
  3: [
    { tex: 'fixtures/barrel', side: -1, fx: 0.82, z: -7, h: 1.15 },
    { tex: 'fixtures/hay_bale', side: 1, fx: 0.8, z: -8, h: 1.2 },
    { tex: 'fixtures/fence', side: -1, fx: 0.6, z: -11, h: 1.3 },
    { tex: 'fixtures/fence', side: 1, fx: 0.6, z: -11, h: 1.3 },
    { tex: 'npc/fellow_cheer', side: -1, fx: 0.62, z: -15, h: 1.8 }
  ],
  4: [
    { tex: 'fixtures/barrel', side: -1, fx: 0.88, z: -5.5, h: 1.15 },
    { tex: 'fixtures/crates', side: 1, fx: 0.88, z: -5.5, h: 1.2 },
    { tex: 'fixtures/signpost', side: -1, fx: 0.6, z: -9, h: 2.4 }
  ],
  5: []
};

export class ThreeCanvas {
  constructor(containerEl) {
    this.container = containerEl;
    this.width = containerEl.clientWidth || window.innerWidth;
    this.height = containerEl.clientHeight || window.innerHeight;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB);
    this.scene.fog = new THREE.Fog(0xE8F4F8, 20, 78);
    this.stagePalettes = {};

    this.camera = new THREE.PerspectiveCamera(uxMode.fov, this.width / this.height, 0.1, 160);
    this.camera.position.copy(CAMERA_POS);
    this.camera.lookAt(LOOK_AT);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.id = 'three-canvas';
    this.container.appendChild(this.renderer.domElement);

    this.ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.95);
    this.scene.add(this.ambientLight);
    this.dirLight = new THREE.DirectionalLight(0xFFF0D0, 1.2);
    this.dirLight.position.set(10, 20, 10);
    this.scene.add(this.dirLight);

    this.textureLoader = new THREE.TextureLoader();
    this.textureCache = {};

    this.groundMesh = this.createGround();
    this.scene.add(this.groundMesh);

    this.skyTextures = {};
    this.currentStageNumber = 1;
    this.stage5GroundTexture = null;
    this.backdropMesh = this.createSkyBackdrop();
    this.scene.add(this.backdropMesh);
    this.preloadStageAssets();

    // Launchers + scenery sprites
    this.launchers = [];
    this.props = [];
    this.roadsideProps = [];

    // Stage 4 waves
    this.waveGroup = this.createWave();
    this.waveGroup.visible = false;
    this.scene.add(this.waveGroup);
    this.wave = { time: 0, period: 7.5, reachDepth: 0.5, frontZ: -40, cycle: -1, approaching: false };

    // Stage 3 fireworks
    this.fireworkLight = new THREE.PointLight(0xFF00FF, 0, 60);
    this.fireworkLight.position.set(0, 8, -15);
    this.scene.add(this.fireworkLight);

    this.debrisParticles = [];
    this.popSprites = [];
    this.fireworkParticles = [];
    this.debrisGeo = new THREE.TetrahedronGeometry(0.14, 0);
    this.popTexture = this.createPopTexture();

    this.shakeIntensity = 0;
    this.uvScrollOffset = 0;
    this.roadSpeed = 9;

    // Stage 5 rides one bed height higher so the hero frames like on the ground stages; the camera
    // also trails the truck a little (cameraFollow) and the truck body bounces (truckLift, metres)
    this.cameraBase = CAMERA_POS.clone();
    this.cameraFollow = new THREE.Vector3();
    this.truckLift = 0;

    this._vec = new THREE.Vector3();
    this.cameraRight = new THREE.Vector3(1, 0, 0);

    window.addEventListener('resize', () => this.onResize());
    window.addEventListener('claypop_ux_changed', () => this.onResize());
    this.onResize();
  }

  // ---------- Assets ----------

  loadTexture(path) {
    if (!this.textureCache[path]) {
      this.textureCache[path] = new Promise((resolve) => {
        this.textureLoader.load(
          `/assets/${path}.png`,
          (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            resolve(tex);
          },
          undefined,
          () => resolve(null)
        );
      });
    }
    return this.textureCache[path];
  }

  createGround() {
    const geo = new THREE.PlaneGeometry(160, 160, 1, 1);
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 900; i++) {
      const shade = 200 + Math.floor(Math.random() * 40);
      ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
      ctx.beginPath();
      ctx.arc(Math.random() * 512, Math.random() * 512, Math.random() * 3 + 1, 0, Math.PI * 2);
      ctx.fill();
    }
    this.defaultGroundTexture = new THREE.CanvasTexture(canvas);
    this.defaultGroundTexture.wrapS = THREE.RepeatWrapping;
    this.defaultGroundTexture.wrapT = THREE.RepeatWrapping;
    this.defaultGroundTexture.repeat.set(24, 24);
    this.groundTexture = this.defaultGroundTexture;

    // Ground spans z = +40 (v = 0) to z = -120 (v = 1); fade it out so the painted backdrop's own
    // foreground takes over before the horizon instead of meeting it in a hard seam.
    const fadeNearV = (40 + 18) / 160;
    const fadeFarV = (40 + 34) / 160;
    const alphaCanvas = document.createElement('canvas');
    alphaCanvas.width = 4;
    alphaCanvas.height = 256;
    const actx = alphaCanvas.getContext('2d');
    const grad = actx.createLinearGradient(0, 256, 0, 0);
    grad.addColorStop(0, '#FFFFFF');
    grad.addColorStop(fadeNearV, '#FFFFFF');
    grad.addColorStop(fadeFarV, '#000000');
    grad.addColorStop(1, '#000000');
    actx.fillStyle = grad;
    actx.fillRect(0, 0, 4, 256);
    const alphaMap = new THREE.CanvasTexture(alphaCanvas);

    const mat = new THREE.MeshStandardMaterial({
      map: this.defaultGroundTexture,
      alphaMap,
      transparent: true,
      color: 0x6BA347,
      roughness: 0.95
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(0, GROUND_Y, -40);
    mesh.renderOrder = -1;
    return mesh;
  }

  createSkyBackdrop() {
    const geo = new THREE.CylinderGeometry(90, 90, 70, 32, 1, true, -Math.PI * 0.7, Math.PI * 1.4);
    const mat = new THREE.MeshBasicMaterial({ side: THREE.BackSide, depthWrite: false, fog: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, 20, -10);
    return mesh;
  }

  createPopTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    g.translate(64, 64);
    g.fillStyle = 'rgba(255,248,210,0.95)';
    g.beginPath();
    for (let i = 0; i < 16; i++) {
      const r = i % 2 === 0 ? 60 : 26;
      const a = (i / 16) * Math.PI * 2;
      g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    g.closePath();
    g.fill();
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  preloadStageAssets() {
    for (let i = 1; i <= 5; i++) {
      this.textureLoader.load(`/assets/stages/stage0${i}_sky.png`, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        this.skyTextures[i] = tex;
        this.stagePalettes[i] = this.samplePalette(tex.image);
        if (this.currentStageNumber === i) this.setStageTheme(i);
      });
    }
    this.textureLoader.load('/assets/stages/ground_tile.png', (tex) => {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(2, 10);
      tex.colorSpace = THREE.SRGBColorSpace;
      this.stage5GroundTexture = tex;
      if (this.currentStageNumber === 5) this.setStageTheme(5);
    });
  }

  // Average colors of the painted backdrop: just above its horizon and its foreground strip
  samplePalette(image) {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(image, 0, 0, 64, 64);
    const avgRow = (v0, v1) => {
      const y0 = Math.floor(v0 * 64);
      const rows = Math.max(1, Math.floor((v1 - v0) * 64));
      const data = g.getImageData(0, y0, 64, rows).data;
      let r = 0;
      let gr = 0;
      let b = 0;
      for (let i = 0; i < data.length; i += 4) {
        r += data[i];
        gr += data[i + 1];
        b += data[i + 2];
      }
      const n = data.length / 4;
      return new THREE.Color(`rgb(${Math.round(r / n)},${Math.round(gr / n)},${Math.round(b / n)})`);
    };
    return { horizon: avgRow(0.55, 0.62), ground: avgRow(0.86, 0.98) };
  }

  applySkyTexture(stageNumber) {
    const tex = this.skyTextures[stageNumber];
    if (tex) {
      this.backdropMesh.material.map = tex;
      this.backdropMesh.material.needsUpdate = true;
      this.scene.background = tex;
    }
  }

  // ---------- Projection helpers ----------

  project(worldVec) {
    const p = this._vec.copy(worldVec).project(this.camera);
    return {
      x: (p.x + 1) * 0.5 * this.width,
      y: (1 - p.y) * 0.5 * this.height,
      visible: p.z > -1 && p.z < 1
    };
  }

  // World point on the plane z = const under screen fraction (u, v)
  unprojectAtZ(u, v, z) {
    const ndc = new THREE.Vector3(u * 2 - 1, 1 - v * 2, 0.5).unproject(this.camera);
    const dir = ndc.sub(this.camera.position).normalize();
    const t = (z - this.camera.position.z) / dir.z;
    return this.camera.position.clone().addScaledVector(dir, t);
  }

  // View ray through screen fraction (u, v); depends only on the camera's orientation
  viewRay(u, v) {
    const ndc = new THREE.Vector3(u * 2 - 1, 1 - v * 2, 0.5).unproject(this.camera);
    return ndc.sub(this.camera.position).normalize();
  }

  // Layout helpers below use the resting camera (no follow, bounce or shake) so the lane / depth
  // grid doesn't move with the view
  halfWidthAt(z) {
    const dir = this.viewRay(0, 0.5);
    const t = (z - this.cameraBase.z) / dir.z;
    return Math.abs(dir.x * t);
  }

  // Floor the hero stands on: the ground, or the pickup bed on Stage 5
  getFloorY() {
    return this.currentStageNumber === 5 ? GROUND_Y + STAGE5_BED_HEIGHT : GROUND_Y;
  }

  // Floor z where the bottom edge of the screen meets it
  getNearGroundZ() {
    const dir = this.viewRay(0.5, 1);
    if (dir.y >= -1e-3) return -2;
    const t = (this.getFloorY() - this.cameraBase.y) / dir.y;
    return this.cameraBase.z + dir.z * t;
  }

  // Player feet line: depth 0 (nearest) .. 1 (farthest)
  getPlayerLineZ(depth) {
    return this.getNearGroundZ() - 1.0 - depth * 3.4;
  }

  getPlayerWorld(player) {
    const z = this.getPlayerLineZ(player.depth);
    const half = this.halfWidthAt(z) * 0.8;
    const lift = this.currentStageNumber === 5 ? this.truckLift : 0;
    return new THREE.Vector3(player.lane * half, this.getFloorY() + lift, z);
  }

  getLaunchPoint(side) {
    const z = LAUNCH_Z;
    const half = this.halfWidthAt(z);
    return new THREE.Vector3(side * half * 0.93, GROUND_Y + 1.3, z);
  }

  // ---------- Stage theme ----------

  setStageTheme(stageNumber) {
    this.currentStageNumber = stageNumber;
    this.cameraBase.copy(CAMERA_POS);
    if (stageNumber === 5) this.cameraBase.y += STAGE5_BED_HEIGHT;
    this.cameraFollow.set(0, 0, 0);
    this.truckLift = 0;
    this.roadSpeed = 9;
    this.applySkyTexture(stageNumber);
    const mat = this.groundMesh.material;
    mat.map = this.defaultGroundTexture;
    this.groundTexture = this.defaultGroundTexture;
    this.waveGroup.visible = false;
    this.fireworkLight.intensity = 0;

    const themes = {
      1: { fog: 0xE8F4F8, ground: 0x7DB04F, ambient: 0.95 },
      2: { fog: 0xD0E0F0, ground: 0x4E9A45, ambient: 1.05 },
      3: { fog: 0x141630, ground: 0x2A3A2A, ambient: 0.5 },
      4: { fog: 0xE1F5FE, ground: 0xF3DFB5, ambient: 1.05 },
      5: { fog: 0xFBE9E7, ground: 0xC2884A, ambient: 1.0 }
    };
    const th = themes[stageNumber] || themes[1];
    const palette = this.stagePalettes[stageNumber];
    this.scene.fog.color = palette ? palette.horizon.clone() : new THREE.Color(th.fog);
    mat.color = palette && stageNumber <= 3
      ? palette.ground.clone().lerp(new THREE.Color(th.ground), 0.6)
      : new THREE.Color(th.ground);
    this.ambientLight.intensity = th.ambient;

    if (stageNumber === 4) {
      this.waveGroup.visible = true;
      this.wave.time = 0;
      this.wave.cycle = -1;
      this.wave.frontZ = -40;
    }
    if (stageNumber === 5 && this.stage5GroundTexture) {
      mat.map = this.stage5GroundTexture;
      mat.color = new THREE.Color(0xFFFFFF);
      this.groundTexture = this.stage5GroundTexture;
    }
    mat.needsUpdate = true;
    this.rebuildScenery();
  }

  clearScenery() {
    [...this.launchers, ...this.props, ...this.roadsideProps].forEach((s) => {
      this.scene.remove(s);
      s.material.dispose();
    });
    this.launchers = [];
    this.props = [];
    this.roadsideProps = [];
  }

  makeGroundSprite(tex, heightWorld, tint = 0xFFFFFF) {
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, alphaTest: 0.35, color: tint });
    const sprite = new THREE.Sprite(mat);
    const aspect = tex.image ? tex.image.width / tex.image.height : 1;
    sprite.scale.set(heightWorld * aspect, heightWorld, 1);
    sprite.center.set(0.5, 0.0);
    return sprite;
  }

  async rebuildScenery() {
    const token = Symbol('scenery');
    this._sceneryToken = token;
    const stage = this.currentStageNumber;
    const tint = stage === 3 ? 0x8088B8 : 0xFFFFFF;

    const launcherTex = await this.loadTexture('fixtures/clay_launcher');
    const propDefs = STAGE_PROPS[stage] || [];
    const propTextures = await Promise.all(propDefs.map((p) => this.loadTexture(p.tex)));
    const fenceTex = stage === 5 ? await this.loadTexture('fixtures/fence') : null;
    if (this._sceneryToken !== token) return;

    this.clearScenery();

    if (launcherTex) {
      [-1, 1].forEach((side) => {
        const s = this.makeGroundSprite(launcherTex, 1.7, tint);
        const p = this.getLaunchPoint(side);
        s.position.set(p.x, GROUND_Y + (stage === 5 ? 0 : 0), p.z + 0.3);
        if (side > 0) s.material.rotation = 0;
        s.scale.x *= side < 0 ? 1 : -1;
        this.scene.add(s);
        this.launchers.push(s);
      });
    }

    propDefs.forEach((def, i) => {
      const tex = propTextures[i];
      if (!tex) return;
      const s = this.makeGroundSprite(tex, def.h, tint);
      s.position.set(def.side * this.halfWidthAt(def.z) * def.fx, GROUND_Y, def.z);
      if (def.side > 0 && def.tex.startsWith('npc/')) s.scale.x *= -1;
      this.scene.add(s);
      this.props.push(s);
    });

    if (fenceTex) {
      for (let i = 0; i < 10; i++) {
        [-1, 1].forEach((side) => {
          const s = this.makeGroundSprite(fenceTex, 1.2);
          s.userData.side = side;
          s.position.set(0, GROUND_Y, -4 - i * 4.5);
          this.scene.add(s);
          this.roadsideProps.push(s);
        });
      }
      this.layoutRoadside();
    }
  }

  layoutRoadside() {
    this.roadsideProps.forEach((s) => {
      s.position.x = s.userData.side * Math.max(4.5, this.halfWidthAt(s.position.z) * 0.92);
    });
  }

  // ---------- Stage 4 waves ----------

  // Shoreline water: one shader surface whose irregular front washes up the sand. Behind the front
  // a breaking crest rolls in with foam, the shallows stay translucent over the sand, and the
  // area the water just left is drawn as darker wet sand. The far end fades into the painted sea.
  createWave() {
    const group = new THREE.Group();
    const geo = new THREE.PlaneGeometry(160, 52, 200, 130);
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, 0, -17);
    this.waterUniforms = {
      uTime: { value: 0 },
      uFrontZ: { value: -40 },
      uSlope: { value: 0 },
      uCrest: { value: 0 },
      uWetZ: { value: -40 },
      uWetness: { value: 0 },
      uShallow: { value: new THREE.Color(0x74E8DE) },
      uDeep: { value: new THREE.Color(0x22A9C2) },
      uFar: { value: new THREE.Color(0x4CD3CE) },
      uSand: { value: new THREE.Color(0xC9A877) }
    };
    const shared = /* glsl */ `
      uniform float uTime, uFrontZ, uSlope, uCrest;
      float hash1(float n) { return fract(sin(n) * 43758.5453); }
      float noise1(float x) {
        float i = floor(x); float f = fract(x); f = f * f * (3.0 - 2.0 * f);
        return mix(hash1(i), hash1(i + 1.0), f);
      }
      // Irregular wave front (world z) at world x
      float frontAt(float x, float base) {
        return base + x * uSlope
          + (noise1(x * 0.32 + uTime * 0.12) - 0.5) * 1.1
          + (noise1(x * 1.25 - uTime * 0.35) - 0.5) * 0.3;
      }
    `;
    const mat = new THREE.ShaderMaterial({
      uniforms: this.waterUniforms,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      vertexShader: /* glsl */ `
        ${shared}
        varying vec3 vWorld;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          float d = frontAt(wp.x, uFrontZ) - wp.z;
          float swell = 0.05 * sin(wp.x * 0.7 + uTime * 1.3)
            + 0.07 * sin(wp.z * 0.9 - uTime * 1.8)
            + 0.03 * sin((wp.x + wp.z) * 1.7 + uTime * 2.3);
          swell *= smoothstep(0.0, 3.0, d);
          float crest = uCrest * 0.5 * exp(-pow((d - 0.9) / 0.6, 2.0));
          wp.y += max(0.0, swell) + crest;
          vWorld = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: /* glsl */ `
        ${shared}
        uniform float uWetZ, uWetness;
        uniform vec3 uShallow, uDeep, uFar, uSand;
        varying vec3 vWorld;
        float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise2(vec2 p) {
          vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash2(i), hash2(i + vec2(1, 0)), f.x), mix(hash2(i + vec2(0, 1)), hash2(i + vec2(1, 1)), f.x), f.y);
        }
        float fbm(vec2 p) {
          float v = 0.0; float a = 0.5;
          for (int i = 0; i < 4; i++) { v += a * noise2(p); p *= 2.03; a *= 0.5; }
          return v;
        }
        void main() {
          float farFade = 1.0 - smoothstep(22.0, 34.0, -vWorld.z);
          float d = frontAt(vWorld.x, uFrontZ) - vWorld.z;
          if (d < 0.0) {
            float wd = frontAt(vWorld.x, uWetZ) - vWorld.z;
            float a = uWetness * smoothstep(0.0, 0.8, wd) * 0.42 * farFade;
            if (a < 0.01) discard;
            gl_FragColor = vec4(uSand * 0.62, a);
            #include <colorspace_fragment>
            return;
          }
          float depth = smoothstep(0.0, 12.0, d);
          vec3 col = mix(uShallow, uDeep, depth);
          float n = fbm(vWorld.xz * vec2(0.55, 1.1) + vec2(uTime * 0.22, uTime * 0.08));
          col *= 0.9 + n * 0.22;
          float glint = smoothstep(0.8, 0.9, fbm(vWorld.xz * vec2(2.4, 5.0) + vec2(uTime * 0.6, -uTime * 0.3)));
          col += glint * 0.45 * (0.4 + depth * 0.6);
          // Match the painted sea where the surface hands over to the backdrop
          col = mix(col, uFar * (0.92 + n * 0.16), smoothstep(14.0, 28.0, -vWorld.z));

          float edgeFoam = 1.0 - smoothstep(0.0, 0.35 + n * 0.55, d);
          float crestFoam = uCrest * exp(-pow((d - 0.9) / 0.45, 2.0)) * smoothstep(0.35, 0.6, fbm(vWorld.xz * vec2(2.0, 4.0) + uTime));
          float lace = smoothstep(0.52, 0.7, fbm(vWorld.xz * vec2(1.5, 3.2) + vec2(0.0, uTime * 0.45))) * (1.0 - smoothstep(0.4, 3.2, d));
          float foam = clamp(max(edgeFoam, crestFoam) + lace * 0.75, 0.0, 1.0);
          col = mix(col, vec3(1.0), foam * 0.93);

          float alpha = mix(0.5, 0.93, smoothstep(0.0, 3.0, d));
          alpha = max(alpha, foam * 0.95) * smoothstep(0.0, 0.05, d) * farFade;
          gl_FragColor = vec4(col, alpha);
          #include <colorspace_fragment>
        }
      `
    });
    this.waterMesh = new THREE.Mesh(geo, mat);
    this.waterMesh.renderOrder = 1;
    this.waterMesh.frustumCulled = false;
    group.add(this.waterMesh);
    group.position.y = GROUND_Y + 0.03;
    return group;
  }

  // Wave front line in world z for a given x (collision uses the smooth front, without the visual ripple)
  waveFrontZAt(x) {
    return this.wave.frontZ + x * this.wave.slope;
  }

  updateWave(dt) {
    const w = this.wave;
    w.time += dt;
    const cycle = Math.floor(w.time / w.period);
    if (cycle !== w.cycle) {
      w.cycle = cycle;
      w.reachDepth = 0.15 + Math.random() * 0.75;
      w.slope = (Math.random() - 0.5) * 0.12;
      w.approaching = true;
      this.onWaveCycle?.();
    }
    const phase = (w.time % w.period) / w.period;
    const farZ = -26;
    const reachZ = this.getPlayerLineZ(w.reachDepth) + 0.2;
    let k;
    if (phase < 0.45) k = Math.sin((phase / 0.45) * Math.PI * 0.5);
    else if (phase < 0.6) k = 1;
    else k = 1 - (phase - 0.6) / 0.4;
    w.approaching = phase < 0.6;
    w.frontZ = farZ + (reachZ - farZ) * Math.max(0, k);

    // Crest builds while the wave rolls in, then collapses into swash as it reaches the beach
    const crest = phase < 0.45 ? Math.min(1, phase / 0.12) * (1 - Math.max(0, (phase - 0.3) / 0.15)) : 0;
    // Sand the swash just covered stays dark and dries out before the next wave
    if (phase < 0.6) {
      w.wetZ = Math.max(w.wetZ ?? -40, w.frontZ);
      w.wetness = 1;
    } else {
      w.wetness = Math.max(0, 1 - (phase - 0.6) / 0.4) ** 0.6;
    }
    if (phase < 0.02) w.wetZ = w.frontZ;

    const u = this.waterUniforms;
    u.uTime.value = w.time;
    u.uFrontZ.value = w.frontZ;
    u.uSlope.value = w.slope;
    u.uCrest.value = crest;
    u.uWetZ.value = w.wetZ;
    u.uWetness.value = w.wetness;
  }

  isWaveTouching(playerWorld) {
    if (this.currentStageNumber !== 4 || !this.waveGroup.visible) return false;
    return this.waveFrontZAt(playerWorld.x) >= playerWorld.z - 0.15;
  }

  // ---------- Effects ----------

  spawnClayDebris(pos, color = 0xFF5500) {
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.1 });
    for (let i = 0; i < 30; i++) {
      const mesh = new THREE.Mesh(this.debrisGeo, mat);
      mesh.position.copy(pos);
      const a = Math.random() * Math.PI * 2;
      const e = (Math.random() - 0.25) * Math.PI;
      const sp = 3.5 + Math.random() * 6.5;
      const vel = new THREE.Vector3(Math.cos(a) * Math.cos(e) * sp, Math.sin(e) * sp + 2.5, Math.sin(a) * Math.cos(e) * sp);
      const rot = new THREE.Vector3((Math.random() - 0.5) * 16, (Math.random() - 0.5) * 16, (Math.random() - 0.5) * 16);
      this.scene.add(mesh);
      this.debrisParticles.push({ mesh, vel, rot, life: 1.0, maxLife: 1.0 });
    }

    const pop = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.popTexture, transparent: true, depthWrite: false }));
    pop.position.copy(pos);
    pop.scale.set(0.5, 0.5, 1);
    this.scene.add(pop);
    this.popSprites.push({ sprite: pop, life: 0.22 });

    this.addCameraShake(0.1);
  }

  triggerFireworks() {
    this.fireworkLight.intensity = 3.5;
    this.fireworkLight.color.setHSL(Math.random(), 0.9, 0.6);
    this.fireworkLight.position.set((Math.random() - 0.5) * 24, 12 + Math.random() * 6, -26);
    const geo = new THREE.SphereGeometry(0.14, 6, 6);
    const mat = new THREE.MeshBasicMaterial({ color: this.fireworkLight.color.getHex(), fog: false });
    for (let i = 0; i < 44; i++) {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(this.fireworkLight.position);
      const a = Math.random() * Math.PI * 2;
      const e = (Math.random() - 0.5) * Math.PI;
      const sp = 6 + Math.random() * 6;
      const vel = new THREE.Vector3(Math.cos(a) * Math.cos(e) * sp, Math.sin(e) * sp, Math.sin(a) * Math.cos(e) * sp);
      this.scene.add(mesh);
      this.fireworkParticles.push({ mesh, vel, life: 1.3 });
    }
  }

  addCameraShake(intensity) {
    this.shakeIntensity = Math.min(0.35, this.shakeIntensity + intensity);
  }

  // ---------- Frame ----------

  update(dt) {
    const stage = this.currentStageNumber;

    if (stage === 4 && this.waveGroup.visible) this.updateWave(dt);

    if (stage === 5) {
      if (this.groundTexture) {
        this.uvScrollOffset += dt * 0.1 * this.roadSpeed;
        this.groundTexture.offset.y = this.uvScrollOffset;
      }
      this.roadsideProps.forEach((s) => {
        s.position.z += dt * this.roadSpeed;
        if (s.position.z > 2) s.position.z -= 45;
      });
      this.layoutRoadside();
    }

    for (let i = this.debrisParticles.length - 1; i >= 0; i--) {
      const p = this.debrisParticles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.debrisParticles.splice(i, 1);
        continue;
      }
      p.vel.y -= 14 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.rotation.x += p.rot.x * dt;
      p.mesh.rotation.y += p.rot.y * dt;
      p.mesh.scale.setScalar(Math.max(0.05, p.life / p.maxLife));
    }

    for (let i = this.popSprites.length - 1; i >= 0; i--) {
      const p = this.popSprites[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.sprite);
        p.sprite.material.dispose();
        this.popSprites.splice(i, 1);
        continue;
      }
      const k = 1 - p.life / 0.22;
      p.sprite.scale.setScalar(0.6 + k * 2.6);
      p.sprite.material.opacity = 1 - k;
    }

    if (this.fireworkLight.intensity > 0) this.fireworkLight.intensity = Math.max(0, this.fireworkLight.intensity - dt * 3);
    for (let i = this.fireworkParticles.length - 1; i >= 0; i--) {
      const fp = this.fireworkParticles[i];
      fp.life -= dt;
      if (fp.life <= 0) {
        this.scene.remove(fp.mesh);
        this.fireworkParticles.splice(i, 1);
        continue;
      }
      fp.vel.y -= 3.5 * dt;
      fp.mesh.position.addScaledVector(fp.vel, dt);
      fp.mesh.scale.setScalar(fp.life);
    }

    const bump = stage === 5 ? Math.sin(performance.now() * 0.018) * 0.025 : 0;
    this.camera.position.copy(this.cameraBase).add(this.cameraFollow);
    this.camera.position.y += bump;
    if (this.shakeIntensity > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this.shakeIntensity;
      this.camera.position.y += (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeIntensity = Math.max(0, this.shakeIntensity - dt * 0.9);
    }
    this.camera.updateMatrixWorld();
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  onResize() {
    this.width = this.container.clientWidth || window.innerWidth;
    this.height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = this.width / this.height;
    this.camera.fov = uxMode.fov;
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
    this.cameraRight.set(1, 0, 0).applyQuaternion(this.camera.quaternion);
    this.renderer.setSize(this.width, this.height);
    if (this.launchers.length || this.props.length) this.rebuildScenery();
  }
}
