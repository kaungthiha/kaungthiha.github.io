/* ──────────────────────────────────────────────────────────────────────
   Ambient procedural forest — EZ-Tree + Three.js (bundled ES module).

   A miniature living diorama: many small, varied trees distributed across
   depth bands and biased toward the edges so the central reading area stays
   clear. Per-tree material variation (warm bark hues, leaf colour variance,
   background desaturation) keeps it from reading as one grey blob.

   Keeps the proven scaffolding: sky gradient, hemisphere/sun lighting, fog,
   gentle wind sway, weather integration, dpr cap, tab-visibility pause, and
   a graceful WebGL / SVG fallback.

   prefers-reduced-motion: the forest still renders in full (rich scene) but
   ALL motion is frozen — no wind, no camera drift, a single static frame.
   ────────────────────────────────────────────────────────────────────── */

import * as THREE from 'three';
// `ez-tree-src` is a Vite alias (see astro.config.mjs) pointing at EZ-Tree's
// SOURCE entry instead of the pre-bundled build/ez-tree.es.js, which
// base64-inlines every bark/leaf texture into a 3.9 MB blob.
import { Tree, TreePreset } from 'ez-tree-src';

// Import the leaf billboard textures directly. EZ-Tree's own eager texture
// loader doesn't fire a fetch under this bundling setup (leaves came back
// with an empty .image → invisible foliage), so we load them ourselves and
// assign m.map explicitly per tree.
import ashLeafUrl from 'ez-tree-leaves/ash_color.png';
import aspenLeafUrl from 'ez-tree-leaves/aspen_color.png';
import oakLeafUrl from 'ez-tree-leaves/oak_color.png';
import pineLeafUrl from 'ez-tree-leaves/pine_color.png';

// Internal weather modes the forest understands. The weather driver maps
// real conditions onto these; unknown modes fall back to 'sunny'.
type WeatherMode =
  | 'sunny'
  | 'clear'
  | 'cloudy'
  | 'rainy'
  | 'stormy'
  | 'snowy'
  | 'foggy'
  | 'windy'
  | 'hot'
  | 'cold';

// Daylight phase, derived by weather.js from Arlington's real sun times and
// delivered alongside the weather mode on the same `weather:change` event.
type Phase = 'day' | 'dawn' | 'dusk' | 'night';
const ALL_PHASES: readonly Phase[] = ['day', 'dawn', 'dusk', 'night'];

// Per-mode atmosphere: lighting tints, sky top colour, fog density/colour,
// ground colour, wind multiplier, plus distant-mountain and sun-glow control.
// Kept as plain data so a mode change is a cheap uniform/material update +
// one render — never a regenerate.
//   mtnTint    — multiplied onto each ridge's base colour
//   mtnOpacity — multiplier on each ridge's base opacity (lower = washed out)
//   sunColor   — sun-glow colour
//   sunGlow    — sun-glow opacity (0 hidden → ~1 strong)
interface Atmosphere {
  hemiSky: number;
  hemiGround: number;
  hemiInt: number;
  sunInt: number;
  skyTop: number;
  skyBot: number;
  fog: number;
  fogColor: number;
  ground: number;
  wind: number; // multiplier on the base wind strength
  mtnTint: number;
  mtnOpacity: number;
  sunColor: number;
  sunGlow: number;
}

const ATMOS: Record<WeatherMode, Atmosphere> = {
  sunny:  { hemiSky: 0xc5e8ff, hemiGround: 0x8aab60, hemiInt: 1.05, sunInt: 1.5, skyTop: 0x9ec9e8, skyBot: 0xdaeef6, fog: 0.032, fogColor: 0xc8ddef, ground: 0x6f8f55, wind: 1.0, mtnTint: 0xf2efe6, mtnOpacity: 1.0, sunColor: 0xffe3a8, sunGlow: 0.9 },
  clear:  { hemiSky: 0xcdecff, hemiGround: 0x8fb064, hemiInt: 1.08, sunInt: 1.6, skyTop: 0x96c6ea, skyBot: 0xe0f1f9, fog: 0.030, fogColor: 0xcfe3f2, ground: 0x71925a, wind: 0.9, mtnTint: 0xeef0ea, mtnOpacity: 1.0, sunColor: 0xffe9bc, sunGlow: 1.0 },
  cloudy: { hemiSky: 0xb9c6d6, hemiGround: 0x839472, hemiInt: 0.92, sunInt: 0.85, skyTop: 0xaebccb, skyBot: 0xd6dee6, fog: 0.040, fogColor: 0xc2ccd6, ground: 0x66805a, wind: 1.1, mtnTint: 0xc6cfda, mtnOpacity: 0.85, sunColor: 0xe8eef4, sunGlow: 0.12 },
  rainy:  { hemiSky: 0x9fb6c8, hemiGround: 0x6f7f64, hemiInt: 0.82, sunInt: 0.6,  skyTop: 0x7d92a4, skyBot: 0xaab9c6, fog: 0.050, fogColor: 0x9fb0bf, ground: 0x5a7048, wind: 1.4, mtnTint: 0x95a4b4, mtnOpacity: 0.7, sunColor: 0xb9c4cf, sunGlow: 0.0 },
  stormy: { hemiSky: 0x7c8a9c, hemiGround: 0x5a6553, hemiInt: 0.66, sunInt: 0.4,  skyTop: 0x5d6b7d, skyBot: 0x8593a1, fog: 0.064, fogColor: 0x7e8c99, ground: 0x4d5f43, wind: 1.9, mtnTint: 0x6f7c8c, mtnOpacity: 0.6, sunColor: 0x8b97a4, sunGlow: 0.0 },
  snowy:  { hemiSky: 0xdfeefc, hemiGround: 0xb9c6c4, hemiInt: 1.0,  sunInt: 0.9,  skyTop: 0xc4d6e6, skyBot: 0xeef5fb, fog: 0.052, fogColor: 0xd5e2ee, ground: 0xb9c6c4, wind: 0.8, mtnTint: 0xe6eef6, mtnOpacity: 0.85, sunColor: 0xeaf2fb, sunGlow: 0.3 },
  foggy:  { hemiSky: 0xcdd4d8, hemiGround: 0x9aa69a, hemiInt: 0.9,  sunInt: 0.55, skyTop: 0xc3ccce, skyBot: 0xdde2e2, fog: 0.085, fogColor: 0xd2d8d8, ground: 0x73876a, wind: 0.7, mtnTint: 0xd3d8da, mtnOpacity: 0.35, sunColor: 0xdfe4e4, sunGlow: 0.08 },
  windy:  { hemiSky: 0xc1dcef, hemiGround: 0x88a468, hemiInt: 1.0,  sunInt: 1.25, skyTop: 0x9cc4e2, skyBot: 0xdcecf5, fog: 0.034, fogColor: 0xc6dcec, ground: 0x6d8d56, wind: 2.4, mtnTint: 0xe4ecf2, mtnOpacity: 1.0, sunColor: 0xfdf0d4, sunGlow: 0.45 },
  hot:    { hemiSky: 0xffe7c2, hemiGround: 0x9c9a52, hemiInt: 1.1,  sunInt: 1.7,  skyTop: 0xbcd6e6, skyBot: 0xf6ecd9, fog: 0.026, fogColor: 0xe6dcc8, ground: 0x8a9450, wind: 0.9, mtnTint: 0xf3ead9, mtnOpacity: 0.92, sunColor: 0xffe1a0, sunGlow: 1.0 },
  cold:   { hemiSky: 0xd2e6f6, hemiGround: 0x8c9aa0, hemiInt: 0.95, sunInt: 1.0,  skyTop: 0xaecadd, skyBot: 0xe2eef6, fog: 0.044, fogColor: 0xccdbe7, ground: 0x6a7f63, wind: 1.2, mtnTint: 0xdfe8f0, mtnOpacity: 0.9, sunColor: 0xe6eef8, sunGlow: 0.35 },
};

