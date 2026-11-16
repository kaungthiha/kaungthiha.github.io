#!/usr/bin/env node
/* ──────────────────────────────────────────────────────────────────────
   Build the forest's cast (the people, animals and the far pagoda that the
   dusk shader draws into the painting) from the raw generated sprite sheets.

   node scripts/build-forest-sprites.mjs [srcDir] [debugDir]

   Writes:
     public/assets/forest/dusk/sprites.webp   one atlas, straight alpha
     src/data/forest-sprites.json             where each frame sits in it

   The raw sheets come out of an image generator with dirty edges (opaque
   paper behind some, colour fringes and stray specks on others), so each
   sheet is cleaned first: the background is flood-filled away from the
   border, fringe colours are peeled off, the edge is eroded and feathered.
   Frames are then found as connected blobs, and re-seated in equal cells so
   the figure doesn't jitter: centred on its body, on the sheet's own ground
   line (so hops and strides keep their rise and fall).
   ────────────────────────────────────────────────────────────────────── */

import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [, , SRC = 'animation sprites', debugDir] = process.argv;
const OUT_IMG = 'public/assets/forest/dusk/sprites.webp';
const OUT_JSON = 'src/data/forest-sprites.json';
const ATLAS_W = 2048;
const PAD = 6;

/* file, frames, cell height in the atlas, and how to read the sheet:
   band  [y0, y1] and span [x0, x1] as fractions (for sheets with several rows)
   paper true when the sheet has an opaque pale background to key out
   anchor 'body' centres on the upper body (walkers: legs swing under a still
          torso), 'mass' on the whole blob, 'box' on the bounding box        */
const CLIPS = [
  { name: 'womanWalk', file: 'woman walking.png', frames: 8, h: 200, paper: true, anchor: 'body' },
  { name: 'womanRain', file: 'woman in rain.png', frames: 8, h: 236, paper: true, holes: true, anchor: 'body', bodyBand: [0.3, 0.6] },
  { name: 'womanRun', file: 'woman running.png', frames: 8, h: 200, paper: true, anchor: 'body' },
  { name: 'womanSnow', file: 'woman walking in snow.png', frames: 8, h: 200, anchor: 'body' },
  { name: 'manWalk', file: 'Gouache Burmese Man Walking Cycle-3.png', frames: 8, h: 200, anchor: 'body' },
  { name: 'rabbitHop', file: 'rabbit hopping.png', frames: 6, h: 96, anchor: 'mass' },
  { name: 'rabbitSit', file: 'rabbit still.png', frames: 4, h: 110, anchor: 'box' },
  { name: 'bird', file: 'bird flying.png', frames: 4, h: 110, anchor: 'head' },
  { name: 'deer', file: 'deer.png', frames: 6, h: 150, anchor: 'box', harsh: true },
  { name: 'pagoda', file: 'Painterly Golden Shwedagon Pagoda-5.png', frames: 1, h: 380, anchor: 'box', glow: true },
];

