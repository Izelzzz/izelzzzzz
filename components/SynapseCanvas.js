import { useEffect, useRef, useState } from 'react'

const COLORS = {
  background: '#111801',
  grid: 'rgba(112, 157, 7, 0.12)',
  node: '#C2F745',
  nodeBright: '#AEF50A',
  pulse: '#F50AAE',
}

function seededRandom(seed) {
  let value = seed >>> 0
  return () => {
    value += 0x6D2B79F5
    let result = value
    result = Math.imul(result ^ (result >>> 15), result | 1)
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61)
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296
  }
}

function drawFallback(canvas, reducedMotion) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return () => {}
  let width = 0
  let height = 0
  let nodes = []
  let frame = 0
  let time = 0

  const resize = () => {
    const rect = canvas.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    width = rect.width
    height = rect.height
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const random = seededRandom(23)
    const count = Math.min(92, Math.max(42, Math.floor((width * height) / 15000)))
    nodes = Array.from({ length: count }, (_, index) => ({
      x: random() * width,
      y: random() * height,
      vx: (random() - 0.5) * 0.12,
      vy: (random() - 0.5) * 0.12,
      phase: random() * Math.PI * 2,
      hot: index % 11 === 0,
    }))
  }

  const render = () => {
    ctx.fillStyle = COLORS.background
    ctx.fillRect(0, 0, width, height)
    ctx.strokeStyle = COLORS.grid
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let x = 0; x <= width; x += 52) {
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
    }
    for (let y = 0; y <= height; y += 52) {
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
    }
    ctx.stroke()

    nodes.forEach((node, index) => {
      if (!reducedMotion) {
        node.x += node.vx
        node.y += node.vy
        if (node.x < -8) node.x = width + 8
        if (node.x > width + 8) node.x = -8
        if (node.y < -8) node.y = height + 8
        if (node.y > height + 8) node.y = -8
      }
      for (let next = index + 1; next < nodes.length; next += 1) {
        const other = nodes[next]
        const distance = Math.hypot(node.x - other.x, node.y - other.y)
        if (distance < 108) {
          ctx.strokeStyle = `rgba(112, 157, 7, ${(1 - distance / 108) * 0.32})`
          ctx.beginPath()
          ctx.moveTo(node.x, node.y)
          ctx.lineTo(other.x, other.y)
          ctx.stroke()
        }
      }
      const alpha = 0.4 + Math.sin(time * 0.001 + node.phase) * 0.18
      ctx.fillStyle = node.hot ? `rgba(245, 10, 174, ${alpha})` : `rgba(194, 247, 69, ${alpha})`
      ctx.beginPath()
      ctx.arc(node.x, node.y, node.hot ? 2.5 : 1.7, 0, Math.PI * 2)
      ctx.fill()
    })
    time += 16
    if (!reducedMotion) frame = window.requestAnimationFrame(render)
  }

  resize()
  render()
  window.addEventListener('resize', resize)
  return () => {
    window.cancelAnimationFrame(frame)
    window.removeEventListener('resize', resize)
  }
}

