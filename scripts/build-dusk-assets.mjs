#!/usr/bin/env node
/* ──────────────────────────────────────────────────────────────────────
   Build the painted-forest assets from the single master painting.

   node scripts/build-dusk-assets.mjs <master.png> [debugDir]

   Writes public/assets/forest/dusk/:
     master.webp / master.jpg  the painting (scene texture + no-WebGL fallback)
     mask.webp                 data texture (lossless), one channel per job:
                                 R  sky       (1 = open sky: stars, moon, sky grade)
                                 G  sway      (how far foliage moves in the wind)
                                 B  depth     (0 far … 1 near: parallax, mist, fog)
   The masks are derived from the painting itself (colour + geometry), so they
   always register with it pixel-for-pixel. No alpha channel on purpose:
   browsers premultiply image alpha, which would wipe the RGB data.
   ────────────────────────────────────────────────────────────────────── */

import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const [, , src, debugDir] = process.argv;
if (!src) {
  console.error('usage: node scripts/build-dusk-assets.mjs <master.png> [debugDir]');
  process.exit(1);
}
const OUT = 'public/assets/forest/dusk';
mkdirSync(OUT, { recursive: true });

const { data, info } = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;
const px = (x, y) => { const i = (y * W + x) * 3; return [data[i], data[i + 1], data[i + 2]]; };
const smooth = (e0, e1, v) => { const t = Math.min(1, Math.max(0, (v - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

// ── Foliage colour test ─────────────────────────────────────────────────
// Above the ridge everything is sky unless it reads as tree: dark, neutral
// grey-green (conifer needles), or yellow/olive (lit oak leaves). Peach sky
// glow stays sky because it keeps plenty of blue relative to green.
function foliage(r, g, b) {
  const L = (r + g + b) / 3;
  return L < 85
    || (L < 112 && Math.abs(b - r) < 16)
    || b < 0.64 * g
    || (g > b + 5 && g >= r - 25 && L < 150);
}

// ── Ridge line ──────────────────────────────────────────────────────────
// The mountains share the sky's hue, so colour can't find the skyline. It is
// traced by hand for this painting, then each column snaps to the strongest
// bright-to-dark step within a few pixels of the trace.
const RIDGE_TRACE = [
  [0, 628], [250, 627], [300, 619], [350, 627], [390, 634], [450, 620], [500, 607],
  [550, 595], [600, 582], [650, 575], [700, 565], [715, 562], [750, 570], [800, 586],
  [850, 600], [900, 612], [950, 621], [990, 621], [1025, 612], [1050, 605], [1100, 602],
  [1150, 600], [1180, 602], [1200, 607], [W, 612],
];
const lum = (x, y) => { const [r, g, b] = px(x, Math.min(H - 1, Math.max(0, y))); return (r + g + b) / 3; };
const ridge = new Int32Array(W);
for (let x = 0, seg = 0; x < W; x++) {
  while (RIDGE_TRACE[seg + 1][0] < x) seg++;
  const [xa, ya] = RIDGE_TRACE[seg], [xb, yb] = RIDGE_TRACE[seg + 1];
  const guess = Math.round(ya + ((yb - ya) * (x - xa)) / (xb - xa));
  let best = guess, bestStep = -Infinity;
  for (let y = guess - 9; y <= guess + 9; y++) {
    const step = lum(x, y - 2) + lum(x, y - 1) - lum(x, y + 1) - lum(x, y + 2);
    if (step > bestStep) { bestStep = step; best = y; }
  }
  ridge[x] = best;
}
{
  const copy = Int32Array.from(ridge);
  for (let x = 0; x < W; x++) {
    const win = [];
    for (let k = -3; k <= 3; k++) win.push(copy[Math.min(W - 1, Math.max(0, x + k))]);
    win.sort((a, b) => a - b);
    ridge[x] = win[3];
  }
}

// ── Sky mask: non-foliage above the ridge, then clean up components ─────
const sky = new Uint8Array(W * H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (y >= ridge[x]) continue;
  const [r, g, b] = px(x, y);
  if (!foliage(r, g, b)) sky[y * W + x] = 1;
}
function components(mask, value) {
  const label = new Int32Array(W * H).fill(-1);
  const sizes = [];
  const stack = [];
  for (let i = 0; i < W * H; i++) {
    if (mask[i] !== value || label[i] !== -1) continue;
    const id = sizes.length; let n = 0;
    label[i] = id; stack.push(i);
    while (stack.length) {
      const j = stack.pop(); n++;
      const x = j % W, y = (j / W) | 0;
      const nb = [x > 0 ? j - 1 : -1, x < W - 1 ? j + 1 : -1, y > 0 ? j - W : -1, y < H - 1 ? j + W : -1];
      for (const k of nb) if (k >= 0 && mask[k] === value && label[k] === -1) { label[k] = id; stack.push(k); }
    }
    sizes.push(n);
  }
  return { label, sizes };
}
// Drop specks of "sky" inside foliage (lit needles, leaf highlights)…
{
  const { label, sizes } = components(sky, 1);
  for (let i = 0; i < W * H; i++) if (sky[i] && sizes[label[i]] < 14) sky[i] = 0;
}
// …and fill small non-sky holes inside the sky (dark cloud flecks).
{
  const { label, sizes } = components(sky, 0);
  for (let i = 0; i < W * H; i++) {
    if (sky[i]) continue;
    const y = (i / W) | 0, x = i % W;
    if (sizes[label[i]] < 60 && y < ridge[x] - 2) sky[i] = 1;
  }
}

// ── Trees (for sway and depth) ─────────────────────────────────────────
// Above the ridge, anything that isn't sky is canopy. Below it, trees are
// only possible near the frame edges (the oak on the left, the conifer and
// young tree on the right), and there a pixel is tree when it is dark
// (trunks, needles) or yellow-olive (lit leaves); the hazy blue hills and
// valley mist between them are neither.
// Dark pixels are also the midground conifers, so darkness only counts as
// foreground gradually toward the frame edge; lit leaves count fully.
const trunkEdge = (y) => 225 + Math.max(0, y - 700) * 0.6;
const tree = new Uint8Array(W * H);
const nearness = new Float32Array(W * H);   // 0 land … 1 framing tree
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = y * W + x;
  if (sky[i]) continue;
  if (y < ridge[x]) { tree[i] = 1; nearness[i] = 1; continue; }
  const edge = Math.max(
    1 - smooth(trunkEdge(y) - 40, trunkEdge(y) + 70, x),
    y < 860 ? smooth(1170, 1330, x) : 0,
  );
  if (edge <= 0) continue;
  const [r, g, b] = px(x, y);
  const L = (r + g + b) / 3;
  const lit = b < 0.7 * g, dark = L < 66;
  if (lit || dark) { tree[i] = 1; nearness[i] = lit ? Math.min(1, edge * 2.5) : edge; }
}
// Close pinholes so mist doesn't speckle through the canopy.
{
  const { label, sizes } = components(tree, 0);
  for (let i = 0; i < W * H; i++) {
    const y = (i / W) | 0;
    if (!tree[i] && !sky[i] && y > 560 && sizes[label[i]] < 220) {
      tree[i] = 1;
      const x = i % W;
      nearness[i] = Math.max(nearness[i - 1] || 0, nearness[i + 1] || 0, x < 700 ? 1 - smooth(trunkEdge(y) - 40, trunkEdge(y) + 70, x) : smooth(1170, 1330, x));
    }
  }
}

// ── Channels ────────────────────────────────────────────────────────────
const fSky = new Float32Array(W * H), fSway = new Float32Array(W * H), fDepth = new Float32Array(W * H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = y * W + x;
  fSky[i] = sky[i];

  // Sway: the oak's outer canopy moves most and its trunk not at all; the
  // right-hand trees move more toward their tops; meadow grass tips a little.
  // Oak sway grows with distance from the trunk's right edge (the trunk
  // leans right as it rises, then the main limb heads up-right).
  const trunkRight = y >= 700 ? 200 + (y - 700) * 0.75 : y >= 250 ? 200 : 200 + (250 - y) * 0.6;
  let s = 0;
  if (tree[i] && x < 1150 && y < 720) s = smooth(0, 280, x - trunkRight) * nearness[i];
  else if (tree[i] && x >= 1150) s = Math.min(1, Math.max(0.15, (880 - y) / 700)) * 0.85 * nearness[i];
  if (!tree[i] && y > 800) s = Math.max(s, 0.35 * smooth(805, 845, y) * (1 - smooth(900, 990, y)));
  fSway[i] = s;

  // Depth: sky 0 → mountains → hills → meadow → framing trees.
  let land;
  if (y < ridge[x] + 70) land = 0.12;
  else if (y < 820) land = 0.25 + 0.25 * smooth(ridge[x] + 70, 820, y);
  else land = 0.55 + 0.45 * smooth(820, H, y);
  fDepth[i] = sky[i] ? 0 : land + (0.92 - land) * nearness[i];
}

// Separable box blur, repeated ≈ gaussian. Sway and depth are blurred hard
// so the displacement field is smooth (no tearing at leaf/sky edges).
function blur(src, radius, passes = 3) {
  let a = Float32Array.from(src), b = new Float32Array(W * H);
  const r = Math.max(1, Math.round(radius));
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < H; y++) {
      let acc = 0;
      for (let k = -r; k <= r; k++) acc += a[y * W + Math.min(W - 1, Math.max(0, k))];
      for (let x = 0; x < W; x++) {
        b[y * W + x] = acc / (2 * r + 1);
        acc += a[y * W + Math.min(W - 1, x + r + 1)] - a[y * W + Math.max(0, x - r)];
      }
    }
    for (let x = 0; x < W; x++) {
      let acc = 0;
      for (let k = -r; k <= r; k++) acc += b[Math.min(H - 1, Math.max(0, k)) * W + x];
      for (let y = 0; y < H; y++) {
        a[y * W + x] = acc / (2 * r + 1);
        acc += b[Math.min(H - 1, y + r + 1) * W + x] - b[Math.max(0, y - r) * W + x];
      }
    }
  }
  return a;
}
const skyAA = blur(fSky, 1, 1);
const swayB = blur(fSway, 6);
const depthB = blur(fDepth, 10);

const mask = Buffer.alloc(W * H * 3);
for (let i = 0; i < W * H; i++) {
  mask[i * 3] = Math.round(255 * skyAA[i]);
  mask[i * 3 + 1] = Math.round(255 * Math.min(1, swayB[i]));
  mask[i * 3 + 2] = Math.round(255 * depthB[i]);
}
await sharp(mask, { raw: { width: W, height: H, channels: 3 } }).webp({ lossless: true, effort: 6 }).toFile(join(OUT, 'mask.webp'));
await sharp(src).removeAlpha().webp({ quality: 86 }).toFile(join(OUT, 'master.webp'));
await sharp(src).removeAlpha().jpeg({ quality: 84, mozjpeg: true }).toFile(join(OUT, 'master.jpg'));

if (debugDir) {
  mkdirSync(debugDir, { recursive: true });
  // Sky overlay: sky tinted magenta over the painting, ridge in yellow.
  const over = Buffer.from(data);
  for (let i = 0; i < W * H; i++) if (sky[i]) { over[i * 3] = 255; over[i * 3 + 1] = 0; over[i * 3 + 2] = 220; }
  for (let x = 0; x < W; x++) for (let k = 0; k < 2; k++) { const i = ((ridge[x] + k) * W + x) * 3; over[i] = 255; over[i + 1] = 230; over[i + 2] = 0; }
  await sharp(over, { raw: { width: W, height: H, channels: 3 } }).png().toFile(join(debugDir, 'dbg-sky.png'));
  for (const [name, ch] of [['sway', 1], ['depth', 2]]) {
    const g = Buffer.alloc(W * H);
    for (let i = 0; i < W * H; i++) g[i] = mask[i * 3 + ch];
    await sharp(g, { raw: { width: W, height: H, channels: 1 } }).png().toFile(join(debugDir, `dbg-${name}.png`));
  }
}
console.log(`dusk assets → ${OUT} (${W}×${H})`);
