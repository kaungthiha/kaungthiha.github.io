/* ──────────────────────────────────────────────────────────────────────
   Ambient seasonal forest — Three.js v2
   Upgrades: fog depth, HemisphereLight, sky gradient, wind vertex shader,
   MeshToonMaterial, 5 tree archetypes, intentional layout, ripple pond,
   quality tiers (high/medium/low), comprehensive weather tweens.
   ────────────────────────────────────────────────────────────────────── */

(function () {
  'use strict';

  const host = document.getElementById('tree-canvas-host');
  if (!host) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile     = window.matchMedia('(max-width: 720px)').matches;
  const isTablet     = !isMobile && window.matchMedia('(max-width: 1100px)').matches;
  const quality      = isMobile ? 'low' : (isTablet ? 'medium' : 'high');

  // ── WebGL check + SVG fallback ─────────────────────────────────────
  function hasWebGL() {
    try {
      const c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext &&
        (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (_) { return false; }
  }

  function renderFallback(mode) {
    const p = { sunny: { c: '#5fa052', t: '#8b6f47' }, rainy: { c: '#3e6f3a', t: '#6f5638' }, snowy: { c: '#cfdde3', t: '#6f5638' } }[mode || 'sunny'];
    host.innerHTML = `<svg class="tree-fallback" viewBox="0 0 100 120" aria-hidden="true">
      <rect x="46" y="74" width="8" height="38" rx="2" fill="${p.t}"/>
      <circle cx="50" cy="52" r="28" fill="${p.c}" opacity="0.85"/>
      <circle cx="34" cy="62" r="14" fill="${p.c}" opacity="0.7"/>
      <circle cx="66" cy="62" r="14" fill="${p.c}" opacity="0.7"/>
    </svg>`;
  }

  if (typeof THREE === 'undefined' || !hasWebGL()) {
    renderFallback('sunny');
    window.addEventListener('weather:change', e => renderFallback(e.detail.mode));
    window.TreeScene = { setMode: renderFallback, updateForestState: renderFallback };
    return;
  }

  // ── Scene ──────────────────────────────────────────────────────────
  const scene = new THREE.Scene();
  scene.fog   = new THREE.FogExp2(0xC8DDEF, 0.032);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
  camera.position.set(0, 1.8, 12);
  camera.lookAt(0, 1.2, 0);

  const renderer = new THREE.WebGLRenderer({
    alpha: true, antialias: quality !== 'low', powerPreference: 'low-power',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality === 'high' ? 2 : 1.5));
  renderer.setClearColor(0x000000, 0);
  host.appendChild(renderer.domElement);

  // ── Lighting ───────────────────────────────────────────────────────
  const hemi     = new THREE.HemisphereLight(0xC5E8FF, 0x8AAB60, 0.9);
  const sunLight = new THREE.DirectionalLight(0xFFF5E0, 0.72);
  sunLight.position.set(5, 8, 3);
  scene.add(hemi, sunLight);

  // ── Sky gradient plane ─────────────────────────────────────────────
  const SKY_UNI = {
    uTop:     { value: new THREE.Color(0x9EC9E8) },
    uBot:     { value: new THREE.Color(0xDAEEF6) },
    uOpacity: { value: 0.22 },
  };
  const skyMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 55, 1, 6),
    new THREE.ShaderMaterial({
      uniforms: SKY_UNI,
      vertexShader: `varying float vNY;
        void main() { vNY = (position.y + 27.5) / 55.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform vec3 uTop; uniform vec3 uBot; uniform float uOpacity; varying float vNY;
        void main() { float t = clamp(vNY, 0.0, 1.0); gl_FragColor = vec4(mix(uBot, uTop, t), uOpacity * t); }`,
      transparent: true, depthWrite: false, side: THREE.FrontSide,
    })
  );
  skyMesh.position.set(0, 4, -16);
  scene.add(skyMesh);

  // ── Wind shader uniforms (shared reference — tick updates value) ───
  const WIND_UNI = { uTime: { value: 0.0 }, uStr: { value: 0.025 } };

  function applyWind(mat) {
    mat.onBeforeCompile = shader => {
      shader.uniforms.uTime = WIND_UNI.uTime;
      shader.uniforms.uStr  = WIND_UNI.uStr;
      shader.vertexShader =
        'uniform float uTime;\nuniform float uStr;\n' +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           float h = clamp((position.y + 0.4) / 2.2, 0.0, 1.0);
           float w  = sin(uTime * 1.45 + position.x * 3.1 + position.z * 1.9) * uStr * h;
           float w2 = cos(uTime * 0.95 + position.z * 2.6) * uStr * 0.38 * h;
           transformed.x += w;
           transformed.z += w2;`
        );
    };
    return mat;
  }

  // ── Smooth toon gradient map (8 steps = painterly, not harsh 3-step) ─
  function makeToonGrad(steps) {
    const c = document.createElement('canvas');
    c.width = steps; c.height = 1;
    const ctx = c.getContext('2d');
    for (let i = 0; i < steps; i++) {
      const v = Math.round((i / (steps - 1)) * 255);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(i, 0, 1, 1);
    }
    const t = new THREE.CanvasTexture(c);
    t.minFilter = t.magFilter = THREE.NearestFilter;
    return t;
  }
  const toonGrad = makeToonGrad(quality === 'low' ? 4 : 8);

  // ── Shared materials ───────────────────────────────────────────────
  const trunkMat = new THREE.MeshToonMaterial({ color: 0x8b6f47, gradientMap: toonGrad });
  const leafMat  = applyWind(new THREE.MeshToonMaterial({
    color: 0x5fa052, gradientMap: toonGrad, transparent: true, opacity: 0.92,
  }));
  const capMat   = new THREE.MeshToonMaterial({
    color: 0xf0f5f8, gradientMap: toonGrad, transparent: true, opacity: 0.0,
  });
  const shrubMat = new THREE.MeshToonMaterial({
    color: 0x3a8a5a, gradientMap: toonGrad, transparent: true, opacity: 0.75,
  });
  const flowerMat = new THREE.MeshToonMaterial({
    color: 0xffaabb, gradientMap: toonGrad, transparent: true, opacity: 0.85,
  });
  const padMat = new THREE.MeshToonMaterial({
    color: 0x7ac888, gradientMap: toonGrad, transparent: true, opacity: 0.0, side: THREE.DoubleSide,
  });
  const fishMat = new THREE.MeshToonMaterial({
    color: 0xff8060, gradientMap: toonGrad, transparent: true, opacity: 0.0,
  });

  // ── Shared geometry ────────────────────────────────────────────────
  const SEG_L = new THREE.SphereGeometry(0.22, quality === 'high' ? 8 : 6, quality === 'high' ? 6 : 4);
  const SEG_C = new THREE.SphereGeometry(0.15, 6, 4);
  const SEG_S = new THREE.SphereGeometry(0.30, 7, 5);
  const SEG_F = new THREE.SphereGeometry(0.07, 5, 4);
  const dummy = new THREE.Object3D();

  // ── Tree archetypes ────────────────────────────────────────────────
  const ARCHETYPES = {
    tall:       { tH: 2.3, tR: [0.08, 0.14], cY: 2.0, cS: [0.7, 0.65, 0.7], lR: 0.95, lN: { high:40, medium:28, low:16 }, bn: { n:3, sp:0.32, up:0.32, len:0.72 }, cl:2 },
    round:      { tH: 1.7, tR: [0.12, 0.19], cY: 1.4, cS: [1.0, 1.00, 1.0], lR: 1.20, lN: { high:48, medium:34, low:22 }, bn: { n:5, sp:0.42, up:0.24, len:0.80 }, cl:3 },
    wide:       { tH: 1.5, tR: [0.13, 0.20], cY: 1.1, cS: [1.4, 0.72, 1.4], lR: 1.10, lN: { high:44, medium:32, low:20 }, bn: { n:6, sp:0.52, up:0.14, len:0.85 }, cl:3 },
    sparse:     { tH: 2.0, tR: [0.08, 0.13], cY: 1.7, cS: [0.8, 0.90, 0.8], lR: 0.65, lN: { high:20, medium:14, low: 8 }, bn: { n:4, sp:0.28, up:0.38, len:0.90 }, cl:2 },
    ornamental: { tH: 1.3, tR: [0.10, 0.15], cY: 1.0, cS: [0.9, 0.95, 0.9], lR: 0.90, lN: { high:44, medium:30, low:18 }, bn: { n:4, sp:0.36, up:0.20, len:0.65 }, cl:4 },
  };

  function buildTree(archetype) {
    const spec  = ARCHETYPES[archetype] || ARCHETYPES.round;
    const group = new THREE.Group();

    // Trunk
    const tk = new THREE.Mesh(
      new THREE.CylinderGeometry(spec.tR[0], spec.tR[1], spec.tH, 8),
      trunkMat
    );
    tk.position.y = spec.tH / 2;
    group.add(tk);

    // Branches — emerge from upper trunk going upward + outward
    const bn = spec.bn;
    for (let i = 0; i < bn.n; i++) {
      const len   = bn.len * (0.72 + Math.random() * 0.28);
      const bGeom = new THREE.CylinderGeometry(0.018, 0.052, len, 5);
      bGeom.translate(0, len / 2, 0); // pivot at base
      const br    = new THREE.Mesh(bGeom, trunkMat);
      const t     = 0.60 + (i / bn.n) * 0.32;
      br.position.y = spec.tH * t;
      br.rotation.x = -(bn.up + Math.random() * 0.14);
      br.rotation.y = (i / bn.n) * Math.PI * 2 + Math.random() * 0.3;
      br.rotation.z = (Math.random() - 0.5) * bn.sp;
      group.add(br);
    }

    // Canopy
    const canopy = new THREE.Group();
    canopy.position.y = spec.cY;
    canopy.scale.set(...spec.cS);
    group.add(canopy);

    const LC = spec.lN[quality] || spec.lN.medium;
    const leaves = new THREE.InstancedMesh(SEG_L, leafMat, LC);
    leaves.instanceMatrix.setUsage(THREE.StaticDrawUsage);

    // Cluster centres for natural canopy distribution
    const clCenters = [];
    for (let c = 0; c < spec.cl; c++) {
      const theta = (c / spec.cl) * Math.PI * 2;
      clCenters.push(new THREE.Vector3(
        Math.cos(theta) * spec.lR * 0.35,
        0.08 * c - 0.1,
        Math.sin(theta) * spec.lR * 0.35
      ));
    }
    for (let i = 0; i < LC; i++) {
      const cc  = clCenters[i % spec.cl];
      const phi = Math.acos(2 * Math.random() - 1);
      const th  = Math.random() * Math.PI * 2;
      const r   = spec.lR * (0.38 + Math.random() * 0.62);
      dummy.position.set(
        cc.x + r * Math.sin(phi) * Math.cos(th),
        cc.y + r * Math.cos(phi) * 0.72,
        cc.z + r * Math.sin(phi) * Math.sin(th)
      );
      const s = 0.62 + Math.random() * 0.65;
      dummy.scale.setScalar(s);
      dummy.rotation.set(Math.random() * 0.3, Math.random() * Math.PI, 0);
      dummy.updateMatrix();
      leaves.setMatrixAt(i, dummy.matrix);
    }
    canopy.add(leaves);

    // Snow caps
    if (quality !== 'low') {
      const CC = 7;
      const caps = new THREE.InstancedMesh(SEG_C, capMat, CC);
      for (let i = 0; i < CC; i++) {
        const th = Math.random() * Math.PI * 2;
        const r  = 0.35 + Math.random() * spec.lR * 0.65;
        dummy.position.set(r * Math.cos(th), 0.72 + Math.random() * 0.45, r * Math.sin(th));
        dummy.scale.set(1.25 + Math.random() * 0.35, 0.42, 1.25 + Math.random() * 0.35);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        caps.setMatrixAt(i, dummy.matrix);
      }
      canopy.add(caps);
    }

    return { group, canopy };
  }

  // ── Forest layout — edge-heavy, center kept clear ─────────────────
  const NL = quality === 'low' ? 2 : (quality === 'medium' ? 3 : 5);  // left count
  const NR = quality === 'low' ? 2 : (quality === 'medium' ? 3 : 5);  // right count
  const NB = quality === 'low' ? 1 : (quality === 'medium' ? 2 : 3);  // back row
  const NF = quality === 'low' ? 0 : (quality === 'medium' ? 1 : 2);  // foreground
  const ARR = ['tall', 'round', 'wide', 'sparse', 'ornamental'];
  const rA  = () => ARR[Math.floor(Math.random() * ARR.length)];

  const SPECS = [];
  for (let i = 0; i < NL; i++) SPECS.push({ x: -8 + i * 1.6 + Math.random() * 0.9, z: (Math.random() - 0.5) * 3.2 - 0.8, s: 0.72 + Math.random() * 0.50, type: rA() });
  for (let i = 0; i < NR; i++) SPECS.push({ x:  3.5 + i * 1.6 + Math.random() * 0.9, z: (Math.random() - 0.5) * 3.2 - 0.8, s: 0.72 + Math.random() * 0.50, type: rA() });
  for (let i = 0; i < NB; i++) SPECS.push({ x: (Math.random() - 0.5) * 14, z: -3.2 - Math.random() * 2.0, s: 0.50 + Math.random() * 0.32, type: rA() });
  for (let i = 0; i < NF; i++) SPECS.push({ x: i === 0 ? -5.5 - Math.random() * 1.8 : 5.5 + Math.random() * 1.8, z: 0.4 + Math.random() * 0.5, s: 0.88 + Math.random() * 0.38, type: rA() });

  const canopies = [];
  SPECS.forEach(sp => {
    const { group, canopy } = buildTree(sp.type);
    group.position.set(sp.x, 0, sp.z);
    group.scale.setScalar(sp.s);
    group.rotation.y = (Math.random() - 0.5) * 0.5;
    scene.add(group);
    canopies.push({ canopy, phase: Math.random() * Math.PI * 2 });
  });

  // ── Shrubs — sphere clusters between trunks ────────────────────────
  const SHRUB_POS = quality === 'low' ? [
    { x: -5.4, z: 0.3 }, { x: 4.7, z: 0.2 },
  ] : [
    { x: -5.4, z: 0.3 }, { x: -3.7, z: -0.6 }, { x: -6.5, z: -1.1 },
    { x:  4.7, z: 0.2 }, { x:  5.4, z: -0.6 }, { x:  3.1, z: -0.9 },
    { x: -1.4, z: -2.1 }, { x: 1.7, z: -2.3 }, { x: -0.2, z: -1.5 },
  ];
  const shrubs = SHRUB_POS.map(p => {
    const s   = new THREE.Mesh(SEG_S, shrubMat.clone());
    const scl = 0.55 + Math.random() * 0.60;
    s.position.set(p.x, 0.19, p.z);
    s.scale.set(scl, scl * 0.68, scl);
    scene.add(s);
    return s;
  });

  // ── Small flowers at forest edges ──────────────────────────────────
  const FN = quality === 'low' ? 0 : (quality === 'medium' ? 5 : 10);
  const flowers = [];
  for (let i = 0; i < FN; i++) {
    const fl  = new THREE.Mesh(SEG_F, flowerMat.clone());
    const side = i % 2 === 0 ? -1 : 1;
    fl.position.set(side * (3.8 + Math.random() * 3.5), 0.07, (Math.random() - 0.5) * 3.5);
    fl.scale.setScalar(0.55 + Math.random() * 0.85);
    scene.add(fl);
    flowers.push(fl);
  }

  // ── Pond — organic CircleGeometry + ripple ShaderMaterial ─────────
  const POND_R    = 1.45;
  const pondGeom  = new THREE.CircleGeometry(POND_R, 36);
  // Distort perimeter vertices for organic edge
  {
    const pos = pondGeom.attributes.position.array;
    for (let i = 3; i < pos.length; i += 3) {
      const dx = pos[i], dz = pos[i + 2];
      const r  = Math.sqrt(dx * dx + dz * dz);
      if (r > 0.12) {
        const ang  = Math.atan2(dz, dx);
        const bump = 0.83 + 0.12 * Math.sin(ang * 6 + 0.4) + 0.07 * Math.cos(ang * 9 - 1.1);
        pos[i]     *= bump;
        pos[i + 2] *= bump;
      }
    }
    pondGeom.attributes.position.needsUpdate = true;
    pondGeom.computeVertexNormals();
  }

  const POND_UNI = {
    uTime:    { value: 0.0 },
    uColor:   { value: new THREE.Color(0x60A8D0) },
    uOpacity: { value: 0.0 },
    uRipple:  { value: 0.0 },
  };
  const pondMat = new THREE.ShaderMaterial({
    uniforms: POND_UNI,
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      uniform float uTime; uniform vec3 uColor; uniform float uOpacity; uniform float uRipple;
      varying vec2 vUv;
      void main() {
        vec2  c    = vUv - 0.5;
        float d    = length(c) * 2.0;
        float edge = smoothstep(1.0, 0.55, d);
        float rip  = sin(d * 13.0 - uTime * 2.6) * 0.045 * edge;
        float rain = sin(d * 22.0 - uTime * 4.2) * 0.03 * uRipple * edge;
        float fres = pow(max(0.0, 1.0 - d * 0.88), 2.8) * 0.28;
        vec3  col  = uColor + vec3(rip + fres + rain);
        gl_FragColor = vec4(col, (0.68 + fres) * edge * uOpacity);
      }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
  const pond = new THREE.Mesh(pondGeom, pondMat);
  pond.rotation.x = -Math.PI / 2;
  pond.position.set(-4.5, 0.022, -0.5);
  scene.add(pond);

  // ── Lily pads ──────────────────────────────────────────────────────
  const PAD_DATA = [
    { x: -4.85, z: -0.65, r: 0.20, ry: 0.35 },
    { x: -4.20, z: -0.32, r: 0.15, ry: -0.52 },
    { x: -4.55, z: -0.95, r: 0.17, ry: 1.15 },
    { x: -3.82, z: -0.58, r: 0.13, ry: 2.05 },
    { x: -4.72, z: -0.20, r: 0.11, ry: -1.80 },
  ];
  const pads = PAD_DATA.map(p => {
    const m  = padMat.clone();
    const pg = new THREE.CircleGeometry(p.r, 10);
    const pd = new THREE.Mesh(pg, m);
    pd.rotation.x = -Math.PI / 2;
    pd.rotation.z = p.ry;
    pd.position.set(p.x, 0.026, p.z);
    scene.add(pd);
    return pd;
  });

  // ── Fish — gentle circular swim ────────────────────────────────────
  const FISH_DEF = [
    { bx: -4.5, bz: -0.55, ph: 0.0,  sp: 0.27, rad: 0.38 },
    { bx: -4.2, bz: -0.80, ph: 2.3,  sp: 0.21, rad: 0.29 },
  ];
  const fishGeom = new THREE.SphereGeometry(0.046, 6, 4);
  fishGeom.scale(1.0, 0.52, 0.72);
  const fish = FISH_DEF.map(fd => {
    const f = new THREE.Mesh(fishGeom, fishMat.clone());
    f.position.set(fd.bx, 0.032, fd.bz);
    f.userData = fd;
    scene.add(f);
    return f;
  });

  // ── Sun glow — two-layer sprite ────────────────────────────────────
  function makeGlow(sz, inner, outer) {
    const c   = document.createElement('canvas');
    c.width   = c.height = sz;
    const ctx = c.getContext('2d');
    const g   = ctx.createRadialGradient(sz/2, sz/2, 0, sz/2, sz/2, sz/2);
    g.addColorStop(0,    inner);
    g.addColorStop(0.38, outer);
    g.addColorStop(1,    'rgba(255,200,100,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, sz, sz);
    return new THREE.CanvasTexture(c);
  }
  const sunCoreMat = new THREE.SpriteMaterial({
    map: makeGlow(128, 'rgba(255,248,220,0.98)', 'rgba(255,228,140,0.52)'),
    transparent: true, opacity: 0.0, depthWrite: false, depthTest: false,
  });
  const sunHaloMat = new THREE.SpriteMaterial({
    map: makeGlow(256, 'rgba(255,218,110,0.36)', 'rgba(255,196,72,0.07)'),
    transparent: true, opacity: 0.0, depthWrite: false, depthTest: false,
  });
  const sunCore = new THREE.Sprite(sunCoreMat);
  const sunHalo = new THREE.Sprite(sunHaloMat);
  sunCore.scale.set(2.4, 2.4, 1);
  sunHalo.scale.set(8.0, 8.0, 1);
  sunCore.position.set(6.5, 4.9, -3);
  sunHalo.position.set(6.5, 4.9, -3);
  scene.add(sunCore, sunHalo);

  // ── Birds ──────────────────────────────────────────────────────────
  const BIRD_N  = reduceMotion ? 0 : (isMobile ? 1 : 3);
  const birdMat = new THREE.LineBasicMaterial({ color: 0x4a5260, transparent: true, opacity: 0 });
  const birds   = [];
  function mkBirdGeom() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-0.20,0.00,0, -0.10,0.07,0, 0.00,0.00,0, 0.10,0.07,0, 0.20,0.00,0], 3));
    return g;
  }
  for (let i = 0; i < BIRD_N; i++) {
    const b = new THREE.Line(mkBirdGeom(), birdMat);
    b.userData = { y0: 4 + Math.random() * 1.5, z0: -1 + Math.random() * 2, speed: 0.55 + Math.random() * 0.35, offset: Math.random() * 16, bob: 0.10 + Math.random() * 0.12 };
    scene.add(b);
    birds.push(b);
  }

  // ── Snow particles ─────────────────────────────────────────────────
  const SN    = reduceMotion ? 0 : (quality === 'low' ? 18 : quality === 'medium' ? 30 : 46);
  const snowMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
  const snow  = new THREE.InstancedMesh(new THREE.SphereGeometry(0.042, 4, 3), snowMat, Math.max(SN, 1));
  const snowD = [];
  for (let i = 0; i < SN; i++) {
    const d = { x: (Math.random() - 0.5) * 18, y: Math.random() * 9, z: (Math.random() - 0.5) * 4, sp: 0.36 + Math.random() * 0.50, dr: (Math.random() - 0.5) * 0.24 };
    snowD.push(d);
    dummy.position.set(d.x, d.y, d.z);
    dummy.scale.setScalar(0.68 + Math.random() * 0.72);
    dummy.updateMatrix();
    snow.setMatrixAt(i, dummy.matrix);
  }
  scene.add(snow);

  // ── Mode presets ───────────────────────────────────────────────────
  const MODES = {
    sunny: {
      leafColor:    new THREE.Color(0x5fa052),
      leafOpacity:  0.92,
      capOpacity:   0.0,
      snowOpacity:  0.0,
      sunOpacity:   0.90,
      birdOpacity:  0.65,
      pondOpacity:  0.75,
      shrubOpacity: 0.75,
      padOpacity:   0.85,
      fishOpacity:  0.82,
      flowerOpacity:0.80,
      fogColor:     new THREE.Color(0xC8DDEF),
      fogDensity:   0.030,
      skyTop:       new THREE.Color(0x9EC9E8),
      skyBot:       new THREE.Color(0xDAEEF6),
      skyOpacity:   0.22,
      hemInt:       0.90,
      sunInt:       0.72,
      swayAmp:      0.025,
      swaySpeed:    0.65,
      windStr:      0.025,
      pondColor:    new THREE.Color(0x60A8D0),
      pondRipple:   0.0,
    },
    rainy: {
      leafColor:    new THREE.Color(0x3a6e3a),
      leafOpacity:  0.88,
      capOpacity:   0.0,
      snowOpacity:  0.0,
      sunOpacity:   0.0,
      birdOpacity:  0.18,
      pondOpacity:  0.88,
      shrubOpacity: 0.65,
      padOpacity:   0.72,
      fishOpacity:  0.50,
      flowerOpacity:0.25,
      fogColor:     new THREE.Color(0x8EA8B8),
      fogDensity:   0.052,
      skyTop:       new THREE.Color(0x607888),
      skyBot:       new THREE.Color(0x96A8BA),
      skyOpacity:   0.32,
      hemInt:       0.62,
      sunInt:       0.28,
      swayAmp:      0.058,
      swaySpeed:    1.25,
      windStr:      0.058,
      pondColor:    new THREE.Color(0x4A7A98),
      pondRipple:   1.0,
    },
    snowy: {
      leafColor:    new THREE.Color(0x9ba9b0),
      leafOpacity:  0.28,
      capOpacity:   1.0,
      snowOpacity:  0.94,
      sunOpacity:   0.0,
      birdOpacity:  0.12,
      pondOpacity:  0.48,
      shrubOpacity: 0.38,
      padOpacity:   0.42,
      fishOpacity:  0.28,
      flowerOpacity:0.15,
      fogColor:     new THREE.Color(0xD6E6EE),
      fogDensity:   0.024,
      skyTop:       new THREE.Color(0xB6C8D8),
      skyBot:       new THREE.Color(0xDEE8F0),
      skyOpacity:   0.26,
      hemInt:       0.98,
      sunInt:       0.42,
      swayAmp:      0.011,
      swaySpeed:    0.36,
      windStr:      0.011,
      pondColor:    new THREE.Color(0x88AAB6),
      pondRipple:   0.0,
    },
  };

  function applyImmediate(mode) {
    const m = MODES[mode];
    leafMat.color.copy(m.leafColor);
    leafMat.opacity       = m.leafOpacity;
    capMat.opacity        = m.capOpacity;
    snowMat.opacity       = m.snowOpacity;
    sunCoreMat.opacity    = m.sunOpacity;
    sunHaloMat.opacity    = m.sunOpacity * 0.52;
    birdMat.opacity       = m.birdOpacity;
    WIND_UNI.uStr.value   = reduceMotion ? m.windStr * 0.18 : m.windStr;
    shrubs.forEach(s  => { if (s.material) s.material.opacity = m.shrubOpacity; });
    pads.forEach(p    => { if (p.material) p.material.opacity = m.padOpacity; });
    fish.forEach(f    => { if (f.material) f.material.opacity = m.fishOpacity; });
    flowers.forEach(f => { if (f.material) f.material.opacity = m.flowerOpacity; });
    POND_UNI.uOpacity.value = m.pondOpacity;
    POND_UNI.uColor.value.copy(m.pondColor);
    POND_UNI.uRipple.value  = m.pondRipple;
    scene.fog.color.copy(m.fogColor);
    scene.fog.density = m.fogDensity;
    SKY_UNI.uTop.value.copy(m.skyTop);
    SKY_UNI.uBot.value.copy(m.skyBot);
    SKY_UNI.uOpacity.value = m.skyOpacity;
    hemi.intensity    = m.hemInt;
    sunLight.intensity = m.sunInt;
  }

  // ── Tween ──────────────────────────────────────────────────────────
  let FROM   = { ...MODES.sunny };
  let TO     = MODES.sunny;
  let PROG   = 1;
  const TF   = 38;

  function setMode(mode) {
    if (!MODES[mode] || TO === MODES[mode]) return;
    FROM = {
      leafColor:    leafMat.color.clone(),
      leafOpacity:  leafMat.opacity,
      capOpacity:   capMat.opacity,
      snowOpacity:  snowMat.opacity,
      sunOpacity:   sunCoreMat.opacity,
      birdOpacity:  birdMat.opacity,
      shrubOpacity: shrubs[0]?.material?.opacity ?? 0.75,
      padOpacity:   pads[0]?.material?.opacity   ?? 0.85,
      fishOpacity:  fish[0]?.material?.opacity   ?? 0.82,
      flowerOpacity:flowers[0]?.material?.opacity ?? 0.80,
      pondOpacity:  POND_UNI.uOpacity.value,
      pondColor:    POND_UNI.uColor.value.clone(),
      pondRipple:   POND_UNI.uRipple.value,
      fogColor:     scene.fog.color.clone(),
      fogDensity:   scene.fog.density,
      skyTop:       SKY_UNI.uTop.value.clone(),
      skyBot:       SKY_UNI.uBot.value.clone(),
      skyOpacity:   SKY_UNI.uOpacity.value,
      hemInt:       hemi.intensity,
      sunInt:       sunLight.intensity,
      windStr:      WIND_UNI.uStr.value,
      swayAmp:      TO.swayAmp,
      swaySpeed:    TO.swaySpeed,
    };
    TO   = MODES[mode];
    PROG = 0;
  }

  // ── Resize ─────────────────────────────────────────────────────────
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    if (w < 1 || h < 1) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  // ── Animation loop ─────────────────────────────────────────────────
  let raf     = null;
  let visible = !document.hidden;
  const T0    = performance.now();

  function ease(t) { return t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2,2)/2; }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function tick() {
    if (!visible) { raf = null; return; }
    const t = (performance.now() - T0) / 1000;

    // Time uniforms for shaders
    WIND_UNI.uTime.value = t;
    POND_UNI.uTime.value = t;

    // Mode tween
    if (PROG < 1) {
      PROG = Math.min(1, PROG + 1 / TF);
      const e = ease(PROG);
      leafMat.color.copy(FROM.leafColor).lerp(TO.leafColor, e);
      leafMat.opacity       = lerp(FROM.leafOpacity,    TO.leafOpacity,    e);
      capMat.opacity        = lerp(FROM.capOpacity,     TO.capOpacity,     e);
      snowMat.opacity       = lerp(FROM.snowOpacity,    TO.snowOpacity,    e);
      sunCoreMat.opacity    = lerp(FROM.sunOpacity,     TO.sunOpacity,     e);
      sunHaloMat.opacity    = sunCoreMat.opacity * 0.52;
      birdMat.opacity       = lerp(FROM.birdOpacity,    TO.birdOpacity,    e);
      const sp = lerp(FROM.shrubOpacity,  TO.shrubOpacity,  e);
      const pp = lerp(FROM.padOpacity,    TO.padOpacity,    e);
      const fp = lerp(FROM.fishOpacity,   TO.fishOpacity,   e);
      const flp= lerp(FROM.flowerOpacity, TO.flowerOpacity, e);
      shrubs.forEach(s  => { if (s.material) s.material.opacity = sp;  });
      pads.forEach(p    => { if (p.material) p.material.opacity = pp;  });
      fish.forEach(f    => { if (f.material) f.material.opacity = fp;  });
      flowers.forEach(f => { if (f.material) f.material.opacity = flp; });
      POND_UNI.uOpacity.value = lerp(FROM.pondOpacity, TO.pondOpacity, e);
      POND_UNI.uColor.value.copy(FROM.pondColor).lerp(TO.pondColor, e);
      POND_UNI.uRipple.value  = lerp(FROM.pondRipple, TO.pondRipple, e);
      scene.fog.color.copy(FROM.fogColor).lerp(TO.fogColor, e);
      scene.fog.density = lerp(FROM.fogDensity, TO.fogDensity, e);
      SKY_UNI.uTop.value.copy(FROM.skyTop).lerp(TO.skyTop, e);
      SKY_UNI.uBot.value.copy(FROM.skyBot).lerp(TO.skyBot, e);
      SKY_UNI.uOpacity.value  = lerp(FROM.skyOpacity, TO.skyOpacity, e);
      hemi.intensity     = lerp(FROM.hemInt, TO.hemInt, e);
      sunLight.intensity = lerp(FROM.sunInt, TO.sunInt, e);
      WIND_UNI.uStr.value = reduceMotion
        ? lerp(FROM.windStr, TO.windStr, e) * 0.18
        : lerp(FROM.windStr, TO.windStr, e);
    }

    // Canopy sway
    if (!reduceMotion) {
      for (const c of canopies) {
        const sway = Math.sin(t * TO.swaySpeed + c.phase) * TO.swayAmp;
        c.canopy.rotation.z = sway;
        c.canopy.rotation.x = sway * 0.40;
      }
    }

    // Birds
    if (BIRD_N > 0 && birdMat.opacity > 0.04) {
      for (const b of birds) {
        const u = b.userData;
        b.position.x = ((t * u.speed + u.offset) % 16) - 8;
        b.position.y = u.y0 + Math.sin(t * 1.4 + u.offset) * u.bob;
        b.position.z = u.z0;
      }
    }

    // Fish circular swim
    if (!reduceMotion && fish.some(f => f.material.opacity > 0.06)) {
      for (const f of fish) {
        const d   = f.userData;
        const ang = t * d.sp + d.ph;
        f.position.x  = d.bx + Math.cos(ang) * d.rad;
        f.position.z  = d.bz + Math.sin(ang) * d.rad * 0.52;
        f.rotation.y  = -ang;
      }
    }

    // Snow
    if (snowMat.opacity > 0.02 && !reduceMotion && SN > 0) {
      for (let i = 0; i < SN; i++) {
        const d = snowD[i];
        d.y -= d.sp * 0.018;
        d.x += Math.sin(t * 0.62 + i) * 0.001 + d.dr * 0.001;
        if (d.y < -1) { d.y = 8.5; d.x = (Math.random() - 0.5) * 18; }
        dummy.position.set(d.x, d.y, d.z);
        dummy.scale.setScalar(0.68 + (i % 3) * 0.16);
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
  try { saved = localStorage.getItem('kt_weather_v2') || 'sunny'; } catch (_) {}
  if (!MODES[saved]) saved = 'sunny';
  applyImmediate(saved);
  TO = MODES[saved];
  start();

  window.addEventListener('weather:change', e => setMode(e.detail.mode));
  window.TreeScene = { setMode, updateForestState: setMode };
}());
