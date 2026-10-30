// src/core/HybridGameManager.js
// Orchestrator: Three.js world + Phaser 3 overlay + input + UI flow + admin-only pause

import * as THREE from 'three';
import { ThreeCanvas, GROUND_Y } from '../renderer/ThreeCanvas.js';
import { PhaserOverlay } from '../phaser/PhaserOverlay.js';
import { PlayerCharacter, CHARACTER_STATES, CHARACTER_DISPLAY_SCALE } from '../entities/PlayerCharacter.js';
import { LeadShotPhysics } from '../physics/LeadShotPhysics.js';
import { StageManager, CLAY_PEAK_V } from '../stages/StageManager.js';
import { TruckRide, TRUCK_LANE_MAX, TRUCK_DEPTH_RANGE } from '../stages/TruckRide.js';
import { TARGET_TYPES, DEBRIS_COLORS, preloadTargetTextures } from '../entities/ClayTarget.js';
import { targetCatalog, TARGET_DEFS } from '../config/targetCatalog.js';
import { InputController } from '../input/InputController.js';
import { soundSynth } from '../audio/SoundSynth.js';
import { gameState, GameStates } from './GameState.js';
import { GameScheduler } from './GameScheduler.js';
import { auth } from './firebase.js';
import { cloud } from './cloud.js';
import { i18n } from './i18n.js';

import { IntroCutscene } from '../ui/IntroCutscene.js';
import { AuthUI } from '../ui/AuthUI.js';
import { LobbyUI } from '../ui/LobbyUI.js';
import { GameSetupUI } from '../ui/GameSetupUI.js';
import { HudUI } from '../ui/HudUI.js';
import { ResultUI } from '../ui/ResultUI.js';
import { AdminPauseButton } from '../ui/AdminPauseButton.js';
import { AccountUI } from '../ui/AccountUI.js';
import { showToast } from '../ui/dom.js';
import { StageCutscene, cutsceneUrl } from '../ui/StageCutscene.js';

const FIRE_COOLDOWN = 0.28;
const CLEAR_SCORE = 500;
const JEEP_WIDTH_M = 2.5;
const AIM_BAND_BELOW = 0.03; // bottom aim line sits this far (screen height) under the flattest arc's peak
const AIM_HEAD_GAP = 0.12; // the muzzle sits ~0.07 above the hat line; keep the bottom line clear of it

export class HybridGameManager {
  constructor() {
    this.gameContainer = document.getElementById('game-container');

    this.player = new PlayerCharacter('young_cowboy');
    this.three = new ThreeCanvas(this.gameContainer);
    this.overlay = new PhaserOverlay(this.gameContainer);
    this.stageManager = new StageManager(this.three, this.overlay, soundSynth, gameState);
    this.truck = new TruckRide(this.three);
    this.truck.onBump = (kind, scale) => {
      soundSynth.playTruckBump(scale);
      if (scale >= 1 && gameState.currentState === GameStates.PLAYING) {
        this.overlay.spawnNotice(i18n.t(kind === 'rock' ? 'notice_bump_rock' : 'notice_bump_pothole'), 'penalty');
      }
    };
    this.scheduler = new GameScheduler();

    this.gameState = gameState;
    this.paused = false;
    this.debugHitbox = true;
    this.lastShotAt = -Infinity;
    this.gameClock = 0;

    this.input = new InputController(this.player, {
      onShoot: () => this.onPlayerShoot(),
      onTogglePause: () => this.requestAdminPause()
    });

    this.introUI = new IntroCutscene(this.gameContainer, () => this.onIntroComplete());
    this.cutscene = new StageCutscene();
    this.accountUI = new AccountUI({ onLoggedOut: () => this.onLoggedOut() });
    this.authUI = new AuthUI((user, meta) => this.onAuthSuccess(user, meta), () => this.onAuthCancel());
    this.lobbyUI = new LobbyUI(
      () => this.onLobbyPlayClick(),
      () => this.openAuth(),
      () => this.accountUI.openMyPage()
    );
    this.setupUI = new GameSetupUI(
      (char, mode, stage) => this.startGameplay(char, mode, stage),
      () => this.onSetupBackClick()
    );
    this.hudUI = new HudUI();
    this.resultUI = new ResultUI(
      () => this.onNextStageClick(),
      () => this.onRetryClick(),
      () => this.onLobbyReturnClick()
    );
    this.adminPause = new AdminPauseButton({
      onToggle: () => this.requestAdminPause(),
      onToggleHitbox: (on) => { this.debugHitbox = on; },
      onToggleInvincible: (on) => { gameState.isInvincible = on; },
      onSpawn: () => this.adminSpawnTarget(),
      onFever: () => gameState.startFeverTime()
    });

    this.three.onWaveCycle = () => {
      if (gameState.currentState === GameStates.PLAYING && gameState.timeRemaining < gameState.totalTime - 1) {
        this.overlay.spawnNotice(i18n.t('notice_wave_warning'), 'penalty');
      }
    };

    gameState.subscribe((event, data) => this.onGameEvent(event, data));
    window.addEventListener('claypop_auth_changed', () => this.refreshAdminUI());

    targetCatalog.load().then(() => preloadTargetTextures());

    this.lastTime = performance.now();
    this.initFlow();
    requestAnimationFrame((t) => this.mainLoop(t));
  }

