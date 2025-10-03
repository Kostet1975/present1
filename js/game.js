// js/game.js
// Полный файл — мини-игра с нотами и платформа. Поддерживает initGame() для корректной работы.

'use strict';

// Игровые переменные
let notes = [];
let platformX = 80;
let gameActive = false;
let noteScore = 0;

/* Цвета платформы и нот */
const gameColors = {
  dark: { platform: '#CCCCCC', note: '#E0E0E0', shadowGlow: 'rgba(255,255,255,0.6)' },
  light: { platform: '#333333', note: '#444444', shadowGlow: 'rgba(0,0,0,0.6)' },
};
function getCurrentGameColors() {
  return body && body.classList.contains('light-mode') ? gameColors.dark : gameColors.dark;
}

/* ========== Отсчёт 3-2-1-GO ========== */
let countdownRunning = false;
async function startCountdown(callback) {
  if (countdownRunning) return;
  countdownRunning = true;

  if (particleInterval) { particleInterval = null; }
  if (getComputedStyle(gameContainer).position === 'static') gameContainer.style.position = 'relative';

  const overlay = document.createElement('div');
  overlay.style.position = 'absolute';
  overlay.style.pointerEvents = 'none';
  overlay.style.fontSize = '64px';
  overlay.style.fontWeight = '700';
  overlay.style.color = '#fff';
  overlay.style.textShadow = '0 0 20px rgba(255,255,255,0.8)';
  overlay.style.zIndex = '5';

  const canvasRect = canvas.getBoundingClientRect();
  overlay.style.left = `${canvas.offsetLeft + canvas.width / 2}px`;
  overlay.style.top = `${canvas.offsetTop + canvas.height / 2}px`;
  overlay.style.transform = 'translate(-50%, -50%)';
  gameContainer.appendChild(overlay);

  const seq = ['3', '2', '1', 'GO!'];
  let i = 0;
  function showNext() {
    if (!gameActive) {
      overlay.remove();
      countdownRunning = false;
      return;
    }
    if (i >= seq.length) {
      overlay.remove();
      countdownRunning = false;
      if (callback) callback();
      return;
    }
    overlay.textContent = seq[i];
    const anim = overlay.animate(
      [
        { transform: 'translate(-50%, -50%) scale(0.2)', opacity: 0 },
        { transform: 'translate(-50%, -50%) scale(1.3)', opacity: 1, offset: 0.25 },
        { transform: 'translate(-50%, -50%) scale(1.0)', opacity: 1, offset: 0.7 },
        { transform: 'translate(-50%, -50%) scale(0.8)', opacity: 0 },
      ],
      { duration: 900, easing: 'cubic-bezier(0.2, 0.9, 0.3, 1)', fill: 'forwards' }
    );
    if (seq[i] === 'GO!') {
      const cx = canvasRect.left + canvasRect.width / 2;
      const cy = canvasRect.top + canvasRect.height / 2;
      for (let p = 0; p < 50; p++) createParticle(cx, cy, 'shadow');
    }
    let resolved = false;
    const safeResolve = () => {
      if (resolved) return;
      resolved = true;
      i++;
      setTimeout(showNext, 200);
    };
    const fallback = setTimeout(safeResolve, 950);
    if (anim.finished && typeof anim.finished.then === 'function') {
      anim.finished.then(() => {
        clearTimeout(fallback);
        safeResolve();
      }).catch(() => {
        clearTimeout(fallback);
        safeResolve();
      });
    } else {
      anim.onfinish = () => {
        clearTimeout(fallback);
        safeResolve();
      };
    }
  }
  showNext();
}

/* ========== Игровой цикл ========== */
/* ====== Улучшенная генерация и игровой цикл — "умные", живые ноты" ====== */

