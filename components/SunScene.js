/**
 * Abstract sunrise / sunset: flat sky bands with pixel-dither seams, a sun cut
 * into slices, and its reflection broken into blocks on the sea. Everything is
 * drawn with CSS so it follows the theme tokens and animates when the theme flips.
 */

// Deterministic so server and client render the same blocks.
function reflectionBlocks() {
  const blocks = []
  let seed = 7
  const next = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648
    return seed / 2147483648
  }
  for (let row = 0; row < 9; row++) {
    const y = 4 + row * 10.5
    const height = 3 + row * 0.55
    const spread = 46 - row * 3.2
    const count = 2 + (row % 3)
    for (let i = 0; i < count; i++) {
      const width = 6 + next() * (spread * 0.9)
      const x = 50 - spread + next() * (spread * 2 - width)
      blocks.push({ x, y, width, height, key: `${row}-${i}` })
    }
  }
  return blocks
}

const BLOCKS = reflectionBlocks()

export default function SunScene({ variant = 'hero' }) {
  return (
    <div className={`scene scene-${variant}`} aria-hidden="true">
      <div className="scene-band scene-band-0" />
      <div className="scene-band scene-band-1" />
      <div className="scene-band scene-band-2" />
      <div className="scene-band scene-band-3" />
      <i className="dither scene-dither-1" />
      <i className="dither scene-dither-2" />
      <i className="dither scene-dither-3" />
      <div className="scene-stars" />
      <div className="scene-sun" />
      <div className="scene-sea">
        <svg className="scene-reflection" viewBox="0 0 100 100" preserveAspectRatio="none" focusable="false">
          {BLOCKS.map(block => (
            <rect key={block.key} x={block.x} y={block.y} width={block.width} height={block.height} />
          ))}
        </svg>
        <i className="dither scene-dither-floor" />
      </div>
      <div className="scene-grain" />
    </div>
  )
}