  // ---------- Flow ----------

  initFlow() {
    gameState.setState(GameStates.INTRO);
    this.introUI.start();
  }

  onIntroComplete() {
    gameState.setState(GameStates.LOBBY);
    this.lobbyUI.show();
  }

  onLobbyPlayClick() {
    if (auth.getUser()) {
      this.lobbyUI.hide();
      gameState.setState(GameStates.SETUP);
      this.setupUI.show();
      return;
    }
    this.openAuth();
  }

  openAuth() {
    gameState.setState(GameStates.LOGIN);
    this.lobbyUI.hide();
    this.authUI.open();
  }

  onAuthCancel() {
    gameState.setState(GameStates.LOBBY);
    this.lobbyUI.show();
  }

  // New sign-ups land on the first screen; logins continue to game setup
  onAuthSuccess(user, meta = {}) {
    this.refreshAdminUI();
    if (meta.signup) {
      gameState.setState(GameStates.LOBBY);
      this.lobbyUI.show();
      showToast(i18n.t('signup_success', { name: user.displayName }));
      return;
    }
    this.lobbyUI.hide();
    gameState.setState(GameStates.SETUP);
    this.setupUI.show(i18n.t('login_success', { name: user.displayName }));
  }

  // Logout from the lobby, setup or result screen always returns to the first screen
  onLoggedOut() {
    const s = gameState.currentState;
    if (s === GameStates.SETUP) this.setupUI.hide();
    if (s === GameStates.RESULT) {
      this.resultUI.hide();
      this.onLobbyReturnClick();
      return;
    }
    gameState.setState(GameStates.LOBBY);
    this.refreshAdminUI();
    this.lobbyUI.show();
  }

  onSetupBackClick() {
    this.setupUI.hide();
    gameState.setState(GameStates.LOBBY);
    this.lobbyUI.show();
  }

  isInGame() {
    const s = gameState.currentState;
    return s === GameStates.PLAYING || s === GameStates.ENDING;
  }

  async startGameplay(charId, modeId, stageNumber) {
    if (this.cutscene.active) return;
    this.lobbyUI.hide();
    this.setupUI.hide();
    this.resultUI.hide();
    this.setPaused(false);
    this.scheduler.clear();
    this.overlay.clearTransient();
    this.hudUI.hide();
    this.input.setVisible(false);
    soundSynth.stopWesternBgm();

    const opening = this.cutscene.play(cutsceneUrl('opening', stageNumber, charId));
    this.player.setCharacter(charId);
    this.player.reset();
    await Promise.all([opening, this.overlay.setCharacter(charId)]);

    // The previous round may have kept running under the cutscene (e.g. a Stage 4 wave flinch)
    this.player.reset();
    gameState.resetGameSession(stageNumber, charId, modeId);
    gameState.setState(GameStates.PLAYING);
    this.stageManager.startStage(stageNumber);
    this.applyStageLimits();

    this.hudUI.setStage(stageNumber);
    this.hudUI.show();
    this.input.setVisible(true);
    this.refreshAdminUI();
    this.cutscene.hide();
    this.cutscene.prefetch(['clear', 'fail'].map((o) => cutsceneUrl('ending', stageNumber, charId, o)));

    soundSynth.startWesternBgm();
    this.overlay.spawnNotice(i18n.t('notice_stage_start'));
  }

  applyStageLimits() {
    if (gameState.currentStageNumber === 5) {
      // The arrows steer the whole pickup (TruckRide); the hero stays seated in it
      this.truck.reset(true);
      this.player.setLimits([-TRUCK_LANE_MAX, TRUCK_LANE_MAX], TRUCK_DEPTH_RANGE);
      this.player.lane = this.truck.lane;
      this.player.depth = this.truck.depth;
    } else {
      this.truck.reset(false);
      this.player.setLimits([-1, 1], [0, 1]);
    }
  }