/* Вспомогательная: создаёт одну ноту с параметрами "intelligence" и поведением */
function spawnNote() {
  const behaviors = ['normal', 'jitter', 'decoy', 'split', 'phantom'];
  // распределение: normal частые, jitter/decoy/phantom - реже, split - редкий
  const r = Math.random();
  let behavior;
  if (r < 0.55) behavior = 'normal';
  else if (r < 0.72) behavior = 'jitter';
  else if (r < 0.85) behavior = 'decoy';
  else if (r < 0.94) behavior = 'phantom';
  else behavior = 'split';

  const speed = 1 + Math.random() * 2;
  const char = ['♪','♩','♫','♬'][Math.floor(Math.random()*4)];
  const isSmart = Math.random() < 0.35; // шанс быть "умной" (принимает решения)
  const sizeScale = 1; // оставляем размер
  const id = Math.random().toString(36).slice(2,9);

  const note = {
    id,
    x: Math.random() * (canvas.width - 20),
    y: -20,
    speed,
    char,
    behavior,
    smart: isSmart,
    state: 'falling',
    pauseTime: 0,
    jumpProgress: 0,
    startX: null,
    startY: null,
    jumpDir: 0,
    amplitude: 0,
    jumpHeight: 0,
    canTriggerJump: true,
    alpha: 1,
    shimmerOffset: Math.random() * 1000,
    sizeScale
  };

  notes.push(note);
}

