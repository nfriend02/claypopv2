// src/core/SaveSystem.js
// Local-first save system with debounce sync to cloud

const STORAGE_KEY = 'claypopv2_save_data';

export class SaveSystem {
  constructor() {
    this.data = this.load();
    this.syncTimer = null;
  }

  getDefaultData() {
    return {
      version: '2.0.0',
      highScore: 0,
      mileage: 0,
      unlockedStages: [1],
      selectedCharacter: 'young_cowboy',
      selectedTargetMode: 'clay_disc',
      lastStage: 1,
      stats: {
        totalShots: 0,
        totalHits: 0,
        totalFeverTimes: 0,
        maxCombo: 0
      },
      settings: {
        bgmVolume: 0.7,
        sfxVolume: 0.9,
        bgmEnabled: false, // Default Sound OFF as requested
        sfxEnabled: false, // Default Sound OFF as requested
        showHitbox: false
      },
      updatedAt: Date.now()
    };
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return this.getDefaultData();
      const parsed = JSON.parse(raw);
      const data = { ...this.getDefaultData(), ...parsed };
      data.settings = { ...this.getDefaultData().settings, ...parsed.settings };
      return SaveSystem.withSoundOff(data);
    } catch (e) {
      console.warn('[SaveSystem] Corrupted data found, resetting:', e);
      return this.getDefaultData();
    }
  }

  // Every session starts muted; the player turns sound on with the speaker button
  static withSoundOff(data) {
    data.settings.bgmEnabled = false;
    data.settings.sfxEnabled = false;
    data.settings.userExplicitlyUnmuted = false;
    return data;
  }

  save() {
    try {
      this.data.updatedAt = Date.now();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      this.requestCloudSync();
    } catch (e) {
      console.error('[SaveSystem] Save failed:', e);
    }
  }

  updateScore(score, hits, shots, maxCombo) {
    if (score > this.data.highScore) {
      this.data.highScore = score;
    }
    const earnedMileage = Math.floor(score / 10);
    this.data.mileage += earnedMileage;
    this.data.stats.totalShots += shots;
    this.data.stats.totalHits += hits;
    if (maxCombo > this.data.stats.maxCombo) {
      this.data.stats.maxCombo = maxCombo;
    }
    this.save();
    return earnedMileage;
  }

  unlockStage(stageNum) {
    if (!this.data.unlockedStages.includes(stageNum) && stageNum <= 5) {
      this.data.unlockedStages.push(stageNum);
      this.save();
    }
  }

  // Cancels a queued cloud sync; true if one was waiting (the caller flushes it)
  takePendingSync() {
    if (!this.syncTimer) return false;
    clearTimeout(this.syncTimer);
    this.syncTimer = null;
    return true;
  }

  requestCloudSync() {
    if (this.syncTimer) clearTimeout(this.syncTimer);
    this.syncTimer = setTimeout(() => {
      this.syncTimer = null;
      window.dispatchEvent(new CustomEvent('claypop_request_cloud_sync', { detail: this.data }));
    }, 1500); // 1.5s debounce as mandated in Form_1_7
  }

  mergeFromCloud(cloudData) {
    if (!cloudData) return;
    if (cloudData.updatedAt && cloudData.updatedAt > this.data.updatedAt) {
      // Cloud progress must not switch the current session's sound back on
      const settings = { ...this.data.settings, ...cloudData.settings };
      settings.bgmEnabled = this.data.settings.bgmEnabled;
      settings.sfxEnabled = this.data.settings.sfxEnabled;
      this.data = { ...this.data, ...cloudData, settings };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      this.notifyProgress();
    }
  }

  // Progress belongs to one account: a different (or no) user starts from defaults.
  // Session settings (sound, volumes) carry over; nothing is pushed to the cloud.
  resetProgress(ownerUid = null) {
    this.takePendingSync();
    const settings = this.data.settings;
    this.data = { ...this.getDefaultData(), settings, ownerUid };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    this.notifyProgress();
  }

  // Replace local progress with the account's cloud copy (keeps this session's sound flags)
  adoptCloud(cloudData, ownerUid) {
    this.takePendingSync();
    const settings = { ...this.data.settings, ...cloudData.settings };
    settings.bgmEnabled = this.data.settings.bgmEnabled;
    settings.sfxEnabled = this.data.settings.sfxEnabled;
    settings.userExplicitlyUnmuted = this.data.settings.userExplicitlyUnmuted;
    this.data = { ...this.getDefaultData(), ...cloudData, settings, ownerUid };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    this.notifyProgress();
  }

  notifyProgress() {
    window.dispatchEvent(new CustomEvent('claypop_progress_changed', { detail: this.data }));
  }

  resetAll() {
    this.data = this.getDefaultData();
    localStorage.removeItem(STORAGE_KEY);
    this.save();
  }
}

export const saveSystem = new SaveSystem();