  // ---------- Shooting ----------

  getCrosshairPx() {
    return { x: this.player.aimU * this.three.width, y: this.player.aimV * this.three.height };
  }

  onPlayerShoot() {
    if (gameState.currentState !== GameStates.PLAYING || this.paused) return;
    if (this.player.state === CHARACTER_STATES.WAVE_FLINCH) return;
    if (this.gameClock - this.lastShotAt < FIRE_COOLDOWN) return;
    this.lastShotAt = this.gameClock;

    this.updateCrosshair();
    const M = this.getCrosshairPx();
    soundSynth.playShotgunBlast();
    this.overlay.spawnMuzzleFlash(M);
    this.player.triggerShoot();
    this.three.addCameraShake(0.06);
    gameState.addShot();

    let best = null;
    for (const target of this.stageManager.targets) {
      if (!target.isAlive) continue;
      const probe = target.getScreenProbe(this.three);
      if (!probe.visible) continue;
      const res = LeadShotPhysics.evaluate(
        probe,
        M,
        targetCatalog.getHitTuning(target.type),
        this.player.stats.leadZoneBonus
      );
      if (res.isHit && (!best || res.score < best.res.score)) best = { target, res };
    }

    if (best) {
      this.handleTargetHit(best.target, best.res.isPerfectLead);
    } else {
      gameState.addMiss();
      this.overlay.spawnNotice(i18n.t('notice_miss'), 'penalty');
    }
  }

  shatter(target) {
    this.three.spawnClayDebris(target.position, DEBRIS_COLORS[target.type]);
    target.destroy(this.three.scene);
  }

  handleTargetHit(target, isPerfectLead) {
    const type = target.type;
    soundSynth.playClayShatter(type !== TARGET_TYPES.DISC);

    if (type === TARGET_TYPES.HAT) {
      this.shatter(target);
      gameState.score = Math.max(0, gameState.score + TARGET_DEFS[type].points);
      gameState.combo = 0;
      gameState.chainHits = 0;
      gameState.notify('stats_updated');
      this.overlay.spawnNotice(i18n.t('notice_hat_penalty'), 'penalty');
      this.overlay.popNpc('npc_angry', 'left');
      return;
    }

    if (type === TARGET_TYPES.BADGE) {
      this.shatter(target);
      gameState.timeRemaining += 5.0;
      gameState.addHit(TARGET_DEFS[type].points * 3, isPerfectLead, type);
      this.overlay.spawnNotice(i18n.t('notice_badge_bonus'), 'bonus');
      return;
    }

    if (type === TARGET_TYPES.DYNAMITE) {
      this.shatter(target);
      soundSynth.playDynamiteBlast();
      this.three.addCameraShake(0.3);
      this.stageManager.destroyAllClaysWithDynamite((t) => {
        this.three.spawnClayDebris(t.position, DEBRIS_COLORS[t.type]);
        gameState.addHit(TARGET_DEFS[t.type]?.points || 100, false, t.type);
      });
      gameState.addHit(TARGET_DEFS[type].points, false, type);
      this.overlay.spawnNotice(i18n.t('notice_dynamite_boom'), 'bonus');
      return;
    }

    this.shatter(target);
    const pts = gameState.addHit(TARGET_DEFS[type]?.points || 100, isPerfectLead, type);
    if (isPerfectLead) this.overlay.spawnNotice(`${i18n.t('notice_perfect_lead_short')} +${pts}`, 'bonus');
    else this.overlay.spawnNotice(`HIT! +${pts}`);

    if (gameState.combo >= 3 && gameState.combo % 3 === 0) {
      this.overlay.spawnNotice(i18n.t('notice_combo', { combo: gameState.combo }));
    }
    if (gameState.combo > 0 && gameState.combo % 5 === 0) {
      this.overlay.popNpc('npc_cheer', 'right');
    }
  }

  onGameEvent(event) {
    if (event === 'fever_started') {
      soundSynth.playFeverWhistle?.();
      this.overlay.spawnNotice(i18n.t('notice_fever_start'), 'bonus');
      this.overlay.popNpc('npc_dog', 'left');
    } else if (event === 'fever_ended' && gameState.currentState === GameStates.PLAYING) {
      this.overlay.spawnNotice(i18n.t('notice_fever_end'));
    }
  }

  checkWave(playerWorld) {
    if (gameState.currentStageNumber !== 4 || gameState.isFlinching) return;
    if (!this.three.isWaveTouching(playerWorld)) return;

    gameState.triggerWaveFlinch();
    this.player.triggerFlinch();
    soundSynth.playWaveSplash();
    // Forced misfire
    soundSynth.playShotgunBlast();
    this.overlay.spawnMuzzleFlash(null);
    gameState.addShot();
    gameState.addMiss();
    this.overlay.spawnNotice(i18n.t('notice_wave_flinch'), 'penalty');
  }

