/* ──────────────────────────────────────────────────────────────────────
   Cursor ripple — canvas 2D, fine pointers only.
   - Throttled to ~16ms via rAF
   - Up to MAX_RIPPLES concurrent expanding rings
   - Auto-stops when no movement for IDLE_MS
   - Disabled under prefers-reduced-motion or coarse pointer
   ────────────────────────────────────────────────────────────────────── */

(function () {
  'use strict';

  // Bail out for touch / no-hover devices and reduced-motion users
  const finePointer  = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!finePointer || reduceMotion) return;

  const MAX_RIPPLES   = 8;
  const SPAWN_MIN_MS  = 80;     // min time between spawns from movement
  const IDLE_MS       = 2500;   // stop loop after this long without motion
  const LIFE_MS       = 1100;   // ring life
  const MAX_RADIUS    = 70;

  const canvas = document.createElement('canvas');
  canvas.className = 'ripple-canvas';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d', { alpha: true });

  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width  = Math.floor(window.innerWidth  * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width  = window.innerWidth  + 'px';
    canvas.style.height = window.innerHeight + 'px';
  }
  resize();
  window.addEventListener('resize', resize);

  /** @type {{x:number,y:number,start:number}[]} */
  const ripples = [];
  let lastSpawn = 0;
  let lastMove  = 0;
  let raf = null;

  function spawn(x, y) {
    const now = performance.now();
    if (now - lastSpawn < SPAWN_MIN_MS) return;
    lastSpawn = now;
    if (ripples.length >= MAX_RIPPLES) ripples.shift();
    ripples.push({ x, y, start: now });
  }

  function tick() {
    const now = performance.now();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      const t = (now - r.start) / LIFE_MS; // 0 → 1
      if (t >= 1) { ripples.splice(i, 1); continue; }

      const eased = 1 - Math.pow(1 - t, 3);          // ease-out cubic
      const radius = eased * MAX_RADIUS * dpr;
      const alpha  = (1 - t) * 0.35;

      ctx.beginPath();
      ctx.arc(r.x * dpr, r.y * dpr, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(36, 128, 253, ${alpha})`;
      ctx.lineWidth = 1.25 * dpr;
      ctx.stroke();
    }

    if (ripples.length || (now - lastMove) < IDLE_MS) {
      raf = requestAnimationFrame(tick);
    } else {
      raf = null;
    }
  }

  function ensureRunning() {
    if (!raf) raf = requestAnimationFrame(tick);
  }

  window.addEventListener('pointermove', e => {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    lastMove = performance.now();
    spawn(e.clientX, e.clientY);
    ensureRunning();
  }, { passive: true });

  // Pause on tab hidden — clears canvas & cancels RAF
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      ripples.length = 0;
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  });
}());
