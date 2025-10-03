// js/lyrics.js
// Полный файл — управление текстом песен, воспроизведение, тайминги.

'use strict';

/* ========== Переменные для лирики ========== */
let lyrics = [];
let timestamps = [];
let keywords = []; // ДОБАВЛЕНО: Глобальный массив для ключевых слов текущей песни
let currentWordIndex = 0;
let isPlaying = false;
let isRestarting = false;

// ДОБАВЛЕНО: Управление фоновыми эффектами (частицы/червячки)
/* ========== Управление фоновыми эффектами (частицы/червячки) ========== */

// Функция для остановки всех фоновых эффектов (для чистого старта)
function stopAllBackgroundEffects() {
    // Останавливаем мерцающие частицы (particles.js)
    if (sparkleInterval) {
        clearInterval(sparkleInterval);
        sparkleInterval = null;
    }
    // Останавливаем червячки (worms.js) - предполагаем, что stopWormEffect доступна
    if (typeof stopWormEffect === 'function') {
        stopWormEffect();
    }
}

// Функция для запуска случайного фонового эффекта
function startRandomBackgroundEffect() {
    // 1. Сначала останавливаем все запущенные эффекты
    stopAllBackgroundEffects();
    
    // 2. Выбираем случайный эффект: 'sparkles' (частицы) или 'worms' (червячки)
    const effects = ['sparkles', 'worms'];
    const selectedEffect = effects[Math.floor(Math.random() * effects.length)];

    if (selectedEffect === 'sparkles' && typeof randomSparkle === 'function') {
        // Запускаем мерцающие частицы (particles.js)
        sparkleInterval = setInterval(randomSparkle, 700); 
    } else if (selectedEffect === 'worms' && typeof startWormEffect === 'function') {
        // Запускаем червячки (worms.js)
        startWormEffect();
    }
}

/* ДОБАВЛЕНО: Функция для запуска вылетающих ключевых слов */
function launchKeywords() {
    // Проверка наличия ключевых слов
    if (!keywords || keywords.length < 2) return; 

    // Выбираем 2 или 3 случайных слова
    const numWordsToLaunch = Math.floor(Math.random() * 2) + 2; 
    
    // Создаем копию и перемешиваем для случайного выбора
    const shuffledKeywords = [...keywords].sort(() => 0.5 - Math.random());
    const wordsToUse = shuffledKeywords.slice(0, numWordsToLaunch);

    wordsToUse.forEach((word, index) => {
        const keywordElement = document.createElement('div');
        keywordElement.textContent = word;
        keywordElement.classList.add('keyword-effect');
        
        // Определяем случайную конечную позицию (вылет за пределы экрана)
        const destX = (Math.random() - 0.5) * window.innerWidth * 1.5;
        const destY = (Math.random() - 0.5) * window.innerHeight * 1.5;
        
        // Случайный сдвиг времени для эффекта "вылетают друг за другом"
        const delay = index * 200; 

        // Устанавливаем переменные для CSS-анимации
        keywordElement.style.setProperty('--dest-x', `${destX}px`);
        keywordElement.style.setProperty('--dest-y', `${destY}px`);
        keywordElement.style.animationDelay = `${delay}ms`;
        
        document.body.appendChild(keywordElement);
        
        // Удаляем элемент после завершения анимации (4000ms + задержка)
        setTimeout(() => {
            keywordElement.remove();
        }, 4000 + delay);
    });
}

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

    // **********************************************
    // ВЫЗОВ: Запуск ключевых слов при новой строке
    launchKeywords();
    // **********************************************

    // Создаём "вспышки" вокруг текста
    const bbox = newLyric.getBoundingClientRect();
    const textCenterX = bbox.left + bbox.width / 2;
    const textCenterY = bbox.top + bbox.height / 2;
    const textWidth = bbox.width;
    const textHeight = bbox.height;
    
    // Запуск частиц (функция createParticle() должна быть определена в particles.js)
    const num = Math.floor(Math.random() * 5) + 3;
    for (let i = 0; i < num; i++) {
        const x = textCenterX + (Math.random() - 0.5) * textWidth * 0.8;
        const y = textCenterY + (Math.random() - 0.5) * textHeight * 0.8;
        createParticle(x, y, 'shadow');
    }
    newLyric.classList.add('active');


    // Логика переключения темного/светлого режима
    if (
      (currentWordIndex >= 14 && currentWordIndex < 20) ||
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
    stopAllBackgroundEffects(); // Остановка всех фоновых эффектов
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

  // Запуск случайного фонового эффекта
  startRandomBackgroundEffect(); 

  audioPlayer.addEventListener('timeupdate', handleTimeUpdate);
}

/* ========== Инициализация ========== */
function initLyrics() {
    // console.info('lyrics.js: Initialized.');
    // Никакой логики DOM в initLyrics не требуется, так как переменные уже
    // инициализированы в core.js
}