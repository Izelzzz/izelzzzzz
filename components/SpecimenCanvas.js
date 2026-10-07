import { useEffect, useRef } from 'react'

const TAU = Math.PI * 2

export default function SpecimenCanvas() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const ctx = canvas.getContext('2d')
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const pointer = { x: 0, y: 0, active: false }
    let width = 0
    let height = 0
    let dpr = 1
    let animationId = 0
    let spores = []

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = rect.width
      height = rect.height
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      spores = Array.from({ length: Math.max(18, Math.floor(width / 48)) }, (_, index) => ({
        x: (index / Math.max(1, Math.floor(width / 48) - 1)) * width,
        y: Math.random() * height,
        r: 2 + Math.random() * 7,
        speed: 0.08 + Math.random() * 0.16,
        phase: Math.random() * TAU,
        color: index % 5 === 0 ? '#ff593d' : index % 3 === 0 ? '#2448ff' : '#151918',
      }))
    }

    const organicPath = (cx, cy, radius, time, wobble, points = 84) => {
      ctx.beginPath()
      for (let i = 0; i <= points; i += 1) {
        const angle = (i / points) * TAU
        const noise =
          Math.sin(angle * 3 + time * 0.0007) * wobble +
          Math.sin(angle * 7 - time * 0.00045) * wobble * 0.42
        const r = radius + noise
        const x = cx + Math.cos(angle) * r
        const y = cy + Math.sin(angle) * r * 0.9
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()
    }

    const draw = time => {
      ctx.clearRect(0, 0, width, height)

      const baseX = width > 760 ? width * 0.69 : width * 0.58
      const baseY = height * 0.48
      const pullX = pointer.active ? (pointer.x - baseX) * 0.08 : 0
      const pullY = pointer.active ? (pointer.y - baseY) * 0.08 : 0
      const cx = baseX + pullX
      const cy = baseY + pullY
      const radius = Math.min(width, height) * (width > 760 ? 0.285 : 0.42)

      ctx.strokeStyle = '#151918'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(cx, cy, radius * 1.23, 0, TAU)
      ctx.stroke()

      ctx.fillStyle = '#d8ff47'
      organicPath(cx, cy, radius, time, radius * 0.07)
      ctx.fill()
      ctx.strokeStyle = '#151918'
      ctx.lineWidth = 3
      ctx.stroke()

      ctx.fillStyle = '#2448ff'
      organicPath(cx + radius * 0.1, cy - radius * 0.05, radius * 0.57, time + 900, radius * 0.045, 68)
      ctx.fill()

      ctx.fillStyle = '#f3f0e8'
      organicPath(cx - radius * 0.04, cy + radius * 0.04, radius * 0.32, time + 1600, radius * 0.025, 54)
      ctx.fill()
      ctx.strokeStyle = '#151918'
      ctx.lineWidth = 2
      ctx.stroke()

      ctx.fillStyle = '#ff593d'
      ctx.beginPath()
      ctx.arc(cx + Math.sin(time * 0.001) * radius * 0.07, cy, radius * 0.105, 0, TAU)
      ctx.fill()

      ctx.strokeStyle = 'rgba(21, 25, 24, 0.48)'
      ctx.lineWidth = 1
      for (let i = 0; i < 10; i += 1) {
        const angle = (i / 10) * TAU + time * 0.00004
        ctx.beginPath()
        ctx.moveTo(cx + Math.cos(angle) * radius * 0.66, cy + Math.sin(angle) * radius * 0.59)
        ctx.lineTo(cx + Math.cos(angle) * radius * 1.2, cy + Math.sin(angle) * radius * 1.08)
        ctx.stroke()
      }

      spores.forEach(spore => {
        if (!reducedMotion) {
          spore.y -= spore.speed
          spore.x += Math.sin(time * 0.0007 + spore.phase) * 0.08
          if (spore.y < -12) spore.y = height + 12
        }
        ctx.fillStyle = spore.color
        ctx.beginPath()
        ctx.arc(spore.x, spore.y, spore.r, 0, TAU)
        ctx.fill()
      })

      if (pointer.active) {
        ctx.strokeStyle = '#ff593d'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(pointer.x, pointer.y, 22, 0, TAU)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(pointer.x - 32, pointer.y)
        ctx.lineTo(pointer.x + 32, pointer.y)
        ctx.moveTo(pointer.x, pointer.y - 32)
        ctx.lineTo(pointer.x, pointer.y + 32)
        ctx.stroke()
      }

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

  return <canvas ref={canvasRef} className="specimen-canvas" aria-hidden="true" />
}
