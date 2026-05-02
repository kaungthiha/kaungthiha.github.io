/* ──────────────────────────────────────────────────────────────────────
   Minimalist seasonal tree — Three.js
   - Sits in the identity column, listens to the weather:change event
   - Three modes: sunny | rainy | snowy
   - Smooth color/opacity tween between modes
   - Subtle canopy sway, falling snow particles in snowy
   - SVG fallback if WebGL or THREE unavailable
   - Respects prefers-reduced-motion (no sway, no particles)
   - Pauses RAF when tab hidden
   ────────────────────────────────────────────────────────────────────── */

(function () {
  'use strict';

  const host = document.getElementById('tree-canvas-host');
  if (!host) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── WebGL availability check ───────────────────────────────────────
  function hasWebGL() {
    try {
      const c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext &&
        (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (_) { return false; }
  }

  function renderFallback(mode) {
    // Static SVG tree — colors track the current mode
    const palette = {
      sunny: { canopy: '#5fa052', trunk: '#8b6f47' },
      rainy: { canopy: '#3e6f3a', trunk: '#6f5638' },
      snowy: { canopy: '#cfdde3', trunk: '#6f5638' },
    }[mode || 'sunny'];
    host.innerHTML = `
      <svg class="tree-fallback" viewBox="0 0 100 120" aria-hidden="true">
        <rect x="46" y="74" width="8" height="38" rx="2" fill="${palette.trunk}"/>
        <circle cx="50" cy="52" r="28" fill="${palette.canopy}" opacity="0.85"/>
        <circle cx="34" cy="62" r="14" fill="${palette.canopy}" opacity="0.7"/>
        <circle cx="66" cy="62" r="14" fill="${palette.canopy}" opacity="0.7"/>
      </svg>
    `;
  }

  if (typeof THREE === 'undefined' || !hasWebGL()) {
    renderFallback('sunny');
    // Still listen to weather changes to recolor the SVG
    window.addEventListener('weather:change', e => renderFallback(e.detail.mode));
    window.TreeScene = { setMode: renderFallback };
    return;
  }

  // ── Scene ──────────────────────────────────────────────────────────
  const scene    = new THREE.Scene();
  const camera   = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
  camera.position.set(0, 1.5, 5.6);
  camera.lookAt(0, 1.4, 0);

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  host.appendChild(renderer.domElement);

  // Lights
  const ambient    = new THREE.AmbientLight(0xffffff, 0.7);
  const directional = new THREE.DirectionalLight(0xfff7e6, 0.6);
  directional.position.set(2.5, 4, 3);
  scene.add(ambient, directional);

  // ── Tree ──────────────────────────────────────────────────────────
  const tree = new THREE.Group();
  scene.add(tree);

  // Trunk
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8b6f47, roughness: 0.9 });
  const trunkGeom = new THREE.CylinderGeometry(0.12, 0.18, 1.4, 10);
  const trunk = new THREE.Mesh(trunkGeom, trunkMat);
  trunk.position.y = 0.7;
  tree.add(trunk);

  // Canopy group — this is what sways
  const canopy = new THREE.Group();
  canopy.position.y = 1.5;
  tree.add(canopy);

  // Branches — 4 angled cylinders
  const branchMat  = new THREE.MeshStandardMaterial({ color: 0x6f5638, roughness: 0.9 });
  const branchGeom = new THREE.CylinderGeometry(0.04, 0.08, 0.95, 6);
  const branchTransforms = [
    { rx:  0.0, rz:  0.65 },
    { rx:  0.0, rz: -0.65 },
    { rx:  0.65, rz: 0.0 },
    { rx: -0.65, rz: 0.0 },
  ];
  branchTransforms.forEach(b => {
    const branch = new THREE.Mesh(branchGeom, branchMat);
    branch.rotation.set(b.rx, 0, b.rz);
    // Re-anchor so the branch base sits at canopy origin
    const offset = 0.45;
    branch.position.set(
      Math.sin(b.rz) * offset,
      Math.cos(b.rz) * Math.cos(b.rx) * offset,
      Math.sin(-b.rx) * offset
    );
    canopy.add(branch);
  });

  // Leaves — instanced spheres distributed in an oblate cloud
  const LEAF_COUNT = 56;
  const leafGeom   = new THREE.SphereGeometry(0.18, 8, 6);
  const leafMat    = new THREE.MeshStandardMaterial({
    color: 0x5fa052, roughness: 0.7, transparent: true, opacity: 1, depthWrite: true
  });
  const leaves = new THREE.InstancedMesh(leafGeom, leafMat, LEAF_COUNT);
  leaves.instanceMatrix.setUsage(THREE.StaticDrawUsage);

  const dummy = new THREE.Object3D();
  for (let i = 0; i < LEAF_COUNT; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.acos(2 * Math.random() - 1);
    const r     = 0.65 + Math.random() * 0.4;
    dummy.position.set(
      r * Math.sin(phi) * Math.cos(theta),
      0.55 + r * Math.cos(phi) * 0.7,    // flatten vertically
      r * Math.sin(phi) * Math.sin(theta)
    );
    const s = 0.7 + Math.random() * 0.6;
    dummy.scale.setScalar(s);
    dummy.rotation.set(Math.random() * 0.4, Math.random() * Math.PI, Math.random() * 0.4);
    dummy.updateMatrix();
    leaves.setMatrixAt(i, dummy.matrix);
  }
  canopy.add(leaves);

  // Snow caps — small white spheres scattered in upper canopy. Opacity tracks mode.
  const CAP_COUNT = 10;
  const capGeom = new THREE.SphereGeometry(0.13, 8, 6);
  const capMat  = new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: 0.55, transparent: true, opacity: 0
  });
  const caps = new THREE.InstancedMesh(capGeom, capMat, CAP_COUNT);
  for (let i = 0; i < CAP_COUNT; i++) {
    const theta = Math.random() * Math.PI * 2;
    const r     = 0.5 + Math.random() * 0.5;
    dummy.position.set(
      r * Math.cos(theta),
      0.85 + Math.random() * 0.35,
      r * Math.sin(theta)
    );
    const sx = 1 + Math.random() * 0.3;
    dummy.scale.set(sx, 0.55, sx);     // flatten — snow cap shape
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    caps.setMatrixAt(i, dummy.matrix);
  }
  canopy.add(caps);

  // Snow particles (falling) — only animate in snow mode
  const SNOW_COUNT = reduceMotion ? 0 : 22;
  const snowGeom = new THREE.SphereGeometry(0.045, 4, 4);
  const snowMat  = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
  const snow = new THREE.InstancedMesh(snowGeom, snowMat, Math.max(SNOW_COUNT, 1));
  const snowPositions = [];
  for (let i = 0; i < SNOW_COUNT; i++) {
    const x = (Math.random() - 0.5) * 4.2;
    const y = Math.random() * 3.5;
    const z = (Math.random() - 0.5) * 1.6;
    snowPositions.push({ x, y, z, speed: 0.4 + Math.random() * 0.5, drift: (Math.random() - 0.5) * 0.3 });
    dummy.position.set(x, y, z);
    dummy.scale.setScalar(0.8 + Math.random() * 0.6);
    dummy.updateMatrix();
    snow.setMatrixAt(i, dummy.matrix);
  }
  scene.add(snow);

  // ── Mode presets ───────────────────────────────────────────────────
  const MODES = {
    sunny: {
      leafColor:           new THREE.Color(0x5fa052),
      leafOpacity:         1.0,
      capOpacity:          0.0,
      snowParticleOpacity: 0.0,
      ambientIntensity:    0.7,
      directionalIntensity:0.6,
      directionalColor:    new THREE.Color(0xfff7e6),
      swayAmplitude:       0.025,
      swaySpeed:           0.6,
    },
    rainy: {
      leafColor:           new THREE.Color(0x3a6e3a),
      leafOpacity:         0.95,
      capOpacity:          0.0,
      snowParticleOpacity: 0.0,
      ambientIntensity:    0.5,
      directionalIntensity:0.35,
      directionalColor:    new THREE.Color(0xb8c8d8),
      swayAmplitude:       0.05,
      swaySpeed:           1.15,
    },
    snowy: {
      leafColor:           new THREE.Color(0x9ba9b0),
      leafOpacity:         0.18,
      capOpacity:          1.0,
      snowParticleOpacity: 0.95,
      ambientIntensity:    0.85,
      directionalIntensity:0.5,
      directionalColor:    new THREE.Color(0xeaf4ff),
      swayAmplitude:       0.012,
      swaySpeed:           0.4,
    },
  };

  // Initialize materials to sunny baseline
  function applyImmediate(mode) {
    const m = MODES[mode];
    leafMat.color.copy(m.leafColor);
    leafMat.opacity = m.leafOpacity;
    capMat.opacity  = m.capOpacity;
    snowMat.opacity = m.snowParticleOpacity;
    ambient.intensity = m.ambientIntensity;
    directional.intensity = m.directionalIntensity;
    directional.color.copy(m.directionalColor);
  }
  applyImmediate('sunny');

  // ── Tween state ────────────────────────────────────────────────────
  let from = MODES.sunny;
  let to   = MODES.sunny;
  let progress = 1;
  const TWEEN_FRAMES = 30;     // ~500ms at 60fps

  function setMode(mode) {
    if (!MODES[mode] || to === MODES[mode]) return;
    // Capture current live values as the new start point
    from = {
      leafColor:           leafMat.color.clone(),
      leafOpacity:         leafMat.opacity,
      capOpacity:          capMat.opacity,
      snowParticleOpacity: snowMat.opacity,
      ambientIntensity:    ambient.intensity,
      directionalIntensity:directional.intensity,
      directionalColor:    directional.color.clone(),
      swayAmplitude:       to.swayAmplitude,
      swaySpeed:           to.swaySpeed,
    };
    to = MODES[mode];
    progress = 0;
  }

  // ── Resize ─────────────────────────────────────────────────────────
  function resize() {
    const rect = host.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    renderer.setSize(rect.width, rect.height, false);
    camera.aspect = rect.width / rect.height;
    camera.updateProjectionMatrix();
  }
  resize();
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(resize).observe(host);
  } else {
    window.addEventListener('resize', resize);
  }

  // ── Animation loop ─────────────────────────────────────────────────
  let raf = null;
  let visible = !document.hidden;
  const startTime = performance.now();

  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function tick() {
    if (!visible) { raf = null; return; }
    const t = (performance.now() - startTime) / 1000;

    // Tween
    if (progress < 1) {
      progress = Math.min(1, progress + 1 / TWEEN_FRAMES);
      const e = easeInOut(progress);
      leafMat.color.copy(from.leafColor).lerp(to.leafColor, e);
      leafMat.opacity = from.leafOpacity + (to.leafOpacity - from.leafOpacity) * e;
      capMat.opacity  = from.capOpacity  + (to.capOpacity  - from.capOpacity)  * e;
      snowMat.opacity = from.snowParticleOpacity + (to.snowParticleOpacity - from.snowParticleOpacity) * e;
      ambient.intensity = from.ambientIntensity + (to.ambientIntensity - from.ambientIntensity) * e;
      directional.intensity = from.directionalIntensity + (to.directionalIntensity - from.directionalIntensity) * e;
      directional.color.copy(from.directionalColor).lerp(to.directionalColor, e);
    }

    // Sway
    if (!reduceMotion) {
      const sway = Math.sin(t * to.swaySpeed) * to.swayAmplitude;
      canopy.rotation.z = sway;
      canopy.rotation.x = sway * 0.45;
    }

    // Falling snow when visible
    if (snowMat.opacity > 0.02 && !reduceMotion && SNOW_COUNT > 0) {
      for (let i = 0; i < SNOW_COUNT; i++) {
        const p = snowPositions[i];
        p.y -= p.speed * 0.012;
        p.x += Math.sin(t * 0.7 + i) * 0.0008 + p.drift * 0.0008;
        if (p.y < -0.4) { p.y = 3.5; p.x = (Math.random() - 0.5) * 4.2; }
        dummy.position.set(p.x, p.y, p.z);
        dummy.scale.setScalar(0.8 + (i % 3) * 0.15);
        dummy.updateMatrix();
        snow.setMatrixAt(i, dummy.matrix);
      }
      snow.instanceMatrix.needsUpdate = true;
    }

    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  }

  function start() {
    if (raf) return;
    raf = requestAnimationFrame(tick);
  }
  function stop() {
    if (raf) { cancelAnimationFrame(raf); raf = null; }
  }

  document.addEventListener('visibilitychange', () => {
    visible = !document.hidden;
    if (visible) start(); else stop();
  });

  // Boot
  start();

  // ── Event wiring ───────────────────────────────────────────────────
  // Initial mode: try localStorage; otherwise sunny
  let saved = 'sunny';
  try { saved = localStorage.getItem('kt_weather_v2') || 'sunny'; } catch (_) { /* ignore */ }
  if (!MODES[saved]) saved = 'sunny';
  applyImmediate(saved);
  to = MODES[saved];

  window.addEventListener('weather:change', e => setMode(e.detail.mode));
  window.TreeScene = { setMode };
}());
