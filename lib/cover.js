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
  const palettes = [
    { background: '#101b35', colors: ['#5AC8FA', '#AF52DE', '#007AFF', '#64D2FF', '#BF5AF2', '#30D158'] },
    { background: '#20132f', colors: ['#FF375F', '#BF5AF2', '#FF9F0A', '#FF453A', '#FF6482', '#FFD60A'] },
    { background: '#0d2928', colors: ['#34C759', '#5AC8FA', '#30D158', '#64D2FF', '#00C7BE', '#0A84FF'] },
    { background: '#2a1d12', colors: ['#FF9F0A', '#FF453A', '#FFD60A', '#FFCC00', '#FF6961', '#FFB340'] },
    { background: '#171b2c', colors: ['#64D2FF', '#30D158', '#0A84FF', '#5E5CE6', '#14C3C2', '#32ADE6'] },
    { background: '#281425', colors: ['#F50AAE', '#F862CB', '#C9088F', '#FF2D55', '#AF52DE', '#FF375F'] },
    { background: '#182b28', colors: ['#A7F432', '#34C759', '#30D158', '#FFD60A', '#64D2FF', '#00C7BE'] },
    { background: '#20182d', colors: ['#BF5AF2', '#5E5CE6', '#FF9F0A', '#FF375F', '#64D2FF', '#F50AAE'] },
    { background: '#12252f', colors: ['#00C7BE', '#64D2FF', '#30D158', '#5AC8FA', '#34C759', '#0A84FF'] },
    { background: '#2b1721', colors: ['#FF2D55', '#FF9F0A', '#F50AAE', '#FF453A', '#BF5AF2', '#FFD60A'] },
    { background: '#19253a', colors: ['#0A84FF', '#5AC8FA', '#BF5AF2', '#64D2FF', '#5E5CE6', '#30D158'] },
    { background: '#20251b', colors: ['#A7F432', '#FFD60A', '#34C759', '#FF9F0A', '#30D158', '#FFCC00'] },
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
