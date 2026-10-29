// src/core/GameState.js
// Central state management for Claypop v2

export const GameStates = {
  INTRO: 'INTRO',
  LOGIN: 'LOGIN',
  LOBBY: 'LOBBY',
  SETUP: 'SETUP',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  ENDING: 'ENDING',
  RESULT: 'RESULT',
  MYPAGE: 'MYPAGE',
  SETTINGS: 'SETTINGS'
};

export class GameStateManager {
  constructor() {
    this.currentState = GameStates.INTRO;
    this.selectedCharacter = 'young_cowboy';
    this.selectedTargetMode = 'clay_disc';
    this.currentStageNumber = 1;

    // In-game stats
    this.score = 0;
    this.timeRemaining = 60;
    this.totalTime = 60;
    this.combo = 0;
    this.maxCombo = 0;
    this.chainHits = 0;
    this.totalShots = 0;
    this.totalHits = 0;

    // Fever mode
    this.isFeverActive = false;
    this.feverTimer = 0;

    // Stage 4 wave penalty
    this.isFlinching = false;
    this.flinchTimer = 0;

    // Admin debug
    this.isAdminPause = false;
    this.showHitbox = false;
    this.isInvincible = false;

    // Highlight replay buffer (for 6s Shorts card)
    this.bestShotMoment = null;

    this.listeners = [];
  }

  setState(newState, payload = {}) {
    this.currentState = newState;
    document.body.dataset.screen = newState.toLowerCase();
    this.notify('state_changed', { state: newState, ...payload });
  }

  getState() {
    return this.currentState;
  }

  resetGameSession(stageNumber = 1, charId = 'young_cowboy', targetMode = 'clay_disc') {
    this.currentStageNumber = stageNumber;
    this.selectedCharacter = charId;
    this.selectedTargetMode = targetMode;

    this.score = 0;
    this.timeRemaining = 75; // Stage time limit
    this.totalTime = 75;
    this.combo = 0;
    this.maxCombo = 0;
    this.chainHits = 0;
    this.totalShots = 0;
    this.totalHits = 0;

    this.isFeverActive = false;
    this.feverTimer = 0;
    this.isFlinching = false;
    this.flinchTimer = 0;
    this.bestShotMoment = null;

    this.notify('session_reset');
  }

  addShot() {
    this.totalShots++;
    this.notify('stats_updated');
  }

  addHit(points, isPerfectLead = false, targetType = 'clay_disc') {
    this.totalHits++;
    this.combo++;
    if (this.combo > this.maxCombo) {
      this.maxCombo = this.combo;
    }
    this.chainHits++;

    let multiplier = 1;
    if (this.isFeverActive) multiplier *= 2;
    if (isPerfectLead) multiplier *= 1.5;

    const finalPoints = Math.round(points * multiplier);
    this.score += finalPoints;

    // Check 5 chain hit for High Noon Fever Time (6s)
    if (this.chainHits >= 5 && !this.isFeverActive) {
      this.startFeverTime();
    }

    this.notify('target_hit', {
      points: finalPoints,
      isPerfectLead,
      combo: this.combo,
      targetType
    });
    this.notify('stats_updated');
    return finalPoints;
  }

  addMiss() {
    this.combo = 0;
    this.chainHits = 0;
    this.notify('target_miss');
    this.notify('stats_updated');
  }

  startFeverTime() {
    this.isFeverActive = true;
    this.feverTimer = 6.0; // 6 seconds
    this.notify('fever_started');
  }

  endFeverTime() {
    this.isFeverActive = false;
    this.feverTimer = 0;
    this.chainHits = 0;
    this.notify('fever_ended');
  }

  triggerWaveFlinch() {
    if (!this.isFlinching) {
      this.isFlinching = true;
      this.flinchTimer = 1.2; // 1.2s flinch
      this.notify('wave_flinch_triggered');
    }
  }

  update(dt) {
    if (this.currentState !== GameStates.PLAYING || this.isAdminPause) {
      return;
    }

    // Time countdown
    if (!this.isInvincible) {
      this.timeRemaining -= dt;
      if (this.timeRemaining <= 0) {
        this.timeRemaining = 0;
        this.setState(GameStates.ENDING, { clear: this.score >= 500 });
      }
    }

    // Fever timer
    if (this.isFeverActive) {
      this.feverTimer -= dt;
      if (this.feverTimer <= 0) {
        this.endFeverTime();
      }
    }

    // Flinch timer
    if (this.isFlinching) {
      this.flinchTimer -= dt;
      if (this.flinchTimer <= 0) {
        this.isFlinching = false;
      }
    }
  }

  subscribe(cb) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  notify(event, data = {}) {
    for (const cb of this.listeners) {
      cb(event, data);
    }
  }
}

export const gameState = new GameStateManager();