// Per-phase transform applied ON TOP of the weather baseline (ATMOS stays
// authored for daytime). Composition instead of a 4×10 matrix: any weather
// at any phase works without hand-tuning 40 entries.
//   lightMul          — multiplies hemi + sun intensities
//   skyTint/skyMix    — lerp sky gradient + fog colour toward the tint
//   sceneTint/sceneMix— "moonlight wash" lerp on bark/leaf/ridge/ground bases
//   sunGlowMul        — scales the weather's sun-glow (0 at night)
//   moon / stars      — max opacities, further gated by SKY_CLARITY[mode]
interface PhaseFx {
  lightMul: number;
  skyTint: number;
  skyMix: number;
  sceneTint: number;
  sceneMix: number;
  sunGlowMul: number;
  moon: number;
  stars: number;
}

const PHASE_FX: Record<Phase, PhaseFx> = {
  day:   { lightMul: 1,    skyTint: 0xffffff, skyMix: 0,    sceneTint: 0xffffff, sceneMix: 0,    sunGlowMul: 1,   moon: 0,    stars: 0 },
  dawn:  { lightMul: 0.85, skyTint: 0xffc9a0, skyMix: 0.45, sceneTint: 0xffd9b0, sceneMix: 0.16, sunGlowMul: 1.2, moon: 0,    stars: 0.25 },
  dusk:  { lightMul: 0.78, skyTint: 0xff9e7a, skyMix: 0.5,  sceneTint: 0xe8a37c, sceneMix: 0.2,  sunGlowMul: 1.1, moon: 0.35, stars: 0.4 },
  night: { lightMul: 0.32, skyTint: 0x0b1630, skyMix: 0.85, sceneTint: 0x35507a, sceneMix: 0.55, sunGlowMul: 0,   moon: 0.9,  stars: 1 },
};

// How much of the night sky (stars/moon) each weather lets through.
const SKY_CLARITY: Record<WeatherMode, number> = {
  sunny: 1, clear: 1, cloudy: 0.15, rainy: 0, stormy: 0,
  snowy: 0, foggy: 0, windy: 0.4, hot: 0.6, cold: 1,
};

// Small deterministic PRNG so a given seed always lays out the same forest.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Quality = 'high' | 'medium' | 'low';

// ── Aspect-aware coverage ──────────────────────────────────────────────
// The camera has a FIXED vertical FOV (50°) at z=15.5 looking ~horizontal,
// so the visible horizontal half-extent at a given depth grows linearly
// with the viewport aspect ratio. Everything that must reach the screen
// edges (ridges, sky, tree flanks, clouds, birds) sizes itself from this.
const CAM_Z = 15.5;
const HALF_FOV_TAN = Math.tan(THREE.MathUtils.degToRad(25));
function halfWidthAt(z: number, aspect: number): number {
  return HALF_FOV_TAN * (CAM_Z - z) * aspect;
}

// ──────────────────────────────────────────────────────────────────────
// Ambient layers — small, self-contained scene-local managers that add
// quiet life (clouds, birds, motes) on top of the forest/mountains. Each
// owns its own THREE.Group, reacts to weather via setMode, animates in
// update(t, dt), and has a dispose path. They never touch unrelated scene
// state and never rebuild geometry on a mode change (just opacity/colour/
// speed). All motion is gated by reduced-motion and device tier.
// ──────────────────────────────────────────────────────────────────────
interface AmbientLayer {
  setContext(mode: WeatherMode, phase: Phase): void;
  /** Re-spread positions to cover the visible width at the layer's depth. */
  setSpread?(aspect: number): void;
  update(t: number, dt: number): void;
  dispose(): void;
}

// ── Clouds / mist ──────────────────────────────────────────────────────
// A few large, soft, transparent planes that sit behind the mountains and
// drift slowly. Per-mode opacity/colour/speed give the sky weather life
// without volumetrics or postprocessing.
interface CloudCfg { opacity: number; color: number; speed: number; }
const CLOUD_MODE_CONFIG: Record<WeatherMode, CloudCfg> = {
  sunny:  { opacity: 0.16, color: 0xffffff, speed: 0.7 },
  clear:  { opacity: 0.10, color: 0xffffff, speed: 0.6 },
  cloudy: { opacity: 0.38, color: 0xd5dde6, speed: 0.8 },
  rainy:  { opacity: 0.42, color: 0x9eacba, speed: 1.0 },
  stormy: { opacity: 0.55, color: 0x6f7d8d, speed: 1.3 },
  snowy:  { opacity: 0.32, color: 0xe8f1f8, speed: 0.5 },
  foggy:  { opacity: 0.50, color: 0xd4dadb, speed: 0.35 },
  windy:  { opacity: 0.28, color: 0xdce8f2, speed: 1.8 },
  hot:    { opacity: 0.20, color: 0xffead0, speed: 0.55 },
  cold:   { opacity: 0.22, color: 0xddeaf3, speed: 0.45 },
};

