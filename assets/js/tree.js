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
  const flowerMat = new THREE.MeshToonMaterial({
    color: 0xffaabb, gradientMap: toonGrad, transparent: true, opacity: 0.85,
  });
  const padMat = new THREE.MeshToonMaterial({
    color: 0x7ac888, gradientMap: toonGrad, transparent: true, opacity: 0.0, side: THREE.DoubleSide,
  });
  const fishMat = new THREE.MeshToonMaterial({
    color: 0xff8060, gradientMap: toonGrad, transparent: true, opacity: 0.0,
  });

  const dummy = new THREE.Object3D();

  // ── Tree builder — pine (cone tiers) + deciduous (branch-tip clusters) ─
  function buildTree(type) {
    const group  = new THREE.Group();
    const canopy = new THREE.Group();
    const rnd    = () => Math.random();

    const cfgs = {
      pine:   { tH: 2.5,  tR: [0.050, 0.10] },
      round:  { tH: 1.75, tR: [0.095, 0.17] },
      wide:   { tH: 1.45, tR: [0.10,  0.18] },
      sparse: { tH: 2.1,  tR: [0.065, 0.12] },
    };
    const cfg = cfgs[type] || cfgs.round;

    const tk = new THREE.Mesh(
      new THREE.CylinderGeometry(cfg.tR[0], cfg.tR[1], cfg.tH, 7), trunkMat);
    tk.position.y = cfg.tH / 2;
    group.add(tk);

    if (type === 'pine') {
      // ── Stacked cone tiers for recognisable pine silhouette ──
      const nT = quality === 'low' ? 3 : quality === 'medium' ? 4 : 5;
      for (let i = 0; i < nT; i++) {
        const t   = i / nT;
        const yP  = cfg.tH * (0.26 + (1 - t) * 0.62);
        const rad = (0.48 + rnd() * 0.16) * (1 - t * 0.50);
        const ht  = rad * 1.15 + rnd() * 0.07;
        const tier = new THREE.Mesh(
          new THREE.ConeGeometry(rad, ht, quality === 'low' ? 6 : 8), leafMat);
        tier.position.set((rnd()-0.5)*0.05, yP, (rnd()-0.5)*0.05);
        canopy.add(tier);
        if (quality !== 'low') {
          const cap = new THREE.Mesh(new THREE.ConeGeometry(rad*0.70, ht*0.18, 6), capMat);
          cap.position.copy(tier.position);
          cap.position.y += ht * 0.46;
          canopy.add(cap);
        }
      }
    } else {
      // ── Deciduous: branches + leaf clusters at approximate tip positions ──
      const bnC = {
        round:  { n:5, sp:0.40, up:0.26, len:0.78 },
        wide:   { n:6, sp:0.52, up:0.16, len:0.84 },
        sparse: { n:4, sp:0.28, up:0.42, len:0.96 },
      }[type] || { n:5, sp:0.40, up:0.26, len:0.78 };

      const tips = [];
      for (let i = 0; i < bnC.n; i++) {
        const len  = bnC.len * (0.72 + rnd() * 0.28);
        const ry   = (i / bnC.n) * Math.PI * 2 + rnd() * 0.4;
        const upA  = bnC.up + rnd() * 0.14;
        const yF   = 0.58 + (i / bnC.n) * 0.34;
        const bGeo = new THREE.CylinderGeometry(0.012, 0.040, len, 5);
        bGeo.translate(0, len / 2, 0);
        const br   = new THREE.Mesh(bGeo, trunkMat);
        br.position.y = cfg.tH * yF;
        br.rotation.set(-upA, ry, (rnd()-0.5) * bnC.sp);
        group.add(br);
        tips.push({
          x: Math.sin(ry) * len * Math.cos(upA),
          y: cfg.tH * yF + len * Math.sin(upA),
          z: Math.cos(ry) * len * Math.cos(upA),
        });
        if (quality !== 'low' && rnd() > 0.38) {
          const sl  = len * (0.40 + rnd() * 0.22);
          const sGeo = new THREE.CylinderGeometry(0.006, 0.016, sl, 4);
          sGeo.translate(0, sl / 2, 0);
          const sb = new THREE.Mesh(sGeo, trunkMat);
          sb.position.y = len * (0.52 + rnd() * 0.30);
          sb.rotation.set(-(0.20 + rnd()*0.14), rnd()*Math.PI*2, 0);
          br.add(sb);
        }
      }

      const lGeo  = new THREE.SphereGeometry(0.17, quality === 'high' ? 7 : 5, quality === 'high' ? 5 : 4);
      const lScX  = type === 'wide' ? 1.30 : 1.0;
      const lScY  = type === 'wide' ? 0.58 : 0.82;
      const lSprd = type === 'sparse' ? 0.20 : 0.40;
      const lCnt  = quality === 'low' ? bnC.n*3 : quality === 'medium' ? bnC.n*5 : bnC.n*7;
      const lInst = new THREE.InstancedMesh(lGeo, leafMat, lCnt);
      lInst.instanceMatrix.setUsage(THREE.StaticDrawUsage);
      for (let i = 0; i < lCnt; i++) {
        const tip = tips[i % tips.length];
        const sc  = 0.55 + rnd() * 0.55;
        dummy.position.set(
          tip.x + (rnd()-0.5)*lSprd,
          tip.y + (rnd()-0.5)*lSprd*0.55,
          tip.z + (rnd()-0.5)*lSprd);
        dummy.scale.set(sc*lScX, sc*lScY, sc*lScX);
        dummy.rotation.y = rnd() * Math.PI * 2;
        dummy.updateMatrix();
        lInst.setMatrixAt(i, dummy.matrix);
      }
      canopy.add(lInst);

      if (quality !== 'low') {
        const cGeo  = new THREE.SphereGeometry(0.11, 5, 3);
        const nC    = type === 'sparse' ? 3 : 5;
        const cInst = new THREE.InstancedMesh(cGeo, capMat, nC);
        for (let i = 0; i < nC; i++) {
          const tip = tips[i % tips.length];
          dummy.position.set(
            tip.x + (rnd()-0.5)*0.22,
            tip.y + 0.14 + rnd()*0.20,
            tip.z + (rnd()-0.5)*0.22);
          dummy.scale.set(1.2, 0.36, 1.2);
          dummy.rotation.set(0, 0, 0);
          dummy.updateMatrix();
          cInst.setMatrixAt(i, dummy.matrix);
        }
        canopy.add(cInst);
      }
    }

    group.add(canopy);
    return { group, canopy };
  }

  // ── Forest layout — edge-heavy, center kept clear ─────────────────
  const NL = quality === 'low' ? 2 : (quality === 'medium' ? 3 : 5);  // left count
  const NR = quality === 'low' ? 2 : (quality === 'medium' ? 3 : 5);  // right count
  const NB = quality === 'low' ? 1 : (quality === 'medium' ? 2 : 3);  // back row
  const NF = quality === 'low' ? 0 : (quality === 'medium' ? 1 : 2);  // foreground
  const ARR = ['pine', 'round', 'wide', 'sparse', 'round']; // round weighted heavier
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

  // ── Shrubs — multi-lobe organic clusters ─────────────────────────────
  const shrubMat = new THREE.MeshToonMaterial({
    color: 0x3a8a5a, gradientMap: toonGrad, transparent: true, opacity: 0.75,
  });
  const SHRUB_POS = quality === 'low' ? [
    { x: -5.4, z: 0.3 }, { x: 4.7, z: 0.2 },
  ] : [
    { x: -5.4, z: 0.3 }, { x: -3.7, z: -0.6 }, { x: -6.5, z: -1.1 },
    { x:  4.7, z: 0.2 }, { x:  5.4, z: -0.6 }, { x:  3.1, z: -0.9 },
    { x: -1.4, z: -2.1 }, { x: 1.7, z: -2.3 }, { x: -0.2, z: -1.5 },
  ];
  SHRUB_POS.forEach(p => {
    const g   = new THREE.Group();
    const scl = 0.55 + Math.random() * 0.55;
    const n   = 3 + Math.floor(Math.random() * 3); // 3-5 lobes
    for (let i = 0; i < n; i++) {
      const lobe = new THREE.Mesh(
        new THREE.SphereGeometry(
          0.12 + Math.random() * 0.10, quality === 'low' ? 5 : 7, 4),
        shrubMat
      );
      const ang = (i / n) * Math.PI * 2 + Math.random() * 0.55;
      const rad = 0.06 + Math.random() * 0.14;
      lobe.position.set(
        Math.cos(ang) * rad,
        0.07 + Math.random() * 0.18,
        Math.sin(ang) * rad
      );
      lobe.scale.set(
        0.88 + Math.random() * 0.30,
        0.50 + Math.random() * 0.24,
        0.88 + Math.random() * 0.30
      );
      g.add(lobe);
    }
    if (quality !== 'low') {
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.014, 0.022, 0.10, 5), trunkMat);
      stem.position.y = 0.05;
      g.add(stem);
    }
    g.position.set(p.x, 0, p.z);
    g.scale.setScalar(scl);
    scene.add(g);
  });

  // ── Small flowers at forest edges ──────────────────────────────────
  const SEG_F = new THREE.SphereGeometry(0.075, 6, 4);
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

  // ── Mountains — far background silhouettes above the tree line ───────
  // yBase sits above tree canopy (~3.0+) so only peaks show in the sky zone.
  // A small below-base fill (1.5 units) seals the shape without creating a box.
  const mtnMats = [];
  (function () {
    const LAYERS = quality === 'low' ? [
      { z:-22, yBase:3.2, w:36, pks:4, maxH:5.0, col:0xC2D0DA, op:0.14 },
    ] : quality === 'medium' ? [
      { z:-28, yBase:3.5, w:42, pks:5, maxH:5.8, col:0xCCD8E0, op:0.11 },
      { z:-20, yBase:3.1, w:30, pks:4, maxH:4.4, col:0x90AEBE, op:0.17 },
    ] : [
      { z:-32, yBase:3.7, w:48, pks:6, maxH:6.4, col:0xD0DAE2, op:0.09 },
      { z:-24, yBase:3.4, w:36, pks:5, maxH:5.0, col:0x9EB4C2, op:0.15 },
      { z:-18, yBase:3.0, w:28, pks:4, maxH:3.8, col:0x728EA0, op:0.20 },
    ];
    LAYERS.forEach((l) => {
      const shape = new THREE.Shape();
      shape.moveTo(-l.w / 2, l.yBase - 1.5);
      shape.lineTo(-l.w / 2, l.yBase);
      const sp = l.w / l.pks;
      for (let i = 0; i < l.pks; i++) {
        const cx = -l.w/2 + sp * (i + 0.5) + (Math.random()-0.5) * sp * 0.18;
        const h  = l.maxH * (0.55 + Math.random() * 0.42);
        const hw = sp * (0.28 + Math.random() * 0.24);
        shape.lineTo(cx - hw * 0.68, l.yBase + 0.10);
        shape.lineTo(cx, l.yBase + h);
        shape.lineTo(cx + hw * 0.68, l.yBase + 0.10);
      }
      shape.lineTo(l.w / 2, l.yBase);
      shape.lineTo(l.w / 2, l.yBase - 1.5);
      shape.closePath();
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(l.col), transparent: true, opacity: l.op,
        depthWrite: false,
      });
      mtnMats.push({ mat, base: l.op });
      const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), mat);
      mesh.position.z = l.z;
      scene.add(mesh);
    });
  }());

  // ── Hikers — articulated figures with limb-rotation walk cycle ────────
  const HS      = 0.26; // figure height scale
  const hikerMat = new THREE.LineBasicMaterial({ color: 0x2d3a48, transparent: true, opacity: 0.0 });
  const hikerObjs = []; // all figure root groups (for opacity / scene cleanup)
  const walkers   = []; // animated walkers only

  // Build a limb as a child Group so rotation.z swings it from the pivot
  function mkLimb(xOff, yPivot, segLen) {
    const grp = new THREE.Group();
    grp.position.set(xOff * HS, yPivot * HS, 0);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(
      [0, 0, 0,  0, -segLen * HS, 0], 3));
    grp.add(new THREE.LineSegments(geo, hikerMat));
    return grp;
  }

  function buildWalker(lo, hi, pz, speed, offset) {
    const fig = new THREE.Group();
    // Torso + head
    const tGeo = new THREE.BufferGeometry();
    tGeo.setAttribute('position', new THREE.Float32BufferAttribute([
      -0.030*HS, 0.87*HS, 0,   0.030*HS, 0.87*HS, 0,  // head cross-bar
       0,        0.84*HS, 0,   0,        0.92*HS, 0,   // head vertical
       0,        0.83*HS, 0,   0,        0.50*HS, 0,   // body
    ], 3));
    fig.add(new THREE.LineSegments(tGeo, hikerMat));
    const lArm = mkLimb(-0.04, 0.74, 0.22);
    const rArm = mkLimb( 0.04, 0.74, 0.22);
    const lLeg = mkLimb(-0.04, 0.50, 0.30);
    const rLeg = mkLimb( 0.04, 0.50, 0.30);
    fig.add(lArm, rArm, lLeg, rLeg);
    fig.position.set(lo, 0, pz);
    scene.add(fig);
    hikerObjs.push(fig);
    walkers.push({ fig, lArm, rArm, lLeg, rLeg, lo, hi, pz, speed, offset });
  }

  // Static posed figures (sitting, crouching, standing)
  function buildStatic(segs, x, z) {
    const pts = [];
    segs.forEach(s => pts.push(s[0]*HS, s[1]*HS, 0,  s[2]*HS, s[3]*HS, 0));
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const fig = new THREE.LineSegments(geo, hikerMat);
    fig.position.set(x, 0, z);
    scene.add(fig);
    hikerObjs.push(fig);
  }

  if (quality !== 'low') {
    buildWalker(-6.8, -1.0, 0.82, 0.10, 0.0);
    buildWalker(-6.8, -1.0, 0.92, 0.08, 1.6);
    // Sitting pair — right edge
    buildStatic([
      [-0.04,0.56, 0.04,0.56],[0,0.53, 0,0.60],
      [0,0.52, 0,0.26],
      [0,0.44,-0.18,0.30],[0,0.44, 0.18,0.28],
      [0,0.26,-0.24,0.06],[0,0.26, 0.24,0.06],
    ], 4.55, 0.35);
    buildStatic([
      [-0.04,0.88, 0.04,0.88],[0,0.85, 0,0.92],
      [0,0.83, 0,0.50],
      [0,0.73,-0.18,0.56],[0,0.73, 0.18,0.56],
      [0,0.50,-0.13,0.16],[0,0.50, 0.13,0.16],
    ], 4.92, 0.25);
  }
  if (quality === 'high') {
    // Photo pair — near pond
    buildStatic([
      [-0.04,0.88, 0.04,0.88],[0,0.85, 0,0.92],
      [0,0.83, 0,0.50],
      [0,0.73,-0.18,0.56],[0,0.73, 0.18,0.56],
      [0,0.50,-0.13,0.16],[0,0.50, 0.13,0.16],
    ], -2.7, 0.30);
    buildStatic([
      [-0.04,0.52, 0.04,0.52],[0,0.49, 0,0.56],
      [0,0.48, 0,0.27],
      [0,0.44,-0.26,0.34],[0,0.44, 0.24,0.38],
      [0,0.27,-0.14,0.05],[0,0.27, 0.14,0.05],
    ], -2.2, 0.48);
  }

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
      mtnScale:     1.00,
      hikerOpacity: 0.70,
      sunColor:     new THREE.Color(0xFFE882),
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
      mtnScale:     0.55,
      hikerOpacity: 0.38,
      sunColor:     new THREE.Color(0x7A8EA0),
    },
    snowy: {
      leafColor:    new THREE.Color(0x9ba9b0),
      leafOpacity:  0.28,
      capOpacity:   1.0,
      snowOpacity:  0.94,
      sunOpacity:   0.32,
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
      mtnScale:     1.20,
      hikerOpacity: 0.50,
      sunColor:     new THREE.Color(0xE4EDFF),
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
    shrubMat.opacity = m.shrubOpacity;
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
    mtnMats.forEach(({ mat, base }) => { mat.opacity = base * m.mtnScale; });
    hikerMat.opacity = m.hikerOpacity;
    sunCoreMat.color.copy(m.sunColor);
    sunHaloMat.color.copy(m.sunColor);
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
      shrubOpacity: shrubMat.opacity,
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
      mtnScale:     TO.mtnScale,
      hikerOpacity: hikerMat.opacity,
      sunColor:     sunCoreMat.color.clone(),
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
      shrubMat.opacity = lerp(FROM.shrubOpacity,  TO.shrubOpacity,  e);
      const pp = lerp(FROM.padOpacity,    TO.padOpacity,    e);
      const fp = lerp(FROM.fishOpacity,   TO.fishOpacity,   e);
      const flp= lerp(FROM.flowerOpacity, TO.flowerOpacity, e);
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
      const mtnS = lerp(FROM.mtnScale, TO.mtnScale, e);
      mtnMats.forEach(({ mat, base }) => { mat.opacity = base * mtnS; });
      hikerMat.opacity = lerp(FROM.hikerOpacity, TO.hikerOpacity, e);
      sunCoreMat.color.copy(FROM.sunColor).lerp(TO.sunColor, e);
      sunHaloMat.color.copy(FROM.sunColor).lerp(TO.sunColor, e);
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

    // Articulated walk cycle
    if (hikerMat.opacity > 0.04 && walkers.length) {
      for (const w of walkers) {
        const range = w.hi - w.lo;
        w.fig.position.x = w.lo + ((t * w.speed + w.offset) % range);
        w.fig.position.z = w.pz;
        if (!reduceMotion) {
          const phase  = t * w.speed * 8.0;
          const swing  = Math.sin(phase) * 0.40;
          w.lLeg.rotation.z =  swing;
          w.rLeg.rotation.z = -swing;
          w.lArm.rotation.z = -swing * 0.60;
          w.rArm.rotation.z =  swing * 0.60;
          w.fig.position.y  = Math.abs(Math.sin(phase * 2)) * 0.009;
        }
      }
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
