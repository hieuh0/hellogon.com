import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react'
import type { World } from '../lib/world'

export interface Snack {
  id: 'strawberry' | 'donut' | 'boba' | 'chili'
  emoji: string
  label: string
  crumb: string
  bg: string
}

export const SNACKS: Snack[] = [
  { id: 'strawberry', emoji: '🍓', label: 'Dâu tây', crumb: '#FF6B81', bg: '#FFD1DA' },
  { id: 'donut', emoji: '🍩', label: 'Bánh donut', crumb: '#F4A6C6', bg: '#FFE6C7' },
  { id: 'boba', emoji: '🧋', label: 'Trà sữa trân châu', crumb: '#C79A6B', bg: '#EADBFF' },
  { id: 'chili', emoji: '🌶️', label: 'Ớt cay xè', crumb: '#FF4B3A', bg: '#FFD6C9' },
]

/** How close (px) to Gôn's mouth a dropped snack must be to get eaten. */
const EAT_RADIUS = 80

interface SnackTrayProps {
  open: boolean
  world: World
  reducedMotion: boolean
  getMouth: () => { x: number; y: number }
  onEat: (snack: Snack) => void
  onMiss: () => void
}

/**
 * A tray of snacks above the dock. Drag a snack to Gôn's mouth (he watches it and
 * opens wide as it gets closer), or tap one to toss it straight in.
 */
export function SnackTray({ open, world, reducedMotion, getMouth, onEat, onMiss }: SnackTrayProps) {
  const [held, setHeld] = useState<Snack | null>(null)
  const ghostRef = useRef<HTMLSpanElement>(null)
  const drag = useRef<{ id: number; snack: Snack; startX: number; startY: number; moved: boolean; home: DOMRect } | null>(null)
  const flight = useRef(0)

  const place = (x: number, y: number) => {
    world.snack.x = x
    world.snack.y = y
    if (ghostRef.current) ghostRef.current.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`
  }

  const finish = () => {
    world.snack.active = false
    setHeld(null)
  }

  /** Fly the held snack from (x, y) to a moving target, then call done. */
  const fly = (x: number, y: number, to: () => { x: number; y: number }, ms: number, arc: number, done: () => void) => {
    cancelAnimationFrame(flight.current)
    const start = performance.now()
    const duration = reducedMotion ? Math.min(ms, 120) : ms
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
      const target = to()
      place(x + (target.x - x) * e, y + (target.y - y) * e - Math.sin(t * Math.PI) * arc)
      if (ghostRef.current) ghostRef.current.style.scale = String(1 - t * 0.5)
      if (t < 1) flight.current = requestAnimationFrame(step)
      else done()
    }
    flight.current = requestAnimationFrame(step)
  }

  const eat = (snack: Snack) => {
    finish()
    onEat(snack)
  }

  const start = (snack: Snack, x: number, y: number) => {
    cancelAnimationFrame(flight.current)
    setHeld(snack)
    world.snack.active = true
    if (ghostRef.current) ghostRef.current.style.scale = '1'
    place(x, y)
  }

  const onPointerDown = (snack: Snack) => (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { id: e.pointerId, snack, startX: e.clientX, startY: e.clientY, moved: false, home: e.currentTarget.getBoundingClientRect() }
    start(snack, e.clientX, e.clientY)
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    if (Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > 5) d.moved = true
    place(e.clientX, e.clientY)
  }

  const onPointerUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    drag.current = null
    const mouth = getMouth()
    if (!d.moved) {
      // A tap tosses the snack in an arc straight into Gôn's mouth.
      fly(e.clientX, e.clientY, getMouth, 520, 90, () => eat(d.snack))
    } else if (Math.hypot(e.clientX - mouth.x, e.clientY - mouth.y) < EAT_RADIUS) {
      fly(e.clientX, e.clientY, getMouth, 120, 0, () => eat(d.snack))
    } else {
      const home = { x: d.home.left + d.home.width / 2, y: d.home.top + d.home.height / 2 }
      fly(e.clientX, e.clientY, () => home, 320, 30, finish)
      onMiss()
    }
  }

  const onPointerCancel = () => {
    drag.current = null
    finish()
  }

  /** Keyboard activation tosses the snack from its button. */
  const onKeyboardClick = (snack: Snack) => (e: ReactMouseEvent<HTMLButtonElement>) => {
    if (e.detail !== 0) return
    const r = e.currentTarget.getBoundingClientRect()
    start(snack, r.left + r.width / 2, r.top + r.height / 2)
    fly(r.left + r.width / 2, r.top + r.height / 2, getMouth, 520, 90, () => eat(snack))
  }

  useEffect(
    () => () => {
      cancelAnimationFrame(flight.current)
      world.snack.active = false
    },
    [world],
  )

  return (
    <>
      <div
        id="snack-tray"
        role="group"
        aria-label="Khay đồ ăn: kéo món ăn vào miệng Gôn"
        inert={!open}
        className={`absolute bottom-full left-1/2 mb-3 -translate-x-1/2 rounded-[28px] border-2 border-b-4 border-[var(--edge)] bg-[var(--panel)] p-2 shadow-[0_14px_30px_-16px_var(--shadow)] transition duration-200 ease-[cubic-bezier(0.3,1.5,0.5,1)] ${
          open ? 'translate-y-0 scale-100 opacity-100' : 'pointer-events-none translate-y-3 scale-90 opacity-0'
        }`}
      >
        <ul className="flex gap-2">
          {SNACKS.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                aria-label={`Cho Gôn ăn ${s.label}`}
                title={s.label}
                onPointerDown={onPointerDown(s)}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerCancel}
                onClick={onKeyboardClick(s)}
                className="candy grid size-12 cursor-grab touch-none place-items-center rounded-full text-2xl active:cursor-grabbing"
                style={{ background: s.bg, opacity: held?.id === s.id ? 0.45 : 1 }}
              >
                <span aria-hidden className="pointer-events-none select-none">
                  {s.emoji}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <span
        ref={ghostRef}
        aria-hidden
        className="pointer-events-none fixed top-0 left-0 z-50 text-5xl drop-shadow-[0_6px_6px_rgb(74_55_40/0.25)] select-none"
        style={{ visibility: held ? 'visible' : 'hidden' }}
      >
        {held?.emoji}
      </span>
    </>
  )
}
