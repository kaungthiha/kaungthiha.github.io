/* ──────────────────────────────────────────────────────────────────────
   Season: a third, purely decorative signal beside weather and daylight.

   It comes from the calendar in Arlington (America/New_York), never from
   the weather API or the visitor's clock, and it only nudges the palette
   and small botanical accents. It never claims weather: winter doesn't
   snow, spring doesn't rain. Real weather wins wherever the two meet.

   State lives on <html> so CSS and every script read the same thing:
     data-season="spring|summer|autumn|winter"
     data-padauk="on"   the padauk accent is showing right now

   Review overrides: ?season=winter and ?padauk=on|off (or the ?preview
   panel, which calls setSeason / setPadauk).
   ────────────────────────────────────────────────────────────────────── */

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter'];

/** The padauk (ပိတောက်) accent: Myanmar's April flower, shown on the Loves
    branch through April as a nod to home, not a claim about what blooms in
    Arlington. Set to 'off' to remove it everywhere. */
export const PADAUK: 'april' | 'off' = 'april';
/** Weather that hides the accent: rain is the event then, and nothing blooms in snow. */
const PADAUK_HIDDEN_IN = ['rainy', 'stormy', 'snowy'];

function arlingtonMonth(date: Date): number {
  return Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', month: 'numeric' }).format(date));
}

/** Meteorological seasons: spring Mar–May, summer Jun–Aug, autumn Sep–Nov, winter Dec–Feb. */
export function seasonOf(date = new Date()): Season {
  const m = arlingtonMonth(date);
  return m >= 3 && m <= 5 ? 'spring' : m >= 6 && m <= 8 ? 'summer' : m >= 9 && m <= 11 ? 'autumn' : 'winter';
}

const root = document.documentElement;
const isSeason = (s: unknown): s is Season => SEASONS.includes(s as Season);

export const currentSeason = (): Season => (isSeason(root.dataset.season) ? root.dataset.season : seasonOf());
export const padaukWanted = (): boolean => root.dataset.padaukPref === 'on';

function applyPadauk(): void {
  const mode = (window as any).KTWeatherState?.mode;
  if (padaukWanted() && !PADAUK_HIDDEN_IN.includes(mode)) root.dataset.padauk = 'on';
  else delete root.dataset.padauk;
}

export function setSeason(season: Season): void {
  root.dataset.season = season;
  window.dispatchEvent(new CustomEvent('season:change', { detail: { season } }));
}
export function setPadauk(on: boolean): void {
  root.dataset.padaukPref = on ? 'on' : 'off';
  applyPadauk();
}

/** Safe to call more than once; the first call wins. */
export function initSeason(): void {
  if (root.dataset.padaukPref) return;
  const params = new URLSearchParams(location.search);
  const season = params.get('season');
  const padauk = params.get('padauk');
  const now = new Date();
  root.dataset.season = isSeason(season) ? season : seasonOf(now);
  root.dataset.padaukPref =
    padauk === 'on' || (padauk !== 'off' && PADAUK === 'april' && arlingtonMonth(now) === 4) ? 'on' : 'off';
  applyPadauk();
  window.addEventListener('weather:change', applyPadauk);
}
