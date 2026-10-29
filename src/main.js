// src/main.js
// Entrypoint for Claypop Version 2

import './style.css';
import { uxMode } from './core/UXMode.js';
import { i18n } from './core/i18n.js';
import { HybridGameManager } from './core/HybridGameManager.js';
import './ui/GlobalSoundButton.js';
import './ui/GlobalLangButton.js';
import { auth } from './core/firebase.js';
import { cloud } from './core/cloud.js';

document.addEventListener('DOMContentLoaded', () => {
  uxMode.apply();
  i18n.updateDOM();
  window.claypopGame = new HybridGameManager();
  if (import.meta.env.DEV) window.claypopDebug = { auth, cloud };
  window.addEventListener('claypop_language_changed', () => i18n.updateDOM());
});
