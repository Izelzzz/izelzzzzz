function hashString(input) {
  const str = String(input ?? '')
  // FNV-1a 32bit
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

function escapeXml(unsafe) {
  return String(unsafe ?? '').replace(/[&<>"']/g, c => {
    switch (c) {
      case '&':
        return '&amp;'
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '"':
        return '&quot;'
      case "'":
        return '&#039;'
      default:
        return c
    }
  })
}

function wrapByChars(text, maxCharsPerLine) {
  const s = String(text ?? '').trim()
  if (!s) return ['未命名']
  const lines = []
  let i = 0
  while (i < s.length) {
    lines.push(s.slice(i, i + maxCharsPerLine))
    i += maxCharsPerLine
  }
  return lines.slice(0, 3) // 卡片封面最多 3 行
}

function fontSizeForTitle(title) {
  const len = String(title ?? '').trim().length
  if (len > 30) return 46
  if (len > 22) return 54
  if (len > 14) return 60
  return 66
}

export function makeCoverDataUri(title) {
  // 本地兜底封面：不渲染文字，只生成基于 seed 的配色与图形纹理
  const seed = String(title ?? '').trim() || '未命名'
  const h = hashString(seed)
  const hue1 = h % 360
  const hue2 = (hue1 + 60 + (h % 40)) % 360

  const bg1 = `hsl(${hue1}, 70%, 97%)`
  const bg2 = `hsl(${hue2}, 75%, 90%)`
  const accent = `hsl(${hue2}, 55%, 38%)`

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${bg1}"/>
      <stop offset="1" stop-color="${bg2}"/>
    </linearGradient>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="18" flood-color="rgba(15, 23, 42, 0.12)"/>
    </filter>
    <pattern id="p" width="18" height="18" patternUnits="userSpaceOnUse">
      <path d="M0 18 L18 0" stroke="rgba(15,23,42,0.06)" stroke-width="2"/>
    </pattern>
  </defs>

  <rect x="34" y="34" width="1132" height="562" rx="38" fill="url(#g)"/>
  <rect x="34" y="34" width="1132" height="562" rx="38" fill="none" stroke="rgba(15,23,42,0.10)"/>

  <g filter="url(#softShadow)">
    <circle cx="1035" cy="175" r="95" fill="${accent}" opacity="0.11"/>
    <circle cx="930" cy="280" r="150" fill="${accent}" opacity="0.08"/>
    <circle cx="820" cy="140" r="75" fill="${accent}" opacity="0.06"/>
  </g>

  <rect x="70" y="70" width="1060" height="490" rx="28" fill="url(#p)" opacity="0.55"/>
</svg>`

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

