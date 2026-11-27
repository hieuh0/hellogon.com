import { useEffect, useRef } from 'react'

const COUNT = 6
const SIZE = 56
const COLORS = ['#FFB3C6', '#FFE08A', '#8FD3FF', '#C9B6FF', '#FFC09F', '#7EE081']
const INK = '#4A3728'
const FEAR_RADIUS = 160
const MIN_SPEED = 1.2
const MAX_SPEED = 9

interface Bot {
  x: number
  y: number
  vx: number
  vy: number
  scale: number
  squash: number
  scared: number
  lookX: number
  lookY: number
}

/** Six mini dino Gôns that bounce around the viewport and flee from the cursor. */
export function MiniGons({ origin, reducedMotion }: { origin: { x: number; y: number }; reducedMotion: boolean }) {
  const bodyRefs = useRef<(HTMLDivElement | null)[]>([])
  const pupilRefs = useRef<(SVGGElement | null)[]>([])
  const originRef = useRef(origin)

  useEffect(() => {
    const pointer = { x: -9999, y: -9999 }
    const onPointer = (e: PointerEvent) => {
      pointer.x = e.clientX
      pointer.y = e.clientY
    }
    window.addEventListener('pointermove', onPointer, { passive: true })
    window.addEventListener('pointerdown', onPointer, { passive: true })

    const { x: ox, y: oy } = originRef.current
    const bots: Bot[] = Array.from({ length: COUNT }, (_, i) => {
      const a = (i / COUNT) * Math.PI * 2 + Math.random() * 0.4
      const speed = 4 + Math.random() * 3
      return { x: ox, y: oy, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, scale: 0, squash: 0, scared: 0, lookX: 0, lookY: 0 }
    })

    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const f = Math.min((now - last) / 16.667, 3)
      last = now
      const half = SIZE / 2
      const w = window.innerWidth
      const h = window.innerHeight

      bots.forEach((b, i) => {
        const dx = b.x - pointer.x
        const dy = b.y - pointer.y
        const dist = Math.hypot(dx, dy) || 1
        const near = dist < FEAR_RADIUS
        if (near) {
          const push = (1 - dist / FEAR_RADIUS) * 0.9 * f
          b.vx += (dx / dist) * push
          b.vy += (dy / dist) * push
        }
        b.scared += ((near ? 1 : 0) - b.scared) * (1 - Math.pow(0.85, f))

        const speed = Math.hypot(b.vx, b.vy) || 1
        const clamped = Math.min(MAX_SPEED, Math.max(MIN_SPEED, speed * Math.pow(0.995, f)))
        b.vx *= clamped / speed
        b.vy *= clamped / speed
        b.x += b.vx * f
        b.y += b.vy * f

        if (b.x < half || b.x > w - half) {
          b.x = Math.min(w - half, Math.max(half, b.x))
          b.vx = -b.vx
          b.squash = 0.25
        }
        if (b.y < half || b.y > h - half) {
          b.y = Math.min(h - half, Math.max(half, b.y))
          b.vy = -b.vy
          b.squash = 0.25
        }
        b.squash *= Math.pow(0.85, f)
        b.scale += (1 - b.scale) * (1 - Math.pow(0.88, f))

        // Eyes look at the cursor (wide-eyed when it gets close).
        const amount = Math.min(1, dist / 120)
        b.lookX += ((-dx / dist) * amount - b.lookX) * 0.2
        b.lookY += ((-dy / dist) * amount - b.lookY) * 0.2

        const jitter = reducedMotion ? 0 : Math.sin(now * 0.08 + i) * 2 * b.scared
        const puff = 1 + b.scared * 0.15
        const sx = b.scale * puff * (1 + b.squash * 0.6)
        const sy = b.scale * puff * (1 - b.squash)
        const el = bodyRefs.current[i]
        if (el) {
          el.style.transform = `translate3d(${(b.x - half + jitter).toFixed(2)}px, ${(b.y - half).toFixed(2)}px, 0) rotate(${(b.vx * 2).toFixed(2)}deg) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`
        }
        const pupil = `translate(${(b.lookX * 4).toFixed(2)} ${(b.lookY * 4).toFixed(2)}) scale(${(1 - b.scared * 0.35).toFixed(3)})`
        pupilRefs.current[i * 2]?.setAttribute('transform', pupil)
        pupilRefs.current[i * 2 + 1]?.setAttribute('transform', pupil)
      })
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('pointerdown', onPointer)
    }
  }, [reducedMotion])

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-20 overflow-hidden">
      {COLORS.map((color, i) => (
        <div
          key={color}
          ref={(el) => void (bodyRefs.current[i] = el)}
          className="absolute top-0 left-0 will-change-transform"
          style={{ width: SIZE, height: SIZE, transform: 'scale(0)' }}
        >
          <svg viewBox="-100 -100 200 200" className="h-full w-full overflow-visible">
            <g stroke={INK} strokeWidth="9" strokeLinejoin="round">
              {[
                [-52, -40, -50],
                [-62, -6, -80],
              ].map(([x, y, r]) => (
                <path key={x} d="M-14 8C-9 -6 -4 -20 0 -20C4 -20 9 -6 14 8Z" transform={`translate(${x} ${y}) rotate(${r})`} fill="#FFAD87" />
              ))}
              <path d="M-40 50C-70 52 -84 34 -88 22C-70 30 -54 26 -40 22Z" fill={color} />
              <ellipse cx="0" cy="46" rx="46" ry="34" fill={color} />
              <ellipse cx="4" cy="-14" rx="64" ry="56" fill={color} />
            </g>
            <ellipse cx="-30" cy="12" rx="11" ry="7" fill="#FF9EAA" />
            <ellipse cx="46" cy="12" rx="11" ry="7" fill="#FF9EAA" />
            {[-1, 1].map((side) => (
              <g key={side} transform={`translate(${8 + side * 26} -4)`}>
                <ellipse rx="13" ry="16" fill={INK} />
                <g ref={(el) => void (pupilRefs.current[i * 2 + (side > 0 ? 1 : 0)] = el)}>
                  <circle cx="-4" cy="-5" r="5" fill="#fff" />
                </g>
              </g>
            ))}
            <path d="M-2 22Q3 29 8 22Q13 29 18 22" stroke={INK} strokeWidth="5" strokeLinecap="round" fill="none" />
          </svg>
        </div>
      ))}
    </div>
  )
}