async function load(file) {
  const { data, info } = await sharp(join(SRC, file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { d: data, W: info.width, H: info.height };
}

/** Clean one sheet in place: returns an alpha plane (Uint8) to use instead. */
function clean({ d, W, H }, clip) {
  const N = W * H;
  const A = new Uint8Array(N);
  const cut = clip.harsh ? 200 : 96;
  const bgLike = (i) => {
    const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2], a = d[i * 4 + 3];
    if (a < cut) return true;
    if (!clip.paper) return false;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    return mn > 196 && mx - mn < 30;
  };
  const fringe = (i) => {
    const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (clip.glow) return false;
    // The generator's matte spill: pure red / yellow / cyan / white, none of
    // which appear in the muted gouache figures.
    return (mx - mn > 150) || (r > 215 && g > 205 && b < 130) || (mn > 236);
  };
  // Outside = background-like pixels connected to the border.
  const out = new Uint8Array(N);
  const stack = [];
  const push = (i) => { if (!out[i] && bgLike(i)) { out[i] = 1; stack.push(i); } };
  for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x); }
  for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
  const nb = (i, fn) => {
    const x = i % W, y = (i / W) | 0;
    if (x > 0) fn(i - 1); if (x < W - 1) fn(i + 1); if (y > 0) fn(i - W); if (y < H - 1) fn(i + W);
  };
  while (stack.length) nb(stack.pop(), push);
  if (!clip.paper) for (let i = 0; i < N; i++) if (d[i * 4 + 3] < cut) out[i] = 1;
  // Paper enclosed by the figure (between a face and an umbrella handle):
  // purer white than any painted cloth.
  if (clip.holes) for (let i = 0; i < N; i++) {
    if (!out[i] && Math.min(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]) > 244) out[i] = 1;
  }
  // Peel fringe colours inward from the outside, a few pixels at most.
  for (let pass = 0; pass < (clip.harsh ? 14 : 9); pass++) {
    const peel = [];
    for (let i = 0; i < N; i++) {
      if (out[i] || !fringe(i)) continue;
      let touch = false; nb(i, (j) => { if (out[j]) touch = true; });
      if (touch) peel.push(i);
    }
    if (!peel.length) break;
    for (const i of peel) out[i] = 1;
  }
  // Distance to the outside (two-pass chamfer), for the erode + feather.
  const dist = new Float32Array(N).fill(1e9);
  for (let i = 0; i < N; i++) if (out[i]) dist[i] = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; let v = dist[i];
    if (x > 0) v = Math.min(v, dist[i - 1] + 1);
    if (y > 0) v = Math.min(v, dist[i - W] + 1);
    dist[i] = v;
  }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
    const i = y * W + x; let v = dist[i];
    if (x < W - 1) v = Math.min(v, dist[i + 1] + 1);
    if (y < H - 1) v = Math.min(v, dist[i + W] + 1);
    dist[i] = v;
  }
  const erode = clip.glow ? 0 : clip.paper ? 2 : 1.4, feather = 2.2;
  for (let i = 0; i < N; i++) {
    if (out[i]) continue;
    const k = Math.min(1, Math.max(0, (dist[i] - erode) / feather));
    A[i] = Math.round((clip.glow ? d[i * 4 + 3] : 255) * k);
  }
  return A;
}

/** Connected blobs of alpha > 0 inside a region, largest first. */
function blobs(A, W, H, x0, y0, x1, y1) {
  const label = new Int32Array(W * H).fill(-1);
  const found = [];
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const s = y * W + x;
    if (A[s] < 40 || label[s] !== -1) continue;
    const b = { id: found.length, n: 0, x0: x, x1: x, y0: y, y1: y };
    const stack = [s]; label[s] = b.id;
    while (stack.length) {
      const i = stack.pop(); const px = i % W, py = (i / W) | 0;
      b.n++; b.x0 = Math.min(b.x0, px); b.x1 = Math.max(b.x1, px); b.y0 = Math.min(b.y0, py); b.y1 = Math.max(b.y1, py);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const qx = px + dx, qy = py + dy;
        if (qx < x0 || qx >= x1 || qy < y0 || qy >= y1) continue;
        const j = qy * W + qx;
        if (A[j] >= 40 && label[j] === -1) { label[j] = b.id; stack.push(j); }
      }
    }
    found.push(b);
  }
  return { label, found };
}

const cells = [];   // { clip, frame, w, h, rgba }
const meta = {};

