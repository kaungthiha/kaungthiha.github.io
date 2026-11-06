/* ──────────────────────────────────────────────────────────────────────
   Painted dusk forest — one painting, brought to life in a single shader.

   The scene is the master gouache painting plus a mask texture derived from
   it (scripts/build-dusk-assets.mjs): R = open sky, G = how far foliage
   sways, B = depth. Everything that moves is live, never painted:

     wind sway on the canopy and grass, slow parallax drift, the sky's
     colour by time of day, drifting clouds behind the leaves, stars and a
     moon in tonight's real phase, valley mist, fog, fireflies, rain, snow,
     lightning, film grain — all driven by the existing weather.js state
     (`weather:change` → {mode, phase}).

   One fullscreen WebGL2 pass; no 3D engine needed for a painted plate.
   Falls back to the static painting (CSS background) without WebGL2, and
   renders a single still frame under prefers-reduced-motion.
   ────────────────────────────────────────────────────────────────────── */

type Mode = 'sunny' | 'clear' | 'cloudy' | 'rainy' | 'stormy' | 'snowy' | 'foggy' | 'windy' | 'hot' | 'cold';
type Phase = 'day' | 'dawn' | 'dusk' | 'night';
type Vec3 = [number, number, number];

const PAINT_W = 1536;
const PAINT_H = 1024;
// Tonight's moon sits in open sky right of centre, clear of both trees.
const MOON_POS: [number, number] = [0.705, 0.215];

// ── Look per daylight phase. The painting is natively dusk, so dusk is the
// identity grade; the others re-grade the painting and re-paint the sky.
interface Look {
  exposure: number; sat: number; contrast: number; tint: Vec3; lift: Vec3;
  skyMix: number; skyTop: Vec3; skyBot: Vec3; skyDetail: number;
  stars: number; moon: number; fireflies: number;
  mistColor: Vec3; cloudColor: Vec3; pool: number;
}
const PHASE_LOOK: Record<Phase, Look> = {
  dusk: {
    exposure: 1, sat: 1, contrast: 1, tint: [1, 1, 1], lift: [0, 0, 0],
    skyMix: 0, skyTop: [0.45, 0.47, 0.66], skyBot: [0.9, 0.66, 0.55], skyDetail: 1,
    stars: 0.35, moon: 0.55, fireflies: 0.75,
    mistColor: [0.76, 0.72, 0.82], cloudColor: [0.7, 0.6, 0.68], pool: 0.16,
  },
  night: {
    exposure: 0.5, sat: 0.55, contrast: 1.06, tint: [0.62, 0.74, 1], lift: [0.008, 0.012, 0.026],
    skyMix: 0.9, skyTop: [0.022, 0.032, 0.075], skyBot: [0.085, 0.105, 0.19], skyDetail: 0.32,
    stars: 1, moon: 1, fireflies: 1,
    mistColor: [0.2, 0.24, 0.34], cloudColor: [0.13, 0.15, 0.23], pool: 0,
  },
  dawn: {
    exposure: 0.92, sat: 0.9, contrast: 1, tint: [1, 0.94, 0.95], lift: [0, 0, 0],
    skyMix: 0.35, skyTop: [0.42, 0.47, 0.66], skyBot: [0.96, 0.78, 0.7], skyDetail: 0.9,
    stars: 0.08, moon: 0.25, fireflies: 0,
    mistColor: [0.9, 0.81, 0.82], cloudColor: [0.9, 0.76, 0.75], pool: 0.12,
  },
  // Late golden afternoon rather than bright noon: warm, still a little moody.
  day: {
    exposure: 1.1, sat: 0.92, contrast: 0.98, tint: [1.03, 1, 0.95], lift: [0, 0, 0],
    skyMix: 0.6, skyTop: [0.46, 0.56, 0.74], skyBot: [0.87, 0.84, 0.79], skyDetail: 0.9,
    stars: 0, moon: 0, fireflies: 0,
    mistColor: [0.85, 0.86, 0.88], cloudColor: [0.88, 0.88, 0.9], pool: 0.14,
  },
};

