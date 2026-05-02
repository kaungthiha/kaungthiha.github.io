/* ──────────────────────────────────────────────────────────────────────
   Ambient seasonal forest — Three.js
   - Fixed full-viewport background behind the central content
   - Three modes: sunny | rainy | snowy (driven by `weather:change` event)
   - Multiple stylized trees + soft sun glow + birds + a squirrel
   - SVG fallback if WebGL or THREE unavailable
   - Respects prefers-reduced-motion: minimal sway, no birds/snow/squirrel
   - Pauses RAF when tab hidden; reduced density on mobile
   ────────────────────────────────────────────────────────────────────── */

(function () {
  'use strict';

  const host = document.getElementById('tree-canvas-host');
  if (!host) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile     = window.matchMedia('(max-width: 720px)').matches;

  // ── WebGL availability check ───────────────────────────────────────
  function hasWebGL() {
    try {
      const c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext &&
        (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (_) { return false; }
  }

  function renderFallback(mode) {
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
    window.addEventListener('weather:change', e => renderFallback(e.detail.mode));
    window.TreeScene = { setMode: renderFallback, updateForestState: renderFallback };
    return;
  }

  // ── Scene + camera + renderer ─────────────────────────────────────
  const scene  = new THREE.Scene();
  // Wider FOV, pulled back, slight downward tilt — landscape framing
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 80);
  camera.position.set(0, 1.8, 12);
  camera.lookAt(0, 0.7, 0);

  const renderer = new THREE.WebGLRenderer({
    alpha: true, antialias: true, powerPreference: 'low-power'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  host.appendChild(renderer.domElement);

  // Lights
  const ambient     = new THREE.AmbientLight(0xffffff, 0.7);
  const directional = new THREE.DirectionalLight(0xfff7e6, 0.6);
  directional.position.set(2.5, 4, 3);
  scene.add(ambient, directional);

  // ── Shared materials & geometries (so mode tweens cover all trees) ─
  const trunkMat  = new THREE.MeshStandardMaterial({ color: 0x8b6f47, roughness: 0.9 });
  const branchMat = new THREE.MeshStandardMaterial({ color: 0x6f5638, roughness: 0.9 });
  const leafMat   = new THREE.MeshStandardMaterial({
    color: 0x5fa052, roughness: 0.7, transparent: true, opacity: 1
  });
  const capMat    = new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: 0.55, transparent: true, opacity: 0
  });

  const trunkGeom  = new THREE.CylinderGeometry(0.12, 0.18, 1.4, 10);
  const branchGeom = new THREE.CylinderGeometry(0.04, 0.08, 0.95, 6);
  const leafGeom   = new THREE.SphereGeometry(0.18, 8, 6);
  const capGeom    = new THREE.SphereGeometry(0.13, 8, 6);

  const dummy = new THREE.Object3D();

  // Build a single tree returning { group, canopy } so each canopy can sway independently
  // Helper to create more natural branches
  function createNaturalBranches(trunk, type) {
    const counts = { tall:3, medium:4, short:5, sparse:2 };
    const count = counts[type] || 4;
    for (let i = 0; i < count; i++) {
      const branch = new THREE.Mesh(branchGeom, branchMat);
      // Angle outward/upward, tapering with length
      const angleY = (i - (count-1)/2) * 0.3; // spread horizontally
      const angleX = 0.2 + Math.random()*0.2; // upward tilt
      branch.rotation.set(angleX, angleY, 0);
      const length = 0.6 + Math.random()*0.3;
      branch.scale.set(1, length, 1);
      branch.position.y = 0.7; // start at trunk top
      trunk.add(branch);
    }
  }

  function buildTree(spec) {
    const group  = new THREE.Group();
    const trunk  = new THREE.Mesh(trunkGeom, trunkMat);
    trunk.position.y = 0.7;
    group.add(trunk);

    // Add branches based on archetype
    createNaturalBranches(trunk, spec.type);

    const canopy = new THREE.Group();
    canopy.position.y = 1.5;
    group.add(canopy);

    const LEAF_COUNT = isMobile ? 28 : 36;
    const leaves = new THREE.InstancedMesh(leafGeom, leafMat, LEAF_COUNT);
    leaves.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    for (let i = 0; i < LEAF_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const r     = 0.65 + Math.random() * 0.4;
      dummy.position.set(
        r * Math.sin(phi) * Math.cos(theta),
        0.55 + r * Math.cos(phi) * 0.7,
        r * Math.sin(phi) * Math.sin(theta)
      );
      const s = 0.7 + Math.random() * 0.6;
      dummy.scale.setScalar(s);
      dummy.rotation.set(Math.random() * 0.4, Math.random() * Math.PI, Math.random() * 0.4);
      dummy.updateMatrix();
      leaves.setMatrixAt(i, dummy.matrix);
    }
    canopy.add(leaves);

    const CAP_COUNT = 8;
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
      dummy.scale.set(sx, 0.55, sx);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      caps.setMatrixAt(i, dummy.matrix);
    }
    canopy.add(caps);

    return { group, canopy };
  }

  // ── Forest layout — small grove of trees with depth + scale variance
  // Generate a richer forest layout with varied archetypes
  const TREE_TYPES = ['tall','medium','short','sparse'];
  function randomArchetype() {
    // Prefer medium and short for visual balance
    const weights = { tall:0.2, medium:0.4, short:0.3, sparse:0.1 };
    const r = Math.random();
    let acc = 0;
    for (const t of TREE_TYPES) {
      acc += weights[t];
      if (r <= acc) return t;
    }
    return 'medium';
  }

  const TREE_LAYOUT = [];
  const count = isMobile ? 6 : 12;
  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * 16; // spread horizontally
    const z = (Math.random() - 0.5) * 2;  // slight depth variation
    const s = 0.6 + Math.random() * 0.6; // scale range
    const type = randomArchetype();
    TREE_LAYOUT.push({ x, z, s, type });
    canopies.push({ canopy, phase: Math.random() * Math.PI * 2 });
  });

  // ── Sun glow (sprite with radial-gradient texture) ────────────────
  function makeGlowTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0,   'rgba(255, 240, 200, 0.95)');
    g.addColorStop(0.4, 'rgba(255, 220, 150, 0.4)');
    g.addColorStop(1,   'rgba(255, 200, 100, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }
  const sunMat = new THREE.SpriteMaterial({
    map: makeGlowTexture(),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
  });
  const sun = new THREE.Sprite(sunMat);
  sun.scale.set(4.5, 4.5, 1);
  sun.position.set(6.5, 4.6, -2);
  scene.add(sun);

  // ── Birds (small Line silhouettes drifting across) ─────────────────
  const BIRD_COUNT = reduceMotion ? 0 : (isMobile ? 1 : 3);
  const birdMat    = new THREE.LineBasicMaterial({
    color: 0x4a5260, transparent: true, opacity: 0
  });
  const birds = [];
  function makeBirdGeom() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([
      -0.20,  0.00, 0,
      -0.10,  0.07, 0,
       0.00,  0.00, 0,
       0.10,  0.07, 0,
       0.20,  0.00, 0,
    ], 3));
    return g;
  }
  for (let i = 0; i < BIRD_COUNT; i++) {
    const bird = new THREE.Line(makeBirdGeom(), birdMat);
    bird.userData = {
      y0: 4 + Math.random() * 1.6,
      z0: -1 + Math.random() * 2,
      speed: 0.6 + Math.random() * 0.4,        // x-units per second
      offset: Math.random() * 16,              // initial phase (x along path)
      bobAmp: 0.1 + Math.random() * 0.15,
    };
    scene.add(bird);
    birds.push(bird);
  }

  // ── Squirrel (1 small ground-level shape near a tree base) ─────────
  // Squirrels removed per design update

  // ── Snow particles — wider scene volume now ───────────────────────
  const SNOW_COUNT = reduceMotion ? 0 : (isMobile ? 18 : 38);
  const SQUIRREL_COUNT = 0; // squirrels removed
  const snowGeom   = new THREE.SphereGeometry(0.045, 4, 4);
  const snowMat    = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0
  });
  const snow = new THREE.InstancedMesh(snowGeom, snowMat, Math.max(SNOW_COUNT, 1));
  const snowPositions = [];
  for (let i = 0; i < SNOW_COUNT; i++) {
    const x = (Math.random() - 0.5) * 18;
    const y = Math.random() * 8;
    const z = (Math.random() - 0.5) * 4;
    snowPositions.push({
      x, y, z,
      speed: 0.4 + Math.random() * 0.5,
      drift: (Math.random() - 0.5) * 0.3,
    });
    dummy.position.set(x, y, z);
    dummy.scale.setScalar(0.8 + Math.random() * 0.6);
    dummy.updateMatrix();
    snow.setMatrixAt(i, dummy.matrix);
  }
  scene.add(snow);

  // ── Mode presets (now also drive sun + bird opacity) ──────────────
  const MODES = {
    sunny: {
      leafColor:           new THREE.Color(0x5fa052),
      leafOpacity:         0.9,
      capOpacity:          0.0,
      snowParticleOpacity: 0.0,
      sunOpacity:          0.85,
      birdOpacity:         0.7,
      pondOpacity:         0.2,
      shrubOpacity:        0.6,
      ambientIntensity:    0.7,
      directionalIntensity:0.6,
      directionalColor:    new THREE.Color(0xfff7e6),
      swayAmplitude:       0.025,
      swaySpeed:           0.6,
    },
    rainy: {
      leafColor:           new THREE.Color(0x3a6e3a),
      leafOpacity:         0.85,
      capOpacity:          0.0,
      snowParticleOpacity: 0.0,
      sunOpacity:          0.0,
      birdOpacity:         0.25,
      pondOpacity:         0.1,
      shrubOpacity:        0.4,
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
      sunOpacity:          0.0,
      birdOpacity:         0.15,
      pondOpacity:         0.05,
      shrubOpacity:        0.2,
      ambientIntensity:    0.85,
      directionalIntensity:0.5,
      directionalColor:    new THREE.Color(0xeaf4ff),
      swayAmplitude:       0.012,
      swaySpeed:           0.4,
    },
  };

  function applyImmediate(mode) {
    const m = MODES[mode];
    leafMat.color.copy(m.leafColor);
    leafMat.opacity      = m.leafOpacity;
    capMat.opacity       = m.capOpacity;
    snowMat.opacity      = m.snowParticleOpacity;
    sunMat.opacity       = m.sunOpacity;
    birdMat.opacity      = m.birdOpacity;
    ambient.intensity    = m.ambientIntensity;
    directional.intensity = m.directionalIntensity;
    directional.color.copy(m.directionalColor);
  }

  // ── Tween state ────────────────────────────────────────────────────
  let from = MODES.sunny;
  let to   = MODES.sunny;
  let progress = 1;
  const TWEEN_FRAMES = 30;

  function setMode(mode) {
    if (!MODES[mode] || to === MODES[mode]) return;
    from = {
      leafColor:           leafMat.color.clone(),
      leafOpacity:         leafMat.opacity,
      capOpacity:          capMat.opacity,
      snowParticleOpacity: snowMat.opacity,
      sunOpacity:          sunMat.opacity,
      birdOpacity:         birdMat.opacity,
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
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (w < 1 || h < 1) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

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

    // Mode tween
    if (progress < 1) {
      progress = Math.min(1, progress + 1 / TWEEN_FRAMES);
      const e = easeInOut(progress);
      leafMat.color.copy(from.leafColor).lerp(to.leafColor, e);
      leafMat.opacity = from.leafOpacity + (to.leafOpacity - from.leafOpacity) * e;
      capMat.opacity  = from.capOpacity  + (to.capOpacity  - from.capOpacity)  * e;
      snowMat.opacity = from.snowParticleOpacity + (to.snowParticleOpacity - from.snowParticleOpacity) * e;
      sunMat.opacity  = from.sunOpacity  + (to.sunOpacity  - from.sunOpacity)  * e;
      birdMat.opacity = from.birdOpacity + (to.birdOpacity - from.birdOpacity) * e;
      ambient.intensity = from.ambientIntensity + (to.ambientIntensity - from.ambientIntensity) * e;
      directional.intensity = from.directionalIntensity + (to.directionalIntensity - from.directionalIntensity) * e;
      directional.color.copy(from.directionalColor).lerp(to.directionalColor, e);
    }

    // Tree sway — independent phase per tree
    if (!reduceMotion) {
      for (let i = 0; i < canopies.length; i++) {
        const c = canopies[i];
        const sway = Math.sin(t * to.swaySpeed + c.phase) * to.swayAmplitude;
        c.canopy.rotation.z = sway;
        c.canopy.rotation.x = sway * 0.45;
      }
    }

    // Birds drift across the upper area; wrap from right to left
    if (BIRD_COUNT > 0 && birdMat.opacity > 0.04) {
      for (let i = 0; i < BIRD_COUNT; i++) {
        const b = birds[i];
        const u = b.userData;
        const x = ((t * u.speed + u.offset) % 16) - 8;     // [-8, 8]
        b.position.x = x;
        b.position.y = u.y0 + Math.sin(t * 1.5 + u.offset) * u.bobAmp;
        b.position.z = u.z0;
      }
    }

    // Squirrel — gentle hop
    if (SQUIRREL_COUNT > 0) {
      for (let i = 0; i < squirrels.length; i++) {
        const s = squirrels[i];
        s.position.y = s.userData.baseY + Math.abs(Math.sin(t * 1.8 + s.userData.phase)) * 0.04;
      }
    }

    // Falling snow when visible
    if (snowMat.opacity > 0.02 && !reduceMotion && SNOW_COUNT > 0) {
      for (let i = 0; i < SNOW_COUNT; i++) {
        const p = snowPositions[i];
        p.y -= p.speed * 0.018;
        p.x += Math.sin(t * 0.7 + i) * 0.001 + p.drift * 0.001;
        if (p.y < -1) { p.y = 7; p.x = (Math.random() - 0.5) * 18; }
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

  function start() { if (!raf) raf = requestAnimationFrame(tick); }
  function stop()  { if (raf) { cancelAnimationFrame(raf); raf = null; } }

  document.addEventListener('visibilitychange', () => {
    visible = !document.hidden;
    if (visible) start(); else stop();
  });

  // ── Boot ───────────────────────────────────────────────────────────
  let saved = 'sunny';
  try { saved = localStorage.getItem('kt_weather_v2') || 'sunny'; } catch (_) { /* ignore */ }
  if (!MODES[saved]) saved = 'sunny';
  applyImmediate(saved);
  to = MODES[saved];
  start();

  window.addEventListener('weather:change', e => setMode(e.detail.mode));

  // Public API: keep `setMode` for back-compat, expose `updateForestState` per spec
  window.TreeScene = { setMode, updateForestState: setMode };
}());