for (const clip of CLIPS) {
  const img = await load(clip.file);
  const { d, W, H } = img;
  const A = clean(img, clip);
  const [bx0, bx1] = clip.span || [0, 1], [by0, by1] = clip.band || [0, 1];
  const { label, found } = blobs(A, W, H, Math.round(bx0 * W), Math.round(by0 * H), Math.round(bx1 * W), Math.round(by1 * H));
  const main = [...found].sort((a, b) => b.n - a.n).slice(0, clip.frames).sort((a, b) => a.x0 - b.x0);
  if (main.length < clip.frames) throw new Error(`${clip.name}: found ${main.length} of ${clip.frames} frames`);
  // Small loose bits (a hand, a sandal) belong to the nearest main blob.
  const owner = new Map(main.map((b) => [b.id, b]));
  for (const b of found) {
    if (owner.has(b.id) || b.n < 30) continue;
    const cx = (b.x0 + b.x1) / 2;
    let best = null, bd = 1e9;
    for (const m of main) {
      const dd = cx < m.x0 ? m.x0 - cx : cx > m.x1 ? cx - m.x1 : 0;
      if (dd < bd) { bd = dd; best = m; }
    }
    if (bd < 26 && b.n < best.n * 0.2) owner.set(b.id, best);
  }
  // Each frame's extent and anchor.
  const fr = main.map((m) => ({ m, x0: m.x0, x1: m.x1, y0: m.y0, y1: m.y1, ax: 0 }));
  const byMain = new Map(fr.map((f) => [f.m.id, f]));
  for (const [id, m] of owner) {
    const b = found[id], f = byMain.get(m.id);
    f.x0 = Math.min(f.x0, b.x0); f.x1 = Math.max(f.x1, b.x1); f.y0 = Math.min(f.y0, b.y0); f.y1 = Math.max(f.y1, b.y1);
  }
  const ids = (f) => new Set([...owner].filter(([, m]) => m.id === f.m.id).map(([id]) => id));
  for (const f of fr) {
    const mine = ids(f);
    const hgt = f.m.y1 - f.m.y0;
    let ya = f.m.y0, yb = f.m.y1 + 1, xa = f.x0, xb = f.x1 + 1;
    if (clip.anchor === 'body') { const [a, b] = clip.bodyBand || [0.05, 0.45]; ya = f.m.y0 + hgt * a; yb = f.m.y0 + hgt * b; }
    if (clip.anchor === 'head') xa = f.x1 - (f.x1 - f.x0) * 0.3;   // birds: the head leads, the wings flail
    if (clip.anchor === 'box') { f.ax = (f.x0 + f.x1) / 2; continue; }
    let sx = 0, sn = 0;
    for (let y = Math.floor(ya); y < yb; y++) for (let x = Math.floor(xa); x < xb; x++) {
      const i = y * W + x;
      if (mine.has(label[i])) { sx += x * A[i]; sn += A[i]; }
    }
    f.ax = sx / sn;
    f.mine = mine;
  }
  for (const f of fr) f.mine ??= ids(f);
  // One shared cell: the sheet's own vertical extent, widest half-span each side.
  const top = Math.min(...fr.map((f) => f.y0)), bottom = Math.max(...fr.map((f) => f.y1)) + 1;
  const half = Math.ceil(Math.max(...fr.map((f) => Math.max(f.ax - f.x0, f.x1 + 1 - f.ax)))) + 2;
  const cw = half * 2, ch = bottom - top + 4;
  const scale = clip.h / ch;
  const ow = Math.round(cw * scale), oh = clip.h;
  meta[clip.name] = { frames: [], w: ow, h: oh, aspect: ow / oh };
  for (const [k, f] of fr.entries()) {
    const cell = Buffer.alloc(cw * ch * 4);
    for (let y = f.y0; y <= f.y1; y++) for (let x = f.x0; x <= f.x1; x++) {
      const i = y * W + x;
      if (!f.mine.has(label[i]) || !A[i]) continue;
      const tx = Math.round(x - f.ax + half), ty = y - top + 2;
      if (tx < 0 || tx >= cw) continue;
      const o = (ty * cw + tx) * 4;
      cell[o] = d[i * 4]; cell[o + 1] = d[i * 4 + 1]; cell[o + 2] = d[i * 4 + 2]; cell[o + 3] = A[i];
    }
    // Premultiply before resizing so edges don't pick up the matte colour.
    for (let o = 0; o < cell.length; o += 4) {
      const a = cell[o + 3] / 255;
      cell[o] = Math.round(cell[o] * a); cell[o + 1] = Math.round(cell[o + 1] * a); cell[o + 2] = Math.round(cell[o + 2] * a);
    }
    const rgba = await sharp(cell, { raw: { width: cw, height: ch, channels: 4, premultiplied: true } })
      .resize(ow, oh, { kernel: 'lanczos3', fit: 'fill' }).raw().toBuffer();
    bleed(rgba, ow, oh);
    cells.push({ clip: clip.name, frame: k, w: ow, h: oh, rgba });
  }
}

