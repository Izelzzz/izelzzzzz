import { useEffect, useRef } from 'react'

const COLORS = {
  background: '#080b0d',
  grid: '#152126',
}

export default function MindscapeCanvas() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const ctx = canvas.getContext('2d')
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const pointer = { x: 0, y: 0, active: false }
    let width = 0
    let height = 0
    let nodes = []
    let animationId = 0

    const makeNodes = () => {
      const count = Math.min(92, Math.max(42, Math.floor((width * height) / 15000)))
      nodes = Array.from({ length: count }, (_, index) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.16,
        vy: (Math.random() - 0.5) * 0.16,
        phase: Math.random() * Math.PI * 2,
        hot: index % 17 === 0,
      }))
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = rect.width
      height = rect.height
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      makeNodes()
    }

    const drawGrid = () => {
      ctx.strokeStyle = COLORS.grid
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let x = 0; x < width; x += 56) {
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
      }
      for (let y = 0; y < height; y += 56) {
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
      }
      ctx.stroke()
    }

    const drawScanner = time => {
      const cx = pointer.active ? pointer.x : width * 0.72
      const cy = pointer.active ? pointer.y : height * 0.48
      const radius = 58 + ((time * 0.035) % 210)

      ctx.strokeStyle = 'rgba(215, 255, 82, 0.18)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      ctx.stroke()

      ctx.strokeStyle = 'rgba(255, 120, 79, 0.35)'
      ctx.beginPath()
      ctx.moveTo(cx - 11, cy)
      ctx.lineTo(cx + 11, cy)
      ctx.moveTo(cx, cy - 11)
      ctx.lineTo(cx, cy + 11)
      ctx.stroke()
    }

    const drawSignal = time => {
      const startX = width * 0.58
      const baseline = height * 0.72
      ctx.strokeStyle = 'rgba(121, 230, 220, 0.32)'
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let x = startX; x <= width + 8; x += 7) {
        const amplitude = 9 + 15 * Math.sin(x * 0.013 + time * 0.001)
        const y = baseline + Math.sin(x * 0.038 + time * 0.003) * amplitude
        if (x === startX) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }

    const draw = time => {
      ctx.fillStyle = COLORS.background
      ctx.fillRect(0, 0, width, height)
      drawGrid()

      for (let i = 0; i < nodes.length; i += 1) {
        const a = nodes[i]
        for (let j = i + 1; j < nodes.length; j += 1) {
          const b = nodes[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const distance = Math.hypot(dx, dy)
          if (distance < 128) {
            const alpha = (1 - distance / 128) * 0.32
            ctx.strokeStyle = `rgba(121, 230, 220, ${alpha})`
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }

        if (!reducedMotion) {
          a.x += a.vx
          a.y += a.vy
          if (a.x < -8) a.x = width + 8
          if (a.x > width + 8) a.x = -8
          if (a.y < -8) a.y = height + 8
          if (a.y > height + 8) a.y = -8
        }

        if (pointer.active) {
          const dx = a.x - pointer.x
          const dy = a.y - pointer.y
          const distance = Math.max(1, Math.hypot(dx, dy))
          if (distance < 150 && !reducedMotion) {
            const force = (150 - distance) / 150
            a.x += (dx / distance) * force * 1.4
            a.y += (dy / distance) * force * 1.4
          }
        }

        const flicker = 0.45 + Math.sin(time * 0.0014 + a.phase) * 0.25
        ctx.fillStyle = a.hot
          ? `rgba(255, 120, 79, ${flicker})`
          : `rgba(121, 230, 220, ${flicker})`
        ctx.fillRect(a.x - 1.5, a.y - 1.5, 3, 3)
      }

      drawScanner(time)
      drawSignal(time)
      if (!reducedMotion) animationId = window.requestAnimationFrame(draw)
    }

    const updatePointer = event => {
      const rect = canvas.getBoundingClientRect()
      pointer.x = event.clientX - rect.left
      pointer.y = event.clientY - rect.top
      pointer.active = true
    }

    const clearPointer = () => {
      pointer.active = false
    }

    resize()
    draw(0)
    window.addEventListener('resize', resize)
    canvas.addEventListener('pointermove', updatePointer)
    canvas.addEventListener('pointerdown', updatePointer)
    canvas.addEventListener('pointerleave', clearPointer)

    return () => {
      window.cancelAnimationFrame(animationId)
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('pointermove', updatePointer)
      canvas.removeEventListener('pointerdown', updatePointer)
      canvas.removeEventListener('pointerleave', clearPointer)
    }
  }, [])

  return <canvas ref={canvasRef} className="mindscape-canvas" aria-hidden="true" />
}