  // ---------- Ending ----------

  async beginEnding() {
    if (this.cutscene.active) return;
    this.setPaused(false);
    this.input.setVisible(false);
    this.hudUI.hide();
    this.stageManager.clearAllTargets();
    this.overlay.clearTransient();
    soundSynth.stopWesternBgm();

    const isClear = gameState.score >= CLEAR_SCORE;
    await this.cutscene.play(cutsceneUrl('ending', gameState.currentStageNumber, this.player.charId, isClear ? 'clear' : 'fail'));

    gameState.setState(GameStates.RESULT);
    this.refreshAdminUI();
    this.overlay.setView(null);
    this.resultUI.showResult(isClear, { instant: true });
    this.cutscene.hide();
    this.recordRun(isClear);
  }

  recordRun(isClear) {
    const user = auth.getUser();
    if (!user) return;
    cloud.addRun(user.uid, {
      stage: gameState.currentStageNumber,
      character: this.player.charId,
      mode: gameState.selectedTargetMode || 'clay_disc',
      score: Math.max(0, Math.round(gameState.score)),
      hits: gameState.totalHits,
      shots: gameState.totalShots,
      maxCombo: gameState.maxCombo,
      clear: isClear
    }, { guest: user.isAnonymous }).catch((err) => console.warn('[CloudSave] run record failed:', err.code || err));
  }

  onNextStageClick() {
    if (gameState.currentStageNumber < 5) {
      this.startGameplay(this.player.charId, gameState.selectedTargetMode, gameState.currentStageNumber + 1);
    } else {
      this.onLobbyReturnClick();
    }
  }

  onRetryClick() {
    this.startGameplay(this.player.charId, gameState.selectedTargetMode, gameState.currentStageNumber);
  }

  onLobbyReturnClick() {
    soundSynth.stopWesternBgm();
    this.setPaused(false);
    this.scheduler.clear();
    this.hudUI.hide();
    this.input.setVisible(false);
    this.stageManager.clearAllTargets();
    this.overlay.setView(null);
    this.resultUI.hide();
    gameState.setState(GameStates.LOBBY);
    this.refreshAdminUI();
    this.lobbyUI.show();
  }

  // ---------- Admin pause (verified admins only) ----------

  refreshAdminUI() {
    const allowed = auth.isCurrentUserAdmin() && this.isInGame();
    if (!allowed && this.paused) this.setPaused(false);
    this.adminPause.setAvailable(allowed);
    document.body.classList.toggle('admin-in-game', allowed);
  }

  requestAdminPause() {
    if (!auth.isCurrentUserAdmin() || !this.isInGame() || this.cutscene.active) return;
    this.setPaused(!this.paused);
  }

  setPaused(paused) {
    if (this.paused === paused) return;
    if (paused && !auth.isCurrentUserAdmin()) return;
    this.paused = paused;
    gameState.isAdminPause = paused;
    this.overlay.setPaused(paused);
    this.adminPause.setPaused(paused);
    document.body.classList.toggle('game-paused', paused);
    if (paused) this.input.releaseLock();
    else if (gameState.currentState === GameStates.PLAYING) this.input.resumeLock();
    if (paused) soundSynth.stopWesternBgm();
    else if (gameState.currentState === GameStates.PLAYING) soundSynth.startWesternBgm();
  }

  adminSpawnTarget() {
    if (!auth.isCurrentUserAdmin()) return;
    const types = [TARGET_TYPES.DISC, TARGET_TYPES.BOOMERANG, TARGET_TYPES.UFO];
    const t = this.stageManager.spawnTarget(types[Math.floor(Math.random() * types.length)], 3, Math.random() < 0.5 ? 'left' : 'right');
    t.update(t.duration * 0.35, 1);
  }

  // ---------- View for the Phaser overlay ----------

  getCharacterScreen() {
    const pw = this.three.getPlayerWorld(this.player);
    const feet = this.three.project(pw);
    const height = this.player.stats.worldHeight * CHARACTER_DISPLAY_SCALE;
    const head = this.three.project(pw.clone().add(new THREE.Vector3(0, height, 0)));
    return { feetX: feet.x, feetY: feet.y, heightPx: Math.max(40, feet.y - head.y) };
  }

