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

/**
 * Fallback cover for posts without one: flat sky bands, a sliced sun and a dark
 * sea, the same language as the site's hero. The title picks the sky and where
 * the sun sits, so a post looks the same in the list and on its own page.
 */
export function makeCoverDataUri(title) {
  const seed = String(title ?? '').trim() || '未命名'
  const h = hashString(seed)
  const skies = [
    { bands: ['#070818', '#17154a', '#4b1f6f', '#cf4f63'], sea: '#03040d', sun: ['#ffe7ae', '#f6a14a'] },
    { bands: ['#fbf3e4', '#ffd9a8', '#ff9f6b', '#e8564a'], sea: '#1b1a3a', sun: ['#fffbe8', '#ffd166'] },
    { bands: ['#17154a', '#4b1f6f', '#cf4f63', '#f6a14a'], sea: '#070818', sun: ['#fffbe8', '#ffd166'] },
    { bands: ['#1b1a3a', '#3a2a6b', '#e8564a', '#ffd9a8'], sea: '#070818', sun: ['#fbf3e4', '#ff9f6b'] },
    { bands: ['#ffd9a8', '#ff9f6b', '#e8564a', '#4b1f6f'], sea: '#17154a', sun: ['#fffbe8', '#ffd166'] },
  ]
  const sky = skies[h % skies.length]
  const horizon = 430 + ((h >>> 4) % 60)
  const radius = 150 + ((h >>> 8) % 90)
  const cx = 260 + ((h >>> 12) % 680)
  const cy = horizon - radius * (0.15 + ((h >>> 20) % 50) / 100)
  const edges = [0, 0.38, 0.66, 0.84, 1].map(t => Math.round(t * horizon))

  const bands = sky.bands
    .map((color, i) => `<rect y="${edges[i]}" width="1200" height="${edges[i + 1] - edges[i] + 1}" fill="${color}"/>`)
    .join('')
  // Dither seam above each band: three pixel rows at 25 / 50 / 75 % coverage.
  const seams = sky.bands
    .slice(1)
    .map((color, i) => {
      const y = edges[i + 1] - 36
      return [0, 1, 2]
        .map(row => `<rect y="${y + row * 12}" width="1200" height="12" fill="url(#d${row})" color="${color}"/>`)
        .join('')
    })
    .join('')
  // Slices get thicker toward the bottom of the sun.
  const slices = [0.42, 0.54, 0.65, 0.75, 0.85]
    .map((t, i) => `<rect x="0" y="${(cy - radius + radius * 2 * t).toFixed(1)}" width="1200" height="${(radius * (0.03 + i * 0.022)).toFixed(1)}" fill="#000"/>`)
    .join('')
  const reflection = [0, 1, 2, 3, 4]
    .map(i => {
      const width = radius * (1.5 - i * 0.24)
      const offset = (((h >>> (i * 3)) % 40) - 20) * 2
      return `<rect x="${(cx - width / 2 + offset).toFixed(1)}" y="${horizon + 18 + i * 30}" width="${width.toFixed(1)}" height="${8 + i * 3}" fill="${sky.sun[1]}"/>`
    })
    .join('')

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" shape-rendering="crispEdges">
  <defs>
    <pattern id="d0" width="24" height="24" patternUnits="userSpaceOnUse"><rect x="12" width="12" height="12" fill="currentColor"/></pattern>
    <pattern id="d1" width="24" height="24" patternUnits="userSpaceOnUse"><rect x="12" width="12" height="12" fill="currentColor"/><rect y="12" width="12" height="12" fill="currentColor"/></pattern>
    <pattern id="d2" width="24" height="12" patternUnits="userSpaceOnUse"><rect width="24" height="12" fill="currentColor"/></pattern>
    <linearGradient id="sun" x1="0" y1="0" x2="0" y2="1"><stop offset=".4" stop-color="${sky.sun[0]}"/><stop offset=".4" stop-color="${sky.sun[1]}"/></linearGradient>
    <mask id="cut"><rect width="1200" height="630" fill="#fff"/>${slices}</mask>
  </defs>
  ${bands}
  ${seams}
  <circle cx="${cx}" cy="${cy.toFixed(1)}" r="${radius}" fill="url(#sun)" mask="url(#cut)" shape-rendering="geometricPrecision"/>
  <rect y="${horizon}" width="1200" height="${630 - horizon}" fill="${sky.sea}"/>
  ${reflection}
</svg>`

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

/** imgix.net / imgix.com or a subdomain of them; not lookalikes such as evilimgix.net. */
export function isImgixHost(host) {
  return host === 'imgix.net' || host.endsWith('.imgix.net') || host === 'imgix.com' || host.endsWith('.imgix.com')
}

/**
 * Resize/reformat remote cover URLs at the CDN when possible.
 * OpenNext on Cloudflare currently passthroughs `/_next/image` at full origin
 * bytes (e.g. Unsplash ~2MB JPEG), so list LCP must not rely on it.
 */
export function optimizeListCoverUrl(url, { width = 720, quality = 55 } = {}) {
  if (!url || typeof url !== 'string') return url
  if (!/^https?:\/\//i.test(url)) return url

  try {
    const u = new URL(url)
    const host = u.hostname.toLowerCase()

    // Unsplash: request a list-sized webp instead of the full sRGB JPEG.
    if (host === 'images.unsplash.com' || host.endsWith('.unsplash.com')) {
      u.searchParams.set('w', String(width))
      u.searchParams.set('q', String(quality))
      u.searchParams.set('fm', 'webp')
      u.searchParams.set('fit', 'max')
      u.searchParams.delete('cs')
      return u.toString()
    }

    // Imgix-compatible hosts.
    if (isImgixHost(host)) {
      u.searchParams.set('w', String(width))
      u.searchParams.set('q', String(quality))
      u.searchParams.set('auto', 'format')
      u.searchParams.set('fit', 'max')
      return u.toString()
    }
  } catch {
    return url
  }

  return url
}

/** True when we should skip Next's image optimizer (CF passthrough of full bytes). */
export function shouldBypassNextImageOptimizer(url) {
  return typeof url === 'string' && /^https?:\/\//i.test(url)
}