// ── Weather on top of the phase look.
interface Weather {
  clouds: number; cloudSpeed: number; cloudShade: number; mist: number; fog: number;
  rain: number; snow: number; storm: boolean; wind: number;
  satMul: number; expMul: number; contrastMul: number; tintMul: Vec3;
  skyGrey: number; greyTo: Vec3; skyClarity: number; fireflyMul: number;
}
const CALM: Weather = {
  clouds: 0.12, cloudSpeed: 0.004, cloudShade: 1, mist: 0.35, fog: 0, rain: 0, snow: 0, storm: false, wind: 1,
  satMul: 1, expMul: 1, contrastMul: 1, tintMul: [1, 1, 1], skyGrey: 0, greyTo: [0.56, 0.58, 0.64], skyClarity: 1, fireflyMul: 1,
};
const WEATHER: Record<Mode, Weather> = {
  clear: CALM,
  sunny: { ...CALM, clouds: 0.18 },
  hot: { ...CALM, clouds: 0.1, tintMul: [1.05, 1, 0.92] },
  cold: { ...CALM, clouds: 0.16, tintMul: [0.94, 0.98, 1.06], satMul: 0.9 },
  windy: { ...CALM, clouds: 0.32, cloudSpeed: 0.012, wind: 2.2, mist: 0.2 },
  cloudy: { ...CALM, clouds: 0.62, cloudShade: 0.92, satMul: 0.85, expMul: 0.92, skyGrey: 0.45, skyClarity: 0.15, mist: 0.5, fireflyMul: 0.6 },
  rainy: {
    ...CALM, clouds: 0.86, cloudShade: 0.72, satMul: 0.7, expMul: 0.78, skyGrey: 0.7, greyTo: [0.4, 0.44, 0.52],
    skyClarity: 0, mist: 0.75, rain: 0.8, wind: 1.4, fireflyMul: 0,
  },
  stormy: {
    ...CALM, clouds: 1, cloudShade: 0.5, cloudSpeed: 0.009, satMul: 0.6, expMul: 0.62, skyGrey: 0.85, greyTo: [0.26, 0.29, 0.36],
    skyClarity: 0, mist: 0.6, rain: 1, storm: true, wind: 2, fireflyMul: 0,
  },
  snowy: { ...CALM, clouds: 0.55, satMul: 0.75, tintMul: [0.95, 0.99, 1.06], skyGrey: 0.3, skyClarity: 0.3, mist: 0.4, snow: 0.8, fireflyMul: 0 },
  foggy: { ...CALM, clouds: 0.4, satMul: 0.65, contrastMul: 0.85, skyGrey: 0.4, skyClarity: 0, mist: 1, fog: 0.7, fireflyMul: 0.3, wind: 0.6 },
};

// The numeric uniforms that ease between states (scalars and colours).
interface Params {
  exposure: number; sat: number; contrast: number; tint: Vec3; lift: Vec3;
  skyMix: number; skyTop: Vec3; skyBot: Vec3; skyDetail: number;
  stars: number; moon: number; fireflies: number; mistColor: Vec3; cloudColor: Vec3;
  clouds: number; cloudSpeed: number; mist: number; fog: number; rain: number; snow: number; wind: number; pool: number;
}

function mix3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
function mul3(a: Vec3, b: Vec3): Vec3 { return [a[0] * b[0], a[1] * b[1], a[2] * b[2]]; }

function compose(mode: Mode, phase: Phase): Params {
  const L = PHASE_LOOK[phase];
  const w = WEATHER[mode];
  // Overcast skies pull the phase's sky toward grey, darker at night.
  const grey = phase === 'night' ? mul3(w.greyTo, [0.25, 0.27, 0.32]) : w.greyTo;
  return {
    exposure: L.exposure * w.expMul,
    sat: L.sat * w.satMul,
    contrast: L.contrast * w.contrastMul,
    tint: mul3(L.tint, w.tintMul),
    lift: L.lift,
    skyMix: Math.max(L.skyMix, w.skyGrey),
    skyTop: mix3(L.skyTop, grey, w.skyGrey),
    skyBot: mix3(L.skyBot, grey, w.skyGrey),
    skyDetail: L.skyDetail,
    stars: L.stars * w.skyClarity,
    moon: L.moon * Math.max(w.skyClarity, 0.15),
    fireflies: L.fireflies * w.fireflyMul,
    mistColor: L.mistColor,
    cloudColor: L.cloudColor.map((c) => c * w.cloudShade) as Vec3,
    clouds: w.clouds,
    cloudSpeed: w.cloudSpeed,
    mist: w.mist,
    fog: w.fog,
    rain: w.rain,
    snow: w.snow,
    wind: w.wind,
    pool: L.pool,
  };
}