/** Back to straight alpha, with each figure's edge colour spread outward
    into the transparent surround. Lossy compression and texture filtering
    then blend edge pixels with more of the same colour, not with black. */
function bleed(px, w, h) {
  const set = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const a = px[i * 4 + 3];
    if (a < 24) continue;
    for (let c = 0; c < 3; c++) px[i * 4 + c] = Math.min(255, Math.round((px[i * 4 + c] * 255) / a));
    set[i] = 1;
  }
  for (let pass = 0; pass < 12; pass++) {
    const add = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (set[i]) continue;
      let r = 0, g = 0, b = 0, n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const qx = x + dx, qy = y + dy;
        if (qx < 0 || qx >= w || qy < 0 || qy >= h) continue;
        const j = qy * w + qx;
        if (set[j]) { r += px[j * 4]; g += px[j * 4 + 1]; b += px[j * 4 + 2]; n++; }
      }
      if (n) add.push([i, r / n, g / n, b / n]);
    }
    for (const [i, r, g, b] of add) { px[i * 4] = r; px[i * 4 + 1] = g; px[i * 4 + 2] = b; set[i] = 1; }
  }
  for (let i = 0; i < w * h; i++) if (!set[i]) px[i * 4] = px[i * 4 + 1] = px[i * 4 + 2] = 90;
}

// ── Shelf-pack the cells, tallest clips first ────────────────────────────
const order = [...new Set(cells.map((c) => c.clip))].sort((a, b) => meta[b].h - meta[a].h);
let x = PAD, y = PAD, shelf = 0;
for (const name of order) {
  for (const c of cells.filter((q) => q.clip === name)) {
    if (x + c.w + PAD > ATLAS_W) { x = PAD; y += shelf + PAD; shelf = 0; }
    c.x = x; c.y = y; x += c.w + PAD; shelf = Math.max(shelf, c.h);
  }
}
const ATLAS_H = Math.ceil((y + shelf + PAD) / 4) * 4;
const atlas = Buffer.alloc(ATLAS_W * ATLAS_H * 4);
for (const c of cells) {
  for (let r = 0; r < c.h; r++) c.rgba.copy(atlas, ((c.y + r) * ATLAS_W + c.x) * 4, r * c.w * 4, (r + 1) * c.w * 4);
  meta[c.clip].frames[c.frame] = [c.x, c.y];
}
mkdirSync('src/data', { recursive: true });
// Straight alpha, colour kept under the transparent pixels (exact); dusk.ts
// loads it with premultiplyAlpha 'none'.
await sharp(atlas, { raw: { width: ATLAS_W, height: ATLAS_H, channels: 4 } })
  .webp({ quality: 84, alphaQuality: 92, effort: 6, exact: true }).toFile(OUT_IMG);
writeFileSync(OUT_JSON, JSON.stringify({ width: ATLAS_W, height: ATLAS_H, clips: meta }, null, 1) + '\n');

if (debugDir) {
  mkdirSync(debugDir, { recursive: true });
  // The atlas over meadow green, to judge the edges by eye.
  const bg = Buffer.alloc(ATLAS_W * ATLAS_H * 3);
  for (let i = 0; i < ATLAS_W * ATLAS_H; i++) {
    const a = atlas[i * 4 + 3] / 255;
    bg[i * 3] = Math.round(atlas[i * 4] * a + 74 * (1 - a));
    bg[i * 3 + 1] = Math.round(atlas[i * 4 + 1] * a + 98 * (1 - a));
    bg[i * 3 + 2] = Math.round(atlas[i * 4 + 2] * a + 78 * (1 - a));
  }
  await sharp(bg, { raw: { width: ATLAS_W, height: ATLAS_H, channels: 3 } }).png().toFile(join(debugDir, 'atlas-on-green.png'));
}
console.log(`forest sprites → ${OUT_IMG} (${ATLAS_W}×${ATLAS_H}), ${cells.length} frames`);
for (const [k, v] of Object.entries(meta)) console.log(' ', k.padEnd(10), `${v.w}×${v.h}`, `${v.frames.length}f`);
