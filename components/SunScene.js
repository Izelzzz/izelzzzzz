import { useEffect, useRef } from 'react'

/**
 * A sunrise / sunset rendered live on a canvas.
 *
 * One fragment shader draws everything. The sky is cool overhead and warm
 * toward the sun; cloud banks drift and catch the low light on their
 * undersides; the sun burns out to white inside a coloured aureole and a band
 * of scattered light along the horizon. The water is a rippled surface seen
 * at a glancing angle: each facet mirrors the piece of sky it happens to face,
 * which is what breaks the sun into a path of glitter.
 *
 * 日出 and 日落 are two palettes and two sun heights; flipping the theme eases
 * from one to the other. Without WebGL, or before the script runs, the CSS
 * gradient on .scene shows.
 */

const FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 u_res;
uniform float u_time;
uniform float u_horizon;
uniform vec2 u_sun;
uniform float u_radius;
uniform float u_glowAmt;
uniform vec3 u_top, u_mid, u_low, u_glow, u_sea, u_core, u_halo;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 4; i++) { s += a * noise(p); p = p * 2.03 + vec2(17.3, 9.1); a *= 0.5; }
  return s;
}

// Colours are worked on as light (0 = black, large = blinding) and squeezed back
// at the end, so the sun can burn out to white while the sky keeps its hue.
vec3 toLight(vec3 c) { return -log(1.0 - c * 0.96); }
vec3 toScreen(vec3 l) { return (1.0 - exp(-l)) / 0.96; }

// Light arriving from one direction of the sky. detail = 0 skips the fine cloud
// layer, for the reflection, where ripples would hide it anyway.
vec3 skyLight(vec2 p, float aspect, float detail) {
  vec2 sp = vec2(u_sun.x * aspect, u_horizon + u_sun.y * u_radius);
  float h = clamp((p.y - u_horizon) / (1.0 - u_horizon), 0.0, 1.0);
  vec2 ds = p - sp;
  float d = length(ds);
  float r = u_radius;

  // Air: cool overhead, warm low down, and warmest in the direction of the sun.
  float toward = exp(-ds.x * ds.x / (0.9 * aspect * 0.5));
  float w = fbm(vec2(p.x * 0.9 + u_time * 0.006, p.y * 1.8));
  float t = h + (w - 0.5) * 0.16;
  vec3 warm = mix(u_low, u_glow, toward);
  vec3 c = mix(warm, u_low, smoothstep(0.0, 0.2 + 0.12 * toward, t));
  c = mix(c, u_mid, smoothstep(0.12, 0.55, t));
  c = mix(c, u_top, smoothstep(0.45, 1.0, t));
  vec3 L = toLight(c);

  // Clouds: long banks, thicker higher up, drifting. Their undersides catch
  // the low sun; the thick parts stay in shadow.
  vec2 cp = vec2(p.x * 1.1 - u_time * 0.035, p.y * 5.5);
  float warp = fbm(cp * 0.7 + 3.0);
  float dens = fbm(cp + vec2(warp * 1.6, warp * 0.8));
  if (detail > 0.5) dens += (fbm(cp * 3.1 + vec2(-u_time * 0.02, 0.0)) - 0.5) * 0.22;
  float cover = smoothstep(0.46, 0.78, dens + (h - 0.5) * 0.3) * smoothstep(0.04, 0.22, h);
  // How much low sunlight reaches this part of the cloud deck.
  float reach = exp(-d / (r * 7.5)) * (1.0 - smoothstep(0.12, 0.8, h) * 0.82);
  float thin = 1.0 - smoothstep(0.52, 0.82, dens);
  vec3 shade = toLight(mix(u_top, u_mid, 0.6) * 0.82);
  vec3 lit = toLight(mix(u_low, u_glow, 0.55)) * (1.0 + 1.3 * reach) + u_halo * thin * reach * 1.3;
  L = mix(L, mix(shade, lit, clamp(reach * 1.6 + thin * 0.2, 0.0, 1.0)), cover * 0.85);

  // The sun: a core that burns out to white, a coloured rim, a tight aureole,
  // a wider glow, and a band of scattered light that hugs the horizon.
  float veil = 1.0 - cover * 0.5;
  vec3 S = u_core * smoothstep(r * 1.0, r * 0.35, d) * 3.2;
  S += mix(u_core, u_halo, 0.6) * smoothstep(r * 1.25, r * 0.7, d) * 1.5;
  S += u_halo * exp(-d / (r * 0.6)) * 1.5;
  S += u_halo * exp(-d * d / (r * r * 16.0)) * 0.42;
  S += u_halo * 0.1 * r / (d + r * 1.2);
  float along = exp(-ds.x * ds.x / (r * r * 46.0));
  S += u_glow * exp(-abs(p.y - u_horizon) / (r * 0.4)) * along * 0.55;
  return L + S * veil * u_glowAmt;
}

