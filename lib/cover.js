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
 * Fallback cover for posts without one: a small still of the site's horizon.
 * Soft sky, a sun that bleeds light, and a reflection pulled apart by an SVG
 * displacement filter. The title picks the hour, where the sun sits and how
 * the water moves, so a post looks the same in the list and on its own page.
 */
export function makeCoverDataUri(title) {
  const seed = String(title ?? '').trim() || '未命名'
  const h = hashString(seed)
  const hours = [
    { sky: ['#070818', '#1c1750', '#6a2a78', '#f2765a'], sea: '#05061a', core: '#ffd9a0', halo: '#f68a4a' },
    { sky: ['#9fbfe6', '#b3a9e3', '#f09dbd', '#ffc27a'], sea: '#2a2a5e', core: '#fffaf0', halo: '#ffdca6' },
    { sky: ['#0b1030', '#2a2a6e', '#8a4a9a', '#f6a14a'], sea: '#070a22', core: '#ffe7ae', halo: '#f6a14a' },
    { sky: ['#1a1440', '#4b1f6f', '#cf4f63', '#ffc27a'], sea: '#0c0a26', core: '#fff1c4', halo: '#f68a4a' },
    { sky: ['#b9cdea', '#d1b6e0', '#f3a8a8', '#ffd08a'], sea: '#34346a', core: '#fffaf0', halo: '#ffe2a8' },
  ]
  const hour = hours[h % hours.length]
  const horizon = 420 + ((h >>> 4) % 50)
  const radius = 120 + ((h >>> 8) % 70)
  const cx = 280 + ((h >>> 12) % 640)
  const cy = horizon - radius * (((h >>> 20) % 90) / 100 - 0.25)
  const turbulence = h % 97

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="${horizon}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${hour.sky[0]}"/>
      <stop offset=".45" stop-color="${hour.sky[1]}"/>
      <stop offset=".78" stop-color="${hour.sky[2]}"/>
      <stop offset="1" stop-color="${hour.sky[3]}"/>
    </linearGradient>
    <radialGradient id="halo" cx="${cx}" cy="${cy.toFixed(1)}" r="${radius * 3.2}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${hour.halo}" stop-opacity=".95"/>
      <stop offset=".45" stop-color="${hour.halo}" stop-opacity=".35"/>
      <stop offset="1" stop-color="${hour.halo}" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5"/></filter>
    <filter id="water" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.0015 0.11" numOctaves="2" seed="${turbulence}" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="150" xChannelSelector="R" yChannelSelector="B"/>
    </filter>
    <filter id="grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="${turbulence}"/>
      <feColorMatrix values="0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  0 0 0 .22 0"/>
    </filter>
    <clipPath id="above"><rect width="1200" height="${horizon}"/></clipPath>
    <clipPath id="below"><rect y="${horizon}" width="1200" height="${630 - horizon}"/></clipPath>
    <linearGradient id="deep" x1="0" y1="${horizon}" x2="0" y2="630" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${hour.sea}" stop-opacity=".25"/>
      <stop offset="1" stop-color="${hour.sea}" stop-opacity=".95"/>
    </linearGradient>
    <g id="light">
      <rect x="-200" width="1600" height="${horizon + 90}" fill="url(#sky)"/>
      <rect x="-200" width="1600" height="${horizon + 90}" fill="url(#halo)"/>
      <circle cx="${cx}" cy="${cy.toFixed(1)}" r="${radius}" fill="${hour.core}" filter="url(#soft)"/>
    </g>
  </defs>
  <rect width="1200" height="630" fill="${hour.sea}"/>
  <use href="#light" clip-path="url(#above)"/>
  <g clip-path="url(#below)">
    <g filter="url(#water)"><use href="#light" transform="translate(0 ${horizon * 2}) scale(1 -1)"/></g>
    <rect y="${horizon}" width="1200" height="${630 - horizon}" fill="url(#deep)"/>
  </g>
  <rect width="1200" height="630" filter="url(#grain)"/>
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

