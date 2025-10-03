// js/particles.js
// Полный файл. Здесь реализованы частицы, сердечки и интервалы анимаций.

'use strict';

/* ========== Создание частицы (обычная/тень) ========== */
function createParticle(x, y, type) {
  const particle = document.createElement('particle');
  document.body.appendChild(particle);

  let width = Math.floor(Math.random() * 30 + 8);
  let height = width;
  const spreadFactor = Math.random() * 1 + 0.5;
  let destinationX = (Math.random() - 0.5) * 300 * spreadFactor;
  let destinationY = (Math.random() - 0.5) * 300 * spreadFactor;
  let rotation = Math.random() * 520;
  let delay = Math.random() * 200;

  let color = body && body.classList.contains('light-mode') ? 'black' : 'white';
  let boxShadow = `0 0 ${Math.floor(Math.random() * 10 + 10)}px ${color}`;

  if (type === 'shadow') {
    particle.style.boxShadow = boxShadow;
    particle.style.background = color;
    particle.style.borderRadius = '50%';
    width = height = Math.random() * 5 + 4;
  }

  particle.style.width = `${width}px`;
  particle.style.height = `${height}px`;
  particle.style.position = 'fixed';
  particle.style.left = '0';
  particle.style.top = '0';

  const animation = particle.animate(
    [
      { transform: `translate(${x}px, ${y}px) rotate(0deg)`, opacity: 1 },
      {
        transform: `translate(${x + destinationX}px, ${y + destinationY}px) rotate(${rotation}deg)`,
        opacity: 0,
      },
    ],
    {
      duration: Math.random() * 1000 + 5000,
      easing: 'cubic-bezier(0, .9, .57, 1)',
      delay,
    }
  );

  animation.onfinish = () => particle.remove();
}

/* ========== Создание сердечка ========== */
function createHeartParticle(x, y) {
  const heartParticle = document.createElement('span');
  heartParticle.classList.add('heart-particle');
  heartParticle.innerHTML = '❤️';
  heartParticle.style.position = 'fixed';
  heartParticle.style.left = '0';
  heartParticle.style.top = '0';
  heartParticle.style.fontSize = '16px';
  document.body.appendChild(heartParticle);

  const spreadFactor = Math.random() * 1 + 0.5;
  let destinationX = (Math.random() - 0.5) * 200 * spreadFactor;
  let destinationY = (Math.random() - 0.5) * 200 * spreadFactor;
  let rotation = Math.random() * 360;
  let delay = Math.random() * 100;

  const animation = heartParticle.animate(
    [
      {
        transform: `translate(${x}px, ${y}px) rotate(0deg) scale(0)`,
        opacity: 1,
      },
      {
        transform: `translate(${x + destinationX}px, ${y + destinationY}px) rotate(${rotation}deg) scale(2.0)`,
        opacity: 0,
      },
    ],
    {
      duration: Math.random() * 500 + 1500,
      easing: 'cubic-bezier(0, .9, .57, 1)',
      delay,
    }
  );

  animation.onfinish = () => heartParticle.remove();
}

/* ========== Постоянные "взрывы" из центра стартовой кнопки ========== */
function popContinuous() {
  if (!startButtonContainer || startButtonContainer.classList.contains('fade-out')) return;
  const b = startButton.getBoundingClientRect();
  const x = b.left + b.width / 2;
  const y = b.top + b.height / 2;
  const num = 6 + Math.floor(Math.random() * 6);
  for (let i = 0; i < num; i++) createParticle(x, y, 'shadow');
}

/* ========== Случайное мерцание по экрану ========== */
function randomSparkle() {
  const x = Math.random() * window.innerWidth;
  const y = Math.random() * window.innerHeight;
  const numParticles = Math.floor(Math.random() * 6) + 5;
  for (let i = 0; i < numParticles; i++) createParticle(x, y, 'shadow');
}

/* ========== Инициализация ========== */
function initParticles() {
  if (document.body.animate) {
    if (!particleInterval) {
      particleInterval = setInterval(popContinuous, 300);
    }
  }
}

/* Экспортируем функции глобально (если нужно использовать в других файлах) */
window.createParticle = createParticle;
window.createHeartParticle = createHeartParticle;
window.popContinuous = popContinuous;
window.randomSparkle = randomSparkle;
window.initParticles = initParticles;
