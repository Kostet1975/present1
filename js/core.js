// js/core.js
'use strict';

/* ========== Глобальные переменные ========== */
let lyricsContainer = null;
let audioPlayer = null;
let startButtonContainer = null;
let startButton = null;
let heartButton = null;
let restartButtonContainer = null;
let restartButton = null;
let body = null;
let scoreDisplay = null;

let toggleButton = null;
let gameContainer = null;
let canvas = null;
let ctx = null;

/* Интервалы для частиц и sparkles (определяются/используются в других модулях) */
window.particleInterval = null;
window.sparkleInterval = null;

/* ========== Загрузка песни по ключу ========== */
function loadSongByKey(key) {
  const song = typeof songLibrary !== 'undefined' ? songLibrary[key] : null;
  if (!song) return false;
  try {
    if (!audioPlayer) {
      console.warn('audioPlayer is not ready yet in loadSongByKey');
      return false;
    }
    audioPlayer.src = song.src;
    audioPlayer.currentTime = 0;
    audioPlayer.load();
  } catch (e) {
    console.warn('Failed to load song src', e);
  }

  if (typeof lyrics !== 'undefined' && Array.isArray(song.lyrics)) {
    lyrics = song.lyrics.slice();
  }
  if (typeof timestamps !== 'undefined' && Array.isArray(song.timestamps)) {
    timestamps = song.timestamps.slice();
  }
  if (typeof currentWordIndex !== 'undefined') {
    currentWordIndex = 0;
  }
  if (lyricsContainer) lyricsContainer.innerHTML = '';
  return true;
}

/* ========== Safe call helper ========== */
function callIfFunction(fnName) {
  try {
    const fn = window[fnName];
    if (typeof fn === 'function') fn();
  } catch (e) {
    // ignore
  }
}

/* ========== DOMContentLoaded init ========== */
document.addEventListener('DOMContentLoaded', () => {
  lyricsContainer = document.querySelector('.lyrics-container');
  audioPlayer = document.getElementById('audioPlayer');
  startButtonContainer = document.getElementById('startButtonContainer');
  startButton = document.getElementById('startButton');
  heartButton = document.getElementById('heartButton');
  restartButtonContainer = document.getElementById('restartButtonContainer');
  restartButton = document.getElementById('restartButton');
  body = document.body;
  scoreDisplay = document.querySelector('.note-score');

  toggleButton = document.querySelector('.game-toggle-button');
  gameContainer = document.querySelector('.game-container');
  canvas = document.getElementById('noteGameCanvas');
  ctx = canvas ? canvas.getContext('2d') : null;

  // Инициализируем модули (если присутствуют)
  callIfFunction('initParticles');
  callIfFunction('initLyrics');
  callIfFunction('initGame');
  callIfFunction('initUI');

  // Останавливаем фоновые эффекты и восстанавливаем popContinuous при паузе/конце
  if (audioPlayer) {
    audioPlayer.addEventListener('pause', () => {
      try { if (window.backgroundEffects && typeof window.backgroundEffects.stopEffect === 'function') window.backgroundEffects.stopEffect(); } catch (e) {}
      try { if (typeof initParticles === 'function') initParticles(); } catch (e) {}
    });
    audioPlayer.addEventListener('ended', () => {
      try { if (window.backgroundEffects && typeof window.backgroundEffects.stopEffect === 'function') window.backgroundEffects.stopEffect(); } catch (e) {}
      try { if (typeof initParticles === 'function') initParticles(); } catch (e) {}
    });
  }
});

/* Экспорт на window */
window.loadSongByKey = loadSongByKey;
window.callIfFunction = callIfFunction;
