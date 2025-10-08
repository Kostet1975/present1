// js/ui.js
'use strict';

let songListVisible = false;

function showSongList() {
  if (songListVisible) return;

  lyricsContainer.innerHTML = '';

  const ul = document.createElement('ul');
  ul.className = 'song-list';

  songs.forEach((s, idx) => {
    const li = document.createElement('li');
    li.className = 'song-list-item';
    li.tabIndex = 0;

    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = s.title;
    li.appendChild(label);

    li.addEventListener('click', () => playSongByIndex(idx));
    li.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        playSongByIndex(idx);
      }
    });

    ul.appendChild(li);
  });

  document.body.appendChild(ul);
  ul.classList.add('show');

  requestAnimationFrame(() => {
    ul.querySelectorAll('.song-list-item').forEach((li, i) => {
      setTimeout(() => li.classList.add('show'), i * 150);
    });
  });

  songListVisible = true;

  try {
    if (window.sparkleInterval) clearInterval(window.sparkleInterval);
    window.sparkleInterval = setInterval(randomSparkle, 700);
  } catch (e) {}
}

function hideSongList() {
  const ul = document.querySelector('ul.song-list');
  if (ul) ul.remove();
  songListVisible = false;
}

function playSongByIndex(index) {
  const song = songs[index];
  if (!song) return;

  const ul = document.querySelector('ul.song-list');
  if (!ul) return;

  const items = ul.querySelectorAll('.song-list-item');
  items.forEach((li, i) => {
    if (i === index) {
      li.classList.add('focused');

      const rect = li.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      for (let p = 0; p < 25; p++) createParticle(cx, cy, 'shadow');

      li.addEventListener(
        'animationend',
        () => {
          ul.remove();
          songListVisible = false;
          const loaded = loadSongByKey(song.key);
          if (!loaded) return;

          // Запускаем рандомный фон уже при выборе (модуль сам остановит предыдущий)
          try {
            if (window.backgroundEffects && typeof window.backgroundEffects.startRandomEffect === 'function') {
              window.backgroundEffects.startRandomEffect(true);
            } else {
              // fallback — если модули не подключены, оставляем старое поведение (randomSparkle)
              if (typeof randomSparkle === 'function') {
                try { if (window.sparkleInterval) clearInterval(window.sparkleInterval); } catch (e) {}
                window.sparkleInterval = setInterval(randomSparkle, 700);
              }
            }
          } catch (e) {}

          startButtonContainer.classList.add('fade-out');
          setTimeout(() => startPlayback(), 120);
        },
        { once: true }
      );
    } else {
      setTimeout(() => li.classList.add('hide'), i * 120);
    }
  });
}

function initUI() {
  startButtonContainer.addEventListener('click', () => {
    if (!isPlaying) {
      try { if (window.particleInterval) { clearInterval(window.particleInterval); window.particleInterval = null; } } catch (e) {}
      startButtonContainer.classList.add('fade-out');
      setTimeout(showSongList, 800);
    }
  });

  heartButton.addEventListener('click', () => {
    const bbox = heartButton.getBoundingClientRect();
    const x = bbox.left + bbox.width / 2;
    const y = bbox.top + bbox.height / 2;
    const numHearts = Math.floor(Math.random() * 8) + 5;
    for (let i = 0; i < numHearts; i++) createHeartParticle(x, y);
  });

  restartButtonContainer.addEventListener('click', () => {
    audioPlayer.pause();
    audioPlayer.currentTime = 0;
    // isPlaying will be managed by lyrics.js
    try { if (typeof setIsPlaying !== 'undefined') setIsPlaying(false); } catch (e) {}
    lyricsContainer.innerHTML = '';
    restartButtonContainer.style.display = 'none';
    showSongList();
  });
}

window.showSongList = showSongList;
window.hideSongList = hideSongList;
window.playSongByIndex = playSongByIndex;
window.initUI = initUI;
