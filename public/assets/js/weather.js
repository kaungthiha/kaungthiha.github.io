/* ──────────────────────────────────────────────────────────────────────
   Automatic local weather + daylight phase — Arlington, Virginia.

   Fetches current conditions AND today's sunrise/sunset from Open-Meteo
   (free, keyless, CORS-enabled), maps the WMO weather code (+ temperature /
   wind) onto an internal mode, derives a daylight phase (day / dawn / dusk /
   night) from Arlington's actual sun times, and drives the page mood:
   body classes, `data-theme` on <html>, lazy rain/snow particles, weather
   backdrops, and a single `weather:change` event carrying {mode, phase}
   that the ambient forest listens for.

   This file is the single source of truth for BOTH weather and phase. A
   minute ticker re-derives the phase between fetches so dusk→night flips
   live. No user selector, no geolocation prompt — always Arlington.

   Dev override: `?weather=<mode>&phase=<phase>` skips the fetch entirely.
   ────────────────────────────────────────────────────────────────────── */

(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Arlington, Virginia (approx). No geolocation — hardcoded on purpose.
  const LAT = 38.88;
  const LON = -77.09;
  // timeformat=unixtime makes daily.sunrise/sunset unambiguous epoch seconds
  // (ISO strings would parse in the VISITOR's zone, not Arlington's).
  const API =
    `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
    `&current=weather_code,temperature_2m,wind_speed_10m,is_day` +
    `&daily=sunrise,sunset&forecast_days=1&timezone=America%2FNew_York` +
    `&timeformat=unixtime&temperature_unit=fahrenheit&wind_speed_unit=mph`;

  // v2: payload gained sunrise/sunset (a stale v1 entry lacks them — the
  // phase then falls back to the wall clock, handled below).
  const CACHE_KEY = 'kt_arlington_weather_v2';
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
  const ALL_PHASES = ['day', 'dawn', 'dusk', 'night'];

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

  // ── Daylight phase ─────────────────────────────────────────────────
  // dawn/dusk = sunrise/sunset ± 40 min; night outside; day between.
  // sunrise/sunset are epoch SECONDS (Open-Meteo timeformat=unixtime).
  const PHASE_BAND_SEC = 40 * 60;
  // Today's sun times, kept module-level so the minute ticker can re-derive
  // the phase without refetching.
  let sunTimes = null; // { sunrise, sunset } in epoch seconds

  function phaseFromSun(nowSec, sunrise, sunset) {
    if (nowSec < sunrise - PHASE_BAND_SEC || nowSec > sunset + PHASE_BAND_SEC) return 'night';
    if (nowSec <= sunrise + PHASE_BAND_SEC) return 'dawn';
    if (nowSec >= sunset - PHASE_BAND_SEC) return 'dusk';
    return 'day';
  }

  // Clock fallback (no sun times yet / fetch failed): fixed bands on the
  // America/New_York wall clock. KEEP IN SYNC with the inline anti-FOUC
  // script in src/layouts/Base.astro <head>.
  function phaseFromClock() {
    let h;
    try {
      h = parseInt(
        new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/New_York', hour: 'numeric', hour12: false,
        }).format(new Date()),
        10,
      ) % 24;
    } catch (_) {
      h = new Date().getHours();
    }
    if (h >= 6 && h < 7) return 'dawn';
    if (h >= 7 && h < 18) return 'day';
    if (h >= 18 && h < 20) return 'dusk';
    return 'night';
  }

  function resolvePhase() {
    if (sunTimes && typeof sunTimes.sunrise === 'number' && typeof sunTimes.sunset === 'number') {
      return phaseFromSun(Date.now() / 1000, sunTimes.sunrise, sunTimes.sunset);
    }
    return phaseFromClock();
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

  // ── Apply a resolved (mode, phase) to the page ─────────────────────
  let currentMode = null;
  let currentPhase = null;

  const THEME_OF_PHASE = { day: 'light', dawn: 'dawn', dusk: 'dusk', night: 'dark' };

  function applyState(mode, phase, phrase, opts) {
    if (!ALL_MODES.includes(mode)) mode = 'sunny';
    if (!ALL_PHASES.includes(phase)) phase = 'day';
    const silentSnippet = opts && opts.silentSnippet;

    const modeChanged = mode !== currentMode;
    const phaseChanged = phase !== currentPhase;

    // Mode-only work: weather body classes, backdrops, DOM particles.
    // Keyed on mode change ONLY so the minute phase ticker never rebuilds
    // the rain/snow DOM.
    if (modeChanged) {
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
    }

    // Phase-only work: phase body class + the CSS theme on <html>.
    if (phaseChanged) {
      ALL_PHASES.forEach((p) => document.body.classList.remove('phase-' + p));
      document.body.classList.add('phase-' + phase);
      document.documentElement.dataset.theme = THEME_OF_PHASE[phase];
    }

    if (modeChanged || phaseChanged) {
      currentMode = mode;
      currentPhase = phase;

      const detail = {
        mode,
        phase,
        phrase: phrase || PHRASE[mode] || mode,
        source: 'arlington-weather',
      };
      // Persist the latest state so a listener that registers AFTER this fired
      // (e.g. the lazily-imported forest) can pick it up on boot — no second
      // event needed.
      window.KTWeatherState = detail;
      // Broadcast for the forest (and any other listeners).
      window.dispatchEvent(new CustomEvent('weather:change', { detail }));
    }

    // Snippet text (only on pages that have it). Fallback keeps its own copy.
    if (statusEl && !silentSnippet) {
      const when = phase === 'night' ? ' tonight' : '';
      statusEl.textContent =
        `It's really ${phrase || PHRASE[mode] || mode} in Arlington, Virginia${when}!`;
    }
  }

  // ── Pause / rebuild particles on tab visibility ────────────────────
  document.addEventListener('visibilitychange', () => {
    const pc = particleContainer(currentMode);
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
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        t: Date.now(),
        mode,
        phrase,
        sunrise: sunTimes ? sunTimes.sunrise : undefined,
        sunset: sunTimes ? sunTimes.sunset : undefined,
      }));
    } catch (_) {
      /* ignore */
    }
  }

  // ── Fetch current Arlington weather + sun times ────────────────────
  function fetchWeather() {
    fetch(API, { mode: 'cors' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status))))
      .then((data) => {
        const c = data && data.current;
        if (!c || typeof c.weather_code !== 'number') throw new Error('no current weather');
        const d = data.daily;
        if (d && Array.isArray(d.sunrise) && typeof d.sunrise[0] === 'number' &&
            Array.isArray(d.sunset) && typeof d.sunset[0] === 'number') {
          sunTimes = { sunrise: d.sunrise[0], sunset: d.sunset[0] };
        }
        const mode = resolveMode(c.weather_code, c.temperature_2m, c.wind_speed_10m);
        const phrase = PHRASE[mode] || mode;
        writeCache(mode, phrase);
        applyState(mode, resolvePhase(), phrase);
      })
      .catch(() => {
        // Graceful fallback — calm default, friendly copy, no raw codes.
        // Apply the mood/forest but keep the softer bespoke fallback wording.
        if (!currentMode) {
          applyState('sunny', resolvePhase(), 'calm', { silentSnippet: true });
          if (statusEl) {
            statusEl.textContent = 'It feels calm in Arlington, Virginia.';
          }
        }
      });
  }

  // ── Boot ───────────────────────────────────────────────────────────
  // Dev/test override: ?weather=rainy&phase=night skips the live fetch.
  const params = new URLSearchParams(window.location.search);
  const weatherOverride = params.get('weather');
  const phaseOverride = params.get('phase');
  if (weatherOverride || phaseOverride) {
    const mode = ALL_MODES.includes(weatherOverride) ? weatherOverride : 'sunny';
    const phase = ALL_PHASES.includes(phaseOverride) ? phaseOverride : resolvePhase();
    applyState(mode, phase, PHRASE[mode]);
    return;
  }

  if (statusEl) {
    statusEl.textContent = 'Checking the weather in Arlington, Virginia…';
  }

  const cached = readCache();
  if (cached) {
    if (typeof cached.sunrise === 'number' && typeof cached.sunset === 'number') {
      sunTimes = { sunrise: cached.sunrise, sunset: cached.sunset };
    }
    // Apply instantly from cache, then refresh quietly in the background.
    applyState(cached.mode, resolvePhase(), cached.phrase);
  }
  fetchWeather();

  // Re-derive the phase every minute so dawn/dusk/night transitions land
  // without a refetch (and without touching the weather-mode DOM).
  setInterval(() => {
    if (currentMode) applyState(currentMode, resolvePhase(), PHRASE[currentMode]);
  }, 60 * 1000);
}());
