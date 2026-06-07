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
// ground colour, and a wind multiplier. Kept as plain data so a mode change
// is a cheap uniform/material update + one render — never a regenerate.
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
}

const ATMOS: Record<WeatherMode, Atmosphere> = {
  sunny:  { hemiSky: 0xc5e8ff, hemiGround: 0x8aab60, hemiInt: 1.05, sunInt: 1.5, skyTop: 0x9ec9e8, skyBot: 0xdaeef6, fog: 0.032, fogColor: 0xc8ddef, ground: 0x6f8f55, wind: 1.0 },
  clear:  { hemiSky: 0xcdecff, hemiGround: 0x8fb064, hemiInt: 1.08, sunInt: 1.6, skyTop: 0x96c6ea, skyBot: 0xe0f1f9, fog: 0.030, fogColor: 0xcfe3f2, ground: 0x71925a, wind: 0.9 },
  cloudy: { hemiSky: 0xb9c6d6, hemiGround: 0x839472, hemiInt: 0.92, sunInt: 0.85, skyTop: 0xaebccb, skyBot: 0xd6dee6, fog: 0.040, fogColor: 0xc2ccd6, ground: 0x66805a, wind: 1.1 },
  rainy:  { hemiSky: 0x9fb6c8, hemiGround: 0x6f7f64, hemiInt: 0.82, sunInt: 0.6,  skyTop: 0x7d92a4, skyBot: 0xaab9c6, fog: 0.050, fogColor: 0x9fb0bf, ground: 0x5a7048, wind: 1.4 },
  stormy: { hemiSky: 0x7c8a9c, hemiGround: 0x5a6553, hemiInt: 0.66, sunInt: 0.4,  skyTop: 0x5d6b7d, skyBot: 0x8593a1, fog: 0.064, fogColor: 0x7e8c99, ground: 0x4d5f43, wind: 1.9 },
  snowy:  { hemiSky: 0xdfeefc, hemiGround: 0xb9c6c4, hemiInt: 1.0,  sunInt: 0.9,  skyTop: 0xc4d6e6, skyBot: 0xeef5fb, fog: 0.052, fogColor: 0xd5e2ee, ground: 0xb9c6c4, wind: 0.8 },
  foggy:  { hemiSky: 0xcdd4d8, hemiGround: 0x9aa69a, hemiInt: 0.9,  sunInt: 0.55, skyTop: 0xc3ccce, skyBot: 0xdde2e2, fog: 0.085, fogColor: 0xd2d8d8, ground: 0x73876a, wind: 0.7 },
  windy:  { hemiSky: 0xc1dcef, hemiGround: 0x88a468, hemiInt: 1.0,  sunInt: 1.25, skyTop: 0x9cc4e2, skyBot: 0xdcecf5, fog: 0.034, fogColor: 0xc6dcec, ground: 0x6d8d56, wind: 2.4 },
  hot:    { hemiSky: 0xffe7c2, hemiGround: 0x9c9a52, hemiInt: 1.1,  sunInt: 1.7,  skyTop: 0xbcd6e6, skyBot: 0xf6ecd9, fog: 0.026, fogColor: 0xe6dcc8, ground: 0x8a9450, wind: 0.9 },
  cold:   { hemiSky: 0xd2e6f6, hemiGround: 0x8c9aa0, hemiInt: 0.95, sunInt: 1.0,  skyTop: 0xaecadd, skyBot: 0xe2eef6, fog: 0.044, fogColor: 0xccdbe7, ground: 0x6a7f63, wind: 1.2 },
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

  // A little cluster of stylised trees rather than one blob, so the no-WebGL
  // fallback still reads as a "small forest".
  function renderFallback(mode: WeatherMode = 'sunny'): void {
    const warm = mode === 'snowy' ? '#cfdde3' : mode === 'foggy' ? '#9fb0a6' : '#6f9a54';
    const cool = mode === 'snowy' ? '#a9bcc6' : '#4f7d42';
    const bark = '#7a5a3c';
    const tree = (x: number, y: number, s: number, c: string) => `
      <g transform="translate(${x} ${y}) scale(${s})">
        <rect x="-2" y="0" width="4" height="20" rx="1.5" fill="${bark}"/>
        <circle cx="0" cy="-6" r="13" fill="${c}" opacity="0.9"/>
        <circle cx="-8" cy="2" r="8" fill="${c}" opacity="0.75"/>
        <circle cx="8" cy="2" r="8" fill="${c}" opacity="0.75"/>
      </g>`;
    host.innerHTML = `<svg class="tree-fallback" viewBox="0 0 200 120" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
      ${tree(28, 70, 0.7, cool)}
      ${tree(168, 66, 0.8, cool)}
      ${tree(60, 86, 1.0, warm)}
      ${tree(140, 88, 0.95, warm)}
      ${tree(100, 92, 1.15, warm)}
      ${tree(14, 96, 0.55, warm)}
      ${tree(186, 94, 0.6, warm)}
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

  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 140);
  camera.position.set(0, 2.2, 14);
  camera.lookAt(0, 1.4, 0);

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

  // ── Ground ─────────────────────────────────────────────────────────
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(50, 48),
    new THREE.MeshStandardMaterial({ color: 0x6f8f55, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.02;
  scene.add(ground);

  // ── Wind (shared uniforms, injected per material) ──────────────────
  const BASE_WIND = reduceMotion ? 0 : 0.02;
  const WIND = { uTime: { value: 0 }, uStr: { value: BASE_WIND } };
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
  // Depth bands, edge-biased, with a cleared central reading corridor.
  // Counts scale with device tier (high 18–28, medium 12–18, low 6–10).
  type Band = 'foreground' | 'midground' | 'background';
  const PRESETS: Record<Band, Array<keyof typeof TreePreset>> = {
    foreground: ['Bush 1', 'Bush 2', 'Bush 3', 'Aspen Small'],
    midground: ['Oak Small', 'Aspen Small', 'Pine Small', 'Ash Small', 'Oak Medium', 'Aspen Medium'],
    background: ['Pine Medium', 'Pine Small', 'Aspen Small', 'Ash Small'],
  };
  const COUNTS: Record<typeof quality, Record<Band, number>> = {
    high: { foreground: 6, midground: 12, background: 8 },
    medium: { foreground: 4, midground: 8, background: 5 },
    low: { foreground: 2, midground: 5, background: 3 },
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

  // Place a tree avoiding the central reading corridor (|x| < clearHalf near
  // the camera). Edge bias: push |x| outward. Returns world position.
  function placement(band: Band): { x: number; z: number } {
    const zRange: Record<Band, [number, number]> = {
      foreground: [0, -2.5],
      midground: [-3, -7],
      background: [-8, -14],
    };
    const [z0, z1] = zRange[band];
    const z = z0 + rng() * (z1 - z0);
    // Wider spread further back; keep a clear center near the camera.
    const spread = band === 'background' ? 16 : band === 'midground' ? 11 : 8;
    const clearHalf = band === 'foreground' ? 3.4 : band === 'midground' ? 2.2 : 0;
    let x = (rng() - 0.5) * 2 * spread;
    if (Math.abs(x) < clearHalf) x += (x >= 0 ? 1 : -1) * clearHalf;
    return { x, z };
  }

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
        } else {
          if (m.color) m.color.copy(barkColor);
          if ('roughness' in m) m.roughness = 0.8 + rng() * 0.2;
          applyWind(m); // trunk/branch sway only
        }
      });
    });
  }

  const trees: any[] = [];
  function buildBand(band: Band, count: number) {
    for (let i = 0; i < count; i++) {
      const tree = new Tree();
      tree.loadFromJson(TreePreset[pick(PRESETS[band])]);
      tree.options.seed = Math.floor(rng() * 100000);
      tree.options.bark.textured = false;
      tree.options.bark.flatShading = true;
      // Push foliage forward: bigger, denser leaf billboards so the canopy
      // reads as a leafy summer tree rather than a bare branch skeleton.
      if (tree.options.leaves) {
        tree.options.leaves.size = (tree.options.leaves.size ?? 2.5) * 1.6;
        tree.options.leaves.count = Math.round((tree.options.leaves.count ?? 12) * 1.5);
        tree.options.leaves.alphaTest = 0.3; // keep soft leaf edges, less harsh cutout
      }
      tree.generate();

      // Small scales; smaller still in the background. Vary per-tree.
      const baseScale =
        band === 'foreground' ? 0.22 : band === 'midground' ? 0.3 : 0.34;
      const s = baseScale * (0.75 + rng() * 0.6);
      tree.scale.setScalar(s);

      const { x, z } = placement(band);
      tree.position.set(x, 0, z);
      tree.rotation.y = rng() * Math.PI * 2;

      tintTree(tree, band);
      scene.add(tree);
      trees.push(tree);
    }
  }

  const counts = COUNTS[quality];
  buildBand('background', counts.background);
  buildBand('midground', counts.midground);
  buildBand('foreground', counts.foreground);


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
    // Subtle camera drift for life; disabled under reduced-motion.
    camera.position.x = Math.sin(t * 0.1) * 0.6;
    camera.lookAt(0, 1.4, 0);
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

  // ── Boot ───────────────────────────────────────────────────────────
  resize();
  if (reduceMotion) {
    // Full static render: trees, lighting, sky — one frame, no motion.
    renderOnce();
  } else {
    start();
  }
}