/* Перезаписанная игровая функция: аккуратная обработка в цикле (перебор в обратном порядке) */
function updateNoteGame() {
  if (!gameActive) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const colors = getCurrentGameColors();
  const platformTop = canvas.height - 10;
  const platformBottom = canvas.height;
  const platformLeft = platformX;
  const platformRight = platformX + 60;
  const platformCenter = platformX + 30;
  const padding = 8;

  // Платформа
  ctx.fillStyle = colors.platform;
  ctx.fillRect(platformX, platformTop, 60, 6);

  // Генерация: вынесена в spawnNote(), но контролируем вероятность
  if (Math.random() < 0.028) spawnNote();

  ctx.font = '16px Arial';

  // Перебираем в обратном порядке, чтобы безопасно удалять (splice)
  for (let i = notes.length - 1; i >= 0; i--) {
    const note = notes[i];

    // Умное поведение: корректировка X в flight, если "smart" и платформа близко
    if (note.smart && (note.state === 'falling' || note.state === 'jump')) {
      const dx = platformCenter - note.x;
      const distX = Math.abs(dx);
      // Если платформа почти под нотой и нота не "decoy", может подстроиться
      if (distX < 60 && Math.random() < 0.03) {
        // небольшая корректировка в сторону платформы (хотят попасть)
        note.x += Math.sign(dx) * Math.min(1.5, Math.max(0.4, Math.abs(dx) * 0.04));
      } else if (note.behavior === 'decoy' && distX < 30 && note.y > platformTop - 80 && Math.random() < 0.06) {
        // decoy принимает решение увернуться (обманка)
        note.state = 'pause';
        note.pauseTime = 18 + Math.floor(Math.random() * 12);
      }
    }

    // Поведение состояний: falling / pause / jump (как у тебя), плюс новые эффекты
    if (note.state === 'falling') {
      // jitter влияет на x во время падения
      if (note.behavior === 'jitter') {
        note.x += Math.sin((Date.now() + note.shimmerOffset) / 220) * 0.9;
      }

      note.y += note.speed;

      // Если "decoy" и близко к платформе — триггер паузы (обман)
      if (note.behavior === 'decoy' && note.canTriggerJump && Math.abs(note.x - platformCenter) <= 18 &&
          note.y >= platformTop - 20 && note.y <= platformTop - 6) {
        note.state = 'pause';
        note.pauseTime = 18 + Math.floor(Math.random() * 18);
      }

      // smart -> иногда триггер прыжка (как раньше), но с более живым выбором направления
      if (note.smart && note.canTriggerJump &&
          Math.abs(note.x - platformCenter) <= 12 &&
          note.y >= platformTop - 18 && note.y <= platformTop - 8 &&
          Math.random() < 0.35) {
        note.state = 'pause';
        note.pauseTime = 12 + Math.floor(Math.random() * 18);
      }

    } else if (note.state === 'pause') {
      note.pauseTime--;
      // визуальная легкая пульсация alpha
      note.alpha = 0.75 + 0.20 * Math.sin((Date.now() + note.shimmerOffset) / 140);

      if (note.pauseTime <= 0) {
        // поведение после паузы зависит от типа
        if (note.behavior === 'decoy') {
          // decoy: телепорт/рывок в сторону (обман)
          const dir = Math.random() < 0.5 ? -1 : 1;
          const shift = 40 + Math.random() * 80;
          // делаем вспышку частиц в точке "исчезновения"
          createParticle(note.x, note.y, 'shadow');
          note.x = Math.max(padding, Math.min(canvas.width - padding, note.x + dir * shift));
          // небольшая потеря высоты и возобновление падения
          note.state = 'falling';
          note.canTriggerJump = false;
          note.alpha = 1;
        } else {
          // обычный прыжок как раньше
          note.state = 'jump';
          note.startX = note.x;
          note.startY = note.y;
          note.jumpProgress = 0;
          note.canTriggerJump = false;
          const dir = Math.random() < 0.5 ? -1 : 1;
          const baseAmplitude = 40 + Math.random() * 20;
          const maxLeft = note.startX - padding;
          const maxRight = (canvas.width - padding) - note.startX;
          const safeAmplitude = Math.min(baseAmplitude, dir < 0 ? maxLeft : maxRight);
          note.jumpDir = dir;
          note.amplitude = Math.max(10, safeAmplitude);
          note.jumpHeight = 26 + Math.random() * 16;
          note.alpha = 1;
          // Если это split — делимся в момент прыжка старта
          if (note.behavior === 'split' && Math.random() < 0.95) {
            // создаём две меньшие ноты, чуть в стороны
            const left = Object.assign({}, note);
            const right = Object.assign({}, note);
            left.id = note.id + '_a'; right.id = note.id + '_b';
            left.x = Math.max(padding, note.x - 10); right.x = Math.min(canvas.width - padding, note.x + 10);
            left.speed = note.speed * 1.05; right.speed = note.speed * 1.05;
            left.behavior = 'normal'; right.behavior = 'normal';
            left.sizeScale = 0.9; right.sizeScale = 0.9;
            // вставляем дочерние ноты вместо текущей
            notes.splice(i, 1, left, right);
            // продолжим обработку следующей итерации (не рисуем исходную)
            continue;
          }
        }
      }
    } else if (note.state === 'jump') {
      note.jumpProgress += 0.05;
      const p = note.jumpProgress;
      note.x = note.startX + note.jumpDir * note.amplitude * p;
      note.y = note.startY - note.jumpHeight * Math.sin(Math.PI * p);
      note.x = Math.max(padding, Math.min(note.x, canvas.width - padding));
      if (p >= 1) {
        note.state = 'falling';
        note.speed = Math.max(note.speed, 1.6 + Math.random() * 1.2);
      }
    }

    // Визуальные параметры: alpha и тень
    let drawAlpha = typeof note.alpha === 'number' ? note.alpha : 1;
    if (note.behavior === 'phantom') {
      // phantom полупрозрачна и слегка мерцает
      drawAlpha = 0.35 + 0.25 * Math.sin((Date.now() + note.shimmerOffset) / 200);
    }

    ctx.fillStyle = colors.note;
    ctx.shadowColor = body.classList.contains('light-mode') ? gameColors.light.shadowGlow : gameColors.dark.shadowGlow;
    ctx.shadowBlur = (note.state === 'pause') ? 6 : 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.globalAlpha = drawAlpha;

    // небольшой визуальный "шум" для jitter
    let drawX = note.x;
    if (note.behavior === 'jitter') drawX += Math.sin((Date.now() + note.shimmerOffset) / 160) * 1.6;

    // отрисовка с сохранённым размером (font установлен)
    ctx.fillText(note.char, drawX, note.y);

    // Сброс
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    // Коллизия — при phantom шанс меньше (обман)
    const noteWidth = ctx.measureText(note.char).width;
    const noteHeight = 16;
    const noteLeft = note.x;
    const noteRight = note.x + noteWidth;
    const noteTop = note.y - noteHeight;
    const noteBottom = note.y;
    const isDescendingArc = note.state === 'jump' && note.jumpProgress > 0.5;

    // правило подсчёта: phantom лишь с вероятностью считается "пойманной"
    let phantomPass = false;
    if (note.behavior === 'phantom') {
      phantomPass = Math.random() < 0.30; // только 30% случаев — засчитывается
    }

    if ((note.state === 'falling' || isDescendingArc) &&
        noteBottom >= platformTop &&
        noteTop <= platformBottom &&
        noteRight >= platformLeft &&
        noteLeft <= platformRight) {
      // если phantom — проверяем слот
      if (note.behavior === 'phantom' && !phantomPass) {
        // промах — нотка исчезает, но очко не даёт (обманка)
        createParticle(note.x, note.y, 'shadow');
        notes.splice(i, 1);
      } else {
        // очко засчитываем
        noteScore++;
        scoreDisplay.textContent = ` ${noteScore}`;
        // эффект частиц при поимке
        for (let p = 0; p < 6; p++) createParticle(note.x + Math.random()*8, note.y + Math.random()*8, 'shadow');
        notes.splice(i, 1);
      }
      continue; // переходим к следующей ноте
    }

    // Удаление ушедших за низ
    if (note.y > canvas.height + 24) {
      notes.splice(i, 1);
      continue;
    }
  } // конец цикла по notes

  requestAnimationFrame(updateNoteGame);
}

