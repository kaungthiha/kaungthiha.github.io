/* ──────────────────────────────────────────────────────────────────────
   The forest's cast: who is out in the meadow right now.

   A small director for the painted figures the dusk shader draws into the
   landscape (dusk.ts samples them from one atlas, scripts/build-forest-
   sprites.mjs). It decides who appears from the same state as everything
   else up there, Arlington's weather and daylight:

     fair day     someone strolling, now and then a jogger; a rabbit; birds
     dawn / dusk  the same, plus a deer at the meadow's far edge
     night        nobody; the deer may still come
     rain         one walker under an umbrella, hurrying
     storm        someone running for cover
     snow         a slow, bundled walker

   and, always, Shwedagon small on a far ridge: a memory of Yangon on the
   horizon, not a claim about Virginia. It never moves and is nothing to
   click.

   No loop of its own: dusk.ts calls update() from its existing frame.
   Everything is in painting pixels (1536 × 1024, origin top-left).
   ────────────────────────────────────────────────────────────────────── */

import atlas from '../data/forest-sprites.json';

export type ClipName = keyof typeof atlas.clips;

/** One figure to draw this frame. x, y is where it stands (bottom centre). */
export interface Figure {
  clip: ClipName;
  frame: number;
  x: number;
  y: number;
  h: number;          // drawn height of the clip's cell
  flip: boolean;      // the sheets all face right
  depth: number;      // 0 far … 1 near: parallax, and what can stand in front
  alpha: number;
  haze: number;       // how far it sinks into the air behind it
  foot: number;       // share of the cell, from the bottom, lost in the grass
  glow: number;       // holds its own light when the scene darkens
  hideLeft: number;   // nearer things hide it only left of this (0…1 of the painting)
  tone: number;       // gamma: above 1 deepens a figure painted too pale for the scene
  behindSkyline?: boolean;  // drawn only against the sky, so the ridge in front cuts it off
}

export interface CastContext {
  mode: string;
  phase: string;
  x0: number;         // the visible span of the painting
  x1: number;
  still: boolean;     // reduced motion: a single frame, nothing moving
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)];
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

// ── The lie of the land, traced from the painting ───────────────────────
// The meadow's brow (where the lit grass meets the misty valley), every 64px
// across: high by the oak, dipping through the middle, rising to the young
// tree. Everyone on foot follows it instead of walking a ruled line.
const BROW = [836, 836, 836, 836, 836, 842, 854, 869, 882, 890, 897, 904, 910, 913, 913, 910, 903, 893, 887, 877, 868, 853, 848, 844, 842];
function browY(x: number): number {
  const t = clamp(x / 64, 0, BROW.length - 1.001), i = Math.floor(t), f = t - i;
  const a = BROW[Math.max(0, i - 1)], b = BROW[i], c = BROW[i + 1], d = BROW[Math.min(BROW.length - 1, i + 2)];
  // Catmull-Rom, so the path has no corners at the samples.
  return 0.5 * (2 * b + (c - a) * f + (2 * a - 5 * b + 4 * c - d) * f * f + (3 * b - a - 3 * c + d) * f * f * f);
}
// The far skyline (same trace the sky mask is built from, build-dusk-assets.mjs).
const RIDGE: Array<[number, number]> = [
  [0, 628], [250, 627], [300, 619], [350, 627], [390, 634], [450, 620], [500, 607], [550, 595], [600, 582],
  [650, 575], [700, 565], [715, 562], [750, 570], [800, 586], [850, 600], [900, 612], [950, 621], [990, 621],
  [1025, 612], [1050, 605], [1100, 602], [1150, 600], [1180, 602], [1200, 607], [1536, 612],
];
function ridgeY(x: number): number {
  let k = 0;
  while (k < RIDGE.length - 2 && RIDGE[k + 1][0] < x) k++;
  const [xa, ya] = RIDGE[k], [xb, yb] = RIDGE[k + 1];
  return ya + ((yb - ya) * clamp((x - xa) / (xb - xa), 0, 1));
}

const OAK = 0.15;            // the oak's trunk ends here; walkers pass behind it
const OAK_X = 150;

interface Gait { clip: ClipName; h: number; stride: number; cycle: number; tone: number }
// stride: ground covered per cycle, as a share of the figure's height, so
// the feet don't slide.
const GAITS: Record<string, Gait> = {
  womanWalk: { clip: 'womanWalk', h: 104, stride: 0.86, cycle: 1.12, tone: 1.45 },
  manWalk: { clip: 'manWalk', h: 104, stride: 0.8, cycle: 1.16, tone: 1.15 },
  womanRun: { clip: 'womanRun', h: 106, stride: 1.5, cycle: 0.64, tone: 1.4 },
  womanRain: { clip: 'womanRain', h: 124, stride: 0.74, cycle: 0.92, tone: 1.3 },
  womanSnow: { clip: 'womanSnow', h: 104, stride: 0.7, cycle: 1.3, tone: 1.15 },
};

