/**
 * Decorative sunrise used behind the home hero. Colours come from CSS custom
 * properties, so one inline SVG serves both the light and the dark theme.
 * Star positions are fixed: random values would differ between server and client.
 */
const STARS = [
  [389, 40, 1.2], [439, 20, 1], [84, 27, 0.9], [268, 140, 1.4], [1172, 18, 1.4],
  [141, 73, 1.3], [767, 86, 1], [544, 71, 1.3], [689, 118, 1.4], [587, 16, 1.2],
  [1051, 74, 1.2], [342, 89, 1.2], [297, 90, 1.4], [498, 83, 1.4], [315, 9, 0.9],
  [1144, 153, 1], [926, 120, 1.3], [888, 56, 1], [34, 67, 0.8], [574, 45, 1.3],
  [1166, 91, 0.9], [220, 9, 1.3], [941, 30, 1.1], [820, 150, 0.8], [640, 170, 0.9],
]

function hills(base, amplitude, period, width = 1500) {
  let d = `M0,${base}`
  for (let x = 10; x <= width; x += 10) {
    const y = base + Math.sin((x / period) * Math.PI * 2) * amplitude
    d += ` L${x},${y.toFixed(1)}`
  }
  return `${d} L${width},400 L0,400 Z`
}

const HILL_BACK = hills(332, 7, 300)
const HILL_MID = hills(348, 9, 400)
const HILL_FRONT = hills(366, 6, 240)

export default function DawnSky() {
  return (
    <svg
      className="dawn-sky"
      viewBox="0 0 1200 400"
      preserveAspectRatio="xMaxYMax slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="dawn-sky-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="dawn-stop-0" />
          <stop offset="0.5" className="dawn-stop-1" />
          <stop offset="0.78" className="dawn-stop-2" />
          <stop offset="0.92" className="dawn-stop-3" />
          <stop offset="1" className="dawn-stop-4" />
        </linearGradient>
        <radialGradient id="dawn-glow">
          <stop offset="0" className="dawn-glow-0" />
          <stop offset="1" className="dawn-glow-1" />
        </radialGradient>
        <linearGradient id="dawn-disc" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="dawn-disc-0" />
          <stop offset="1" className="dawn-disc-1" />
        </linearGradient>
      </defs>
      <rect width="1200" height="400" fill="url(#dawn-sky-fill)" />
      <g className="dawn-stars">
        {STARS.map(([cx, cy, r], i) => (
          <circle key={i} cx={cx} cy={cy} r={r} style={{ animationDelay: `${-(i % 7) * 0.8}s` }} />
        ))}
      </g>
      <circle className="dawn-glow" cx="990" cy="338" r="190" fill="url(#dawn-glow)" />
      <circle className="dawn-sun" cx="990" cy="338" r="50" fill="url(#dawn-disc)" />
      <path className="dawn-hill dawn-hill-back" d={HILL_BACK} />
      <path className="dawn-hill dawn-hill-mid" d={HILL_MID} />
      <path className="dawn-hill dawn-hill-front" d={HILL_FRONT} />
    </svg>
  )
}
