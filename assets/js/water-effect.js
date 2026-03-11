/* Water ripple effect for folder cards — mousemove only, subtle specular shimmer */
(function () {
  'use strict';

  /* ── Config ─────────────────────────────────────────────────────── */
  const SIM      = 256;    // simulation grid (power-of-2)
  const DAMP     = 0.987;  // per-frame wave damping
  const FORCE    = 0.10;   // mouse impulse strength
  const SPEC_POW = 50.0;   // specular highlight tightness
  const MAX_A    = 0.20;   // max overlay alpha
  const IDLE_MS  = 5000;   // pause after this many ms idle

  /* ── Guard ──────────────────────────────────────────────────────── */
  if (typeof THREE === 'undefined') return;
  const stack = document.querySelector('.folder-stack');
  if (!stack) return;

  /* ── Vertex shader (shared) ─────────────────────────────────────── */
  const VERT = /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
  `;

  /* ── Simulation fragment shader ─────────────────────────────────── */
  // Stores: R = current height, G = previous height
  const SIM_FRAG = /* glsl */`
    precision highp float;
    uniform sampler2D tPrev;
    uniform vec2      res;
    uniform vec2      mouse;   // normalized [0..1]
    uniform float     force;
    varying vec2      vUv;

    void main() {
      vec2  px = 1.0 / res;
      float N  = texture2D(tPrev, vUv + vec2(0.0,  px.y)).r;
      float S  = texture2D(tPrev, vUv - vec2(0.0,  px.y)).r;
      float E  = texture2D(tPrev, vUv + vec2(px.x, 0.0 )).r;
      float W  = texture2D(tPrev, vUv - vec2(px.x, 0.0 )).r;
      float C  = texture2D(tPrev, vUv).r;
      float P  = texture2D(tPrev, vUv).g;

      // Wave equation: h_new = 2h - h_prev + c²·∇²h
      float wave = (2.0*C - P + 0.495*(N + S + E + W - 4.0*C)) * ${DAMP.toFixed(4)};

      // Mouse impulse — smooth Gaussian blob
      float d = length(vUv - mouse);
      wave   += force * smoothstep(0.07, 0.0, d);

      gl_FragColor = vec4(clamp(wave, -1.0, 1.0), C, 0.0, 1.0);
    }
  `;

  /* ── Display fragment shader ────────────────────────────────────── */
  // Renders specular ripple shimmer in site colours; transparent background
  const DISP_FRAG = /* glsl */`
    precision highp float;
    uniform sampler2D tData;
    uniform vec2      res;
    varying vec2      vUv;

    void main() {
      vec2 px = 1.0 / res;

      // Finite-difference normal from height field
      float hL = texture2D(tData, vUv - vec2(px.x, 0.0)).r;
      float hR = texture2D(tData, vUv + vec2(px.x, 0.0)).r;
      float hD = texture2D(tData, vUv - vec2(0.0,  px.y)).r;
      float hU = texture2D(tData, vUv + vec2(0.0,  px.y)).r;
      vec2  grad = vec2(hR - hL, hU - hD) * 9.0;

      vec3  norm  = normalize(vec3(-grad, 0.28));
      vec3  light = normalize(vec3(-2.0, 9.0, 5.0));
      float spec  = pow(max(0.0, dot(norm, light)), ${SPEC_POW.toFixed(1)});
      float mag   = length(grad);

      // Electric-blue (#0066ff) ↔ cyan (#00d4ff) — matches site palette
      vec3  col = mix(vec3(0.0, 0.40, 1.0), vec3(0.0, 0.83, 1.0), spec);
      float a   = clamp(spec * 0.55 + mag * 1.2, 0.0, ${MAX_A.toFixed(2)});

      // Pre-multiplied alpha for additive overlay
      gl_FragColor = vec4(col * a, a);
    }
  `;

  /* ── Renderer + canvas ──────────────────────────────────────────── */
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      alpha: true, antialias: false, powerPreference: 'low-power',
    });
  } catch (_) { return; }

  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(1);

  const canvas = renderer.domElement;
  Object.assign(canvas.style, {
    position: 'absolute', top: '0', left: '0',
    width: '100%', height: '100%',
    pointerEvents: 'none',
    zIndex: '4',
    borderRadius: 'inherit',
  });

  /* ── Scene ──────────────────────────────────────────────────────── */
  const scene  = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const mesh   = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
  scene.add(mesh);

  /* ── Ping-pong render targets ───────────────────────────────────── */
  const texType = renderer.capabilities.floatFragmentTextures
    ? THREE.FloatType : THREE.HalfFloatType;
  const rtOpts = {
    format: THREE.RGBAFormat, type: texType,
    minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
    depthBuffer: false, stencilBuffer: false,
  };
  let rtA = new THREE.WebGLRenderTarget(SIM, SIM, rtOpts);
  let rtB = new THREE.WebGLRenderTarget(SIM, SIM, rtOpts);

  /* ── Materials ──────────────────────────────────────────────────── */
  const resVec   = new THREE.Vector2(SIM, SIM);
  const mouseVec = new THREE.Vector2(-1, -1);

  const simMat = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: SIM_FRAG,
    uniforms: {
      tPrev:  { value: null },
      res:    { value: resVec },
      mouse:  { value: mouseVec },
      force:  { value: 0 },
    },
  });

  const dispMat = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: DISP_FRAG,
    uniforms: {
      tData: { value: null },
      res:   { value: resVec },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  /* ── Loop state ─────────────────────────────────────────────────── */
  let activeCard  = null;
  let mouseActive = false;
  let lastMove    = 0;
  let raf         = null;

  /* ── Animation loop ─────────────────────────────────────────────── */
  function tick() {
    // Simulation pass → rtB (at SIM × SIM)
    simMat.uniforms.tPrev.value = rtA.texture;
    simMat.uniforms.force.value = mouseActive ? FORCE : 0;
    mouseActive = false;

    mesh.material = simMat;
    renderer.setRenderTarget(rtB);
    renderer.render(scene, camera);
    [rtA, rtB] = [rtB, rtA];

    // Display pass → canvas (at card dimensions)
    dispMat.uniforms.tData.value = rtA.texture;
    mesh.material = dispMat;
    renderer.setRenderTarget(null);
    renderer.render(scene, camera);

    raf = (Date.now() - lastMove < IDLE_MS) ? requestAnimationFrame(tick) : null;
  }

  function ensureRunning() {
    lastMove = Date.now();
    if (!raf) raf = requestAnimationFrame(tick);
  }

  /* ── Mouse handler ──────────────────────────────────────────────── */
  function onMove(e) {
    const rect = activeCard.getBoundingClientRect();
    mouseVec.x = (e.clientX - rect.left)  / rect.width;
    mouseVec.y = 1.0 - (e.clientY - rect.top) / rect.height; // flip Y
    mouseActive = true;
    ensureRunning();
  }

  /* ── Card attachment ────────────────────────────────────────────── */
  function attach(card) {
    if (activeCard === card) return;
    if (activeCard) {
      activeCard.removeEventListener('mousemove', onMove);
      if (activeCard.contains(canvas)) activeCard.removeChild(canvas);
    }
    activeCard = card;
    if (!card) return;
    card.appendChild(canvas);
    card.addEventListener('mousemove', onMove);
    const r = card.getBoundingClientRect();
    renderer.setSize(Math.round(r.width) || 800, Math.round(r.height) || 600, false);
  }

  /* ── Observe data-order attribute changes ───────────────────────── */
  new MutationObserver(() => {
    attach(document.querySelector('.folder-card[data-order="1"]'));
  }).observe(stack, { attributes: true, subtree: true, attributeFilter: ['data-order'] });

  window.addEventListener('resize', () => {
    if (!activeCard) return;
    const r = activeCard.getBoundingClientRect();
    renderer.setSize(Math.round(r.width) || 800, Math.round(r.height) || 600, false);
  });

  /* ── Boot ───────────────────────────────────────────────────────── */
  attach(document.querySelector('.folder-card[data-order="1"]'));
  // Run one silent frame to initialise render targets
  raf = requestAnimationFrame(tick);
}());