// Soft radial alpha so the plane reads as a blurry cloud, not a rectangle.
function makeCloudTexture(): THREE.CanvasTexture {
  const s = 128;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createCloudLayer(scene: THREE.Scene, quality: Quality, reduceMotion: boolean): AmbientLayer {
  const group = new THREE.Group();
  group.renderOrder = -5;
  scene.add(group);

  const count = quality === 'high' ? 5 : quality === 'medium' ? 3 : 2;
  const tex = makeCloudTexture();
  const rng = mulberry32(31337);

  // baseN is the cloud's home x normalized to [-1, 1]; the actual x is
  // baseN × spreadHalf so wide viewports spread the same clouds outward.
  interface CloudItem { mat: THREE.MeshBasicMaterial; baseN: number; drift: number; phase: number; }
  const clouds: CloudItem[] = [];
  let spreadHalf = 18;

  for (let i = 0; i < count; i++) {
    const mat = new THREE.MeshBasicMaterial({
      map: tex, color: 0xffffff, transparent: true, opacity: 0.18,
      depthWrite: false, fog: false,
    });
    const w = 14 + rng() * 10;
    const h = 4 + rng() * 2.5;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    const baseN = (rng() - 0.5) * 2;
    // Sit above the ridge line, behind the mountains/sky.
    mesh.position.set(baseN * spreadHalf, 7 + rng() * 5, -22 - rng() * 4);
    group.add(mesh);
    clouds.push({ mat, baseN, drift: 0.04 + rng() * 0.05, phase: rng() * Math.PI * 2 });
  }

  let speedMul = 0.7;
  let targetOpacity = 0.18;

  const _nightCloud = new THREE.Color(0x223046);
  return {
    setContext(mode, phase) {
      const c = CLOUD_MODE_CONFIG[mode];
      speedMul = c.speed;
      const night = phase === 'night';
      targetOpacity = c.opacity * (night ? 0.55 : 1);
      for (const cl of clouds) {
        cl.mat.color.setHex(c.color);
        if (night) cl.mat.color.lerp(_nightCloud, 0.6);
        cl.mat.opacity = targetOpacity;
      }
    },
    setSpread(aspect) {
      // Clouds sit around z ≈ -24; cover that depth with a small margin.
      spreadHalf = Math.max(18, halfWidthAt(-24, aspect) * 0.9);
      for (let i = 0; i < clouds.length; i++) {
        (group.children[i] as THREE.Mesh).position.x = clouds[i].baseN * spreadHalf;
      }
    },
    update(t) {
      if (reduceMotion) return;
      void targetOpacity; // set in setMode; opacity is not animated per-frame
      // Drift each cloud mesh (group children) slowly along x — no allocations.
      for (let i = 0; i < clouds.length; i++) {
        const mesh = group.children[i] as THREE.Mesh;
        const cl = clouds[i];
        mesh.position.x = cl.baseN * spreadHalf + Math.sin(t * cl.drift * speedMul + cl.phase) * 4;
      }
    },
    dispose() {
      scene.remove(group);
      for (const cl of clouds) cl.mat.dispose();
      group.children.forEach((m) => (m as THREE.Mesh).geometry?.dispose());
      tex.dispose();
    },
  };
}

// ── Birds ──────────────────────────────────────────────────────────────
// A handful of tiny distant "V" silhouettes that glide along seeded
// elliptical paths, high above the mountains and clear of the centre
// reading zone. One InstancedMesh = one draw call. Hidden in harsh weather.
const BIRD_COUNT: Record<Quality, number> = { high: 7, medium: 4, low: 2 };
const BIRD_HARSH: WeatherMode[] = ['rainy', 'stormy', 'snowy', 'foggy'];

function makeBirdGeometry(): THREE.BufferGeometry {
  // A flat two-triangle "V" (chevron), ~1.7 units wide, pointing -z. Enlarged
  // from the original ~1u so the distant silhouettes actually read.
  const g = new THREE.BufferGeometry();
  const v = new Float32Array([
    0, 0, 0,  -0.85, 0.2, 0.3,  -0.72, 0.0, 0.27,   // left wing
    0, 0, 0,   0.72, 0.0, 0.27,   0.85, 0.2, 0.3,   // right wing
  ]);
  g.setAttribute('position', new THREE.BufferAttribute(v, 3));
  return g;
}

interface BirdSlot { cx: number; cy: number; cz: number; rx: number; rz: number; speed: number; phase: number; tilt: number; }
function makeBirdSlots(count: number): BirdSlot[] {
  const rng = mulberry32(8675309);
  const slots: BirdSlot[] = [];
  for (let i = 0; i < count; i++) {
    const side = rng() < 0.5 ? -1 : 1;
    slots.push({
      cx: side * (6 + rng() * 7),        // biased to the sides, clear of centre
      // Sit in the open sky band above the treetops but in front of the
      // mountains, so they're actually in frame and not occluded by ridges.
      cy: 5 + rng() * 3,
      cz: -13 - rng() * 5,               // in front of the mountains (z -16..-19)
      rx: 3.5 + rng() * 3.5,
      rz: 1.5 + rng() * 2,
      speed: 0.12 + rng() * 0.1,
      phase: rng() * Math.PI * 2,
      tilt: 0.8 + rng() * 0.5,
    });
  }
  return slots;
}

function createBirdLayer(scene: THREE.Scene, quality: Quality, reduceMotion: boolean): AmbientLayer {
  const group = new THREE.Group();
  scene.add(group);

  const count = BIRD_COUNT[quality];
  const geometry = makeBirdGeometry();
  const material = new THREE.MeshBasicMaterial({
    color: 0x2b3845, transparent: true, opacity: 0.72,
    side: THREE.DoubleSide, depthWrite: false, fog: true,
  });
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.frustumCulled = false;
  group.add(mesh);

  const slots = makeBirdSlots(count);
  // Reused temporaries — never allocate inside update().
  const _m = new THREE.Matrix4();
  const _pos = new THREE.Vector3();
  const _quat = new THREE.Quaternion();
  const _scl = new THREE.Vector3(1, 1, 1);
  const _e = new THREE.Euler();

  let active = !reduceMotion;
  let speedMul = 1;
  let baseOpacity = 0.72;
  let spreadMul = 1; // scales path centres outward on wide viewports

  function writeMatrices(t: number): void {
    for (let i = 0; i < count; i++) {
      const s = slots[i];
      const a = t * s.speed * speedMul + s.phase;
      _pos.set(s.cx * spreadMul + Math.cos(a) * s.rx, s.cy + Math.sin(a * 1.3) * 0.6, s.cz + Math.sin(a) * s.rz);
      // Bank along the path: yaw toward travel, slight roll.
      _e.set(0, -a, Math.sin(a * 2) * 0.15 * s.tilt);
      _quat.setFromEuler(_e);
      _m.compose(_pos, _quat, _scl);
      mesh.setMatrixAt(i, _m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  // Lay down an initial static pose so a reduced-motion / single-frame
  // render still shows birds in place.
  writeMatrices(0);

  return {
    setContext(mode, phase) {
      // Birds roost at night; hidden in harsh weather as before.
      const hidden = BIRD_HARSH.includes(mode) || phase === 'night';
      active = !reduceMotion && !hidden;
      speedMul = mode === 'windy' ? 1.6 : mode === 'hot' ? 0.75 : 1;
      // Still a touch softer on overcast/snow days, but clearly visible now.
      baseOpacity = mode === 'cloudy' ? 0.6 : mode === 'snowy' ? 0.5 : 0.72;
      material.opacity = hidden ? 0 : baseOpacity;
      group.visible = !hidden;
    },
    setSpread(aspect) {
      // Path centres sit around z ≈ -15.5; widen so flocks reach the edges.
      spreadMul = Math.max(1, (halfWidthAt(-15.5, aspect) * 0.8) / 13);
      writeMatrices(0); // refresh the static pose for reduced-motion renders
    },
    update(t) {
      if (!active) return;
      writeMatrices(t);
    },
    dispose() {
      scene.remove(group);
      geometry.dispose();
      material.dispose();
    },
  };
}

// ── Ground life (motes / pollen / fireflies) ───────────────────────────
// A single THREE.Points cloud of tiny specks that wander slowly near the
// forest edges in pleasant weather. High tier only; off in harsh weather
// and under reduced motion. One draw call, soft additive points.
const GROUNDLIFE_COUNT: Record<Quality, number> = { high: 32, medium: 0, low: 0 };
const GROUNDLIFE_OK: WeatherMode[] = ['sunny', 'clear', 'hot', 'cloudy', 'windy'];

function makeMoteTexture(): THREE.CanvasTexture {
  const s = 32;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createGroundLifeLayer(scene: THREE.Scene, quality: Quality, reduceMotion: boolean): AmbientLayer {
  const group = new THREE.Group();
  scene.add(group);

  const count = GROUNDLIFE_COUNT[quality];
  if (count === 0 || reduceMotion) {
    // Empty, inert layer — keeps the array uniform and dispose-safe.
    return { setContext() {}, update() {}, dispose() { scene.remove(group); } };
  }

  const rng = mulberry32(424242);
  const positions = new Float32Array(count * 3);
  // Per-mote home + wander params (preallocated, read-only in update).
  const home = new Float32Array(count * 3);
  const wob = new Float32Array(count * 3); // speed x/y/z packed as phase seeds
  for (let i = 0; i < count; i++) {
    const side = rng() < 0.5 ? -1 : 1;
    const hx = side * (5 + rng() * 4);   // forest edges, clear of centre
    const hy = 0.6 + rng() * 2.2;        // low, near the canopy base
    const hz = -3 - rng() * 6;
    home[i * 3] = hx; home[i * 3 + 1] = hy; home[i * 3 + 2] = hz;
    positions[i * 3] = hx; positions[i * 3 + 1] = hy; positions[i * 3 + 2] = hz;
    wob[i * 3] = rng() * Math.PI * 2;
    wob[i * 3 + 1] = rng() * Math.PI * 2;
    wob[i * 3 + 2] = 0.3 + rng() * 0.5;  // individual speed
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const tex = makeMoteTexture();
  const material = new THREE.PointsMaterial({
    map: tex, color: 0xfff4cf, size: 0.12, transparent: true, opacity: 0,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
  });
  const points = new THREE.Points(geo, material);
  points.frustumCulled = false;
  group.add(points);

  let active = false;

  return {
    setContext(mode, phase) {
      // Day persona: pale pollen motes. Night/dusk persona handled in P5
      // (fireflies); until then motes simply glow warmer after dark.
      active = GROUNDLIFE_OK.includes(mode) || (phase !== 'day' && SKY_CLARITY[mode] > 0);
      material.color.setHex(phase === 'night' || phase === 'dusk' ? 0xffd97a : 0xfff4cf);
      material.opacity = active ? (phase === 'night' ? 0.7 : 0.5) : 0;
      group.visible = active;
    },
    update(t) {
      if (!active) return;
      const arr = geo.attributes.position.array as Float32Array;
      for (let i = 0; i < count; i++) {
        const sp = wob[i * 3 + 2];
        arr[i * 3]     = home[i * 3]     + Math.sin(t * sp + wob[i * 3]) * 0.5;
        arr[i * 3 + 1] = home[i * 3 + 1] + Math.sin(t * sp * 0.8 + wob[i * 3 + 1]) * 0.4;
        arr[i * 3 + 2] = home[i * 3 + 2] + Math.cos(t * sp * 0.6 + wob[i * 3]) * 0.4;
      }
      geo.attributes.position.needsUpdate = true;
    },
    dispose() {
      scene.remove(group);
      geo.dispose();
      material.dispose();
      tex.dispose();
    },
  };
}

export function initForest(host: HTMLElement): void {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = window.matchMedia('(max-width: 720px)').matches;
  const isTablet = !isMobile && window.matchMedia('(max-width: 1100px)').matches;
  const quality: 'high' | 'medium' | 'low' = isMobile ? 'low' : isTablet ? 'medium' : 'high';

  // ── WebGL check + SVG fallback ─────────────────────────────────────
  function hasWebGL(): boolean {
    try {
      const c = document.createElement('canvas');
      return !!(
        window.WebGLRenderingContext &&
        (c.getContext('webgl') || c.getContext('experimental-webgl'))
      );
    } catch {
      return false;
    }
  }

  // A layered landscape — distant mountain ridge behind a small edge-biased
  // forest, with a few clouds and (in pleasant weather) birds — so the
  // no-WebGL fallback still reads as a little diorama.
  function renderFallback(mode: WeatherMode = 'sunny', phase: Phase = 'day'): void {
    const snowy = mode === 'snowy', foggy = mode === 'foggy';
    const night = phase === 'night';
    const harsh = mode === 'rainy' || mode === 'stormy' || snowy || foggy;
    const warm = night ? '#2e4636' : snowy ? '#cfdde3' : foggy ? '#9fb0a6' : '#6f9a54';
    const cool = night ? '#243a2e' : snowy ? '#a9bcc6' : '#4f7d42';
    const bark = night ? '#3a3226' : '#7a5a3c';
    const mtnFar = night ? '#1d2b42' : snowy ? '#e3edf6' : foggy ? '#cfd6da' : '#bcd0e2';
    const mtnNear = night ? '#16233a' : snowy ? '#cfdcea' : foggy ? '#b9c2c7' : '#93a8bd';
    const clearSky = mode === 'sunny' || mode === 'clear' || mode === 'hot' || mode === 'cold';
    const sunOn = !night && (mode === 'sunny' || mode === 'clear' || mode === 'hot');
    const moonOn = night && clearSky;
    const birdsOn = !night && !harsh && mode !== 'cold';
    // Cloud tint/opacity loosely tracks the WebGL cloud config.
    const cloudCol = mode === 'stormy' ? '#6f7d8d' : mode === 'rainy' ? '#9eacba'
      : mode === 'cloudy' ? '#d5dde6' : mode === 'foggy' ? '#d4dadb' : '#ffffff';
    const cloudOp = mode === 'stormy' ? 0.5 : mode === 'rainy' || mode === 'foggy' ? 0.42
      : mode === 'cloudy' ? 0.34 : 0.16;
    const tree = (x: number, y: number, s: number, c: string) => `
      <g transform="translate(${x} ${y}) scale(${s})">
        <rect x="-2" y="0" width="4" height="20" rx="1.5" fill="${bark}"/>
        <circle cx="0" cy="-6" r="13" fill="${c}" opacity="0.9"/>
        <circle cx="-8" cy="2" r="8" fill="${c}" opacity="0.75"/>
        <circle cx="8" cy="2" r="8" fill="${c}" opacity="0.75"/>
      </g>`;
    const cloud = (x: number, y: number, s: number) => `
      <g transform="translate(${x} ${y}) scale(${s})" fill="${cloudCol}" opacity="${cloudOp}">
        <ellipse cx="0" cy="0" rx="16" ry="6"/>
        <ellipse cx="-10" cy="2" rx="9" ry="5"/>
        <ellipse cx="11" cy="2" rx="8" ry="4.5"/>
      </g>`;
    // A tiny "V" chevron bird.
    const bird = (x: number, y: number, s: number) =>
      `<path d="M${x - 4 * s} ${y} Q${x} ${y - 2.4 * s} ${x} ${y} Q${x} ${y - 2.4 * s} ${x + 4 * s} ${y}" fill="none" stroke="#3a4a58" stroke-width="${0.9 * s}" stroke-linecap="round" opacity="0.5"/>`;
    const starsSvg = moonOn
      ? [[30, 18], [62, 10], [96, 22], [128, 8], [162, 16], [184, 28]]
          .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="0.9" fill="#eaf2ff" opacity="0.8"/>`)
          .join('')
      : '';
    host.innerHTML = `<svg class="tree-fallback" viewBox="0 0 200 120" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
      ${sunOn ? '<circle cx="138" cy="44" r="16" fill="#ffe3a8" opacity="0.55"/>' : ''}
      ${moonOn ? '<circle cx="60" cy="34" r="11" fill="#dfe9ff" opacity="0.75"/><circle cx="64" cy="31" r="10" fill="#1d2b42" opacity="0.9"/>' : ''}
      ${starsSvg}
      ${cloud(46, 30, 0.8)}
      ${cloud(150, 24, 1.0)}
      ${birdsOn ? bird(70, 22, 1.1) + bird(82, 26, 0.9) + bird(120, 18, 1.0) : ''}
      <path d="M0 70 L26 50 L48 64 L74 44 L104 62 L132 46 L160 60 L184 48 L200 62 L200 120 L0 120 Z" fill="${mtnFar}" opacity="0.6"/>
      <path d="M0 82 L34 64 L60 78 L92 60 L120 76 L150 62 L178 76 L200 66 L200 120 L0 120 Z" fill="${mtnNear}" opacity="0.65"/>
      ${tree(24, 90, 0.7, cool)}
      ${tree(176, 88, 0.75, cool)}
      ${tree(46, 102, 0.85, warm)}
      ${tree(154, 104, 0.8, warm)}
      ${tree(12, 110, 0.5, warm)}
      ${tree(188, 110, 0.55, warm)}
    </svg>`;
  }

  if (!hasWebGL()) {
    const initial = (window as any).KTWeatherState;
    renderFallback(initial?.mode ?? 'sunny', initial?.phase ?? 'day');
    window.addEventListener('weather:change', (e) => {
      const d = (e as CustomEvent).detail;
      renderFallback(d.mode, d.phase ?? 'day');
    });
    (window as any).TreeScene = { setMode: renderFallback, updateForestState: renderFallback };
    return;
  }

  // ── Scene ──────────────────────────────────────────────────────────
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xc8ddef, 0.032);

  // Slightly wider FOV + a touch further back so the edge trees, the cleared
  // centre, and the distant mountains all read as one landscape.
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 160);
  camera.position.set(0, 2.6, 15.5);
  camera.lookAt(0, 2.2, -6);

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: quality !== 'low',
    powerPreference: 'low-power',
  });
  // Cap device pixel ratio so high-DPI phones don't render 3–4× the pixels.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality === 'high' ? 2 : 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.appendChild(renderer.domElement);

  // ── Leaf textures (loaded ourselves; see import note above) ────────
  // Astro/Vite resolves image imports to a metadata object ({ src, width, … }),
  // not a bare string — so read `.src` (falling back to the value itself).
  const urlOf = (v: any): string => (typeof v === 'string' ? v : v?.src ?? '');
  const texLoader = new THREE.TextureLoader();
  const LEAF_URL: Record<string, string> = {
    ash: urlOf(ashLeafUrl),
    aspen: urlOf(aspenLeafUrl),
    oak: urlOf(oakLeafUrl),
    pine: urlOf(pineLeafUrl),
  };
  const leafTexCache: Record<string, THREE.Texture> = {};
  function leafTexture(type: string): THREE.Texture {
    const key = LEAF_URL[type] ? type : 'oak';
    if (!leafTexCache[key]) {
      const t = texLoader.load(LEAF_URL[key], () => renderOnce());
      t.colorSpace = THREE.SRGBColorSpace;
      leafTexCache[key] = t;
    }
    return leafTexCache[key];
  }

  // Recover gracefully if the GPU drops the context.
  renderer.domElement.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    stop();
  });
  renderer.domElement.addEventListener('webglcontextrestored', () => start());

  // ── Lighting ───────────────────────────────────────────────────────
  const hemi = new THREE.HemisphereLight(0xc5e8ff, 0x8aab60, 1.05);
  const sun = new THREE.DirectionalLight(0xfff5e0, 1.5);
  sun.position.set(5, 9, 4);
  scene.add(hemi, sun);

  // ── Sky gradient plane ─────────────────────────────────────────────
  const SKY_UNI = {
    uTop: { value: new THREE.Color(0x9ec9e8) },
    uBot: { value: new THREE.Color(0xdaeef6) },
    uOpacity: { value: 0.22 },
  };
  const sky = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 60, 1, 6),
    new THREE.ShaderMaterial({
      uniforms: SKY_UNI,
      vertexShader: `varying float vNY;
        void main(){ vNY=(position.y+30.0)/60.0; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 uTop; uniform vec3 uBot; uniform float uOpacity; varying float vNY;
        void main(){ float t=clamp(vNY,0.0,1.0); gl_FragColor=vec4(mix(uBot,uTop,t),uOpacity*t); }`,
      transparent: true,
      depthWrite: false,
    }),
  );
  sky.position.set(0, 5, -20);
  scene.add(sky);

  // ── Sun glow (radial plane behind the ridge) ───────────────────────
  // A soft additive disc that reads as sunlight peeking over the mountains.
  // Its opacity/colour are driven per weather mode (strong on sunny/clear/hot,
  // hidden on cloudy/rainy/stormy/foggy).
  const SUN_UNI = {
    uColor: { value: new THREE.Color(0xffe6b0) },
    uOpacity: { value: 0.0 },
  };
  const sunGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(34, 34),
    new THREE.ShaderMaterial({
      uniforms: SUN_UNI,
      vertexShader: `varying vec2 vUv;
        void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 uColor; uniform float uOpacity; varying vec2 vUv;
        void main(){
          float d = distance(vUv, vec2(0.5));
          float core = smoothstep(0.5, 0.0, d);     // bright centre
          float halo = smoothstep(0.5, 0.12, d);    // soft falloff
          float a = (core*0.7 + halo*0.5) * uOpacity;
          gl_FragColor = vec4(uColor, a);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  // Sit behind the ridge, offset to the right so it reads as a sun, not a spotlight.
  sunGlow.position.set(7, 6.5, -18.5);
  scene.add(sunGlow);

  // ── Moon (night counterpart of the sun glow) ───────────────────────
  // Same additive-disc pattern, opposite side, pale blue-white, with a
  // crescent bite cut in the fragment shader. Opacity is driven by
  // PHASE_FX.moon × SKY_CLARITY[mode] (hidden by day / under overcast).
  const MOON_UNI = {
    uColor: { value: new THREE.Color(0xdfe9ff) },
    uOpacity: { value: 0.0 },
  };
  const moon = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 16),
    new THREE.ShaderMaterial({
      uniforms: MOON_UNI,
      vertexShader: `varying vec2 vUv;
        void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 uColor; uniform float uOpacity; varying vec2 vUv;
        void main(){
          float d = distance(vUv, vec2(0.5));
          float disc = smoothstep(0.15, 0.135, d);                          // crisp moon disc
          float bite = smoothstep(0.125, 0.145, distance(vUv, vec2(0.565, 0.535))); // crescent shadow
          float halo = smoothstep(0.45, 0.1, d) * 0.3;                      // soft glow
          float a = (disc * bite * 0.95 + halo) * uOpacity;
          gl_FragColor = vec4(uColor, a);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  moon.position.set(-7, 8.5, -18.8);
  scene.add(moon);

  // ── Stars (night sky) ──────────────────────────────────────────────
  // One Points cloud spread across the sky band, behind the ridges. Twinkle
  // is a slow global opacity sine in tick() — no per-point shader needed.
  const STAR_COUNT: Record<Quality, number> = { high: 350, medium: 180, low: 90 };
  const starCount = STAR_COUNT[quality];
  const starRng = mulberry32(5151);
  const starPos = new Float32Array(starCount * 3);
  const STAR_BUILT_HALF = 40; // scaled up in layoutForAspect for wide frusta
  for (let i = 0; i < starCount; i++) {
    starPos[i * 3] = (starRng() - 0.5) * 2 * STAR_BUILT_HALF;
    starPos[i * 3 + 1] = 5 + Math.pow(starRng(), 0.7) * 24; // denser near zenith
    starPos[i * 3 + 2] = -19.7;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starTex = makeMoteTexture();
  const starMat = new THREE.PointsMaterial({
    map: starTex, color: 0xeaf2ff, size: 0.22, transparent: true, opacity: 0,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, fog: false,
  });
  const stars = new THREE.Points(starGeo, starMat);
  stars.frustumCulled = false;
  scene.add(stars);
  let starBaseOpacity = 0; // set per (mode, phase) in applyImmediate

  // ── Distant procedural mountains (lightweight ridge silhouettes) ────
  // Three flat ridge layers between the sky and the background trees. Each is
  // a single triangle-fan BufferGeometry built from a seeded ridgeline, so no
  // image assets and a tiny vertex count. Colours/opacity update per weather.
  interface Ridge {
    mesh: THREE.Mesh;
    mat: THREE.MeshBasicMaterial;
    base: THREE.Color;
    z: number;
    builtHalfWidth: number;
  }
  const ridges: Ridge[] = [];

  function buildRidge(opts: {
    z: number; width: number; baseY: number; height: number;
    segments: number; color: number; opacity: number; seedShift: number;
  }): void {
    const { z, width, baseY, height, segments, color, opacity, seedShift } = opts;
    const verts: number[] = [];
    const idx: number[] = [];
    const rr = mulberry32(98765 + seedShift);
    // Build a ridgeline as a strip of triangles from baseline up to ridge top.
    const topY: number[] = [];
    for (let i = 0; i <= segments; i++) {
      // Layered value noise → jagged but smooth peaks.
      const f = i / segments;
      const peak =
        Math.sin(f * Math.PI * 3 + seedShift) * 0.5 +
        Math.sin(f * Math.PI * 7 + rr() * 6) * 0.28 +
        (rr() - 0.5) * 0.4;
      topY.push(baseY + height * (0.55 + 0.45 * (peak * 0.5 + 0.5)));
    }
    for (let i = 0; i <= segments; i++) {
      const x = -width / 2 + (width * i) / segments;
      verts.push(x, baseY, 0);     // bottom
      verts.push(x, topY[i], 0);   // top
    }
    for (let i = 0; i < segments; i++) {
      const a = i * 2, b = i * 2 + 1, c = i * 2 + 2, d = i * 2 + 3;
      idx.push(a, b, c, b, d, c);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setIndex(idx);
    const mat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity, depthWrite: false, fog: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, 0, z);
    scene.add(mesh);
    ridges.push({ mesh, mat, base: new THREE.Color(color), z, builtHalfWidth: width / 2 });
  }

  // Far pale → near darker. All sit behind the background tree band (z ≥ -14).
  // Raised well above the tree canopy and taller, so the ridge line clearly
  // reads on the horizon instead of hiding behind the background trees.
  buildRidge({ z: -19, width: 96, baseY: 3.5, height: 13, segments: 22, color: 0xa9c1d8, opacity: 0.8, seedShift: 0 });
  buildRidge({ z: -17.5, width: 88, baseY: 3.0, height: 11, segments: 20, color: 0x88a3bd, opacity: 0.85, seedShift: 11 });
  buildRidge({ z: -16, width: 80, baseY: 2.5, height: 9, segments: 18, color: 0x6c8398, opacity: 0.9, seedShift: 23 });

  // ── Ground ─────────────────────────────────────────────────────────
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(50, 48),
    new THREE.MeshStandardMaterial({ color: 0x6f8f55, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.02;
  scene.add(ground);

  // ── Wind (shared uniforms, injected per material) ──────────────────
  // Stronger base sway than before (0.02 → 0.045) so the trees feel alive.
  const BASE_WIND = reduceMotion ? 0 : 0.045;
  const WIND = { uTime: { value: 0 }, uStr: { value: BASE_WIND } };
  // Leaf wind base strength (the EZ-Tree leaf shader uses a Vector3); the
  // weather multiplier scales on top of this.
  const LEAF_WIND_BASE = reduceMotion ? 0 : 1.1;
  let leafWindMul = 1; // updated by weather mode
  function applyWind(mat: THREE.Material) {
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = WIND.uTime;
      shader.uniforms.uStr = WIND.uStr;
      shader.vertexShader =
        'uniform float uTime;\nuniform float uStr;\n' +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           float wh = clamp(position.y / 5.0, 0.0, 1.0);
           transformed.x += sin(uTime*1.3 + position.y*0.6) * uStr * wh;
           transformed.z += cos(uTime*0.9 + position.x*0.5) * uStr * 0.5 * wh;`,
        );
    };
  }

  // ── Forest composition ─────────────────────────────────────────────
  // Art-directed: explicit anchor zones (not pure random) so the scene reads
  // as a composed landscape, not a central clump. Hero trunks sit in the
  // midground at the left/right thirds with visible negative space; background
  // clusters fill in behind them; foreground bushes live ONLY at the lower
  // extreme edges so they never block a hero trunk from the camera.
  type Band = 'foreground' | 'midground' | 'background';
  const PRESETS: Record<Band, Array<keyof typeof TreePreset>> = {
    foreground: ['Bush 1', 'Bush 2', 'Bush 3'],
    midground: ['Oak Medium', 'Aspen Medium', 'Pine Medium', 'Ash Small', 'Oak Small'],
    background: ['Pine Medium', 'Pine Small', 'Aspen Small', 'Ash Small'],
  };

  // Warm, non-grey bark hues + vivid summer-leaf colour variance. Background
  // trees get slightly cooler/softer greens so depth still reads clearly, but
  // they stay leafy (not bare).
  const BARK_HUES = [0x6b4f34, 0x7a5a3c, 0x5e4a39, 0x836547, 0x6f5034];
  const LEAF_HUES = [0x6cb33f, 0x7cc24a, 0x86c84f, 0x9bd45c, 0x5fa83a, 0x8ec64d];
  const BARK_BG = [0x5a5246, 0x615747, 0x554f44];
  const LEAF_BG = [0x6a9c4e, 0x74a657, 0x7fae5e];

  const rng = mulberry32(20260606);
  const pick = <T>(arr: T[]) => arr[Math.floor(rng() * arr.length)];

  // An anchor describes WHERE and roughly HOW BIG a placement is; jitter is
  // applied within it so repeated seeds stay composed but not mechanical.
  interface Anchor { band: Band; x: number; z: number; scale: number; jx: number; jz: number }

  // Hero midground trunks: pushed to the left/right thirds, clear of centre,
  // each with negative space around it. (|x| ≳ 4.)
  const HERO_ANCHORS: Anchor[] = [
    { band: 'midground', x: -5.6, z: -4.5, scale: 0.40, jx: 0.6, jz: 0.6 },
    { band: 'midground', x:  5.4, z: -4.0, scale: 0.40, jx: 0.6, jz: 0.6 },
    { band: 'midground', x: -4.2, z: -6.5, scale: 0.34, jx: 0.7, jz: 0.7 },
    { band: 'midground', x:  4.6, z: -6.8, scale: 0.34, jx: 0.7, jz: 0.7 },
    { band: 'midground', x: -7.4, z: -5.5, scale: 0.30, jx: 0.6, jz: 0.6 },
    { band: 'midground', x:  7.2, z: -5.2, scale: 0.30, jx: 0.6, jz: 0.6 },
  ];

  // Background silhouettes: wide spread behind the heroes, filling the horizon
  // without crowding the centre reading zone.
  const BG_ANCHORS: Anchor[] = [
    { band: 'background', x: -10, z: -11, scale: 0.30, jx: 1.4, jz: 1.5 },
    { band: 'background', x:  -6, z: -12, scale: 0.28, jx: 1.4, jz: 1.5 },
    { band: 'background', x:  -2, z: -13, scale: 0.26, jx: 1.2, jz: 1.5 },
    { band: 'background', x:   2, z: -13, scale: 0.26, jx: 1.2, jz: 1.5 },
    { band: 'background', x:   6, z: -12, scale: 0.28, jx: 1.4, jz: 1.5 },
    { band: 'background', x:  10, z: -11, scale: 0.30, jx: 1.4, jz: 1.5 },
    { band: 'background', x: -13, z: -12.5, scale: 0.26, jx: 1.2, jz: 1.5 },
    { band: 'background', x:  13, z: -12.5, scale: 0.26, jx: 1.2, jz: 1.5 },
  ];

  // Foreground bushes: ONLY at the lower extreme left/right edges, never in the
  // central reading area, never directly in front of a hero trunk.
  const FG_ANCHORS: Anchor[] = [
    { band: 'foreground', x: -8.2, z: -1.5, scale: 0.20, jx: 0.5, jz: 0.4 },
    { band: 'foreground', x:  8.0, z: -1.2, scale: 0.20, jx: 0.5, jz: 0.4 },
    { band: 'foreground', x: -9.4, z: -0.5, scale: 0.18, jx: 0.5, jz: 0.4 },
    { band: 'foreground', x:  9.2, z: -0.6, scale: 0.18, jx: 0.5, jz: 0.4 },
    { band: 'foreground', x: -6.8, z: -2.2, scale: 0.17, jx: 0.4, jz: 0.4 },
    { band: 'foreground', x:  6.6, z: -2.3, scale: 0.17, jx: 0.4, jz: 0.4 },
  ];

  // Tier budget: how many of each anchor list to use (desktop uses all).
  const TIER: Record<typeof quality, { hero: number; bg: number; fg: number }> = {
    high:   { hero: 6, bg: 8, fg: 6 },
    medium: { hero: 4, bg: 5, fg: 4 },
    low:    { hero: 3, bg: 3, fg: 2 },
  };

  // Per-tree leaf material refs so we can drive their wind each frame.
  // EZ-Tree stashes the compiled shader on material.userData.shader.
  interface LeafEntry { mat: any }
  const leafEntries: LeafEntry[] = [];

  // Every tinted tree material (bark + leaves), each with userData.baseColor
  // stashed, so the phase "moonlight wash" can re-derive colours losslessly.
  const phaseTintedMats: any[] = [];

  function tintTree(tree: any, band: Band) {
    const barkPool = band === 'background' ? BARK_BG : BARK_HUES;
    const leafPool = band === 'background' ? LEAF_BG : LEAF_HUES;
    const barkColor = new THREE.Color(pick(barkPool));
    const leafColor = new THREE.Color(pick(leafPool));
    const leafType = tree.options?.leaves?.type ?? 'oak';
    // Slight per-tree value jitter so neighbours differ.
    const jitter = 0.9 + rng() * 0.2;
    barkColor.multiplyScalar(jitter);
    tree.traverse((o: any) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || !mesh.material) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((m: any) => {
        // EZ-Tree names the leaf material 'leaves'. Its textured billboard
        // shader lives in its OWN onBeforeCompile (with built-in sway), so we
        // must NOT overwrite it — only retint + reassign a real loaded map.
        const isLeaf = m.name === 'leaves' || m.alphaTest > 0;
        if (isLeaf) {
          // EZ-Tree's eager loader leaves m.map with no image under our
          // bundling, so assign our own loaded leaf texture explicitly.
          m.map = leafTexture(leafType);
          if (m.color) {
            m.color.copy(leafColor);
            m.userData.baseColor = m.color.clone();
            phaseTintedMats.push(m);
          }
          m.needsUpdate = true;
          leafEntries.push({ mat: m });
        } else {
          if (m.color) {
            m.color.copy(barkColor);
            m.userData.baseColor = m.color.clone();
            phaseTintedMats.push(m);
          }
          if ('roughness' in m) m.roughness = 0.8 + rng() * 0.2;
          applyWind(m); // trunk/branch sway only
        }
      });
    });
  }

  const trees: any[] = [];
  // Source pools for the aspect-aware flank fill (clones pull from these).
  const builtByBand: Record<Band, any[]> = { foreground: [], midground: [], background: [] };
  function buildFromAnchor(a: Anchor) {
    const band = a.band;
    const tree = new Tree();
    tree.loadFromJson(TreePreset[pick(PRESETS[band])]);
    tree.options.seed = Math.floor(rng() * 100000);
    tree.options.bark.textured = false;
    tree.options.bark.flatShading = true;
    // Foliage that reads as leaves WITHOUT smothering the tree. Foreground
    // bushes get the LEAST dense foliage (they're closest, so they'd blob
    // most) and a tighter alpha cutout; mid/background keep more canopy.
    if (tree.options.leaves) {
      const baseSize = tree.options.leaves.size ?? 2.5;
      const baseCount = tree.options.leaves.count ?? 12;
      // Per-tree fullness so ~1 in 5 trees are sparse/near-bare.
      const fullness = rng();
      let density =
        fullness < 0.2 ? 0.35 :
        fullness < 0.5 ? 0.7 :
        1.0;
      if (band === 'foreground') density *= 0.6;  // bushes stay airy, not walls
      const sizeMul = band === 'foreground' ? 0.8 : 0.85 + rng() * 0.3;
      tree.options.leaves.size = baseSize * sizeMul;
      tree.options.leaves.count = Math.max(3, Math.round(baseCount * density));
      tree.options.leaves.alphaTest = band === 'foreground' ? 0.62 : 0.55;
      tree.options.leaves.start = Math.min(0.9, (tree.options.leaves.start ?? 0.5) + 0.1);
    }
    tree.generate();

    // Anchor scale with mild per-tree variance.
    tree.scale.setScalar(a.scale * (0.85 + rng() * 0.3));

    // Jitter within the anchor zone (keeps the composition, avoids a grid).
    const x = a.x + (rng() - 0.5) * 2 * a.jx;
    const z = a.z + (rng() - 0.5) * 2 * a.jz;
    tree.position.set(x, 0, z);
    tree.rotation.y = rng() * Math.PI * 2;

    tintTree(tree, band);
    scene.add(tree);
    trees.push(tree);
    builtByBand[band].push(tree);
  }

  // Build back-to-front so nearer trees overlap farther ones correctly.
  const tier = TIER[quality];
  BG_ANCHORS.slice(0, tier.bg).forEach(buildFromAnchor);
  HERO_ANCHORS.slice(0, tier.hero).forEach(buildFromAnchor);
  FG_ANCHORS.slice(0, tier.fg).forEach(buildFromAnchor);

  // ── Ambient layers (clouds, birds, ground life) ────────────────────
  const ambientLayers: AmbientLayer[] = [
    createCloudLayer(scene, quality, reduceMotion),
    createBirdLayer(scene, quality, reduceMotion),
    createGroundLifeLayer(scene, quality, reduceMotion),
  ];

  // ── Aspect-aware layout (widescreen edge-to-edge fill) ─────────────
  // The composed scene was authored for ~4:3–16:10. On wider viewports the
  // horizontal frustum outgrows it, so: stretch the flat backdrops (ridges,
  // sky) to the frustum width, and extend the tree bands outward with cheap
  // clones of already-generated trees.
  const flankRng = mulberry32(77777);
  // Representative depth + fill start per band; `filled` tracks how far out
  // clones already reach so a resize only ever ADDS coverage (extras left
  // outside the frustum on shrink are culled).
  const FLANK: Record<Band, { z: number; startX: number }> = {
    background: { z: -12, startX: 14.5 },
    midground: { z: -5, startX: 8.5 },
    foreground: { z: -1.5, startX: 10.5 },
  };
  const filled: Record<Band, number> = {
    background: FLANK.background.startX,
    midground: FLANK.midground.startX,
    foreground: FLANK.foreground.startX,
  };
  // Wider step = sparser flanks on weaker tiers (clones share geometry and
  // materials, so the cost is a few extra draw calls each).
  const FLANK_STEP: Record<Quality, number> = { high: 3.5, medium: 5.8, low: 10 };

  function cloneTree(source: any): THREE.Group {
    // Clone the generated meshes into a plain Group — Object3D.clone() on the
    // EZ-Tree subclass would re-run its constructor. Mesh.clone() shares
    // geometry AND materials, so clones inherit wind sway and weather tints
    // for free. NEVER call tintTree()/applyWind() on a clone: it would
    // double-wrap onBeforeCompile and double-register leafEntries.
    const g = new THREE.Group();
    for (const child of source.children) g.add(child.clone());
    return g;
  }

  function fillFlanks(aspect: number): void {
    if (aspect <= 1.5) return;
    const step = FLANK_STEP[quality];
    (Object.keys(FLANK) as Band[]).forEach((band) => {
      const pool = builtByBand[band];
      if (!pool.length) return;
      const { z } = FLANK[band];
      const needed = halfWidthAt(z, aspect) * 1.08;
      for (let x = filled[band]; x < needed; x += step) {
        for (const side of [-1, 1]) {
          const src = pool[Math.floor(flankRng() * pool.length)];
          const clone = cloneTree(src);
          clone.scale.copy(src.scale).multiplyScalar(0.85 + flankRng() * 0.3);
          clone.position.set(
            side * (x + (flankRng() - 0.5) * step * 0.6),
            0,
            z + (flankRng() - 0.5) * 2.5,
          );
          clone.rotation.y = flankRng() * Math.PI * 2;
          scene.add(clone);
        }
      }
      filled[band] = Math.max(filled[band], needed);
    });
  }

  let lastAspect = 0;
  function layoutForAspect(aspect: number): void {
    // Re-layout only on meaningful aspect changes (not every drag pixel).
    if (Math.abs(aspect - lastAspect) < 0.15) return;
    lastAspect = aspect;
    // Stretch each backdrop to the frustum width at its depth. X-scaling a
    // jagged silhouette just widens peak spacing — visually free.
    for (const r of ridges) {
      r.mesh.scale.x = Math.max(1, (halfWidthAt(r.z, aspect) * 1.15) / r.builtHalfWidth);
    }
    sky.scale.x = Math.max(1, (halfWidthAt(-20, aspect) * 1.15) / 60);
    stars.scale.x = Math.max(1, (halfWidthAt(-19.7, aspect) * 1.1) / 40);
    // Nudge the sun/moon glows outward so they don't crowd centre on ultrawide.
    sunGlow.position.x = 7 * Math.min(1.6, Math.max(1, aspect / 1.6));
    moon.position.x = -sunGlow.position.x;
    fillFlanks(aspect);
    for (const layer of ambientLayers) layer.setSpread?.(aspect);
  }

  // ── Weather × phase atmosphere (cheap uniform update + one render) ──
  function normalizeMode(mode: string): WeatherMode {
    return (mode in ATMOS ? mode : 'sunny') as WeatherMode;
  }
  function normalizePhase(phase: string): Phase {
    return (ALL_PHASES as readonly string[]).includes(phase) ? (phase as Phase) : 'day';
  }

  // Preallocated temporaries for the colour composition — no per-call allocs.
  const _skyTint = new THREE.Color();
  const _sceneTint = new THREE.Color();
  const _mtnTint = new THREE.Color();

  function applyImmediate(mode: WeatherMode, phase: Phase): void {
    const a = ATMOS[mode];
    const fx = PHASE_FX[phase];
    const clarity = SKY_CLARITY[mode];
    _skyTint.setHex(fx.skyTint);
    _sceneTint.setHex(fx.sceneTint);

    // Lighting: weather baseline dimmed/cooled by the phase.
    hemi.color.setHex(a.hemiSky).lerp(_sceneTint, fx.sceneMix * 0.5);
    hemi.groundColor.setHex(a.hemiGround).lerp(_sceneTint, fx.sceneMix * 0.5);
    hemi.intensity = a.hemiInt * fx.lightMul;
    sun.intensity = a.sunInt * fx.lightMul;

    // Sky gradient + fog drift toward the phase tint (peach dusk, navy night).
    SKY_UNI.uTop.value.setHex(a.skyTop).lerp(_skyTint, fx.skyMix);
    SKY_UNI.uBot.value.setHex(a.skyBot).lerp(_skyTint, fx.skyMix * 0.85);
    (scene.fog as THREE.FogExp2).density = a.fog;
    (scene.fog as THREE.FogExp2).color.setHex(a.fogColor).lerp(_skyTint, fx.skyMix * 0.8);

    (ground.material as THREE.MeshStandardMaterial).color
      .setHex(a.ground)
      .lerp(_sceneTint, fx.sceneMix * 0.6);
    WIND.uStr.value = reduceMotion ? 0 : BASE_WIND * a.wind;
    leafWindMul = a.wind;

    // Moonlight wash over every tree material (bark + leaves), re-derived
    // from the stashed base colour so repeated phase flips never drift.
    for (const m of phaseTintedMats) {
      m.color.copy(m.userData.baseColor).lerp(_sceneTint, fx.sceneMix);
    }

    // Distant mountains: weather tint, then the same phase wash.
    _mtnTint.setHex(a.mtnTint);
    for (let i = 0; i < ridges.length; i++) {
      const r = ridges[i];
      r.mat.color.copy(r.base).multiply(_mtnTint).lerp(_sceneTint, fx.sceneMix * 0.8);
      // Far ridges fade more under haze; near ridge stays a touch stronger.
      const layerBoost = 0.85 + i * 0.08;
      r.mat.opacity = Math.min(1, (0.6 * layerBoost) * a.mtnOpacity + 0.05);
    }

    // Sun glow behind the ridge (boosted at dawn/dusk, gone at night)…
    SUN_UNI.uColor.value.setHex(a.sunColor);
    SUN_UNI.uOpacity.value = a.sunGlow * fx.sunGlowMul;
    // …and the moon + stars take over after dark, if the sky is clear enough.
    MOON_UNI.uOpacity.value = fx.moon * clarity;
    starBaseOpacity = fx.stars * clarity * 0.9;
    starMat.opacity = starBaseOpacity;
    stars.visible = starBaseOpacity > 0.01;
  }

  let currentMode: WeatherMode = 'sunny';
  let currentPhase: Phase = 'day';
  function setContext(mode: string, phase: string): void {
    currentMode = normalizeMode(mode);
    currentPhase = normalizePhase(phase);
    applyImmediate(currentMode, currentPhase);
    for (const layer of ambientLayers) layer.setContext(currentMode, currentPhase);
    renderOnce();
  }
  // Back-compat shim (window.TreeScene.setMode callers pass only a mode).
  function setMode(mode: string): void {
    setContext(mode, currentPhase);
  }

  // ── Resize ─────────────────────────────────────────────────────────
  function resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    layoutForAspect(camera.aspect);
    renderOnce();
  }
  window.addEventListener('resize', resize);

  // ── Render / animation ─────────────────────────────────────────────
  let raf = 0;
  const clock = new THREE.Clock();
  let prevT = 0;

  function renderOnce(): void {
    renderer.render(scene, camera);
  }

  function tick(): void {
    const t = clock.getElapsedTime();
    const dt = Math.min(0.05, t - prevT); // clamp to avoid a huge step after pause
    prevT = t;
    WIND.uTime.value = t;

    // Drive each leaf material's own wind shader: advance time and set a
    // strength scaled by the current weather wind multiplier.
    const strength = LEAF_WIND_BASE * leafWindMul;
    for (const e of leafEntries) {
      const shader = e.mat.userData?.shader;
      if (!shader) continue;
      if (shader.uniforms.uTime) shader.uniforms.uTime.value = t;
      if (shader.uniforms.uWindStrength) {
        shader.uniforms.uWindStrength.value.set(strength, strength * 0.35, strength);
      }
    }

    // Ambient layers (clouds, birds, motes) — each animates itself.
    for (const layer of ambientLayers) layer.update(t, dt);

    // Star twinkle: one slow global opacity sine — no per-point work.
    if (starBaseOpacity > 0.01) {
      starMat.opacity = starBaseOpacity * (0.88 + 0.12 * Math.sin(t * 1.7));
    }

    // Subtle camera drift for life; disabled under reduced-motion.
    camera.position.x = Math.sin(t * 0.1) * 0.6;
    camera.lookAt(0, 2.2, -6);
    renderOnce();
    raf = requestAnimationFrame(tick);
  }

  function start(): void {
    if (!raf && !reduceMotion) raf = requestAnimationFrame(tick);
  }
  function stop(): void {
    if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  }

  // Pause the loop when the tab is hidden (battery + CPU).
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else start();
  });

  function dispose(): void {
    stop();
    for (const layer of ambientLayers) layer.dispose();
  }

  window.addEventListener('weather:change', (e) => {
    const d = (e as CustomEvent).detail;
    setContext(d.mode, d.phase ?? currentPhase);
  });
  (window as any).TreeScene = { setMode, setContext, updateForestState: setMode, dispose };

  // Apply the current weather + phase immediately if they resolved before
  // this lazily imported module booted (weather.js stashes them on
  // window.KTWeatherState) — so the forest (and all ambient layers) reflect
  // Arlington's sky on first paint, no 2nd event.
  const initialWeather = (window as any).KTWeatherState;
  setContext(initialWeather?.mode ?? 'sunny', initialWeather?.phase ?? 'day');

  // ── Boot ───────────────────────────────────────────────────────────
  resize();
  if (reduceMotion) {
    // Full static render: trees, lighting, sky, and the layers' static poses
    // (birds in place, clouds parked) — one frame, no motion.
    renderOnce();
  } else {
    start();
  }
}
