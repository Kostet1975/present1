// js/lyrics.js
// Полный файл — управление текстом песен, воспроизведение, тайминги.

'use strict';

/* ========== Переменные для лирики ========== */
let lyrics = [];
let timestamps = [];
let currentWordIndex = 0;
let isPlaying = false;
let isRestarting = false;

/* ========== Обновление текста при смене тайм-кодов ========== */
function handleTimeUpdate() {
  if (!isPlaying || isRestarting) return;

  if (audioPlayer.currentTime * 1000 >= timestamps[currentWordIndex]) {
    // Удаление старой активной строки
    const oldLyric = lyricsContainer.querySelector('.active');
    if (oldLyric) {
      oldLyric.classList.remove('active');
      oldLyric.classList.add('hide');
      setTimeout(() => oldLyric.remove(), 1000);
    }

    // Добавляем новую строку
    const newLyric = document.createElement('div');
    newLyric.innerHTML = lyrics[currentWordIndex];
    newLyric.classList.add('lyrics');
    lyricsContainer.appendChild(newLyric);

    // Создаём "вспышки" вокруг текста
    const bbox = newLyric.getBoundingClientRect();
    const textCenterX = bbox.left + bbox.width / 2;
    const textCenterY = bbox.top + bbox.height / 2;
    const textWidth = bbox.width;
    const textHeight = bbox.height;
    const numFlashes = Math.floor(Math.random() * 2) + 2;
    const particlesPerFlash = Math.floor(Math.random() * 6) + 5;
    const offset = 50;
    for (let i = 0; i < numFlashes; i++) {
      const randomX = textCenterX + (Math.random() - 0.5) * (textWidth + 2 * offset);
      const randomY = textCenterY + (Math.random() - 0.5) * (textHeight + 2 * offset);
      for (let j = 0; j < particlesPerFlash; j++) createParticle(randomX, randomY, 'shadow');
    }

    // Активируем строку
    newLyric.offsetHeight; // принудительный reflow
    newLyric.classList.add('active');

    // Переключение светлого/тёмного режима по индексам
    if (
      (currentWordIndex >= 4 && currentWordIndex < 8) ||
      (currentWordIndex >= 12 && currentWordIndex < 20) ||
      (currentWordIndex >= 24 && currentWordIndex < 28)
    ) {
      body.classList.add('light-mode');
      newLyric.classList.add('dark-mode-elements');
    } else {
      body.classList.remove('light-mode');
      newLyric.classList.remove('dark-mode-elements');
    }

    currentWordIndex++;
  }

  // Конец песни
  if (currentWordIndex >= timestamps.length) {
    audioPlayer.removeEventListener('timeupdate', handleTimeUpdate);
    clearInterval(sparkleInterval);
    body.classList.remove('light-mode');
    restartButtonContainer.style.display = 'block';
    return;
  }
}

/* ========== Запуск воспроизведения ========== */
function startPlayback() {
  isRestarting = true;
  currentWordIndex = 0;
  lyricsContainer.innerHTML = '';
  restartButtonContainer.style.display = 'none';
  body.classList.remove('light-mode');
  heartButton.classList.add('visible');

  audioPlayer.currentTime = 0;
  audioPlayer.play();
  isPlaying = true;
  isRestarting = false;

  clearInterval(sparkleInterval);
  sparkleInterval = setInterval(randomSparkle, 700);

  audioPlayer.addEventListener('timeupdate', handleTimeUpdate);
}

/* ========== Инициализация ========== */
function initLyrics() {
  // Пока что ничего особого не требуется
  // Но здесь можно добавить предварительные настройки
}

/* Экспортируем глобально */
window.handleTimeUpdate = handleTimeUpdate;
window.startPlayback = startPlayback;
window.initLyrics = initLyrics;