/* ====== startNoteGame() оставляем как было, но вызывает новую updateNoteGame ====== */
function startNoteGame() {
  notes = [];
  noteScore = 0;
  scoreDisplay.textContent = ` ${noteScore}`;
  requestAnimationFrame(updateNoteGame);
}


/* ========== Плавное исчезновение нот ========== */
function fadeOutAllNotes() {
  let start = null;
  const duration = 250;
  notes.forEach((n) => { n.speed = 0; });
  function step(ts) {
    if (!start) start = ts;
    const p = Math.min(1, (ts - start) / duration);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = `rgba(204,204,204,${1 - p})`;
    ctx.fillRect(platformX, canvas.height - 10, 60, 6);
    ctx.font = '16px Arial';
    notes.forEach((note) => {
      ctx.shadowBlur = 0;
      ctx.fillStyle = `rgba(224,224,224,${1 - p})`;
      ctx.fillText(note.char, note.x, note.y);
    });
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ========== Инициализация игры ========== */
function initGame() {
  if (!toggleButton || !gameContainer || !canvas) {
    console.warn("Game elements not found!");
    return;
  }

  // Обработчик кнопки игры
  toggleButton.addEventListener('click', () => {
    if (!gameActive) {
      gameActive = true;
      gameContainer.style.transformOrigin = 'top left';
      gameContainer.classList.add('active');
      void gameContainer.offsetWidth;
      gameContainer.style.opacity = '1';
      gameContainer.style.transform = 'scale(1)';
      scoreDisplay.classList.add('visible');
      startCountdown(() => {
        startNoteGame();
      });
    } else {
      gameActive = false;
      scoreDisplay.classList.remove('visible');
      fadeOutAllNotes();
      gameContainer.style.transformOrigin = 'top left';
      gameContainer.style.opacity = '0';
      gameContainer.style.transform = 'scale(0.85)';
      setTimeout(() => {
        gameContainer.classList.remove('active');
        notes = [];
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        gameContainer.style.opacity = '';
        gameContainer.style.transform = '';
        gameContainer.style.transformOrigin = '';
      }, 300);
    }
  });

  // Движение платформы
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    platformX = Math.max(0, Math.min(x - 30, canvas.width - 60));
  });

  console.info("Game initialized ✔️");
}

/* Экспортируем глобально */
window.initGame = initGame;
window.startNoteGame = startNoteGame;
window.fadeOutAllNotes = fadeOutAllNotes;
