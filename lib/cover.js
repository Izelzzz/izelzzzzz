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

export function makeCoverDataUri(title) {
  // 根据标题稳定选择配色，让同一篇文章在列表页和详情页保持一致。
  const seed = String(title ?? '').trim() || '未命名'
  const h = hashString(seed)
  // Dawn palette: indigo night, violet dusk, amber and coral light.
  const palettes = [
    { background: '#0f1233', colors: ['#F6C177', '#F28B6C', '#9C9AE6', '#7A3F58', '#E58BA5', '#2A1D49'] },
    { background: '#2a1d49', colors: ['#F28B6C', '#E58BA5', '#F6C177', '#D9785A', '#9C9AE6', '#7A3F58'] },
    { background: '#151838', colors: ['#9C9AE6', '#5A57A8', '#F6C177', '#E58BA5', '#2A2E55', '#F28B6C'] },
    { background: '#3a2040', colors: ['#D9785A', '#F6A96A', '#C7597A', '#FFE9BD', '#7A3F58', '#9C9AE6'] },
    { background: '#0e1126', colors: ['#5A57A8', '#F6C177', '#2A1D49', '#9C9AE6', '#F28B6C', '#E58BA5'] },
    { background: '#231a3f', colors: ['#F6A96A', '#9C9AE6', '#D8603F', '#E58BA5', '#F6C177', '#5A57A8'] },
  ]
  const palette = palettes[h % palettes.length]
  const rotation = (h % 24) - 12
  const blobOne = 260 + (h % 140)
  const blobTwo = 230 + ((h >>> 8) % 150)
  const blobThree = 190 + ((h >>> 16) % 130)
  const blobFour = 170 + ((h >>> 20) % 120)
  const blobFive = 150 + ((h >>> 24) % 130)
  const blobSix = 130 + ((h >>> 28) % 120)
  const blobOneX = -20 + ((h >>> 4) % 430)
  const blobOneY = 40 + ((h >>> 10) % 350)
  const blobTwoX = 690 + ((h >>> 12) % 500)
  const blobTwoY = -40 + ((h >>> 18) % 420)
  const blobThreeX = 360 + ((h >>> 20) % 500)
  const blobThreeY = 320 + ((h >>> 22) % 330)
  const blobFourX = 80 + ((h >>> 6) % 1050)
  const blobFourY = 430 + ((h >>> 14) % 220)
  const blobFiveX = 80 + ((h >>> 2) % 1000)
  const blobFiveY = -40 + ((h >>> 16) % 560)
  const blobSixX = 470 + ((h >>> 26) % 700)
  const blobSixY = 200 + ((h >>> 24) % 390)

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="background" x1="0" y1="0" x2="1" y2="1" gradientTransform="rotate(${rotation} .5 .5)">
      <stop offset="0" stop-color="${palette.background}"/>
      <stop offset="1" stop-color="#080d1b"/>
    </linearGradient>
    <filter id="blurLarge" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="42"/>
    </filter>
    <filter id="blurSmall" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="18"/>
    </filter>
    <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity=".16"/>
      <stop offset=".48" stop-color="#ffffff" stop-opacity=".07"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity=".025"/>
    </linearGradient>
  </defs>

  <rect width="1200" height="630" fill="url(#background)"/>
  <g opacity=".82" filter="url(#blurLarge)">
    <circle cx="${blobOneX}" cy="${blobOneY}" r="${blobOne}" fill="${palette.colors[0]}"/>
    <circle cx="${blobTwoX}" cy="${blobTwoY}" r="${blobTwo}" fill="${palette.colors[1]}"/>
    <circle cx="${blobThreeX}" cy="${blobThreeY}" r="${blobThree}" fill="${palette.colors[2]}"/>
    <circle cx="${blobFourX}" cy="${blobFourY}" r="${blobFour}" fill="${palette.colors[3]}"/>
    <circle cx="${blobFiveX}" cy="${blobFiveY}" r="${blobFive}" fill="${palette.colors[4]}"/>
    <circle cx="${blobSixX}" cy="${blobSixY}" r="${blobSix}" fill="${palette.colors[5]}"/>
  </g>
  <g opacity=".42" filter="url(#blurSmall)">
    <circle cx="${blobOneX + 80}" cy="${blobOneY + 45}" r="${Math.round(blobOne * .48)}" fill="${palette.colors[2]}"/>
    <circle cx="${blobTwoX - 90}" cy="${blobTwoY + 55}" r="${Math.round(blobTwo * .44)}" fill="${palette.colors[4]}"/>
    <circle cx="${blobThreeX + 45}" cy="${blobThreeY - 38}" r="${Math.round(blobThree * .5)}" fill="${palette.colors[0]}"/>
  </g>

  <rect width="1200" height="630" fill="url(#glass)" stroke="#ffffff" stroke-opacity=".18"/>

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