float swell(vec2 w, float t) {
  float s = noise(w * vec2(0.34, 1.05) + vec2(t * 0.04, t * 0.16));
  s += noise(w * vec2(0.9, 2.5) + vec2(-t * 0.07, t * 0.3)) * 0.5;
  s += noise(w * vec2(2.3, 5.6) + vec2(t * 0.1, t * 0.52)) * 0.22;
  return s;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float aspect = u_res.x / u_res.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  vec3 L;
  if (p.y >= u_horizon) {
    L = skyLight(p, aspect, 1.0);
  } else {
    // Water. The eye is level with the horizon; each pixel below it is a ray
    // that meets the sea some distance away.
    vec3 ray = normalize(vec3(p.x - 0.5 * aspect, p.y - u_horizon, 1.0));
    float dist = 1.0 / max(u_horizon - p.y, 0.0015);
    vec2 w = vec2((p.x - 0.5 * aspect) * dist, dist);
    // Ripples flatten with distance, which is also what keeps them from flickering.
    float amp = 0.62 / (1.0 + dist * 0.22);
    float e = 0.05 + dist * 0.01;
    float h0 = swell(w, u_time);
    float hx = swell(w + vec2(e, 0.0), u_time) - h0;
    float hz = swell(w + vec2(0.0, e), u_time) - h0;
    vec3 n = normalize(vec3(-hx * amp / e, 1.0, -hz * amp / e));
    vec3 rf = reflect(ray, n);
    rf.y = abs(rf.y) + 0.002;
    rf.z = max(rf.z, 0.15);
    vec2 rp = vec2(rf.x / rf.z + 0.5 * aspect, rf.y / rf.z + u_horizon);
    vec3 refl = skyLight(rp, aspect, 0.0);
    // Glitter: facets that happen to mirror the sun straight into the eye.
    // A sun that has gone under leaves no glitter, only its afterglow.
    float up = smoothstep(-1.1, -0.3, u_sun.y);
    vec2 sp = vec2(u_sun.x * aspect, u_horizon + max(u_sun.y, 0.25) * u_radius);
    vec3 sunDir = normalize(vec3(sp.x - 0.5 * aspect, sp.y - u_horizon, 1.0));
    float aim = max(dot(normalize(rf), sunDir), 0.0);
    refl += mix(u_core, u_halo, 0.35) * (pow(aim, 900.0) * 9.0 + pow(aim, 120.0) * 0.9) * u_glowAmt * up;
    // Glancing rays mirror the sky; steeper ones look into the dark water.
    // The sea also swallows a little of what it mirrors, so it reads darker than the sky.
    float fres = 0.05 + 0.95 * pow(1.0 - max(dot(-ray, n), 0.0), 5.0);
    L = mix(toLight(u_sea) * 0.85, refl * 0.8, clamp(fres, 0.0, 1.0));
  }
  gl_FragColor = vec4(toScreen(L), 1.0);
}`

const VERTEX = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.0,1.0);}'

const hex = value => [1, 3, 5].map(i => parseInt(value.slice(i, i + 2), 16) / 255)

// Keep in step with the --sky-* and --sea tokens in styles/globals.css.
const PALETTES = {
  day: {
    top: hex('#9fbfe6'),
    mid: hex('#b3a9e3'),
    low: hex('#f09dbd'),
    glow: hex('#ffc27a'),
    sea: hex('#2a2a5e'),
    core: hex('#fff4d8'),
    halo: hex('#ffc56e'),
    glowAmt: 0.9,
  },
  night: {
    top: hex('#070818'),
    mid: hex('#1c1750'),
    low: hex('#6a2a78'),
    glow: hex('#f2765a'),
    sea: hex('#05061a'),
    core: hex('#ffd9a0'),
    halo: hex('#f68a4a'),
    glowAmt: 1,
  },
}
const COLOR_KEYS = ['top', 'mid', 'low', 'glow', 'sea', 'core', 'halo']

/** horizon: share of the height below the waterline. elev: sun centre above it, in radii. */
const VARIANTS = {
  hero: { horizon: 0.22, sunX: 0.5, sunXNarrow: 0.5, radius: 0.15, day: 0.85, night: -0.25 },
  strip: { horizon: 0.3, sunX: 0.76, sunXNarrow: 0.72, radius: 0.2, day: 1.2, night: -0.25 },
  sunk: { horizon: 0.3, sunX: 0.76, sunXNarrow: 0.72, radius: 0.2, day: -1.6, night: -1.6 },
}

const RESOLUTION = 0.85 // of CSS pixels: enough for the glitter, light enough for phones
const MAX_PIXELS = 1100000 // large windows render proportionally coarser instead of slower
const FRAME_MS = 1000 / 30
const SWITCH_SECONDS = 2.4

function activeTheme() {
  const stored = document.documentElement.getAttribute('data-theme')
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const lerp = (a, b, t) => a + (b - a) * t
const ease = t => t * t * (3 - 2 * t)

export default function SunScene({ variant = 'hero' }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const config = VARIANTS[variant] || VARIANTS.hero
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' })
    if (!gl) return undefined

    const compile = (type, source) => {
      const shader = gl.createShader(type)
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null
    }
    const vertex = compile(gl.VERTEX_SHADER, VERTEX)
    const fragment = compile(gl.FRAGMENT_SHADER, FRAGMENT)
    if (!vertex || !fragment) return undefined
    const program = gl.createProgram()
    gl.attachShader(program, vertex)
    gl.attachShader(program, fragment)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return undefined
    gl.useProgram(program)
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const position = gl.getAttribLocation(program, 'a')
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
    const uniform = name => gl.getUniformLocation(program, name)

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)')
    let night = activeTheme() === 'dark' ? 1 : 0 // 0 = 日出, 1 = 日落
    let target = night
    let visible = true
    let frame = 0
    let last = 0
    let alive = true
    const start = performance.now()

    const resize = () => {
      const area = canvas.clientWidth * canvas.clientHeight
      const scale = Math.min(RESOLUTION, Math.sqrt(MAX_PIXELS / Math.max(area, 1)))
      const width = Math.max(2, Math.round(canvas.clientWidth * scale))
      const height = Math.max(2, Math.round(canvas.clientHeight * scale))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
        gl.viewport(0, 0, width, height)
      }
    }

    const draw = now => {
      const t = ease(night)
      const aspect = canvas.width / canvas.height
      gl.uniform2f(uniform('u_res'), canvas.width, canvas.height)
      // A fixed moment when motion is reduced, so the picture holds still.
      gl.uniform1f(uniform('u_time'), reducedMotion.matches ? 20 : 20 + (now - start) / 1000)
      gl.uniform1f(uniform('u_horizon'), config.horizon)
      gl.uniform1f(uniform('u_radius'), Math.min(config.radius, 0.3 * aspect))
      gl.uniform2f(uniform('u_sun'), aspect < 1 ? config.sunXNarrow : config.sunX, lerp(config.day, config.night, t))
      gl.uniform1f(uniform('u_glowAmt'), lerp(PALETTES.day.glowAmt, PALETTES.night.glowAmt, t))
      for (const key of COLOR_KEYS) {
        const a = PALETTES.day[key]
        const b = PALETTES.night[key]
        gl.uniform3f(uniform(`u_${key}`), lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t))
      }
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      canvas.classList.add('is-live')
    }

    const tick = now => {
      if (!alive) return
      frame = 0
      const elapsed = now - last
      if (elapsed >= FRAME_MS) {
        if (night !== target) {
          const step = Math.min(elapsed, 100) / 1000 / SWITCH_SECONDS
          night = target > night ? Math.min(target, night + step) : Math.max(target, night - step)
        }
        last = now
        draw(now)
      }
      schedule()
    }

    // Keep drawing only while it can be seen and something is moving.
    const schedule = () => {
      if (!alive || frame || !visible || document.hidden) return
      if (reducedMotion.matches && night === target) return
      frame = requestAnimationFrame(tick)
    }

    const onTheme = () => {
      target = activeTheme() === 'dark' ? 1 : 0
      if (reducedMotion.matches) {
        night = target
        draw(performance.now())
      }
      schedule()
    }
    const onResize = () => {
      resize()
      draw(performance.now())
      schedule()
    }
    const onLost = event => {
      event.preventDefault()
      alive = false
      canvas.classList.remove('is-live')
    }

    const themeObserver = new MutationObserver(onTheme)
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    systemDark.addEventListener('change', onTheme)
    reducedMotion.addEventListener('change', onResize)
    document.addEventListener('visibilitychange', schedule)
    canvas.addEventListener('webglcontextlost', onLost)
    const resizeObserver = new ResizeObserver(onResize)
    resizeObserver.observe(canvas)
    const viewObserver = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting
      schedule()
    })
    viewObserver.observe(canvas)

    resize()
    draw(performance.now())
    schedule()

    return () => {
      alive = false
      cancelAnimationFrame(frame)
      themeObserver.disconnect()
      resizeObserver.disconnect()
      viewObserver.disconnect()
      systemDark.removeEventListener('change', onTheme)
      reducedMotion.removeEventListener('change', onResize)
      document.removeEventListener('visibilitychange', schedule)
      canvas.removeEventListener('webglcontextlost', onLost)
    }
  }, [variant])

  return (
    <div className={`scene scene-${variant}`} aria-hidden="true">
      <canvas ref={canvasRef} className="scene-canvas" />
      <div className="scene-grain" />
      <div className="scene-mist" />
    </div>
  )
}
