/* ──────────────────────────────────────────────────────────────────────
   Editorial weather mode
   - Three states: sunny | rainy | snowy. Sunny is just a CSS gradient.
   - Rain + snow particles are generated on activation, removed when idle,
     paused on visibility change, and disabled under prefers-reduced-motion.
   ────────────────────────────────────────────────────────────────────── */

(function () {
  'use strict';

  const STORAGE_KEY = 'kt_weather_v2';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const buttons = document.querySelectorAll('.weather-btn[data-weather]');
  const containers = {
    sunny: document.querySelector('.weather-bg--sunny'),
    rainy: document.querySelector('.weather-bg--rainy'),
    snowy: document.querySelector('.weather-bg--snowy'),
  };
  if (!buttons.length) return;

  // ── Particle generation ────────────────────────────────────────────
  function buildRain(node) {
    if (node.childElementCount) return; // already built
    const drops = reduceMotion ? 0 : 28;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < drops; i++) {
      const drop = document.createElement('span');
      drop.className = 'raindrop';
      const left = Math.random() * 100;
      const height = 30 + Math.random() * 40;     // 30-70px
      const duration = 0.7 + Math.random() * 0.6; // 0.7-1.3s
      const delay = Math.random() * -1.5;
      drop.style.cssText =
        `left:${left}%;height:${height}px;animation-duration:${duration}s;animation-delay:${delay}s;`;
      frag.appendChild(drop);
    }
    node.appendChild(frag);
  }

  function buildSnow(node) {
    if (node.childElementCount) return;
    const flakes = reduceMotion ? 0 : 24;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < flakes; i++) {
      const flake = document.createElement('span');
      flake.className = 'snowflake';
      flake.textContent = '❄';
      const left = Math.random() * 100;
      const size = 10 + Math.random() * 12;       // 10-22px
      const duration = 10 + Math.random() * 14;   // 10-24s
      const delay = Math.random() * -duration;
      const opacity = 0.5 + Math.random() * 0.4;
      flake.style.cssText =
        `left:${left}%;font-size:${size}px;opacity:${opacity};animation-duration:${duration}s;animation-delay:${delay}s;`;
      frag.appendChild(flake);
    }
    node.appendChild(frag);
  }

  function clearParticles(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
  }

  // ── State ──────────────────────────────────────────────────────────
  let current = null;

  function setWeather(mode) {
    if (mode === current) return;
    current = mode;

    buttons.forEach(btn => {
      const active = btn.dataset.weather === mode;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    document.body.classList.remove('weather-sunny', 'weather-rainy', 'weather-snowy');
    document.body.classList.add(`weather-${mode}`);

    Object.entries(containers).forEach(([key, el]) => {
      if (!el) return;
      el.classList.toggle('is-active', key === mode);
      // Tear down particles when leaving rainy/snowy to save cycles
      if (key !== mode && (key === 'rainy' || key === 'snowy')) clearParticles(el);
    });

    if (mode === 'rainy' && containers.rainy) buildRain(containers.rainy);
    if (mode === 'snowy' && containers.snowy) buildSnow(containers.snowy);

    try { localStorage.setItem(STORAGE_KEY, mode); } catch (_) { /* ignore */ }

    // Broadcast for downstream listeners (e.g. tree.js)
    window.dispatchEvent(new CustomEvent('weather:change', { detail: { mode } }));
  }

  // ── Pause particles when tab hidden ────────────────────────────────
  document.addEventListener('visibilitychange', () => {
    if (!current || (current !== 'rainy' && current !== 'snowy')) return;
    const node = containers[current];
    if (!node) return;
    if (document.hidden) {
      clearParticles(node);
    } else {
      if (current === 'rainy') buildRain(node);
      if (current === 'snowy') buildSnow(node);
    }
  });

  // ── Wire up buttons ────────────────────────────────────────────────
  buttons.forEach(btn => {
    btn.addEventListener('click', () => setWeather(btn.dataset.weather));
  });

  // ── Boot ───────────────────────────────────────────────────────────
  let saved = 'sunny';
  try { saved = localStorage.getItem(STORAGE_KEY) || 'sunny'; } catch (_) { /* ignore */ }
  if (!['sunny', 'rainy', 'snowy'].includes(saved)) saved = 'sunny';
  setWeather(saved);
}());
