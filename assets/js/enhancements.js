/* Load this file after app.js. No confetti or audio libraries required. */
(function () {
  'use strict';
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&display=swap';
  document.head.appendChild(link);
  const style = document.createElement('style');
  style.textContent = `
    body, button, input, textarea, select, .btn, .form-control {
      font-family: 'Quicksand', Arial, sans-serif;
    }
    .letters {
      font-family: 'KG Primary Penmanship Alt', Arial, sans-serif;
      font-weight: 400;
      font-synthesis: none;
    }
    .reading-confetti {
      position: fixed; inset: 0; width: 100%; height: 100%;
      pointer-events: none; z-index: 9999;
    }
  `;
  document.head.appendChild(style);

  let audio = null;
  let celebrated = false;
  let animation = null;
  let canvas = null;
  let checkTimer = null;
  function unlockAudio() {
    const AudioClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioClass) return;
    try {
      if (!audio) audio = new AudioClass();
      if (audio.state === 'suspended') audio.resume().catch(() => {});
    } catch (error) { console.warn('Audio unavailable.', error); }
  }
  document.addEventListener('pointerdown', unlockAudio, { passive: true });
  document.addEventListener('keydown', unlockAudio);

  function ding() {
    if (!audio || audio.state !== 'running') return;
    const now = audio.currentTime;
    [[1046.5, .15, .85], [2093, .045, .6], [3139.5, .018, .4]].forEach(function (tone) {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = tone[0];
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(tone[1], now + .012);
      gain.gain.exponentialRampToValueAtTime(.0001, now + tone[2]);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start(now);
      oscillator.stop(now + tone[2] + .03);
      oscillator.onended = function () { oscillator.disconnect(); gain.disconnect(); };
    });
  }
  function stopConfetti() {
    if (animation !== null) cancelAnimationFrame(animation);
    animation = null;
    if (canvas) canvas.remove();
    canvas = null;
  }
  function confetti() {
    stopConfetti();
    canvas = document.createElement('canvas');
    canvas.className = 'reading-confetti';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);
    const context = canvas.getContext('2d');
    if (!context) { stopConfetti(); return; }
    const width = innerWidth, height = innerHeight;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.scale(ratio, ratio);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const colors = ['#2375dc', '#ffca48', '#ec6394', '#52b788', '#9c7bea'];
    const particles = Array.from({ length: reduced ? 45 : 160 }, function () {
      const left = Math.random() < .5;
      return {
        x: reduced ? Math.random() * width : left ? width * .12 : width * .88,
        y: reduced ? Math.random() * height : height * .55,
        vx: (left ? 1 : -1) * (100 + Math.random() * 330),
        vy: -270 - Math.random() * 430,
        size: 5 + Math.random() * 7,
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() - .5) * 12,
        color: colors[Math.floor(Math.random() * colors.length)]
      };
    });
    const start = performance.now();
    let previous = start;
    function frame(now) {
      const duration = reduced ? 1100 : 3200;
      const elapsed = now - start;
      if (elapsed > duration) { stopConfetti(); return; }
      const dt = Math.min((now - previous) / 1000, .04);
      previous = now;
      context.clearRect(0, 0, width, height);
      context.globalAlpha = Math.min(1, (duration - elapsed) / 650);
      particles.forEach(function (p) {
        if (!reduced) {
          p.vy += 380 * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.rotation += p.spin * dt;
        }
        context.save();
        context.translate(p.x, p.y);
        context.rotate(p.rotation);
        context.fillStyle = p.color;
        context.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * .65);
        context.restore();
      });
      animation = requestAnimationFrame(frame);
    }
    animation = requestAnimationFrame(frame);
  }
  function checkCompletion() {
    const reader = document.getElementById('reader');
    const pages = document.getElementById('pages');
    if (!reader || !pages) return;
    const letters = pages.querySelectorAll('.letter');
    const complete = letters.length > 0 && Array.from(letters).every(el => el.classList.contains('read'));
    if (reader.hidden || !complete) {
      celebrated = false;
      if (reader.hidden) stopConfetti();
      return;
    }
    if (pages.querySelector('.dragging') || celebrated) return;
    celebrated = true;
    ding();
    confetti();
  }
  function init() {
    const reader = document.getElementById('reader');
    if (!reader) return;
    const observer = new MutationObserver(function () {
      clearTimeout(checkTimer);
      checkTimer = setTimeout(checkCompletion, 30);
    });
    observer.observe(reader, {
      subtree: true, childList: true, attributes: true,
      attributeFilter: ['class', 'hidden']
    });
    ['reset', 'edit'].forEach(function (id) {
      const button = document.getElementById(id);
      if (button) button.addEventListener('click', function () {
        celebrated = false;
        stopConfetti();
      });
    });
    const form = document.getElementById('setup');
    if (form) form.addEventListener('submit', function () {
      celebrated = false;
      stopConfetti();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
