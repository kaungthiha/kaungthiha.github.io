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
  // forest — so the no-WebGL fallback still reads as a little diorama.
  function renderFallback(mode: WeatherMode = 'sunny'): void {
    const snowy = mode === 'snowy', foggy = mode === 'foggy';
    const warm = snowy ? '#cfdde3' : foggy ? '#9fb0a6' : '#6f9a54';
    const cool = snowy ? '#a9bcc6' : '#4f7d42';
    const bark = '#7a5a3c';
    const mtnFar = snowy ? '#e3edf6' : foggy ? '#cfd6da' : '#bcd0e2';
    const mtnNear = snowy ? '#cfdcea' : foggy ? '#b9c2c7' : '#93a8bd';
    const sunOn = mode === 'sunny' || mode === 'clear' || mode === 'hot';
    const tree = (x: number, y: number, s: number, c: string) => `
      <g transform="translate(${x} ${y}) scale(${s})">
        <rect x="-2" y="0" width="4" height="20" rx="1.5" fill="${bark}"/>
        <circle cx="0" cy="-6" r="13" fill="${c}" opacity="0.9"/>
        <circle cx="-8" cy="2" r="8" fill="${c}" opacity="0.75"/>
        <circle cx="8" cy="2" r="8" fill="${c}" opacity="0.75"/>
      </g>`;
    host.innerHTML = `<svg class="tree-fallback" viewBox="0 0 200 120" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
      ${sunOn ? '<circle cx="138" cy="44" r="16" fill="#ffe3a8" opacity="0.55"/>' : ''}
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
    renderFallback('sunny');
    window.addEventListener('weather:change', (e) =>
      renderFallback((e as CustomEvent).detail.mode),
    );
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

  // ── Distant procedural mountains (lightweight ridge silhouettes) ────
  // Three flat ridge layers between the sky and the background trees. Each is
  // a single triangle-fan BufferGeometry built from a seeded ridgeline, so no
  // image assets and a tiny vertex count. Colours/opacity update per weather.
  interface Ridge { mat: THREE.MeshBasicMaterial; base: THREE.Color }
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
    ridges.push({ mat, base: new THREE.Color(color) });
  }

  // Far pale → near darker. All sit behind the background tree band (z ≥ -14).
  buildRidge({ z: -19, width: 80, baseY: 0.5, height: 9, segments: 22, color: 0xbcd0e2, opacity: 0.55, seedShift: 0 });
  buildRidge({ z: -17.5, width: 72, baseY: 0.2, height: 7, segments: 20, color: 0x9db4c8, opacity: 0.6, seedShift: 11 });
  buildRidge({ z: -16, width: 64, baseY: 0.0, height: 5, segments: 18, color: 0x7e93a6, opacity: 0.62, seedShift: 23 });

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
          if (m.color) m.color.copy(leafColor);
          m.needsUpdate = true;
          leafEntries.push({ mat: m });
        } else {
          if (m.color) m.color.copy(barkColor);
          if ('roughness' in m) m.roughness = 0.8 + rng() * 0.2;
          applyWind(m); // trunk/branch sway only
        }
      });
    });
  }

  const trees: any[] = [];
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
  }

  // Build back-to-front so nearer trees overlap farther ones correctly.
  const tier = TIER[quality];
  BG_ANCHORS.slice(0, tier.bg).forEach(buildFromAnchor);
  HERO_ANCHORS.slice(0, tier.hero).forEach(buildFromAnchor);
  FG_ANCHORS.slice(0, tier.fg).forEach(buildFromAnchor);


  // ── Weather atmosphere (cheap material/uniform update + one render) ─
  function normalizeMode(mode: string): WeatherMode {
    return (mode in ATMOS ? mode : 'sunny') as WeatherMode;
  }
  function applyImmediate(mode: WeatherMode): void {
    const a = ATMOS[mode];
    hemi.color.setHex(a.hemiSky);
    hemi.groundColor.setHex(a.hemiGround);
    hemi.intensity = a.hemiInt;
    sun.intensity = a.sunInt;
    SKY_UNI.uTop.value.setHex(a.skyTop);
    SKY_UNI.uBot.value.setHex(a.skyBot);
    (scene.fog as THREE.FogExp2).density = a.fog;
    (scene.fog as THREE.FogExp2).color.setHex(a.fogColor);
    (ground.material as THREE.MeshStandardMaterial).color.setHex(a.ground);
    WIND.uStr.value = reduceMotion ? 0 : BASE_WIND * a.wind;
    leafWindMul = a.wind;

    // Distant mountains: tint each ridge from its base colour and scale opacity.
    const tint = new THREE.Color(a.mtnTint);
    for (let i = 0; i < ridges.length; i++) {
      const r = ridges[i];
      r.mat.color.copy(r.base).multiply(tint);
      // Far ridges fade more under haze; near ridge stays a touch stronger.
      const layerBoost = 0.85 + i * 0.08;
      r.mat.opacity = Math.min(1, (0.6 * layerBoost) * a.mtnOpacity + 0.05);
    }

    // Sun glow behind the ridge.
    SUN_UNI.uColor.value.setHex(a.sunColor);
    SUN_UNI.uOpacity.value = a.sunGlow;
  }
  function setMode(mode: string): void {
    applyImmediate(normalizeMode(mode));
    renderOnce();
  }

  // ── Resize ─────────────────────────────────────────────────────────
  function resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderOnce();
  }
  window.addEventListener('resize', resize);

  // ── Render / animation ─────────────────────────────────────────────
  let raf = 0;
  const clock = new THREE.Clock();

  function renderOnce(): void {
    renderer.render(scene, camera);
  }

  function tick(): void {
    const t = clock.getElapsedTime();
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

  window.addEventListener('weather:change', (e) =>
    setMode((e as CustomEvent).detail.mode),
  );
  (window as any).TreeScene = { setMode, updateForestState: setMode };

  // Apply the current weather immediately if it resolved before this lazily
  // imported module booted (weather.js stashes it on window.KTWeatherState) —
  // so the forest reflects Arlington weather on first paint, no 2nd event.
  const initialWeather = (window as any).KTWeatherState;
  applyImmediate(normalizeMode(initialWeather?.mode ?? 'sunny'));

  // ── Boot ───────────────────────────────────────────────────────────
  resize();
  if (reduceMotion) {
    // Full static render: trees, lighting, sky — one frame, no motion.
    renderOnce();
  } else {
    start();
  }
}