// Moon phase from the date: 0 new → 0.5 full → 1 new.
function moonPhase(date = new Date()): number {
  const SYNODIC = 29.530588853;
  const REF_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14) / 86400000;
  const days = date.getTime() / 86400000 - REF_NEW_MOON;
  return ((days / SYNODIC) % 1 + 1) % 1;
}

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
uniform sampler2D uTex, uMask;
uniform vec2 uRes, uScale, uOffset, uCam, uMoonPos;
uniform float uTime, uWind, uExposure, uSat, uContrast, uSkyMix, uSkyDetail;
uniform vec3 uTint, uLift, uSkyTop, uSkyBot, uMistColor, uCloudColor, uFadeColor;
uniform float uStars, uMoon, uMoonPhase, uMoonLit, uClouds, uCloudSpeed, uMist, uFog;
uniform float uFireflies, uRain, uSnow, uFlash, uFade, uGrain, uPool;
out vec4 outColor;

const vec2 PAINT = vec2(${PAINT_W}.0, ${PAINT_H}.0);

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x),
             mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + vec2(17.1, 9.2); a *= 0.5; }
  return v;
}

vec3 grade(vec3 c) {
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(vec3(l), c, uSat);
  c = (c - 0.5) * uContrast + 0.5;
  return c * uExposure * uTint + uLift;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  uv.y = 1.0 - uv.y;                       // top-left origin, like the image
  float aspect = uRes.x / uRes.y;
  float t = uTime;

  // Painting coordinates (cover-fit + push-in), then parallax by depth.
  vec2 p = uv * uScale + uOffset;
  float d0 = texture(uMask, p).b;
  vec2 pp = p + uCam * (d0 - 0.35);

  // Wind: coherent branch motion plus a finer leaf flutter, in gusts.
  float sway = texture(uMask, pp).g;
  float gust = 0.6 + 0.4 * sin(t * 0.37 + pp.x * 2.0) * sin(t * 0.13 + 1.3);
  vec2 w = vec2(noise(pp * vec2(9.0, 6.0) + vec2(t * 0.55, t * 0.21)) - 0.5,
                noise(pp * vec2(7.0, 9.0) + vec2(-t * 0.37, t * 0.47)) - 0.5);
  w += 0.35 * vec2(noise(pp * 34.0 + t * 1.6) - 0.5, noise(pp * 31.0 - t * 1.4) - 0.5);
  vec2 s = pp + sway * uWind * gust * w * vec2(0.0045, 0.003);

  vec3 raw = texture(uTex, s).rgb;
  vec3 m = texture(uMask, s).rgb;
  float sky = m.r, depth = m.b;

  vec3 col = grade(raw);

  // Re-paint the sky for the time of day, keeping the painting's brushwork.
  vec3 blurred = texture(uTex, s, 5.0).rgb;
  vec3 skyCol = mix(uSkyTop, uSkyBot, smoothstep(0.0, 0.6, s.y)) + (raw - blurred) * uSkyDetail;
  col = mix(col, skyCol, sky * uSkyMix);

  // Live clouds drift behind the canopy (sky only).
  float cloudOcc = 0.0;
  if (sky > 0.01 && uClouds > 0.01) {
    vec2 cq = vec2(s.x * 2.2 + t * uCloudSpeed, s.y * 5.5);
    float f = fbm(cq), f2 = fbm(cq * 2.3 + 5.0);
    float lo = 0.66 - uClouds * 0.5;
    cloudOcc = smoothstep(lo, lo + 0.3, f * 0.8 + f2 * 0.35) * (0.45 + 0.55 * smoothstep(0.66, 0.25, s.y));
    col = mix(col, uCloudColor * mix(0.78, 1.08, f2), cloudOcc * sky * 0.9);
  }

  // Stars: sparse, twinkling, thinning toward the horizon.
  if (sky > 0.01 && uStars > 0.01) {
    vec2 sp = s * PAINT / 5.0;
    vec2 id = floor(sp), fr = fract(sp) - 0.5;
    float h = hash12(id);
    if (h > 0.93) {
      vec2 off = vec2(hash12(id + 7.1), hash12(id + 3.3)) - 0.5;
      float mag = pow(hash12(id + 1.7), 3.0);
      float tw = 0.75 + 0.25 * sin(t * (1.0 + h * 3.0) + h * 40.0);
      float star = smoothstep(0.24, 0.0, length(fr - off * 0.6)) * (0.35 + mag) * tw;
      float seen = smoothstep(1.0 - uStars, 1.15 - uStars, mag + 0.12);
      float dark = smoothstep(0.5, 0.18, dot(col, vec3(0.299, 0.587, 0.114)));
      col += vec3(0.86, 0.89, 1.0) * star * seen * dark * sky * (1.0 - cloudOcc) * smoothstep(0.62, 0.38, s.y);
    }
  }

  // The moon, in its real phase for today, behind leaves and clouds.
  if (uMoon > 0.01) {
    vec2 mp = (s - uMoonPos) * PAINT / 22.0;
    float md = length(mp);
    if (md < 8.0) {
      float rim = sqrt(max(0.0, 1.0 - mp.y * mp.y));
      float k = cos(6.2831853 * uMoonPhase);
      float lit = uMoonPhase < 0.5
        ? smoothstep(k * rim - 0.08, k * rim + 0.08, mp.x)
        : smoothstep(-k * rim + 0.08, -k * rim - 0.08, mp.x);
      float disc = smoothstep(1.0, 0.93, md);
      vec3 moonCol = vec3(0.96, 0.93, 0.84) * (0.88 + 0.12 * noise(mp * 3.0));
      float clear = sky * (1.0 - cloudOcc * 0.85);
      col = mix(col, moonCol, disc * (lit + 0.02 * (1.0 - lit)) * uMoon * clear);
      col += vec3(0.85, 0.86, 0.95) * exp(-md * 0.55) * 0.1 * uMoon * (0.3 + uMoonLit) * clear * step(1.0, md);
    }
  }

  // Valley mist: two slow layers drifting opposite ways between the ridges.
  if (uMist > 0.01 && s.y > 0.5) {
    float band = smoothstep(0.1, 0.22, depth) * (1.0 - smoothstep(0.48, 0.62, depth));
    if (band > 0.0) {
      float f = fbm(vec2(s.x * 3.0 + t * 0.010, s.y * 9.0));
      float f2 = fbm(vec2(s.x * 5.0 - t * 0.014, s.y * 14.0 + 3.0));
      col = mix(col, uMistColor, uMist * band * smoothstep(0.45, 0.85, f * 0.6 + f2 * 0.5) * 0.6);
    }
  }
  // Fog veils the distance first.
  col = mix(col, uMistColor, uFog * (1.0 - depth * 0.75));

  // Lightning lights the sky most, the land a little.
  col += uFlash * vec3(0.55, 0.6, 0.76) * (0.3 + sky * 0.7);

  // Fireflies over the meadow.
  if (uFireflies > 0.01 && s.y > 0.62) {
    vec2 q = s * PAINT;
    float glow = 0.0;
    for (int i = 0; i < 18; i++) {
      float fi = float(i);
      vec2 base = vec2(220.0 + hash12(vec2(fi, 1.3)) * 1180.0, 730.0 + hash12(vec2(fi, 7.7)) * 210.0);
      vec2 wob = vec2(sin(t * 0.27 + fi * 1.7) * 38.0 + sin(t * 0.61 + fi) * 12.0,
                      cos(t * 0.21 + fi * 2.3) * 22.0 + sin(t * 0.83 + fi * 0.7) * 8.0);
      float dd = length(q - base - wob);
      float pulse = smoothstep(0.15, 1.0, sin(t * (0.6 + hash12(vec2(fi, 3.1)) * 0.9) + fi * 4.0));
      glow += (exp(-dd * dd / 72.0) * 0.5 + smoothstep(2.2, 0.0, dd) * 0.6) * pulse;
    }
    col += vec3(1.0, 0.78, 0.4) * glow * uFireflies;
  }

  // Rain: two layers of thin slanted streaks (screen space).
  if (uRain > 0.01) {
    float r = 0.0;
    for (int L = 0; L < 2; L++) {
      float fl = float(L), sc = 1.0 + fl * 0.8;
      vec2 q = vec2((uv.x + uv.y * 0.12) * 120.0 * sc, uv.y * 3.0 * sc - t * (2.6 + fl * 0.9));
      float h = hash12(vec2(floor(q.x), fl));
      float y = fract(q.y + h * 7.0);
      r += smoothstep(0.09, 0.0, abs(fract(q.x) - 0.5)) * smoothstep(0.0, 0.02, y) * smoothstep(0.16, 0.02, y)
         * step(0.45, h) * (0.6 - fl * 0.25);
    }
    col += vec3(0.75, 0.8, 0.9) * r * 0.22 * uRain;
  }

  // Snow: three depths of drifting flakes.
  if (uSnow > 0.01) {
    float sn = 0.0;
    for (int L = 0; L < 3; L++) {
      float fl = float(L), sc = 9.0 + fl * 7.0;
      vec2 q = uv * vec2(aspect, 1.0) * sc + vec2(sin(t * 0.4 + fl) * 0.4, -t * (0.35 + fl * 0.12));
      vec2 id = floor(q), fr = fract(q);
      vec2 c = vec2(hash12(id + fl * 13.0), hash12(id + fl * 29.0 + 3.0));
      c.x += sin(t * 0.8 + hash12(id) * 6.28) * 0.15;
      float size = (0.026 - fl * 0.006) * (0.6 + 0.8 * hash12(id + 47.0));
      sn += smoothstep(size, size * 0.15, length(fr - c)) * step(0.45, hash12(id + 91.0)) * (0.9 - fl * 0.25);
    }
    col += vec3(0.92, 0.94, 1.0) * sn * 0.7 * uSnow;
  }

  // A soft pool of shade behind the title, then the vignette.
  vec2 tp = (uv - vec2(0.5, 0.4)) * vec2(aspect * 0.55, 1.5);
  col *= 1.0 - uPool * exp(-dot(tp, tp) * 3.0);
  vec2 vp = (uv - 0.5) * vec2(aspect * 0.75, 1.0);
  col *= mix(0.62, 1.0, smoothstep(1.2, 0.3, length(vp)));

  // Descend into the forest: fade toward the content colour on scroll.
  col = mix(col, uFadeColor, uFade);

  col += (hash12(gl_FragCoord.xy + fract(t * 7.0) * 97.0) - 0.5) * uGrain;
  outColor = vec4(col, 1.0);
}`;

export function initDusk(host: HTMLElement, opts: { masterUrl: string; maskUrl: string; fadeColor: Vec3 }): void {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'low-power' });
  if (!gl) return; // the host's CSS background (the painting) stays as the fallback

  // ── Program ────────────────────────────────────────────────────────
  function shader(type: number, src: string): WebGLShader {
    const s = gl!.createShader(type)!;
    gl!.shaderSource(s, src);
    gl!.compileShader(s);
    if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS)) throw new Error(gl!.getShaderInfoLog(s) || 'shader');
    return s;
  }
  const prog = gl.createProgram()!;
  try {
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || 'link');
  } catch (err) {
    console.warn('[dusk] WebGL unavailable, keeping the still painting.', err);
    return;
  }
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const U: Record<string, WebGLUniformLocation | null> = {};
  const u = (name: string) => (name in U ? U[name] : (U[name] = gl.getUniformLocation(prog, name)));

  // ── Textures ───────────────────────────────────────────────────────
  async function loadTexture(url: string, unit: number, mipmaps: boolean, data: boolean): Promise<void> {
    const blob = await (await fetch(url)).blob();
    const bmp = await createImageBitmap(blob, { colorSpaceConversion: data ? 'none' : 'default', premultiplyAlpha: 'none' });
    const tex = gl!.createTexture();
    gl!.activeTexture(gl!.TEXTURE0 + unit);
    gl!.bindTexture(gl!.TEXTURE_2D, tex);
    gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, gl!.RGBA, gl!.UNSIGNED_BYTE, bmp);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
    if (mipmaps) {
      gl!.generateMipmap(gl!.TEXTURE_2D);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR_MIPMAP_LINEAR);
    } else {
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR);
    }
    bmp.close();
  }

  // ── State: current params ease toward the target on every change ───
  const initial = (window as any).KTWeatherState;
  const themePhase: Record<string, Phase> = { light: 'day', dawn: 'dawn', dusk: 'dusk', dark: 'night' };
  let mode: Mode = (initial?.mode in WEATHER ? initial.mode : 'clear') as Mode;
  let phase: Phase = (initial?.phase in PHASE_LOOK
    ? initial.phase
    : themePhase[document.documentElement.dataset.theme || ''] ?? 'dusk') as Phase;
  let target = compose(mode, phase);
  const cur: Params = structuredClone(target);
  const moon = moonPhase();
  const moonLit = (1 - Math.cos(2 * Math.PI * moon)) / 2;

  function ease(k: number): void {
    for (const key of Object.keys(cur) as (keyof Params)[]) {
      const a = cur[key], b = target[key];
      if (Array.isArray(a)) for (let i = 0; i < 3; i++) a[i] += ((b as Vec3)[i] - a[i]) * k;
      else (cur as any)[key] = a + ((b as number) - a) * k;
    }
  }

  // ── Layout: cover-fit with a small overscan for parallax ───────────
  let scale: [number, number] = [1, 1], offset: [number, number] = [0, 0];
  let progress = 0;
  const camTarget: [number, number] = [0, 0], cam: [number, number] = [0, 0];

  function layout(): void {
    const dprCap = window.innerWidth < 720 ? 1.5 : 1.25;
    const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
    const w = Math.round(host.clientWidth * dpr), h = Math.round(host.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl!.viewport(0, 0, w, h);
  }
  function framing(): void {
    const A = canvas.width / canvas.height, P = PAINT_W / PAINT_H;
    // Push in toward the meadow as the visitor scrolls down.
    const zoom = 1.025 + 0.09 * progress;
    let sx = 1, sy = 1;
    if (A > P) sy = P / A; else sx = A / P;
    sx /= zoom; sy /= zoom;
    // Portrait screens keep the peak and part of the oak in frame.
    const fx = A > P ? 0.5 : 0.4, fy = 0.5 + 0.12 * progress;
    scale = [sx, sy];
    offset = [(1 - sx) * fx, (1 - sy) * fy];
  }

  // ── Lightning ──────────────────────────────────────────────────────
  let flash = 0, nextFlash = 4 + Math.random() * 8, flashAt = -1;
  function lightning(t: number): number {
    if (mode !== 'stormy' || reduceMotion) return 0;
    if (flashAt < 0 && t > nextFlash) { flashAt = t; nextFlash = t + 8 + Math.random() * 14; }
    if (flashAt < 0) return 0;
    const e = t - flashAt;
    if (e > 0.6) { flashAt = -1; return 0; }
    return Math.max(0, 1 - e / 0.12) * 0.9 + (e > 0.2 ? Math.max(0, 1 - (e - 0.2) / 0.25) * 0.6 : 0);
  }

  // ── Render ─────────────────────────────────────────────────────────
  const start = performance.now();
  let last = start, raf = 0, ready = false;

  function draw(now: number): void {
    const t = reduceMotion ? 12 : (now - start) / 1000;
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    ease(reduceMotion ? 1 : 1 - Math.exp(-dt / 1.1));
    cam[0] += (camTarget[0] - cam[0]) * Math.min(1, dt * 2.5);
    cam[1] += (camTarget[1] - cam[1]) * Math.min(1, dt * 2.5);
    const drift = reduceMotion ? [0, 0] : [Math.sin(t * 0.05) * 0.0022, Math.cos(t * 0.037) * 0.0014];
    flash = lightning(t);
    framing();

    gl!.uniform2f(u('uRes'), canvas.width, canvas.height);
    gl!.uniform2f(u('uScale'), scale[0], scale[1]);
    gl!.uniform2f(u('uOffset'), offset[0], offset[1]);
    gl!.uniform2f(u('uCam'), cam[0] + drift[0], cam[1] + drift[1]);
    gl!.uniform2f(u('uMoonPos'), MOON_POS[0], MOON_POS[1]);
    gl!.uniform1f(u('uTime'), t);
    gl!.uniform1f(u('uWind'), reduceMotion ? 0 : cur.wind);
    gl!.uniform1f(u('uExposure'), cur.exposure);
    gl!.uniform1f(u('uSat'), cur.sat);
    gl!.uniform1f(u('uContrast'), cur.contrast);
    gl!.uniform3fv(u('uTint'), cur.tint);
    gl!.uniform3fv(u('uLift'), cur.lift);
    gl!.uniform1f(u('uSkyMix'), cur.skyMix);
    gl!.uniform3fv(u('uSkyTop'), cur.skyTop);
    gl!.uniform3fv(u('uSkyBot'), cur.skyBot);
    gl!.uniform1f(u('uSkyDetail'), cur.skyDetail);
    gl!.uniform1f(u('uStars'), cur.stars);
    gl!.uniform1f(u('uMoon'), moonLit < 0.03 ? 0 : cur.moon);
    gl!.uniform1f(u('uMoonPhase'), moon);
    gl!.uniform1f(u('uMoonLit'), moonLit);
    gl!.uniform1f(u('uClouds'), cur.clouds);
    gl!.uniform1f(u('uCloudSpeed'), cur.cloudSpeed);
    gl!.uniform3fv(u('uCloudColor'), cur.cloudColor);
    gl!.uniform1f(u('uMist'), cur.mist);
    gl!.uniform1f(u('uFog'), cur.fog);
    gl!.uniform3fv(u('uMistColor'), cur.mistColor);
    gl!.uniform1f(u('uFireflies'), cur.fireflies);
    gl!.uniform1f(u('uRain'), cur.rain);
    gl!.uniform1f(u('uSnow'), cur.snow);
    gl!.uniform1f(u('uFlash'), flash);
    gl!.uniform1f(u('uPool'), cur.pool * (1 - progress));
    gl!.uniform1f(u('uFade'), 0.9 * Math.min(1, Math.max(0, (progress - 0.1) / 0.8)));
    gl!.uniform3fv(u('uFadeColor'), opts.fadeColor);
    gl!.uniform1f(u('uGrain'), 0.035);
    gl!.uniform1i(u('uTex'), 0);
    gl!.uniform1i(u('uMask'), 1);
    gl!.drawArrays(gl!.TRIANGLES, 0, 3);
  }

  // Animate while the painting is on screen; hold a still frame otherwise.
  function loop(now: number): void {
    draw(now);
    raf = progress < 1 && !document.hidden ? requestAnimationFrame(loop) : 0;
  }
  function wake(): void {
    if (!ready) return;
    if (reduceMotion) { draw(performance.now()); return; }
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); }
  }

  function onScroll(): void {
    progress = Math.min(1, Math.max(0, window.scrollY / (window.innerHeight * 0.9)));
    if (progress < 1) wake(); else if (ready) draw(performance.now());
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => { layout(); wake(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });
  if (finePointer && !reduceMotion) {
    window.addEventListener('pointermove', (e) => {
      camTarget[0] = (e.clientX / window.innerWidth - 0.5) * 0.007;
      camTarget[1] = (e.clientY / window.innerHeight - 0.5) * 0.004;
    }, { passive: true });
  }
  window.addEventListener('weather:change', (e) => {
    const d = (e as CustomEvent).detail || {};
    if (d.mode in WEATHER) mode = d.mode;
    if (d.phase in PHASE_LOOK) phase = d.phase;
    target = compose(mode, phase);
    wake();
  });

  // ── Boot ───────────────────────────────────────────────────────────
  Promise.all([
    loadTexture(opts.masterUrl, 0, true, false),
    loadTexture(opts.maskUrl, 1, false, true),
  ]).then(() => {
    host.appendChild(canvas);
    layout();
    ready = true;
    onScroll();
    draw(performance.now());
    requestAnimationFrame(() => host.classList.add('is-live'));
    wake();
  }).catch((err) => console.warn('[dusk] could not load the painting textures', err));

  (window as any).DuskScene = { setContext: (m: Mode, p: Phase) => window.dispatchEvent(new CustomEvent('weather:change', { detail: { mode: m, phase: p } })) };
}