export default function SynapseCanvas({ activeMenu = null }) {
  const canvasRef = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const coarsePointer = window.matchMedia('(pointer: coarse)').matches
    let disposed = false
    let cleanup = () => {}
    let readyTimer = 0

    const markReady = () => {
      if (disposed) return
      if (reducedMotion) setReady(true)
      else readyTimer = window.setTimeout(() => setReady(true), 900)
    }

    const init = async () => {
      try {
        const THREE = await import('three')
        const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }] = await Promise.all([
          import('three/examples/jsm/postprocessing/EffectComposer.js'),
          import('three/examples/jsm/postprocessing/RenderPass.js'),
          import('three/examples/jsm/postprocessing/UnrealBloomPass.js'),
        ])
        if (disposed) return

        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' })
        renderer.setClearColor(COLORS.background, 1)
        renderer.outputColorSpace = THREE.SRGBColorSpace

        const scene = new THREE.Scene()
        const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100)
        camera.position.set(0, 0, 12)
        camera.lookAt(0, 0, 0)
        const root = new THREE.Group()
        const core = new THREE.Group()
        scene.add(root)
        root.add(core)

        const random = seededRandom(104)
        const mobile = coarsePointer || window.innerWidth < 768
        const particleCount = mobile ? 230 : 430
        const particlePositions = new Float32Array(particleCount * 3)
        const particleColors = new Float32Array(particleCount * 3)
        const lime = new THREE.Color(COLORS.node)
        const pink = new THREE.Color(COLORS.pulse)

        for (let index = 0; index < particleCount; index += 1) {
          const radius = 1.45 + random() * 2.25
          const theta = random() * Math.PI * 2
          const phi = Math.acos(2 * random() - 1)
          const wobble = 1 + Math.sin(theta * 3 + phi * 2) * 0.08
          particlePositions[index * 3] = radius * Math.sin(phi) * Math.cos(theta) * wobble
          particlePositions[index * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) * wobble
          particlePositions[index * 3 + 2] = radius * Math.cos(phi) * wobble
          const color = index % 17 === 0 ? pink : lime
          particleColors[index * 3] = color.r
          particleColors[index * 3 + 1] = color.g
          particleColors[index * 3 + 2] = color.b
        }

        const particleGeometry = new THREE.BufferGeometry()
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3))
        particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3))
        const particleMaterial = new THREE.PointsMaterial({ size: mobile ? 0.06 : 0.045, vertexColors: true, transparent: true, opacity: 0.62, blending: THREE.AdditiveBlending, depthWrite: false })
        const particles = new THREE.Points(particleGeometry, particleMaterial)
        core.add(particles)

        const nucleusGeometry = new THREE.IcosahedronGeometry(1.15, 2)
        const nucleusMaterial = new THREE.MeshBasicMaterial({ color: COLORS.nodeBright, wireframe: true, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending })
        const nucleus = new THREE.Mesh(nucleusGeometry, nucleusMaterial)
        core.add(nucleus)

        const innerGeometry = new THREE.IcosahedronGeometry(0.65, 1)
        const innerMaterial = new THREE.MeshBasicMaterial({ color: COLORS.pulse, wireframe: true, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending })
        const inner = new THREE.Mesh(innerGeometry, innerMaterial)
        core.add(inner)

        const pointer = { x: 0, y: 0, active: false }
        const pointerTarget = { x: 0, y: 0 }
        const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), mobile ? 0.2 : 0.3, 0.35, 0.9)
        const composer = new EffectComposer(renderer)
        composer.addPass(new RenderPass(scene, camera))
        composer.addPass(bloom)

        const resize = () => {
          const rect = canvas.getBoundingClientRect()
          const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2)
          renderer.setPixelRatio(dpr)
          renderer.setSize(rect.width, rect.height, false)
          composer.setSize(rect.width, rect.height)
          bloom.resolution.set(rect.width, rect.height)
          camera.aspect = rect.width / Math.max(1, rect.height)
          camera.updateProjectionMatrix()
        }

        const updatePointer = event => {
          const rect = canvas.getBoundingClientRect()
          pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
          pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
          pointer.active = true
        }
        const clearPointer = () => { pointer.active = false }

        let animationId = 0
        let previous = performance.now()
        const render = time => {
          const elapsed = Math.min(50, time - previous || 16)
          previous = time
          if (pointer.active && !coarsePointer) {
            pointerTarget.x = pointer.x * 0.12
            pointerTarget.y = pointer.y * 0.08
          } else {
            pointerTarget.x = 0
            pointerTarget.y = 0
          }
          root.rotation.y += (pointerTarget.x - root.rotation.y) * 0.035
          root.rotation.x += (-pointerTarget.y - root.rotation.x) * 0.035
          core.rotation.y += reducedMotion ? 0 : elapsed * 0.00018
          core.rotation.x += reducedMotion ? 0 : elapsed * 0.0001
          nucleus.scale.setScalar(1 + (reducedMotion ? 0.035 : Math.sin(time * 0.0015) * 0.07))
          inner.rotation.z += reducedMotion ? 0 : elapsed * 0.00045
          nucleus.rotation.y -= reducedMotion ? 0 : elapsed * 0.00022
          particles.rotation.y += reducedMotion ? 0 : elapsed * 0.00012
          particleMaterial.opacity = 0.56 + Math.sin(time * 0.0011) * 0.08
          composer.render()
          if (!reducedMotion) animationId = window.requestAnimationFrame(render)
        }

        resize()
        render(performance.now())
        window.addEventListener('resize', resize)
        canvas.addEventListener('pointermove', updatePointer)
        canvas.addEventListener('pointerleave', clearPointer)
        markReady()

        cleanup = () => {
          window.cancelAnimationFrame(animationId)
          window.removeEventListener('resize', resize)
          canvas.removeEventListener('pointermove', updatePointer)
          canvas.removeEventListener('pointerleave', clearPointer)
          particleGeometry.dispose()
          particleMaterial.dispose()
          nucleusGeometry.dispose()
          nucleusMaterial.dispose()
          innerGeometry.dispose()
          innerMaterial.dispose()
          composer.dispose()
          renderer.dispose()
        }
      } catch {
        if (disposed) return
        cleanup = drawFallback(canvas, reducedMotion)
        markReady()
      }
    }

    init()
    return () => {
      disposed = true
      window.clearTimeout(readyTimer)
      cleanup()
    }
  }, [])

  return (
    <div className={`synapse-scene ${ready ? 'is-ready' : 'is-awakening'}`} aria-hidden="true">
      <canvas ref={canvasRef} className="synapse-canvas" />
      <span className="synapse-awake-line" />
    </div>
  )
}