  // The crosshair always sits on the character's barrel line for the current 5-degree gun angle
  updateCrosshair() {
    const c = this.getCharacterScreen();
    const angle = this.player.aimAngle;
    let origin = this.overlay.getAimOrigin(angle, c.feetX, c.feetY, c.heightPx);
    if (!origin) {
      const r = (angle * Math.PI) / 180;
      origin = { x: c.feetX, y: c.feetY - c.heightPx * 1.1, dx: Math.sin(r), dy: -Math.cos(r) };
    }
    this.player.layoutCrosshair(origin, this.three.width, this.three.height, this.getAimBand(c));
    const jolt = this.truck.getAimJolt();
    this.player.aimU += jolt.x / this.three.width;
    this.player.aimV += jolt.y / this.three.height;
    this.input.refreshDial();
    return c;
  }

  // Vertical aim band: bottom line just under the flattest clay arc's peak, top line on the tallest
  // arc's peak. The bottom stays above the hero's hat (and so the muzzle) because the barrel only
  // points upward; the hat is used rather than the muzzle so the jeep's bounce doesn't shake it.
  getAimBand(c) {
    const headV = (c.feetY - c.heightPx) / this.three.height;
    const bottom = Math.min(CLAY_PEAK_V.low + AIM_BAND_BELOW, headV - AIM_HEAD_GAP);
    return { top: CLAY_PEAK_V.high, bottom: Math.max(CLAY_PEAK_V.high, bottom) };
  }

  buildView() {
    if (!this.isInGame()) return null;
    const three = this.three;
    const c = this.updateCrosshair();
    const crosshair = this.getCrosshairPx();

    const view = {
      active: true,
      fever: gameState.isFeverActive,
      crosshair: gameState.currentState === GameStates.PLAYING ? crosshair : null,
      character: {
        visible: true,
        feetX: c.feetX,
        feetY: c.feetY,
        heightPx: c.heightPx,
        aimX: crosshair.x,
        aimY: crosshair.y,
        aimAngle: this.player.aimAngle,
        state: this.player.state
      },
      jeep: null,
      debug: null
    };

    if (gameState.currentStageNumber === 5) {
      const anchorWorld = three.getPlayerWorld(this.player);
      const a = three.project(anchorWorld);
      const edge = three.project(anchorWorld.clone().add(three.cameraRight.clone().multiplyScalar(JEEP_WIDTH_M / 2)));
      view.jeep = { x: a.x, y: a.y, width: Math.abs(edge.x - a.x) * 2 };
    }

    if (this.paused && this.debugHitbox && auth.isCurrentUserAdmin()) {
      view.debug = {
        crosshair,
        muzzle: { ...this.overlay.muzzle },
        targets: this.stageManager.targets.filter((t) => t.isAlive).map((t) => {
          const probe = t.getScreenProbe(three);
          const tuning = targetCatalog.getHitTuning(t.type);
          const R = Math.max(tuning.minRadiusPx, probe.radius * tuning.radiusScale) * this.player.stats.leadZoneBonus;
          return { ...probe, ...tuning, R };
        })
      };
      if (gameState.currentStageNumber === 4) {
        const zl = three.waveFrontZAt(-30);
        const zr = three.waveFrontZAt(30);
        view.debug.waveLine = [
          three.project(new THREE.Vector3(-30, GROUND_Y, Math.min(zl, 3))),
          three.project(new THREE.Vector3(30, GROUND_Y, Math.min(zr, 3)))
        ];
      }
    }
    return view;
  }

  // ---------- Main loop ----------

  mainLoop(timestamp) {
    const dt = Math.min(0.1, (timestamp - this.lastTime) / 1000);
    this.lastTime = timestamp;

    if (this.isInGame()) {
      if (!this.paused) {
        this.gameClock += dt;
        this.scheduler.update(dt);

        if (gameState.currentState === GameStates.PLAYING) {
          gameState.update(dt);
          const mv = this.input.getMove();
          if (this.truck.active) {
            this.player.update(dt, 0, 0);
            this.truck.update(dt, this.player, mv);
          } else {
            this.player.update(dt, mv.x, mv.y);
          }
          this.stageManager.update(dt);
          this.three.update(dt);
          this.checkWave(this.three.getPlayerWorld(this.player));
          this.hudUI.update();
          if (gameState.currentState === GameStates.ENDING) this.beginEnding();
        } else {
          this.player.update(dt, 0, 0);
          this.truck.update(dt, this.player, { x: 0, y: 0 }, false);
          this.three.update(dt);
        }
      }
      this.three.render();
      this.overlay.setView(this.buildView());
    }

    requestAnimationFrame((t) => this.mainLoop(t));
  }
}
