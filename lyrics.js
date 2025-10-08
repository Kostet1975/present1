// js/lyrics.js
'use strict';

/* ========== Переменные для лирики ========== */
let lyrics = [];
let timestamps = [];
let keywords = [];
let currentWordIndex = 0;
let isPlaying = false;
let isRestarting = false;

/* ========== Остановить все фоновые эффекты (compat + centralized) ========== */
function stopAllBackgroundEffects() {
  // остановим локальные интервалы sparkle, если есть (global var)
  try {
    if (window.sparkleInterval) {
      clearInterval(window.sparkleInterval);
      window.sparkleInterval = null;
    }
  } catch (e) {}

  // centralized module
  try {
    if (window.backgroundEffects && typeof window.backgroundEffects.stopEffect === 'function') {
      window.backgroundEffects.stopEffect();
    }
  } catch (e) {}

  // старые реализации-фоллбэк (если присутствовали)
  try { if (typeof stopWormEffect === 'function') stopWormEffect(); } catch (e) {}
}

/* ========== Запустить случайный фон (централизовано) ========== */
function startRandomBackgroundEffect() {
  // выключаем предыдущие эффекты, чтобы не было наложений
  stopAllBackgroundEffects();

  // небольшая задержка, чтобы canvas успел очиститься
  setTimeout(() => {
    try {
      if (window.backgroundEffects && typeof window.backgroundEffects.startRandomEffect === 'function') {
        window.backgroundEffects.startRandomEffect(true);
      }
    } catch (e) {}
  }, 150);


  // fallback
  try {
    const effects = ['sparkles', 'worms'];
    const sel = effects[Math.floor(Math.random() * effects.length)];
    if (sel === 'sparkles' && typeof randomSparkle === 'function') {
      window.sparkleInterval = setInterval(randomSparkle, 700);
    } else if (sel === 'worms' && typeof startWormEffect === 'function') {
      startWormEffect();
    }
  } catch (e) {}
}

/* ========== Вылетающие ключевые слова ========== */
function launchKeywords() {
  if (!keywords || keywords.length < 1) return;
  const num = Math.min(keywords.length, Math.floor(Math.random() * 2) + 1);
  const shuffled = [...keywords].sort(() => 0.5 - Math.random());
  const chosen = shuffled.slice(0, num);
  chosen.forEach((word, idx) => {
    const el = document.createElement('div');
    el.className = 'keyword-effect';
    el.textContent = word;
    const destX = (Math.random() - 0.5) * window.innerWidth * 1.4;
    const destY = (Math.random() - 0.5) * window.innerHeight * 1.4;
    el.style.setProperty('--dest-x', `${destX}px`);
    el.style.setProperty('--dest-y', `${destY}px`);
    el.style.animationDelay = `${idx * 140}ms`;
    document.body.appendChild(el);
    setTimeout(() => { try { el.remove(); } catch (e) {} }, 4200 + idx * 140);
  });
}

/* ========== Обновление при timeupdate ========== */
function handleTimeUpdate() {
  if (!isPlaying || isRestarting) return;

  if (audioPlayer.currentTime * 1000 >= timestamps[currentWordIndex]) {
    const oldLyric = lyricsContainer.querySelector('.active');
    if (oldLyric) {
      oldLyric.classList.remove('active');
      oldLyric.classList.add('hide');
      setTimeout(() => { try { oldLyric.remove(); } catch (e) {} }, 1000);
    }

    const newLyric = document.createElement('div');
    newLyric.className = 'lyrics';
    newLyric.innerHTML = lyrics[currentWordIndex] || '';
    lyricsContainer.appendChild(newLyric);

    // запускаем ключевые слова
    try { launchKeywords(); } catch (e) {}

    // частицы вокруг текста (используем createParticle)
    try {
      const bbox = newLyric.getBoundingClientRect();
      const cx = bbox.left + bbox.width/2;
      const cy = bbox.top + bbox.height/2;
      const n = Math.floor(Math.random() * 5) + 3;
      for (let i = 0; i < n; i++) if (typeof createParticle === 'function') createParticle(cx + (Math.random()-0.5)*bbox.width*0.6, cy + (Math.random()-0.5)*bbox.height*0.6, 'shadow');
    } catch (e) {}

    newLyric.offsetHeight;
    newLyric.classList.add('active');

    // логика темы (сохранена)
    if ((currentWordIndex >= 14 && currentWordIndex < 20) || (currentWordIndex >= 24 && currentWordIndex < 28)) {
      body.classList.add('light-mode');
      newLyric.classList.add('dark-mode-elements');
    } else {
      body.classList.remove('light-mode');
      newLyric.classList.remove('dark-mode-elements');
    }

    currentWordIndex++;
  }

  // конец песни
  if (currentWordIndex >= timestamps.length) {
    audioPlayer.removeEventListener('timeupdate', handleTimeUpdate);
    stopAllBackgroundEffects();
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

  // убираем глобальные popContinuous при запуске эффекта
  try {
    if (window.particleInterval) {
      clearInterval(window.particleInterval);
      window.particleInterval = null;
    }
  } catch (e) {}

  // запускаем рандомный фоновый эффект
  try { startRandomBackgroundEffect(); } catch (e) {}

  audioPlayer.currentTime = 0;
  audioPlayer.play();
  isPlaying = true;
  isRestarting = false;

  // оставим лёгкие случайные искры как микро-эффект (не мешают)
  try {
    if (window.sparkleInterval) clearInterval(window.sparkleInterval);
    window.sparkleInterval = setInterval(randomSparkle, 700);
  } catch (e) {}

  audioPlayer.addEventListener('timeupdate', handleTimeUpdate);
}

/* ========== initLyrics ========== */
function initLyrics() {
  // noop — DOM инициализация в core.js
}

/* Экспорт */
window.handleTimeUpdate = handleTimeUpdate;
window.startPlayback = startPlayback;
window.initLyrics = initLyrics;
window.startRandomBackgroundEffect = startRandomBackgroundEffect;
window.stopAllBackgroundEffects = stopAllBackgroundEffects;
window.launchKeywords = launchKeywords;
