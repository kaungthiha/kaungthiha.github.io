/* ──────────────────────────────────────────────────────────────────────
   Ambient procedural forest — EZ-Tree + Three.js (bundled ES module).

   Higher-fidelity successor to the old hand-rolled tree.js. Trees come from
   @dgreenheck/ez-tree presets (textured bark + leaf billboards). Keeps the
   proven scene scaffolding: sky gradient, hemisphere/sun lighting, fog,
   wind sway, weather integration, dpr cap, tab-visibility pause, and a
   graceful WebGL / SVG fallback.

   prefers-reduced-motion: the forest still renders in full (rich hero) but
   ALL motion is frozen — no wind, no camera drift, a single static frame.
   ────────────────────────────────────────────────────────────────────── */

import * as THREE from 'three';
// `ez-tree-src` is a Vite alias (see astro.config.mjs) pointing at EZ-Tree's
// SOURCE entry instead of the pre-bundled build/ez-tree.es.js, which
// base64-inlines every bark/leaf texture into a 3.9 MB blob. From source,
// Vite externalizes the textures as real files (assetsInlineLimit: 0), and
// disabling bark.textured means the heavy bark PBR maps are never fetched.
import { Tree, TreePreset } from 'ez-tree-src';

type WeatherMode = 'sunny' | 'rainy' | 'snowy';

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

  function renderFallback(mode: WeatherMode = 'sunny'): void {
    const p = {
      sunny: { c: '#5fa052', t: '#8b6f47' },
      rainy: { c: '#3e6f3a', t: '#6f5638' },
      snowy: { c: '#cfdde3', t: '#6f5638' },
    }[mode];
    host.innerHTML = `<svg class="tree-fallback" viewBox="0 0 100 120" aria-hidden="true">
      <rect x="46" y="74" width="8" height="38" rx="2" fill="${p.t}"/>
      <circle cx="50" cy="52" r="28" fill="${p.c}" opacity="0.85"/>
      <circle cx="34" cy="62" r="14" fill="${p.c}" opacity="0.7"/>
      <circle cx="66" cy="62" r="14" fill="${p.c}" opacity="0.7"/>
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
  scene.fog = new THREE.FogExp2(0xc8ddef, 0.034);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
  camera.position.set(0, 1.9, 13);
  camera.lookAt(0, 1.6, 0);

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

  // Recover gracefully if the GPU drops the context.
  renderer.domElement.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    stop();
  });
  renderer.domElement.addEventListener('webglcontextrestored', () => start());

  // ── Lighting ───────────────────────────────────────────────────────
  const hemi = new THREE.HemisphereLight(0xc5e8ff, 0x8aab60, 1.05);
  const sun = new THREE.DirectionalLight(0xfff5e0, 1.4);
  sun.position.set(5, 9, 4);
  scene.add(hemi, sun);

  // ── Sky gradient plane (carried from the original scene) ───────────
  const SKY_UNI = {
    uTop: { value: new THREE.Color(0x9ec9e8) },
    uBot: { value: new THREE.Color(0xdaeef6) },
    uOpacity: { value: 0.22 },
  };
  const sky = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 55, 1, 6),
    new THREE.ShaderMaterial({
      uniforms: SKY_UNI,
      vertexShader: `varying float vNY;
        void main(){ vNY=(position.y+27.5)/55.0; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 uTop; uniform vec3 uBot; uniform float uOpacity; varying float vNY;
        void main(){ float t=clamp(vNY,0.0,1.0); gl_FragColor=vec4(mix(uBot,uTop,t),uOpacity*t); }`,
      transparent: true,
      depthWrite: false,
    }),
  );
  sky.position.set(0, 4, -16);
  scene.add(sky);

  // ── Ground ─────────────────────────────────────────────────────────
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(40, 48),
    new THREE.MeshStandardMaterial({ color: 0x6f8f55, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.02;
  scene.add(ground);

  // ── Trees (EZ-Tree presets) ────────────────────────────────────────
  // Fewer, simpler trees on weaker devices keeps the polygon budget sane.
  const layout: Array<{ preset: keyof typeof TreePreset; x: number; z: number; s: number; seed: number }> =
    quality === 'low'
      ? [
          { preset: 'Oak Medium', x: -3.2, z: -2, s: 0.5, seed: 41 },
          { preset: 'Aspen Medium', x: 3.4, z: -3, s: 0.46, seed: 7 },
          { preset: 'Pine Medium', x: 0.2, z: -6, s: 0.5, seed: 88 },
        ]
      : [
          { preset: 'Oak Large', x: -4.5, z: -3, s: 0.5, seed: 41 },
          { preset: 'Aspen Medium', x: 4.2, z: -2.5, s: 0.48, seed: 7 },
          { preset: 'Pine Large', x: 1.8, z: -7, s: 0.52, seed: 88 },
          { preset: 'Ash Medium', x: -2.2, z: -6.5, s: 0.46, seed: 23 },
          { preset: 'Bush 2', x: 2.6, z: 0.5, s: 0.55, seed: 5 },
          { preset: 'Bush 1', x: -3.6, z: 1.2, s: 0.6, seed: 99 },
        ];

  const windMats: THREE.Material[] = [];

  // Wind: gentle vertex sway injected into each tree material. Skipped
  // entirely under reduced-motion (uStr stays 0, tick never runs).
  const WIND = { uTime: { value: 0 }, uStr: { value: reduceMotion ? 0 : 0.02 } };
  function applyWind(mat: THREE.Material) {
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = WIND.uTime;
      shader.uniforms.uStr = WIND.uStr;
      shader.vertexShader =
        'uniform float uTime;\nuniform float uStr;\n' +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           float wh = clamp(position.y / 6.0, 0.0, 1.0);
           transformed.x += sin(uTime*1.3 + position.y*0.6) * uStr * wh;
           transformed.z += cos(uTime*0.9 + position.x*0.5) * uStr * 0.5 * wh;`,
        );
    };
    windMats.push(mat);
  }

  for (const item of layout) {
    const tree = new Tree();
    const preset = TreePreset[item.preset];
    tree.loadFromJson(preset);
    tree.options.seed = item.seed;
    // Flat-shaded, tinted bark instead of 1K PBR textures: keeps the stylized
    // toon look that matches the site and avoids fetching ~2.5 MB of bark maps.
    // (Leaf billboards stay textured — only 4 small PNGs.)
    tree.options.bark.textured = false;
    tree.options.bark.flatShading = true;
    tree.generate();
    tree.scale.setScalar(item.s);
    tree.position.set(item.x, 0, item.z);
    tree.rotation.y = item.seed % 6;
    tree.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh && mesh.material) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach(applyWind);
      }
    });
    scene.add(tree);
  }

  // ── Weather tinting (lighting + sky shift; carried in spirit) ──────
  function applyImmediate(mode: WeatherMode): void {
    if (mode === 'snowy') {
      hemi.color.set(0xdfeefc);
      ground.material.color.set(0xb9c6c4);
      SKY_UNI.uTop.value.set(0xc4d6e6);
    } else if (mode === 'rainy') {
      hemi.color.set(0x9fb6c8);
      ground.material.color.set(0x5a7048);
      SKY_UNI.uTop.value.set(0x7d92a4);
    } else {
      hemi.color.set(0xc5e8ff);
      ground.material.color.set(0x6f8f55);
      SKY_UNI.uTop.value.set(0x9ec9e8);
    }
  }
  function setMode(mode: WeatherMode): void {
    applyImmediate(mode);
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
    camera.position.x = Math.sin(t * 0.12) * 0.5;
    camera.lookAt(0, 1.6, 0);
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
    setMode((e as CustomEvent).detail.mode as WeatherMode),
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
