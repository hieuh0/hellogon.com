import { useEffect, useRef } from 'react'

const COLORS = ['#ff5d8f', '#ffbe0b', '#2ec4b6', '#3b82f6', '#8b5cf6', '#10b981', '#ff6a3d']
const MAX_PARTICLES = 160

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  rot: number
  vr: number
  size: number
  sides: number
  color: string
  phase: number
}

/** Full-screen canvas of falling polygon confetti. Mounted only while party mode is on. */
export function Confetti({ reducedMotion }: { reducedMotion: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    let w = 0
    let h = 0
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const particles: Particle[] = []
    const spawn = (y = -20): Particle => ({
      x: Math.random() * w,
      y,
      vx: (Math.random() - 0.5) * 2,
      vy: 1 + Math.random() * 2,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.2,
      size: 5 + Math.random() * 6,
      sides: 3 + Math.floor(Math.random() * 3),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      phase: Math.random() * Math.PI * 2,
    })
    // Initial burst so the party starts instantly.
    for (let i = 0; i < 60; i++) particles.push(spawn(Math.random() * h * 0.5 - h * 0.1))

    const perFrame = reducedMotion ? 0.3 : 2
    let carry = 0
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const f = Math.min((now - last) / 16.667, 3)
      last = now
      carry += perFrame * f
      while (carry >= 1 && particles.length < MAX_PARTICLES) {
        particles.push(spawn())
        carry -= 1
      }
      carry = Math.min(carry, 1)
      ctx.clearRect(0, 0, w, h)
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.vy = Math.min(p.vy + 0.04 * f, 4)
        p.x += (p.vx + Math.sin(now * 0.003 + p.phase) * 0.6) * f
        p.y += p.vy * f
        p.rot += p.vr * f
        if (p.y > h + 20) {
          particles.splice(i, 1)
          continue
        }
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.scale(1, Math.cos(now * 0.006 + p.phase)) // flutter
        ctx.fillStyle = p.color
        ctx.beginPath()
        for (let k = 0; k < p.sides; k++) {
          const a = (k / p.sides) * Math.PI * 2
          ctx.lineTo(Math.cos(a) * p.size, Math.sin(a) * p.size)
        }
        ctx.closePath()
        ctx.fill()
        ctx.restore()
      }
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [reducedMotion])

  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-20 h-full w-full" />
}
