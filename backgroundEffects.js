// js/backgroundEffects.js
// Обновлённый полный модуль фоновых эффектов.
// - предотвращает мигание при быстром последовательном старте эффектов (debounce).
// - три эффекта: 'worm', 'wind', 'explosions'.
// - простая настройка цвета/яркости ветра и цвета/блюра червяка в начале файла.

'use strict';

(function () {
  // stub на время грузки
  window.backgroundEffects = window.backgroundEffects || {
    startRandomEffect() {},
    startEffect() {},
    stopEffect() {},
    getCurrentEffect() { return null; }
  };

  /* ====================== НАСТРОЙКИ (меняй здесь) ====================== */
  // --- общие ---
  const DPR = window.devicePixelRatio || 1;
  const EFFECTS = ['worm', 'wind', 'explosions'];
  const START_DELAY_MS = 200; // задержка (ms) перед реальным запуском эффекта — помогает убрать мигание

  // --- worm (червяк) ---
  const ATTACK_RADIUS = 300;             // px зона активации атаки
  const WORM_TRAIL_MAX = 20;
  // стиль червяка (если настроить null — используется themeRGB())
  const WORM_CUSTOM_RGB = null;          // [r,g,b] или null чтобы использовать theme
  const WORM_LINE_WIDTH = 1.2;
  const WORM_SHADOW_BLUR = 8;
  const WORM_SHADOW_ALPHA = 0.7;

  // хитрость/тайминги червяка
  const IGNORE_PROB = 0.006;
  const IGNORE_DURATION_MIN = 3000;
  const IGNORE_DURATION_MAX = 4200;
  const ATTACK_AFTER_IGNORE_PROB = 0.45;
  const ATTACK_DURATION_MIN = 140;
  const ATTACK_DURATION_MAX = 700;
  const WORM_WANDER_CHANGE_PROB = 0.012;

  // --- wind (ветер) ---
  const WIND_COUNT_MIN = 14;
  const WIND_COUNT_MAX = 35;
  const WIND_SPEED_MIN = 3.15;
  const WIND_SPEED_MAX = 4.45;
  const WIND_AMP_MIN = 3;
  const WIND_AMP_MAX = 12;
  const WIND_BRIGHTNESS_MIN = 0.28;
  const WIND_BRIGHTNESS_MAX = 0.85;
  const WIND_SEGMENTS = 15;
  // цвет ветра: если null — используем тему, иначе [r,g,b]
  const WIND_CUSTOM_RGB = null;

  // --- explosions (взрывы) ---
  const EXPLOSION_INTERVAL_MS = 680;
  /* ==================================================================== */

  /* внутренние переменные */
  let canvas = null;
  let ctx = null;
  let rafHandle = null;
  let lastTs = performance.now();
  let currentEffect = null;

  let wormObj = null;
  let windLines = [];
  let explosionInterval = null;
  let localSparkleInterval = null;

  // дебаунс для старта эффектов
  let scheduledStartTimer = null;

  // mouse
  let globalMouseX = null, globalMouseY = null;
  let lastMouseMoveTs = 0;
  let mouseHandlerAttached = false;

  /* =========== HELPERS =========== */
  function rand(min, max) { return Math.random() * (max - min) + min; }
  function randint(min, max) { return Math.floor(rand(min, max + 1)); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function distance(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return Math.sqrt(dx*dx + dy*dy); }

  function themeRGB() {
    const dark = !(document.body && document.body.classList.contains('light-mode'));
    return dark ? [255, 255, 255] : [0, 0, 0];
  }

  /* =========== CANVAS =========== */
  function createCanvasIfNeeded() {
    if (canvas) return;
    canvas = document.createElement('canvas');
    canvas.className = 'background-effects-canvas';
    Object.assign(canvas.style, {
      position: 'fixed',
      left: '0',
      top: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: -1 // поставил по умолчанию на фон. Измени, если нужно иное поведение.
    });
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  }

  function resizeCanvas() {
    if (!canvas) return;
    canvas.width = Math.round(window.innerWidth * DPR);
    canvas.height = Math.round(window.innerHeight * DPR);
    if (ctx && ctx.setTransform) ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  /* =========== MOUSE =========== */
  function ensureMouseHandler() {
    if (mouseHandlerAttached) return;
    mouseHandlerAttached = true;
    window.addEventListener('mousemove', (e) => {
      globalMouseX = e.clientX;
      globalMouseY = e.clientY;
      lastMouseMoveTs = performance.now();
    });
  }

  /* =========== WORM =========== */
  function makeWorm() {
    return {
      x: rand(100, Math.max(160, window.innerWidth - 100)),
      y: rand(100, Math.max(160, window.innerHeight - 100)),
      vx: 0, vy: 0,
      baseMaxSpeed: rand(2.0, 3.4),
      maxSpeed: rand(2.0, 3.4),
      accel: rand(0.06, 0.14),
      trail: [],
      trailMax: WORM_TRAIL_MAX,
      state: 'wander',
      wanderTarget: { x: rand(50, window.innerWidth - 50), y: rand(50, window.innerHeight - 50) },
      ignoreTimer: 0,
      scheduledAttackAt: null,
      attackFor: 0,
      lastDecisionAt: performance.now()
    };
  }

  function clampToScreen(o) {
    const m = 6;
    o.x = clamp(o.x, m, window.innerWidth - m);
    o.y = clamp(o.y, m, window.innerHeight - m);
  }

  function steerTowards(entity, tx, ty, dt) {
    const dx = tx - entity.x, dy = ty - entity.y;
    const dist = Math.sqrt(dx*dx + dy*dy) || 1;
    const desiredVx = (dx / dist) * entity.maxSpeed;
    const desiredVy = (dy / dist) * entity.maxSpeed;
    entity.vx += (desiredVx - entity.vx) * entity.accel * (dt / 16);
    entity.vy += (desiredVy - entity.vy) * entity.accel * (dt / 16);
    entity.vx *= 0.995; entity.vy *= 0.995;
    entity.x += entity.vx * (dt / 16);
    entity.y += entity.vy * (dt / 16);
    clampToScreen(entity);
  }

  function updateWorm(dt) {
    if (!wormObj) return;
    ensureMouseHandler();
    const now = performance.now();

    // timers
    if (wormObj.ignoreTimer > 0) wormObj.ignoreTimer -= dt;
    if (wormObj.attackFor > 0) wormObj.attackFor -= dt;

    // scheduled attack after ignore
    if (wormObj.scheduledAttackAt && now >= wormObj.scheduledAttackAt) {
      wormObj.attackFor = randint(ATTACK_DURATION_MIN, ATTACK_DURATION_MAX);
      wormObj.scheduledAttackAt = null;
    }

    const mouseActive = (globalMouseX !== null && (now - lastMouseMoveTs) < 1500);
    let inZone = false;
    if (mouseActive) {
      const d = distance(wormObj.x, wormObj.y, globalMouseX, globalMouseY);
      if (d <= ATTACK_RADIUS) inZone = true;
    }

    if (now - wormObj.lastDecisionAt > 300) {
      wormObj.lastDecisionAt = now;
      if (Math.random() < IGNORE_PROB) {
        wormObj.ignoreTimer = randint(IGNORE_DURATION_MIN, IGNORE_DURATION_MAX);
        if (Math.random() < ATTACK_AFTER_IGNORE_PROB) {
          wormObj.scheduledAttackAt = now + wormObj.ignoreTimer + randint(120, 700);
        }
      }
    }

    // state resolution
    if (wormObj.attackFor > 0) wormObj.state = 'attack';
    else if (wormObj.ignoreTimer > 0) wormObj.state = 'ignore';
    else if (inZone) {
      wormObj.attackFor = randint(ATTACK_DURATION_MIN, ATTACK_DURATION_MAX);
      wormObj.state = 'attack';
    } else wormObj.state = 'wander';

    // behavior
    if (wormObj.state === 'attack') {
      const tx = (globalMouseX !== null) ? globalMouseX : wormObj.wanderTarget.x;
      const ty = (globalMouseY !== null) ? globalMouseY : wormObj.wanderTarget.y;
      const prev = wormObj.maxSpeed;
      wormObj.maxSpeed = Math.min(9, prev * 1.8 + rand(0, 1.2));
      steerTowards(wormObj, tx, ty, dt);
      wormObj.maxSpeed = Math.max(wormObj.baseMaxSpeed, prev);
    } else {
      if (wormObj.state === 'ignore') wormObj.maxSpeed = Math.max(1.0, wormObj.baseMaxSpeed * 0.75);
      else wormObj.maxSpeed = Math.max(1.6, wormObj.baseMaxSpeed);

      if (!wormObj.wanderTarget.x || Math.random() < WORM_WANDER_CHANGE_PROB ||
          distance(wormObj.x, wormObj.y, wormObj.wanderTarget.x, wormObj.wanderTarget.y) < 14) {
        wormObj.wanderTarget.x = rand(40, window.innerWidth - 40);
        wormObj.wanderTarget.y = rand(40, window.innerHeight - 40);
      }
      steerTowards(wormObj, wormObj.wanderTarget.x, wormObj.wanderTarget.y, dt);
    }

    // trail
    wormObj.trail.push({ x: wormObj.x, y: wormObj.y });
    if (wormObj.trail.length > wormObj.trailMax) wormObj.trail.shift();
  }

  function drawWorm() {
    if (!wormObj || wormObj.trail.length < 2) return;
    const baseRgb = WORM_CUSTOM_RGB || themeRGB();
    ctx.save();
    ctx.lineWidth = WORM_LINE_WIDTH;
    // glow
    ctx.shadowBlur = WORM_SHADOW_BLUR;
    ctx.shadowColor = `rgba(${baseRgb[0]},${baseRgb[1]},${baseRgb[2]},${WORM_SHADOW_ALPHA})`;
    ctx.strokeStyle = `rgba(${baseRgb[0]},${baseRgb[1]},${baseRgb[2]},0.95)`;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const t = wormObj.trail;
    ctx.beginPath();
    ctx.moveTo(t[0].x, t[0].y);
    for (let i = 1; i < t.length - 2; i++) {
      const xc = (t[i].x + t[i + 1].x) / 2;
      const yc = (t[i].y + t[i + 1].y) / 2;
      ctx.quadraticCurveTo(t[i].x, t[i].y, xc, yc);
    }
    const l = t.length;
    ctx.quadraticCurveTo(t[l - 2].x, t[l - 2].y, t[l - 1].x, t[l - 1].y);
    ctx.stroke();
    ctx.restore();
  }

  /* =========== WIND =========== */
  function makeWindLines(count = WIND_COUNT_MIN) {
    const arr = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        x: rand(-400, window.innerWidth),
        y: rand(0, window.innerHeight),
        len: rand(160, 320),
        speed: rand(WIND_SPEED_MIN, WIND_SPEED_MAX),
        amp: rand(WIND_AMP_MIN, WIND_AMP_MAX),
        phase: rand(0, Math.PI * 2),
        freq: rand(0.12, 0.28),
        width: rand(0.6, 1.8),
        brightness: rand(WIND_BRIGHTNESS_MIN, WIND_BRIGHTNESS_MAX),
        birth: performance.now(),
        life: rand(8000, 26000),
        opacity: 0,
        appearing: true,
        fading: false

      });
    }
    return arr;
  }

  function drawWindLine(L, dt) {
    // плавное появление / исчезновение
if (L.appearing) {
  L.opacity += dt * 0.0015;
  if (L.opacity >= 1) { L.opacity = 1; L.appearing = false; }
} else if (L.fading) {
  L.opacity -= dt * 0.0015;
  if (L.opacity <= 0) { L.opacity = 0; L.remove = true; }
}

const rgb = WIND_CUSTOM_RGB || themeRGB();
L.x += L.speed * dt * 0.05;

    L.phase += 0.02 + 0.005 * Math.sin(performance.now() / 1200);
    const breathe = 0.65 + 0.35 * Math.sin(L.phase * 1.6);
    const brightness = clamp(L.brightness * breathe, 0.0, 1.0);
    const alpha = clamp(0.12 + brightness * 0.48, 0.04, 0.9) * L.opacity;

    const strokeColor = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;

    ctx.save();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = L.width;
    ctx.globalAlpha = 1.0;
    const segments = WIND_SEGMENTS;
    const dx = L.len / segments;
    ctx.beginPath();
    for (let s = 0; s <= segments; s++) {
      const px = L.x + s * dx;
      const py = L.y + Math.sin(L.phase + s * L.freq) * L.amp;
      if (s === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();

    if (L.x - L.len > window.innerWidth + 80) {
      L.x = -L.len - rand(0, 160);
      L.y = rand(0, window.innerHeight);
      L.phase = rand(0, Math.PI * 2);
      L.speed = rand(WIND_SPEED_MIN, WIND_SPEED_MAX);
      L.amp = rand(WIND_AMP_MIN, WIND_AMP_MAX);
      L.brightness = rand(WIND_BRIGHTNESS_MIN, WIND_BRIGHTNESS_MAX);
      L.birth = performance.now();
      L.life = rand(8000, 26000);
    }
    if (L.remove) return; // пропустить, если линия исчезла полностью

  }

  /* =========== EXPLOSIONS =========== */
  function startExplosions() {
    stopExplosions();
    explosionInterval = setInterval(() => {
      const x = rand(80, window.innerWidth - 80);
      const y = rand(80, window.innerHeight - 80);
      const n = randint(5, 14);
      for (let i = 0; i < n; i++) {
        if (typeof createParticle === 'function') createParticle(x + rand(-30, 30), y + rand(-30, 30), 'shadow');
      }
    }, EXPLOSION_INTERVAL_MS);
  }
  function stopExplosions() {
    if (explosionInterval) { clearInterval(explosionInterval); explosionInterval = null; }
  }

  /* =========== local sparkles fallback =========== */
  function startLocalSparkles() {
    stopLocalSparkles();
    localSparkleInterval = setInterval(() => {
      const x = Math.random() * window.innerWidth;
      const y = Math.random() * window.innerHeight;
      const n = randint(3, 8);
      for (let i = 0; i < n; i++) {
        if (typeof createParticle === 'function') createParticle(x + rand(-20, 20), y + rand(-20, 20), 'shadow');
      }
    }, randint(380, 1000));
  }
  function stopLocalSparkles() {
    if (localSparkleInterval) { clearInterval(localSparkleInterval); localSparkleInterval = null; }
  }

  /* =========== MAIN LOOP =========== */
  function loop(ts) {
    const dt = ts - lastTs;
    lastTs = ts;
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (currentEffect === 'worm') {
      updateWorm(dt);
      drawWorm();
    } else if (currentEffect === 'wind') {
      for (const L of windLines) drawWindLine(L, dt);
    }
    rafHandle = requestAnimationFrame(loop);
  }

  /* =========== HELP: stop global particle intervals =========== */
  function stopGlobalParticleIntervals() {
    try { if (window.particleInterval) { clearInterval(window.particleInterval); window.particleInterval = null; } } catch (e) {}
    try { if (window.sparkleInterval) { clearInterval(window.sparkleInterval); window.sparkleInterval = null; } } catch (e) {}
  }

  /* =========== IMMEDIATE STOP (удалить canvas и всё немедленно) =========== */
  function stopEffectImmediate() {
    // cancel raf
    if (rafHandle) { cancelAnimationFrame(rafHandle); rafHandle = null; }
    // stop any explosion/local intervals
    stopExplosions();
    stopLocalSparkles();
    // clear and remove canvas to avoid visible artefacts
    if (ctx && canvas) {
      try { ctx.clearRect(0, 0, canvas.width, canvas.height); } catch (e) {}
    }
    if (canvas) {
      try { window.removeEventListener('resize', resizeCanvas); canvas.remove(); } catch (e) {}
      canvas = null; ctx = null;
    }
    // stop globals
    stopGlobalParticleIntervals();
    currentEffect = null;
    wormObj = null;
    windLines = [];
  }

  /* =========== API: start/stop/select с дебаунсом =========== */
  function startEffect(name) {
    // отменяем отложенные старты
    if (scheduledStartTimer) { clearTimeout(scheduledStartTimer); scheduledStartTimer = null; }
    // непосредственно старт (с остановкой предыдущего)
    stopEffectImmediate();
    currentEffect = name;

    if (name === 'worm') {
      createCanvasIfNeeded();
      ensureMouseHandler();
      wormObj = makeWorm();
      for (let i = 0; i < 8; i++) wormObj.trail.push({ x: wormObj.x, y: wormObj.y });
      lastTs = performance.now();
      rafHandle = requestAnimationFrame(loop);
    } else if (name === 'wind') {
      createCanvasIfNeeded();
      const count = randint(WIND_COUNT_MIN, WIND_COUNT_MAX);
      windLines = makeWindLines(count);
      lastTs = performance.now();
      rafHandle = requestAnimationFrame(loop);
    } else if (name === 'explosions') {
      // explosions use DOM particles
      stopGlobalParticleIntervals();
      startExplosions();
      // keep a tiny canvas present (not necessary) — create to keep API consistent
      createCanvasIfNeeded();
    } else {
      // unknown
    }
  }

  function stopEffect() {
    // graceful stop (no immediate canvas removal here): cancel raf & clear internal state
    if (rafHandle) { cancelAnimationFrame(rafHandle); rafHandle = null; }
    currentEffect = null;
    wormObj = null;
    windLines = [];
    stopExplosions();
    stopLocalSparkles();
    if (ctx && canvas) {
      try { ctx.clearRect(0, 0, canvas.width, canvas.height); } catch (e) {}
    }
    if (canvas) {
      try { window.removeEventListener('resize', resizeCanvas); canvas.remove(); } catch (e) {}
      canvas = null; ctx = null;
    }
  }

  function startRandomEffect(forceDifferent = true) {
    // debounce: сбросим предыдущую отложенную задачу
    if (scheduledStartTimer) { clearTimeout(scheduledStartTimer); scheduledStartTimer = null; }
    // остановим показываемое сейчас (немедленно) — чтобы не было наложений
    stopEffectImmediate();

    scheduledStartTimer = setTimeout(() => {
      scheduledStartTimer = null;
      // pick random effect (с попыткой не выбрать текущий)
      let pick = EFFECTS[randint(0, EFFECTS.length - 1)];
      if (forceDifferent && currentEffect) {
        let attempts = 0;
        while (pick === currentEffect && attempts < 12) {
          pick = EFFECTS[randint(0, EFFECTS.length - 1)];
          attempts++;
        }
      }
      startEffect(pick);
    }, START_DELAY_MS);
  }

  function initBackgroundEffects() {
    // lazy initialization: не стартуем эффекты автоматически
    try { createCanvasIfNeeded(); stopEffect(); } catch (e) {}
  }

 function fadeOutEffect(duration = 1000) {
  if (!canvas || !ctx) {
    stopEffectImmediate();
    return;
  }

  const start = performance.now();
  const initAlpha = 1.0;

  function fadeStep(ts) {
    const elapsed = ts - start;
    const progress = clamp(elapsed / duration, 0, 1);
    const alpha = initAlpha * (1 - progress);

    canvas.style.opacity = alpha;

    if (progress < 1) {
      requestAnimationFrame(fadeStep);
    } else {
      canvas.style.opacity = 1.0;
      stopEffectImmediate();
    }
  }

  // если активен ветер — запускаем затухание его линий
  if (currentEffect === 'wind') {
    for (const L of windLines) {
      L.fading = true;
      L.appearing = false;
    }
  }

  requestAnimationFrame(fadeStep);
}


  window.backgroundEffects = {
    initBackgroundEffects,
    startEffect,
    stopEffect,
    startRandomEffect,
    getCurrentEffect: () => currentEffect,
    fadeOutEffect,

    // для отладки/тонкой настройки
    __debug: {
      START_DELAY_MS,
      ATTACK_RADIUS,
      WIND_COUNT_MIN, WIND_COUNT_MAX,
      WIND_SPEED_MIN, WIND_SPEED_MAX,
      WIND_AMP_MIN, WIND_AMP_MAX
    }
  };
})();
