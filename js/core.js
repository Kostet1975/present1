// js/core.js
// Полный файл — глобальные переменные, init и loadSongByKey.
// Этот файл безопасно подключать в <head>, он ждёт DOMContentLoaded
// и только потом обращается к DOM и вызывает init-функции из других файлов.

'use strict';

/* ========== Глобальные переменные (объявляем здесь, присвоим позже) ========== */
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
let particleInterval = null;
let sparkleInterval = null;

/* ========== Функция загрузки песни по ключу (использует songLibrary из songs.js) ========== */
function loadSongByKey(key) {
  // songLibrary определяется в js/songs.js (подключается перед core.js)
  const song = typeof songLibrary !== 'undefined' ? songLibrary[key] : null;
  if (!song) return false;
  try {
    if (!audioPlayer) {
      // Если аудиоплеер ещё не инициализирован — корректно завершаем
      console.warn('audioPlayer is not ready yet in loadSongByKey');
      return false;
    }
    audioPlayer.src = song.src;
    audioPlayer.currentTime = 0;
    audioPlayer.load();
  } catch (e) {
    // защищаемся от ошибок браузера при установке src
    console.warn('Failed to load song src', e);
  }

  // lyrics и timestamps — объявлены в js/lyrics.js (внешний файл)
  if (typeof lyrics !== 'undefined' && Array.isArray(song.lyrics)) {
    lyrics = song.lyrics.slice();
  }
  if (typeof timestamps !== 'undefined' && Array.isArray(song.timestamps)) {
    timestamps = song.timestamps.slice();
  }
  if (typeof currentWordIndex !== 'undefined') {
    currentWordIndex = 0;
  }
  if (typeof window.keywords !== 'undefined') {
        window.keywords = song.keywords || []; 
    }
  if (lyricsContainer) lyricsContainer.innerHTML = '';
  return true;
}

/* ========== Вспомогательная функция: безопасная попытка вызвать init-функции других модулей ========== */
function callIfFunction(fnName) {
  try {
    const fn = window[fnName];
    if (typeof fn === 'function') fn();
  } catch (e) {
    // Не ломаем всё, просто логируем
    // console.warn('Failed to call', fnName, e);
  }
}

/* ========== Инициализация — выполняется после полной загрузки DOM ========== */
document.addEventListener('DOMContentLoaded', () => {
  // query и присвоение DOM-элементов
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

  // ---- Вызов init-функций из других модулей, если они присутствуют ----
  // Эти функции (initParticles, initLyrics, initGame, initUI) определяются в
  // соответствующих файлах, которые подключены после core.js в <head>.
  // Мы вызываем их только после того, как весь DOM и все скрипты загружены.

  callIfFunction('initParticles'); // particles.js
  callIfFunction('initLyrics');    // lyrics.js (если нужен init)
  callIfFunction('initGame');      // game.js
  callIfFunction('initUI');        // ui.js

  // Небольшая удобная подсказка в консоль — можно убрать
  // console.info('core.js: DOM ready, core variables initialized.');
});

/* Экспорт (на случай, если кто-то ожидает их на window) */
/* (не обязательно, имена доступны в глобальной области, но на всякий случай) */
window.loadSongByKey = loadSongByKey;
window.callIfFunction = callIfFunction;
