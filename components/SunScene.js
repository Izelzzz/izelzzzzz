import { useEffect, useRef } from 'react'

/**
 * A sunrise / sunset painted live on a canvas.
 *
 * One fragment shader draws everything: sky colours that seep into each other,
 * drifting clouds, a round sun with a soft blurred rim, and water that pulls
 * the reflection apart into strokes of light. 日出 and 日落 are two palettes and
 * two sun heights; flipping the theme eases from one to the other.
 *
 * Without WebGL, or before the script runs, the CSS gradient on .scene shows.
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

vec3 sky(vec2 p, float aspect) {
  float h = clamp((p.y - u_horizon) / (1.0 - u_horizon), 0.0, 1.0);
  // Colours do not sit in bands: slow noise pushes them into each other.
  float w = fbm(vec2(p.x * 1.1 + u_time * 0.010, p.y * 2.2 - u_time * 0.006));
  float w2 = fbm(vec2(p.x * 0.6 - u_time * 0.007, p.y * 1.3 + 7.0));
  float t = h + (w - 0.5) * 0.34 + (w2 - 0.5) * 0.18;
  vec3 c = mix(u_glow, u_low, smoothstep(0.0, 0.24, t));
  c = mix(c, u_mid, smoothstep(0.18, 0.58, t));
  c = mix(c, u_top, smoothstep(0.5, 1.0, t));
  // Two layers of long thin clouds drifting at different speeds, lit from below.
  float cl = fbm(vec2(p.x * 1.4 - u_time * 0.045, p.y * 12.0 + w * 3.0));
  float band = smoothstep(0.5, 0.8, cl) * smoothstep(0.02, 0.22, h) * (1.0 - smoothstep(0.5, 0.9, h));
  c = mix(c, mix(u_low, u_glow, 0.6), band * 0.5);
  float cl2 = fbm(vec2(p.x * 0.8 - u_time * 0.022 + 5.0, p.y * 7.0 - w2 * 2.0));
  float band2 = smoothstep(0.55, 0.85, cl2) * smoothstep(0.3, 0.6, h);
  c = mix(c, mix(u_mid, u_low, 0.5), band2 * 0.35);

  // The sun is a round, softly blurred disc that holds still. Only its reflection
  // is disturbed, by the water.
  vec2 sp = vec2(u_sun.x * aspect, u_horizon + u_sun.y * u_radius);
  float d = length(p - sp);
  // Halation: light bleeding out of the disc, the way it does on film.
  float bleed = exp(-d * d / (u_radius * u_radius * 4.5)) * 0.66 + exp(-d / (u_radius * 1.2)) * 0.08;
  c = mix(c, u_halo, clamp(bleed * u_glowAmt, 0.0, 0.9));
  // A soft, out-of-focus rim: the disc fades out over the last tenth of its radius.
  float core = smoothstep(u_radius * 1.03, u_radius * 0.88, d);
  c = mix(c, u_core, core);
  return c;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float aspect = u_res.x / u_res.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  vec3 c;
  if (p.y >= u_horizon) {
    c = sky(p, aspect);
  } else {
    // Water: the sky upside down, pulled apart by ripples that widen with depth.
    float depth = (u_horizon - p.y) / u_horizon;
    float rows = p.y * 150.0 / (1.0 + depth * 2.5);
    float rip = noise(vec2(p.x * 2.2 + u_time * 0.05, rows - u_time * 0.45));
    float swell = noise(vec2(p.x * 0.8, rows * 0.22 + u_time * 0.12));
    vec2 r = vec2(p.x, u_horizon + (u_horizon - p.y) * 1.1);
    r.x += (rip - 0.5) * 0.09 * (0.25 + depth * 2.2);
    r.x += (swell - 0.5) * 0.14 * depth;
    vec3 refl = sky(r, aspect);
    float lit = smoothstep(0.3, 0.7, rip);
    float keep = (1.0 - depth * 0.75) * (0.35 + 0.65 * lit);
    c = mix(u_sea, refl, clamp(keep, 0.0, 1.0));
  }
  c += u_glow * exp(-abs(p.y - u_horizon) * 260.0) * 0.18;
  gl_FragColor = vec4(c, 1.0);
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
    core: hex('#fffaf0'),
    halo: hex('#ffdca6'),
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
  hero: { horizon: 0.26, sunX: 0.72, sunXNarrow: 0.66, radius: 0.3, day: 0.62, night: -0.28 },
  strip: { horizon: 0.3, sunX: 0.76, sunXNarrow: 0.72, radius: 0.44, day: 0.55, night: -0.3 },
  sunk: { horizon: 0.3, sunX: 0.76, sunXNarrow: 0.72, radius: 0.44, day: -1.15, night: -1.25 },
}

const RESOLUTION = 0.8 // of CSS pixels: the picture is soft, so fewer are enough
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
      const width = Math.max(2, Math.round(canvas.clientWidth * RESOLUTION))
      const height = Math.max(2, Math.round(canvas.clientHeight * RESOLUTION))
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
      gl.uniform1f(uniform('u_radius'), Math.min(config.radius, 0.36 * aspect))
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
