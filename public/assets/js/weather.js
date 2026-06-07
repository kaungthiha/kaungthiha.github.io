/* ──────────────────────────────────────────────────────────────────────
   Automatic local weather — Arlington, Virginia.

   Fetches current conditions from Open-Meteo (free, keyless, CORS-enabled),
   maps the WMO weather code (+ temperature / wind) onto an internal mode, and
   drives the page mood: body class, lazy rain/snow particles, weather
   backdrops, and a `weather:change` event the ambient forest listens for.

   No user selector, no geolocation prompt — always Arlington. The location
   snippet (.local-weather-status) updates from a loading state to the
   resolved phrase. On pages without that element, the script still applies
   body classes site-wide and no-ops gracefully.
   ────────────────────────────────────────────────────────────────────── */

(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Arlington, Virginia (approx). No geolocation — hardcoded on purpose.
  const LAT = 38.88;
  const LON = -77.09;
  const API =
    `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
    `&current=weather_code,temperature_2m,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph`;

  const CACHE_KEY = 'kt_arlington_weather_v1';
  const TTL_MS = 45 * 60 * 1000; // 45 minutes

  const statusEl = document.querySelector('.local-weather-status');

  const containers = {
    rainy: document.querySelector('.weather-bg--rainy'),
    stormy: document.querySelector('.weather-bg--stormy'),
    snowy: document.querySelector('.weather-bg--snowy'),
  };

  const ALL_MODES = [
    'sunny', 'clear', 'cloudy', 'rainy', 'stormy', 'snowy', 'foggy', 'windy', 'hot', 'cold',
  ];

  // User-facing natural-language phrase per mode.
  const PHRASE = {
    sunny: 'sunny',
    clear: 'clear',
    cloudy: 'cloudy',
    rainy: 'rainy',
    stormy: 'stormy',
    snowy: 'snowy',
    foggy: 'foggy',
    windy: 'windy',
    hot: 'hot',
    cold: 'cold',
  };

  // ── WMO weather_code → base mode ───────────────────────────────────
  // https://open-meteo.com/en/docs (WMO interpretation codes)
  function codeToMode(code) {
    if (code === 0) return 'clear';
    if (code === 1 || code === 2) return 'cloudy';   // mainly/partly cloudy
    if (code === 3) return 'cloudy';                  // overcast
    if (code === 45 || code === 48) return 'foggy';   // fog / rime fog
    if (code >= 51 && code <= 57) return 'rainy';     // drizzle
    if (code >= 61 && code <= 67) return 'rainy';     // rain
    if (code >= 71 && code <= 77) return 'snowy';     // snow
    if (code >= 80 && code <= 82) return 'rainy';     // rain showers
    if (code === 85 || code === 86) return 'snowy';   // snow showers
    if (code >= 95 && code <= 99) return 'stormy';    // thunderstorm
    return 'cloudy';
  }

  // Refine with temperature / wind. Precedence (most→least important):
  // storm > snow > fog > rain > [extreme temp / wind refinements].
  function resolveMode(code, tempF, windMph) {
    const base = codeToMode(code);

    // Hard weather always wins — never override storm/snow/fog/rain.
    if (base === 'stormy' || base === 'snowy' || base === 'foggy' || base === 'rainy') {
      return base;
    }

    // Otherwise (clear/cloudy) allow temp/wind to colour the mood.
    if (typeof windMph === 'number' && windMph >= 22) return 'windy';
    if (typeof tempF === 'number') {
      if (tempF >= 90) return 'hot';
      if (tempF <= 32) return 'cold';
    }
    // 'clear' with no refinement reads warmer as "sunny".
    if (base === 'clear') return 'sunny';
    return base;
  }

  // ── Particle generation (lazy; only rain/snow) ─────────────────────
  function buildRain(node, heavy) {
    if (!node || node.childElementCount) return;
    const drops = reduceMotion ? 0 : heavy ? 40 : 28;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < drops; i++) {
      const drop = document.createElement('span');
      drop.className = 'raindrop';
      const left = Math.random() * 100;
      const height = 30 + Math.random() * 40;
      const duration = (heavy ? 0.5 : 0.7) + Math.random() * 0.6;
      const delay = Math.random() * -1.5;
      drop.style.cssText =
        `left:${left}%;height:${height}px;animation-duration:${duration}s;animation-delay:${delay}s;`;
      frag.appendChild(drop);
    }
    node.appendChild(frag);
  }

  function buildSnow(node) {
    if (!node || node.childElementCount) return;
    const flakes = reduceMotion ? 0 : 24;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < flakes; i++) {
      const flake = document.createElement('span');
      flake.className = 'snowflake';
      flake.textContent = '❄';
      const left = Math.random() * 100;
      const size = 10 + Math.random() * 12;
      const duration = 10 + Math.random() * 14;
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

  // Which container (if any) carries particles for a mode.
  function particleContainer(mode) {
    if (mode === 'rainy') return { node: containers.rainy, kind: 'rain' };
    if (mode === 'stormy') return { node: containers.stormy || containers.rainy, kind: 'rain-heavy' };
    if (mode === 'snowy') return { node: containers.snowy, kind: 'snow' };
    return null;
  }

  // ── Apply a resolved mode to the page ──────────────────────────────
  let current = null;

  function applyMode(mode, phrase, opts) {
    if (!ALL_MODES.includes(mode)) mode = 'sunny';
    const silentSnippet = opts && opts.silentSnippet;

    if (mode !== current) {
      // Body class
      ALL_MODES.forEach((m) => document.body.classList.remove('weather-' + m));
      document.body.classList.add('weather-' + mode);

      // Backdrops: deactivate all, then activate the matching container.
      document.querySelectorAll('.weather-bg').forEach((el) => {
        el.classList.remove('is-active');
      });
      const active = document.querySelector('.weather-bg--' + mode);
      if (active) active.classList.add('is-active');

      // Clear particles from any container that is no longer active.
      Object.values(containers).forEach((node) => {
        if (node && !node.classList.contains('is-active')) clearParticles(node);
      });

      // Build particles for the active mode.
      const pc = particleContainer(mode);
      if (pc && pc.node) {
        pc.node.classList.add('is-active');
        if (pc.kind === 'snow') buildSnow(pc.node);
        else buildRain(pc.node, pc.kind === 'rain-heavy');
      }

      current = mode;

      // Broadcast for the forest (and any other listeners).
      window.dispatchEvent(
        new CustomEvent('weather:change', {
          detail: { mode, phrase: phrase || PHRASE[mode] || mode, source: 'arlington-weather' },
        }),
      );
    }

    // Snippet text (only on pages that have it). Fallback keeps its own copy.
    if (statusEl && !silentSnippet) {
      statusEl.textContent =
        `Today it's really ${phrase || PHRASE[mode] || mode} where I am in Arlington, Virginia.`;
    }
  }

  // ── Pause / rebuild particles on tab visibility ────────────────────
  document.addEventListener('visibilitychange', () => {
    const pc = particleContainer(current);
    if (!pc || !pc.node) return;
    if (document.hidden) {
      clearParticles(pc.node);
    } else if (pc.kind === 'snow') {
      buildSnow(pc.node);
    } else {
      buildRain(pc.node, pc.kind === 'rain-heavy');
    }
  });

  // ── Cache ──────────────────────────────────────────────────────────
  function readCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || Date.now() - obj.t > TTL_MS) return null;
      return obj;
    } catch (_) {
      return null;
    }
  }
  function writeCache(mode, phrase) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), mode, phrase }));
    } catch (_) {
      /* ignore */
    }
  }

  // ── Fetch current Arlington weather ────────────────────────────────
  function fetchWeather() {
    fetch(API, { mode: 'cors' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status))))
      .then((data) => {
        const c = data && data.current;
        if (!c || typeof c.weather_code !== 'number') throw new Error('no current weather');
        const mode = resolveMode(c.weather_code, c.temperature_2m, c.wind_speed_10m);
        const phrase = PHRASE[mode] || mode;
        writeCache(mode, phrase);
        applyMode(mode, phrase);
      })
      .catch(() => {
        // Graceful fallback — calm default, friendly copy, no raw codes.
        // Apply the mood/forest but keep the softer bespoke fallback wording.
        if (!current) {
          applyMode('sunny', 'calm', { silentSnippet: true });
          if (statusEl) {
            statusEl.textContent = 'Today it feels calm where I am in Arlington, Virginia.';
          }
        }
      });
  }

  // ── Boot ───────────────────────────────────────────────────────────
  if (statusEl) {
    statusEl.textContent = 'Checking the weather in Arlington, Virginia…';
  }

  const cached = readCache();
  if (cached) {
    // Apply instantly from cache, then refresh quietly in the background.
    applyMode(cached.mode, cached.phrase);
  }
  fetchWeather();
}());