function walkerFor(c: CastContext): Gait | null {
  if (c.phase === 'night') return null;
  if (c.mode === 'stormy') return GAITS.womanRun;
  if (c.mode === 'rainy') return GAITS.womanRain;
  if (c.mode === 'snowy') return GAITS.womanSnow;
  const fair = [GAITS.womanWalk, GAITS.womanWalk, GAITS.manWalk, GAITS.manWalk];
  if (c.phase !== 'dusk' && c.mode !== 'foggy') fair.push(GAITS.womanRun);
  return pick(fair);
}
const rabbitWeather = (c: CastContext) => c.phase !== 'night' && !['rainy', 'stormy', 'snowy'].includes(c.mode);
const birdWeather = (c: CastContext) => c.phase !== 'night' && !['rainy', 'stormy'].includes(c.mode);
const deerWeather = (c: CastContext) => c.phase !== 'day' && !['rainy', 'stormy'].includes(c.mode);

export function createCast() {
  let now = 0;

  // ── Walker ───────────────────────────────────────────────────────────
  // off: how far in front of the brow they walk, drifting from one value to
  // another over the crossing so the path isn't parallel to anything.
  let walker: { g: Gait; x: number; from: number; to: number; x0: number; x1: number; dir: 1 | -1; gone: number } | null = null;
  let nextWalker = rand(5, 9);

  function stepWalker(dt: number, c: CastContext, out: Figure[]): void {
    if (!walker) {
      if (now < nextWalker) return;
      const g = walkerFor(c);
      if (!g) { nextWalker = now + 20; return; }
      const dir = Math.random() < 0.6 ? 1 : -1;
      const left = c.x0 < OAK_X + 40 ? OAK_X : c.x0 - 60, right = c.x1 + 60;
      walker = { g, dir, x: dir > 0 ? left : right, x0: left, x1: right, from: rand(4, 30), to: rand(4, 30), gone: 0 };
    }
    const w = walker;
    const across = clamp((w.x - w.x0) / (w.x1 - w.x0), 0, 1);
    const off = w.dir > 0 ? w.from + (w.to - w.from) * across : w.to + (w.from - w.to) * across;
    const h = w.g.h * (0.93 + off * 0.0045);          // a touch larger as they come nearer
    const speed = (h * w.g.stride) / w.g.cycle;
    // Along the slope, not along x: uphill takes as long as it should.
    const rise = (browY(w.x + 8) - browY(w.x - 8)) / 16;
    w.x += (w.dir * speed * dt) / Math.hypot(1, rise);
    w.gone += speed * dt;
    const n = atlas.clips[w.g.clip].frames.length;
    out.push({
      clip: w.g.clip, frame: Math.floor((w.gone / (h * w.g.stride)) * n) % n,
      x: w.x, y: browY(w.x) + off, h, flip: w.dir < 0,
      depth: 0.78, alpha: 1, haze: 0.06, foot: 0.07, glow: 0, hideLeft: OAK, tone: w.g.tone,
    });
    const leftEdge = c.x0 < OAK_X + 40 ? OAK_X - 20 : c.x0 - 70;
    if (w.x > c.x1 + 70 || w.x < leftEdge) {
      walker = null;
      nextWalker = now + (c.mode === 'rainy' || c.mode === 'snowy' ? rand(16, 34) : rand(11, 26));
    }
  }

  // ── Rabbit ───────────────────────────────────────────────────────────
  // Sits, twitches an ear, hops a few times, sits again; after a while it
  // leaves. Bad weather sends it off at once.
  interface Rabbit {
    x: number; y: number /* below the brow */; dir: 1 | -1; state: 'sit' | 'hop';
    until: number; twitchAt: number; hops: number; hopT: number; rounds: number; leaving: boolean;
  }
  const HOP = 0.44, HOP_LEN = 44;
  let rabbit: Rabbit | null = null;
  let nextRabbit = 0;

  function stepRabbit(dt: number, c: CastContext, out: Figure[]): void {
    const lo = Math.max(c.x0 + 50, 520), hi = Math.min(c.x1 - 50, 1260);
    if (!rabbit) {
      if (now < nextRabbit || !rabbitWeather(c) || hi <= lo) return;
      const first = now < 1;
      const dir: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
      rabbit = {
        x: first ? lo + (hi - lo) * rand(0.55, 0.8) : dir > 0 ? c.x0 - 30 : c.x1 + 30,
        y: rand(38, 74), dir, state: first ? 'sit' : 'hop',
        until: now + rand(2.5, 5), twitchAt: now + rand(1, 2.5),
        hops: first ? 0 : 99, hopT: 0, rounds: Math.round(rand(2, 4)), leaving: false,
      };
    }
    const r = rabbit;
    if (!rabbitWeather(c) && !r.leaving) {
      r.leaving = true; r.state = 'hop'; r.hops = 99; r.hopT = 0;
      r.dir = r.x - c.x0 < c.x1 - r.x ? -1 : 1;
    }
    if (r.state === 'sit') {
      // Ear twitch: run the four frames once, then settle on the first.
      const e = now - r.twitchAt;
      let frame = 0;
      if (e >= 0) {
        frame = [1, 2, 3, 2, 1][Math.floor(e / 0.16)] ?? 0;
        if (e > 0.8) r.twitchAt = now + rand(1.6, 4.5);
      }
      out.push({ clip: 'rabbitSit', frame, x: r.x, y: Math.min(962, browY(r.x) + r.y), h: 31, flip: r.dir < 0, depth: 0.9, alpha: 1, haze: 0.04, foot: 0.16, glow: 0, hideLeft: 0, tone: 1.2 });
      if (now > r.until && !c.still) {
        r.rounds--;
        r.leaving = r.rounds <= 0;
        const target = r.leaving ? (Math.random() < 0.5 ? c.x0 - 60 : c.x1 + 60) : rand(lo, hi);
        r.dir = target > r.x ? 1 : -1;
        r.hops = r.leaving ? 99 : clamp(Math.round(Math.abs(target - r.x) / HOP_LEN), 2, 6);
        r.state = 'hop'; r.hopT = 0;
      }
      return;
    }
    // Hopping: six frames to a hop, the ground covered mid-air.
    r.hopT += dt;
    const k = Math.min(1, r.hopT / HOP);
    const travel = HOP_LEN * (r.leaving ? 1.25 : 1) * smooth(clamp((k - 0.12) / 0.7, 0, 1));
    out.push({ clip: 'rabbitHop', frame: Math.min(5, Math.floor(k * 6)), x: r.x + r.dir * travel, y: Math.min(962, browY(r.x + r.dir * travel) + r.y) + 2, h: 39, flip: r.dir < 0, depth: 0.9, alpha: 1, haze: 0.04, foot: 0.12, glow: 0, hideLeft: 0, tone: 1.2 });
    if (k >= 1) {
      r.x += r.dir * HOP_LEN * (r.leaving ? 1.25 : 1);
      r.hopT = 0; r.hops--;
      if (r.x < c.x0 - 50 || r.x > c.x1 + 50) { rabbit = null; nextRabbit = now + rand(14, 30); return; }
      if (r.hops <= 0 || (!r.leaving && (r.x < lo || r.x > hi))) {
        r.state = 'sit'; r.until = now + rand(3, 7.5); r.twitchAt = now + rand(0.6, 2.2);
      }
    }
  }

  // ── Birds ────────────────────────────────────────────────────────────
  let flock: { x: number; y: number; dir: 1 | -1; n: number; speed: number; seed: number; slope: number } | null = null;
  let nextBirds = rand(2, 4);

  function stepBirds(dt: number, c: CastContext, out: Figure[]): void {
    if (!flock) {
      if (now < nextBirds || !birdWeather(c)) return;
      const dir: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
      const quiet = c.mode === 'snowy' || c.mode === 'foggy';
      flock = {
        dir, x: dir > 0 ? c.x0 - 30 : c.x1 + 30, y: rand(250, 470),
        n: quiet ? 1 : c.phase === 'dusk' ? 3 : Math.round(rand(1, 2.6)),
        speed: rand(105, 140), seed: rand(0, 9), slope: rand(-0.05, 0.03),
      };
    }
    const f = flock;
    f.x += f.dir * f.speed * dt;
    f.y += f.slope * f.speed * dt;
    for (let i = 0; i < f.n; i++) {
      const x = f.x - f.dir * i * 46;
      const y = f.y + (i % 2 ? 20 : 0) + i * 5 + Math.sin(now * 1.7 + f.seed + i * 2.1) * 6;
      out.push({ clip: 'bird', frame: Math.floor(now * 11 + i * 1.3) % 4, x, y, h: 25, flip: f.dir < 0, depth: 0.3, alpha: 0.95, haze: 0.22, foot: 0, glow: 0, hideLeft: 1, tone: 1.15 });
    }
    const tail = f.x - f.dir * (f.n - 1) * 46;
    if ((f.dir > 0 && tail > c.x1 + 40) || (f.dir < 0 && tail < c.x0 - 40)) {
      flock = null;
      nextBirds = now + (c.phase === 'dusk' ? rand(9, 20) : rand(12, 28));
    }
  }

  // ── Deer ─────────────────────────────────────────────────────────────
  // Steps out of the mist at the far edge of the meadow, grazes, looks up.
  let deer: { x: number; flip: boolean; born: number; leave: number; beat: number; frame: number; seq: number[] } | null = null;
  let nextDeer = rand(7, 14);
  const GRAZE = [0, 0, 1, 1, 0, 1], LOOK = [2, 3, 4, 5, 5, 5, 5, 5, 5, 5, 5, 4, 3, 2];

  function stepDeer(dt: number, c: CastContext, out: Figure[]): void {
    if (!deer) {
      if (now < nextDeer || !deerWeather(c)) return;
      const lo = Math.max(c.x0 + 70, 560), hi = Math.min(c.x1 - 70, 1130);
      if (hi <= lo) return;
      const x = lo + (hi - lo) * rand(0.45, 1);
      deer = { x, flip: x > (c.x0 + c.x1) / 2, born: now, leave: now + rand(24, 42), beat: 0, frame: 0, seq: [...GRAZE] };
    }
    const d = deer;
    if (!deerWeather(c)) d.leave = Math.min(d.leave, now);
    d.beat -= dt;
    if (d.beat <= 0) {
      if (!d.seq.length) d.seq = Math.random() < 0.45 ? [...LOOK] : [...GRAZE];
      d.frame = d.seq.shift()!;
      d.beat = d.frame < 2 ? rand(0.7, 1.3) : d.frame === 5 ? 0.5 : 0.2;
    }
    const alpha = smooth(clamp((now - d.born) / 4, 0, 1)) * (1 - smooth(clamp((now - d.leave) / 4, 0, 1)));
    out.push({ clip: 'deer', frame: d.frame, x: d.x, y: browY(d.x) + 5, h: 62, flip: d.flip, depth: 0.6, alpha, haze: 0.2, foot: 0.14, glow: 0, hideLeft: 0, tone: 1.2 });
    if (now > d.leave + 4) { deer = null; nextDeer = now + rand(25, 50); }
  }

  // ── Shwedagon, far off ───────────────────────────────────────────────
  // On the right-hand ridge when that part of the painting is in frame
  // (wide screens), otherwise on the shoulder of the peak. It stands just
  // behind the skyline: its wooded base is sunk below the ridge and only
  // drawn against sky, so the hill's own outline cuts across it and it
  // reads as part of the land rather than something set on top.
  function pagoda(c: CastContext): Figure {
    const right = c.x0 < 1040 && c.x1 > 1200;
    const x = right ? 1112 : 566, h = right ? 84 : 70;
    // Sunk until the skyline covers the whole base, even where the ridge slopes.
    const reach = h * 0.5;
    const low = Math.max(ridgeY(x - reach), ridgeY(x), ridgeY(x + reach));
    return {
      clip: 'pagoda', frame: 0, x, y: low + h * 0.22, h, flip: false,
      depth: 0.12, alpha: 0.96, haze: 0.22, foot: 0.02, glow: 0.8, hideLeft: 1, tone: 1, behindSkyline: true,
    };
  }

  return {
    /** Advance by dt seconds and return this frame's figures, far to near. */
    update(dt: number, c: CastContext): Figure[] {
      const out: Figure[] = [pagoda(c)];
      if (c.still) {
        // One quiet frame: the pagoda, and a rabbit sitting in fair weather.
        stepRabbit(0, c, out);
        return out;
      }
      // A frame can arrive stamped a hair before the clock we last read: never step backwards.
      dt = Math.max(0, dt);
      now += dt;
      stepBirds(dt, c, out);
      stepDeer(dt, c, out);
      stepWalker(dt, c, out);
      stepRabbit(dt, c, out);
      return out.slice(0, MAX_FIGURES);
    },
    /** For previews and tests: bring someone on now. */
    summon(who: 'walker' | 'rabbit' | 'birds' | 'deer'): void {
      if (who === 'walker') nextWalker = 0;
      if (who === 'rabbit') nextRabbit = 0;
      if (who === 'birds') nextBirds = 0;
      if (who === 'deer') nextDeer = 0;
    },
  };
}

export const MAX_FIGURES = 8;
export const ATLAS = atlas;

function smooth(t: number): number { return t * t * (3 - 2 * t); }
