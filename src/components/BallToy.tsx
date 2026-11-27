import { useEffect, useRef } from 'react'
import { groundY, type World } from '../lib/world'

const INK = '#4A3728'
const RADIUS = 30
const GRAVITY = 0.55
const BOUNCE = 0.68
const SLICES = ['#FF8FAB', '#FFFFFF', '#8FD3FF', '#FFFFFF', '#FFE08A', '#FFFFFF']

/** A pie slice of the beach ball, in a -50..50 viewBox. */
function slice(i: number) {
  const a0 = (i / SLICES.length) * Math.PI * 2
  const a1 = ((i + 1) / SLICES.length) * Math.PI * 2
  const r = 46
  return `M0 0L${(Math.cos(a0) * r).toFixed(2)} ${(Math.sin(a0) * r).toFixed(2)}A${r} ${r} 0 0 1 ${(Math.cos(a1) * r).toFixed(2)} ${(Math.sin(a1) * r).toFixed(2)}Z`
}

/**
 * A bouncy beach ball that rolls on the hill. Flick or drag it around;
 * Gôn chases it on his own (see GonMascot) through the shared world state.
 */
export function BallToy({ world, spawnX }: { world: World; spawnX: number }) {
  const ballRef = useRef<HTMLDivElement>(null)
  const spinRef = useRef<SVGSVGElement>(null)
  const shadowRef = useRef<HTMLDivElement>(null)
  const spawnRef = useRef(spawnX)

  useEffect(() => {
    const b = world.ball
    Object.assign(b, { active: true, held: false, x: spawnRef.current, y: -RADIUS, vx: (Math.random() - 0.5) * 4, vy: 0, r: RADIUS })
    let rot = 0
    let squash = 0
    let raf = 0
    let last = performance.now()
    let drag: { id: number; offX: number; offY: number; samples: { x: number; y: number; t: number }[] } | null = null

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const f = Math.min((now - last) / 16.667, 3)
      last = now
      const w = window.innerWidth
      if (!b.held) {
        b.vy += GRAVITY * f
        b.vx *= Math.pow(0.996, f)
        b.x += b.vx * f
        b.y += b.vy * f
        const floor = groundY(world.hill, b.x) - b.r
        if (b.y >= floor) {
          b.y = floor
          if (b.vy > 0) {
            squash = Math.min(0.28, b.vy * 0.025)
            b.vy = b.vy > 2 ? -b.vy * BOUNCE : 0
          }
          // Roll down the hill's slope, with a little grass friction.
          const slope = (groundY(world.hill, b.x + 1) - groundY(world.hill, b.x - 1)) / 2
          b.vx = (b.vx + slope * 0.25 * f) * Math.pow(0.975, f)
        }
        if (b.x < b.r || b.x > w - b.r) {
          b.x = Math.min(w - b.r, Math.max(b.r, b.x))
          b.vx = -b.vx * 0.8
        }
        if (b.y < b.r && b.vy < 0) {
          b.y = b.r
          b.vy = -b.vy * 0.6
        }
      }
      rot += ((b.vx * f) / b.r) * (180 / Math.PI)
      squash *= Math.pow(0.8, f)

      const el = ballRef.current
      if (el) {
        el.style.transform = `translate3d(${(b.x - b.r).toFixed(2)}px, ${(b.y - b.r).toFixed(2)}px, 0) scale(${(1 + squash).toFixed(3)}, ${(1 - squash).toFixed(3)})`
      }
      spinRef.current?.style.setProperty('transform', `rotate(${rot.toFixed(1)}deg)`)
      const sh = shadowRef.current
      if (sh) {
        const ground = groundY(world.hill, b.x)
        const k = Math.max(0.3, 1 - (ground - b.y - b.r) / 300)
        sh.style.transform = `translate3d(${(b.x - b.r).toFixed(2)}px, ${(ground - 6).toFixed(2)}px, 0) scale(${k.toFixed(3)})`
        sh.style.opacity = String(k * 0.8)
      }
    }
    raf = requestAnimationFrame(tick)

    const el = ballRef.current!
    const onDown = (e: PointerEvent) => {
      e.preventDefault()
      el.setPointerCapture(e.pointerId)
      b.held = true
      b.vx = b.vy = 0
      drag = { id: e.pointerId, offX: b.x - e.clientX, offY: b.y - e.clientY, samples: [{ x: e.clientX, y: e.clientY, t: performance.now() }] }
    }
    const onMove = (e: PointerEvent) => {
      if (!drag || drag.id !== e.pointerId) return
      const now = performance.now()
      b.x = e.clientX + drag.offX
      b.y = e.clientY + drag.offY
      drag.samples.push({ x: e.clientX, y: e.clientY, t: now })
      while (drag.samples.length > 2 && now - drag.samples[0].t > 100) drag.samples.shift()
    }
    const onUp = (e: PointerEvent) => {
      if (!drag || drag.id !== e.pointerId) return
      const first = drag.samples[0]
      const lastS = drag.samples[drag.samples.length - 1]
      const dt = Math.max(lastS.t - first.t, 16)
      const clampV = (v: number) => Math.max(-35, Math.min(35, v))
      b.vx = clampV(((lastS.x - first.x) / dt) * 16.667)
      b.vy = clampV(((lastS.y - first.y) / dt) * 16.667)
      b.held = false
      drag = null
    }
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
      b.active = false
      b.held = false
    }
  }, [world])

  return (
    <div className="pointer-events-none fixed inset-0 z-20">
      <div
        ref={shadowRef}
        aria-hidden
        className="absolute top-0 left-0 h-3 rounded-[50%] bg-[#4A3728]/20"
        style={{ width: RADIUS * 2 }}
      />
      <div
        ref={ballRef}
        role="img"
        aria-label="Quả bóng bãi biển, kéo hoặc búng để ném"
        className="pointer-events-auto absolute top-0 left-0 cursor-grab touch-none will-change-transform active:cursor-grabbing"
        style={{ width: RADIUS * 2, height: RADIUS * 2 }}
      >
        <svg ref={spinRef} viewBox="-50 -50 100 100" className="h-full w-full overflow-visible">
          {SLICES.map((c, i) => (
            <path key={i} d={slice(i)} fill={c} />
          ))}
          <circle r="9" fill="#fff" stroke={INK} strokeWidth="3" />
          <circle r="46" fill="none" stroke={INK} strokeWidth="5" />
          <ellipse cx="-20" cy="-24" rx="10" ry="6" transform="rotate(-35 -20 -24)" fill="#fff" opacity="0.7" />
        </svg>
      </div>
    </div>
  )
}
