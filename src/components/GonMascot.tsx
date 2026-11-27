import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { Accessory } from '../data/wardrobe'
import type { Mood, Mouth } from '../hooks/useGonBrain'
import { beatPhase } from '../lib/audioEngine'
import { groundY, type World } from '../lib/world'
import { BreathPuffs, FaceAccessory, HeadAccessory, Headphones, Scarf, Umbrella } from './GonAccessories'

export interface GonHandle {
  hop: (strength?: number) => void
  /** Gon's current center in viewport pixels. */
  getCenter: () => { x: number; y: number }
  /** Gon's mouth in viewport pixels (where snacks should land). */
  mouthPoint: () => { x: number; y: number }
  /** Chew for a moment and scatter crumbs of the given color. */
  chomp: (crumbColor: string) => void
}

/** Things Gon puts on by himself for the weather or for focus mode. */
export interface Gear {
  umbrella: boolean
  scarf: boolean
  breath: boolean
  headphones: boolean
}

interface GonMascotProps {
  mood: Mood
  mouth: Mouth
  /** Body paint (a color or a gradient reference) and the cheek blush that suits it. */
  color: string
  blush: string
  /** Rendered width in px. */
  size: number
  gear: Gear
  /** Dino Runner state: running along the track, or knocked out after a crash. */
  runner: 'off' | 'run' | 'ko'
  reducedMotion: boolean
  dancing: boolean
  zeroG: boolean
  accessory: Accessory | null
  world: World
  onPoke: () => void
  onDragStart: () => void
  onThrow: () => void
  onDizzy: () => void
  onWallHit: () => void
  /** Held down long enough to sneeze a burst of sparks. */
  onPop: () => void
  /** Started enjoying a headpat. */
  onPat: () => void
  /** Booped the ball. */
  onBoop: () => void
}

/* ---------- Chibi dino geometry (viewBox -100..100, feet rest on FLOOR_Y) ---------- */

const FLOOR_Y = 66
const INK = '#4A3728'
const BELLY = '#FFF8E7'
const SPIKE = '#FFAD87'
const GLOW = '#FF3B1F'
const ZERO_G_SPEED = 2.6

const HEAD = { cx: 4, cy: -18, rx: 56, ry: 48 }
/** Pear-shaped body, wider at the bottom; BODY_E approximates it for placing spikes. */
const BODY_PATH = 'M-26 18C-48 30 -50 66 -20 66H20C50 66 46 30 26 18Z'
const BODY_E = { cx: 0, cy: 40, rx: 44, ry: 26 }
/** Face origin: eyes sit wide apart and low on the big head. */
const FACE_X = 10
const FACE_Y = -10
const EYE_SPREAD = 24
const MOUTH_Y = 15
/** Head accessories sit on the crown, in front of the spikes. */
const HAT_X = 14
const HAT_Y = -62
const HAT_TILT = 4
const ARMS = [
  { x: -4, y: 38 },
  { x: 20, y: 36 },
]
const TAIL_X = -34
const TAIL_Y = 48
const TAIL_PATH = 'M4 -12C-14 -14 -28 -20 -37 -14Q-44 -8 -35 -2C-24 5 -10 12 4 12Z'
const SPIKE_PATH = 'M-9 6C-6 -4 -3 -13 0 -13C3 -13 6 -4 9 6Z'
const HEART_PATH = 'M0 6C-8 0 -8 -6 -4 -6C-2 -6 0 -4 0 -3C0 -4 2 -6 4 -6C8 -6 8 0 0 6Z'

/** Soft peach dorsal spikes on the back of the head and back, pointing along the surface normal. */
const SPIKES = (
  [
    [HEAD, 240, 1],
    [HEAD, 211, 0.95],
    [HEAD, 182, 0.85],
    [BODY_E, 200, 0.7],
  ] as const
).map(([e, deg, scale]) => {
  const t = (deg * Math.PI) / 180
  const nx = Math.cos(t) / e.rx
  const ny = Math.sin(t) / e.ry
  const n = Math.hypot(nx, ny)
  const x = e.cx + e.rx * Math.cos(t) - (nx / n) * 3
  const y = e.cy + e.ry * Math.sin(t) - (ny / n) * 3
  const rot = (Math.atan2(ny, nx) * 180) / Math.PI + 90
  return `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${rot.toFixed(1)}) scale(${scale})`
})

const FACES: Record<Mood, { eyeSpread: number; faceY: number }> = {
  idle: { eyeSpread: 1, faceY: 0 },
  sleepy: { eyeSpread: 1, faceY: 2 },
  happy: { eyeSpread: 1.03, faceY: -1 },
  annoyed: { eyeSpread: 0.94, faceY: 1 },
  dizzy: { eyeSpread: 1, faceY: 0 },
  spicy: { eyeSpread: 0.96, faceY: 0 },
}

/** Tail and arm rhythms: phase speed per frame, swing amplitude and resting angle (degrees). */
interface Swing {
  speed: number
  amp: number
  base: number
}

const TAIL_SWING: Record<Mood | 'dance', Swing> = {
  idle: { speed: 0.07, amp: 8, base: 0 },
  happy: { speed: 0.34, amp: 18, base: 4 },
  dance: { speed: 0.38, amp: 18, base: 4 },
  annoyed: { speed: 0.5, amp: 6, base: 8 },
  spicy: { speed: 0.6, amp: 14, base: 10 },
  sleepy: { speed: 0.025, amp: 2, base: -16 },
  dizzy: { speed: 0.13, amp: 12, base: 0 },
}

const ARM_SWING: Record<Mood | 'dance' | 'drag', Swing> = {
  idle: { speed: 0.05, amp: 5, base: 0 },
  happy: { speed: 0.26, amp: 28, base: -14 },
  dance: { speed: 0.26, amp: 30, base: -18 },
  drag: { speed: 0.55, amp: 30, base: -22 },
  annoyed: { speed: 0.6, amp: 14, base: -10 },
  spicy: { speed: 0.7, amp: 30, base: -24 },
  sleepy: { speed: 0.02, amp: 2, base: 16 },
  dizzy: { speed: 0.1, amp: 18, base: -6 },
}

/** Pointer held still this long (ms) starts a charge; a full charge takes CHARGE_MS more. */
const CHARGE_DELAY = 500
const CHARGE_MS = 1300
const POP_HIDE_MS = 320
const SPARK_COUNT = 14
const SPARK_COLORS = ['#FFB627', '#FFE38A', '#FF8FAB', BELLY]
const HEART_COUNT = 8
const CRUMB_COUNT = 10
/** Headpat: back-and-forth strokes this long (ms) start a pat; it ends after a short pause. */
const PAT_MS = 500
const PAT_IDLE_MS = 450
const CHOMP_MS = 820

const SPIRAL_PATH = (() => {
  let d = ''
  for (let a = 0; a <= Math.PI * 5; a += 0.2) {
    const r = (a / (Math.PI * 5)) * 9
    d += `${d ? 'L' : 'M'}${(Math.cos(a) * r).toFixed(2)} ${(Math.sin(a) * r).toFixed(2)}`
  }
  return d
})()

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
/** Percent position inside the wrapper for a point in SVG units. */
const pct = (u: number) => `${50 + u / 2}%`

/** True when a point (SVG units, unflipped) is on the upper part of the head: the petting spot. */
const onHeadTop = (x: number, y: number) =>
  y < -26 && ((x - HEAD.cx) / HEAD.rx) ** 2 + ((y - HEAD.cy) / HEAD.ry) ** 2 < 1.2

/* ---------- Simulation state (mutable, never triggers React renders) ---------- */

interface DragState {
  id: number
  startX: number
  startY: number
  startT: number
  offX: number
  offY: number
  moved: boolean
  /** A touch that started on the head pets instead of dragging. */
  pat: boolean
  samples: { x: number; y: number; t: number }[]
}

function createSim(mood: Mood) {
  const f = FACES[mood]
  const now = performance.now()
  return {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    hopY: 0,
    hopV: 0,
    squash: 0,
    tilt: 0,
    ground: 0,
    face: 1,
    lookX: 0,
    lookY: 0,
    lid: 0,
    blinkUntil: 0,
    nextBlink: now + 2500,
    breath: 0,
    tail: { phase: 0, amp: 0, base: 0 },
    arms: { phase: 0, amp: 0, base: 0 },
    charge: 0,
    charging: false,
    popAt: 0,
    pat: { lastX: 0, dir: 0, travel: 0, flips: [] as number[], streakStart: 0, lastMove: 0 },
    patting: false,
    patK: 0,
    nextHeart: 0,
    mouthOpen: 0,
    chompStart: -1e9,
    nextHop: 0,
    stride: 0,
    boopCooldown: 0,
    spread: f.eyeSpread,
    faceY: f.faceY,
    mood,
    moodSince: now,
    pointer: { x: 0, y: 0, active: false },
    center: { x: 0, y: 0 },
    /** Viewport position of the SVG origin and the px size of one SVG unit, as last drawn. */
    origin: { x: 0, y: 0 },
    unit: 1,
    drag: null as DragState | null,
    spin: [] as { t: number; d: number }[],
    lastAngle: null as number | null,
    dizzyCooldown: 0,
    lastWallHit: 0,
    shadowFade: 1,
  }
}

type Sim = ReturnType<typeof createSim>

/** Ease a swing's amplitude and rest angle toward a target while its phase keeps running. */
function stepSwing(state: Sim['tail'], target: Swing, f: number, ease: number, motion: number) {
  state.phase += target.speed * f * motion
  state.amp += (target.amp * motion - state.amp) * ease
  state.base += (target.base - state.base) * ease
}

/** Track back-and-forth strokes over the head (x in SVG units). */
function feedPat(s: Sim, x: number, now: number) {
  const p = s.pat
  if (now - p.lastMove > 400) {
    p.streakStart = now
    p.flips.length = 0
    p.dir = 0
    p.travel = 0
    p.lastX = x
  }
  const dx = x - p.lastX
  p.lastX = x
  p.lastMove = now
  if (Math.abs(dx) < 0.3) return
  const dir = Math.sign(dx)
  if (p.dir && dir !== p.dir) {
    if (p.travel > 6) p.flips.push(now)
    p.travel = 0
  }
  p.dir = dir
  p.travel += Math.abs(dx)
  while (p.flips.length && now - p.flips[0] > 1000) p.flips.shift()
}

/* ---------- Component ---------- */

export const GonMascot = forwardRef<GonHandle, GonMascotProps>(function GonMascot(props, ref) {
  const { mood, mouth, color, blush, size, gear, runner, reducedMotion, accessory } = props
  const propsRef = useRef(props)
  propsRef.current = props
  const [charging, setCharging] = useState(false)
  const [patting, setPatting] = useState(false)

  const sim = useRef<Sim>(null as never)
  if (!sim.current) sim.current = createSim(mood)

  const wrapRef = useRef<HTMLDivElement>(null)
  const moverRef = useRef<HTMLDivElement>(null)
  const shadowRef = useRef<HTMLDivElement>(null)
  const layerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const squashRef = useRef<SVGGElement>(null)
  const glowRef = useRef<SVGUseElement>(null)
  const faceRef = useRef<SVGGElement>(null)
  const hatRef = useRef<SVGGElement>(null)
  const staticMouthRef = useRef<SVGGElement>(null)
  const openMouthRef = useRef<SVGGElement>(null)
  const tailRefs = useRef<(SVGGElement | null)[]>([])
  const armRefs = useRef<(SVGGElement | null)[]>([])
  const cheekRefs = useRef<(SVGEllipseElement | null)[]>([])
  const eyeRefs = useRef<(SVGGElement | null)[]>([])
  const pupilRefs = useRef<(SVGGElement | null)[]>([])
  const footRefs = useRef<(SVGGElement | null)[]>([])
  const lidRefs = useRef<(SVGRectElement | null)[]>([])
  const lidLineRefs = useRef<(SVGLineElement | null)[]>([])
  const sparkRefs = useRef<(HTMLSpanElement | null)[]>([])
  const heartRefs = useRef<(HTMLSpanElement | null)[]>([])
  const crumbRefs = useRef<(HTMLSpanElement | null)[]>([])
  const heartIndex = useRef(0)

  useImperativeHandle(ref, () => ({
    hop(strength = 1) {
      const s = sim.current
      if (s.hopY > -8) s.hopV = -10 * strength * (propsRef.current.reducedMotion ? 0.6 : 1)
    },
    getCenter() {
      const s = sim.current
      return { x: s.center.x, y: s.center.y + s.hopY }
    },
    mouthPoint: () => mouthPoint(sim.current),
    chomp(crumbColor) {
      const s = sim.current
      s.chompStart = performance.now()
      if (propsRef.current.reducedMotion) return
      const side = Math.sign(s.face || 1)
      crumbRefs.current.forEach((el, i) => {
        if (!el) return
        el.style.left = pct(FACE_X * side)
        el.style.top = pct(FACE_Y + MOUTH_Y + 4)
        el.style.background = i % 3 === 0 ? BELLY : crumbColor
        const dx = (Math.random() - 0.5) * 70 * s.unit
        const up = (10 + Math.random() * 25) * s.unit
        const down = (40 + Math.random() * 30) * s.unit
        el.animate(
          [
            { transform: 'translate(-50%, -50%) scale(0.4)', opacity: 1 },
            { transform: `translate(calc(${dx * 0.6}px - 50%), calc(${-up}px - 50%)) scale(1)`, opacity: 1, offset: 0.35 },
            { transform: `translate(calc(${dx}px - 50%), calc(${down}px - 50%)) scale(0.6)`, opacity: 0 },
          ],
          { duration: 650 + Math.random() * 300, delay: Math.random() * 300, easing: 'cubic-bezier(0.3, 0.6, 0.6, 1)', fill: 'both' },
        )
      })
    },
  }))

  // Animation loop: physics, swings, pats, snacks, ball chasing, eye tracking. Writes straight to the DOM.
  useEffect(() => {
    const s = sim.current
    let raf = 0
    let last = performance.now()

    const burst = () => {
      if (propsRef.current.reducedMotion) return
      const unit = s.unit
      sparkRefs.current.forEach((el, i) => {
        if (!el) return
        const a = (i / SPARK_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.5
        const dist = (70 + Math.random() * 60) * unit
        const dx = Math.cos(a) * dist
        const dy = Math.sin(a) * dist - 20 * unit
        const spin = (Math.random() - 0.5) * 540
        el.animate(
          [
            { transform: 'translate(-50%, -50%) scale(0.3)', opacity: 1 },
            { transform: `translate(calc(${dx * 0.8}px - 50%), calc(${dy * 0.8}px - 50%)) rotate(${spin * 0.7}deg) scale(1.1)`, opacity: 1, offset: 0.55 },
            { transform: `translate(calc(${dx}px - 50%), calc(${dy + 30 * unit}px - 50%)) rotate(${spin}deg) scale(0)`, opacity: 0 },
          ],
          { duration: 650 + Math.random() * 250, easing: 'cubic-bezier(0.15, 0.8, 0.3, 1)', fill: 'forwards' },
        )
      })
    }

    const heart = () => {
      const el = heartRefs.current[heartIndex.current++ % HEART_COUNT]
      if (!el) return
      el.style.left = pct(HAT_X * Math.sign(s.face || 1) + (Math.random() - 0.5) * 70)
      el.style.top = pct(-58)
      const sway = (Math.random() - 0.5) * 30 * s.unit
      const rise = (60 + Math.random() * 40) * s.unit
      el.animate(
        [
          { transform: 'translate(-50%, -50%) scale(0.3)', opacity: 0 },
          { transform: `translate(calc(${sway}px - 50%), calc(${-rise * 0.4}px - 50%)) scale(1.1)`, opacity: 1, offset: 0.3 },
          { transform: `translate(calc(${-sway * 0.5}px - 50%), calc(${-rise}px - 50%)) scale(0.8)`, opacity: 0 },
        ],
        { duration: 1100 + Math.random() * 400, easing: 'ease-out', fill: 'forwards' },
      )
    }

    const pop = (now: number) => {
      const drag = s.drag
      const mover = moverRef.current
      if (drag && mover?.hasPointerCapture(drag.id)) mover.releasePointerCapture(drag.id)
      s.drag = null
      s.popAt = now
      s.charge = 0
      burst()
      propsRef.current.onPop()
    }

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const f = Math.min((now - last) / 16.667, 3)
      last = now
      const p = propsRef.current
      const world = p.world
      const wrap = wrapRef.current
      if (!wrap) return

      if (p.mood !== s.mood) {
        s.mood = p.mood
        s.moodSince = now
      }
      const face = FACES[s.mood]
      const motion = p.reducedMotion ? 0 : 1
      const since = now - s.moodSince
      const ease = 1 - Math.pow(1 - 0.18, f)

      const rect = wrap.getBoundingClientRect()
      const unit = rect.width / 200
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      s.unit = unit
      s.center.x = cx + s.x
      s.center.y = cy + s.y + s.ground

      const ball = world.ball
      const game = world.game
      const running = game.active
      const chasing = ball.active && !p.zeroG && !s.popAt && !running

      // Stay put while running; otherwise spring back to center, drift in zero-g, or roam freely while playing ball.
      if (running) {
        s.x *= Math.pow(0.8, f)
        s.y *= Math.pow(0.8, f)
        s.vx = s.vy = 0
      } else if (!s.drag) {
        if (p.zeroG) {
          const speed = Math.hypot(s.vx, s.vy)
          if (speed < 0.01) {
            const a = Math.PI / 4 + Math.floor(Math.random() * 4) * (Math.PI / 2) + (Math.random() - 0.5) * 0.4
            s.vx = Math.cos(a) * ZERO_G_SPEED
            s.vy = Math.sin(a) * ZERO_G_SPEED
          } else {
            // Ease any throw speed back to a constant drift.
            const next = speed + (ZERO_G_SPEED - speed) * (1 - Math.pow(0.97, f))
            s.vx *= next / speed
            s.vy *= next / speed
          }
        } else {
          const damp = Math.pow(0.88, f)
          s.vy = (s.vy - 0.045 * s.y * f) * damp
          if (chasing) s.vx *= s.hopY < 0 ? 1 : Math.pow(0.8, f)
          else s.vx = (s.vx - 0.045 * s.x * f) * damp
        }
        s.x += s.vx * f
        s.y += s.vy * f
        const half = rect.width * 0.4
        const bounds = [
          [half - cx, window.innerWidth - half - cx],
          [half - cy, window.innerHeight - half - cy],
        ]
        const axes = [
          ['x', 'vx'],
          ['y', 'vy'],
        ] as const
        axes.forEach(([pos, vel], i) => {
          const [lo, hi] = bounds[i]
          if (s[pos] < lo || s[pos] > hi) {
            const speed = Math.abs(s[vel])
            s[pos] = clamp(s[pos], lo, hi)
            s[vel] = (s[pos] === lo ? 1 : -1) * speed * (p.zeroG ? 1 : 0.6)
            if ((p.zeroG || speed > 4) && now - s.lastWallHit > 120) {
              s.lastWallHit = now
              s.squash = 0.12
              p.onWallHit()
            }
          }
        })
        if (Math.abs(s.x) < 0.05 && Math.abs(s.vx) < 0.05) s.x = s.vx = 0
        if (Math.abs(s.y) < 0.05 && Math.abs(s.vy) < 0.05) s.y = s.vy = 0
      }

      // Feet follow the curve of the hill as Gon moves sideways.
      const groundTarget = p.zeroG || s.drag?.moved || running ? 0 : groundY(world.hill, cx + s.x) - world.hill.crestY
      s.ground += (groundTarget - s.ground) * ease

      // Charge: holding the pointer still puffs Gon up until he sneezes sparks.
      const held = s.drag && !s.drag.moved && !s.drag.pat && !s.popAt ? now - s.drag.startT - CHARGE_DELAY : -1
      if (held > 0) s.charge = Math.min(1, held / CHARGE_MS)
      else s.charge += (0 - s.charge) * (1 - Math.pow(1 - 0.2, f))
      if (s.charge >= 1) pop(now)
      const isCharging = s.charge > 0.02
      if (isCharging !== s.charging) {
        s.charging = isCharging
        setCharging(isCharging)
      }
      const charge = s.charge

      // Headpat: enough back-and-forth strokes over the head; stays on while the strokes continue.
      const pat = s.pat
      const stroking = now - pat.lastMove < PAT_IDLE_MS
      const isPatting =
        stroking && (s.patting ? pat.flips.length >= 1 : pat.flips.length >= 2 && now - pat.streakStart >= PAT_MS)
      if (isPatting !== s.patting) {
        s.patting = isPatting
        setPatting(isPatting)
        if (isPatting) {
          s.nextHeart = now
          p.onPat()
        }
      }
      s.patK += ((isPatting ? 1 : 0) - s.patK) * ease
      if (isPatting && now >= s.nextHeart && motion) {
        s.nextHeart = now + 260
        heart()
      }

      // Pop: hidden while the sparks fly, then reform with an elastic overshoot.
      let popK = 1
      if (s.popAt) {
        const t = now - s.popAt
        if (t < POP_HIDE_MS) popK = 0
        else {
          const u = (t - POP_HIDE_MS) / 1000
          popK = motion ? 1 - Math.exp(-6 * u) * Math.cos(13 * u) : Math.min(1, u * 5)
          if (u > 1.2) {
            s.popAt = 0
            popK = 1
          }
        }
      }

      // Ball play: hop toward the ball and boop it on contact.
      if (chasing && !s.drag) {
        const gx = cx + s.x
        const dx = ball.x - gx
        if (s.hopY === 0 && now > s.nextHop && !ball.held) {
          const top = cy + s.y + s.ground - 60 * unit
          if (Math.abs(dx) > 40 * unit) {
            s.hopV = -(7 + Math.random() * 2.5) * (motion || 0.6)
            s.vx = Math.sign(dx) * clamp(Math.abs(dx) * 0.025, 2.5, 7)
            s.nextHop = now + 300 + Math.random() * 250
          } else if (ball.y < top && ball.y > top - 160 * unit) {
            s.hopV = -12 * (motion || 0.6)
            s.nextHop = now + 500
          }
        }
        const bodyY = cy + s.y + s.hopY + s.ground - 8 * unit
        const ddy = ball.y - bodyY
        const dist = Math.hypot(dx, ddy) || 1
        const reach = 54 * unit + ball.r
        if (dist < reach && now > s.boopCooldown && !ball.held) {
          const nx = dx / dist
          const ny = ddy / dist
          ball.x = gx + nx * reach
          ball.y = bodyY + ny * reach
          ball.vx = nx * 9 + s.vx * 0.8
          ball.vy = Math.min(ny * 9, -7) + Math.min(s.hopV, 0) * 0.5
          s.boopCooldown = now + 250
          s.squash = 0.12
          p.onBoop()
        }
      }

      // Spicy: hop around wildly.
      if (s.mood === 'spicy' && motion && !s.drag && !running && s.hopY === 0 && now > s.nextHop) {
        s.hopV = -(7 + Math.random() * 7)
        s.nextHop = now + 90 + Math.random() * 200
      }

      // Hop with gravity and a landing squash; in the runner the game owns the jump.
      if (running) {
        const wasUp = s.hopY < 0
        s.hopY = -game.y
        s.hopV = -game.vy
        if (wasUp && game.y === 0) s.squash = 0.18 * (motion || 0.5)
      } else if (s.hopY < 0 || s.hopV !== 0) {
        s.hopV += 0.9 * f
        s.hopY += s.hopV * f
        if (s.hopY >= 0) {
          s.hopY = 0
          s.hopV = 0
          s.squash = 0.16 * (motion || 0.5)
        }
      }
      s.squash *= Math.pow(0.82, f)

      // Snack: the mouth opens wider as it gets closer; chewing after a bite.
      const snack = world.snack
      let openTarget = 0
      if (snack.active) {
        const m = mouthPoint(s)
        const d = Math.hypot(snack.x - m.x, snack.y - m.y)
        openTarget = clamp(1 - (d - 25 * unit) / (200 * unit), 0, 1)
      }
      const chewing = now - s.chompStart < CHOMP_MS
      if (chewing) openTarget = 0.1 + 0.8 * Math.abs(Math.sin((now - s.chompStart) * 0.024))
      s.mouthOpen += (openTarget - s.mouthOpen) * (1 - Math.pow(1 - (chewing ? 0.6 : 0.25), f))

      // Mood-driven body motion.
      let bx = 0
      let by = 0
      let rot = 0
      let sx = 1
      let sy = 1
      s.breath += (s.mood === 'sleepy' ? 0.026 : 0.044) * f * motion
      const breath = Math.sin(s.breath) * motion * (s.mood === 'sleepy' ? 1.5 : 1)
      sy += breath * 0.018
      sx -= breath * 0.012
      if (p.dancing && motion) {
        // Dance on a 120 BPM beat: bounce every beat, sway every two.
        const beat = (now % 500) / 500
        const bounce = Math.sin(beat * Math.PI)
        const sway = Math.sin((now / 1000) * Math.PI * 2)
        by -= bounce * 14
        bx += sway * 10
        rot += sway * 12
        const land = Math.pow(1 - bounce, 6)
        sy -= land * 0.09
        sx += land * 0.08
      } else if (s.mood === 'happy' && motion && !chasing) {
        const b = Math.abs(Math.sin(since * 0.011))
        by -= b * 10
        const land = Math.pow(1 - b, 6)
        sy -= land * 0.07
        sx += land * 0.06
      }
      if ((s.mood === 'annoyed' || s.mood === 'spicy') && motion) {
        bx += Math.sin(since * 0.09) * 2.4 * Math.max(0.35, 1 - since / 900)
      }
      if (s.mood === 'dizzy' && motion) rot += Math.sin(since * 0.012) * 7
      if (p.zeroG && motion) rot += Math.sin(now * 0.0015) * 10
      if (running) {
        // Little running bounce on the ground; squash low while ducking.
        s.stride += 0.34 * f * motion
        if (game.y === 0 && p.runner === 'run') by -= Math.abs(Math.sin(s.stride)) * 3 * motion
        if (game.duck) {
          sy -= 0.3
          sx += 0.16
        }
      } else if (p.gear.headphones && motion) {
        // Bob along to the lo-fi beat.
        const beat = beatPhase()
        by -= Math.sin(beat * Math.PI) ** 2 * 3
        rot += Math.sin(beat * Math.PI * 2) * 2.2
      }
      if (charge > 0) {
        bx += Math.sin(now * 0.09) * charge * charge * 2.6 * motion
        sx += charge * 0.1
        sy += charge * 0.04
      }
      // Melt a little under a headpat, and munch while chewing.
      sy -= s.patK * 0.07
      sx += s.patK * 0.05
      if (chewing) {
        sy -= s.mouthOpen * 0.05
        sx += s.mouthOpen * 0.03
      }
      const air = clamp(-s.hopV * 0.012, -0.1, 0.12)
      const stretch = Math.min(Math.hypot(s.vx, s.vy) * 0.004, 0.1)
      sy += air + stretch - s.squash
      sx -= (air + stretch) * 0.75 - s.squash * 0.8

      // Face the ball while playing; otherwise face right (the drawing's natural direction).
      const ballDx = ball.x - (cx + s.x)
      const faceTarget = !chasing ? 1 : Math.abs(ballDx) > 12 * unit ? Math.sign(ballDx) : Math.sign(s.face) || 1
      s.face += (faceTarget - s.face) * (1 - Math.pow(1 - 0.3, f))
      const flip = Math.abs(s.face) < 0.15 ? (Math.sign(s.face) || 1) * 0.15 : s.face
      const side = Math.sign(flip)

      // Tail wag and tiny arm wiggles.
      const swingKey = p.dancing ? 'dance' : s.mood
      stepSwing(s.tail, TAIL_SWING[swingKey], f, ease, motion)
      const armKey = s.drag?.moved || (running && p.runner === 'run') ? 'drag' : snack.active || s.patting ? 'happy' : swingKey
      const armTarget = charge > 0.05 ? { speed: 0.9, amp: 4 * charge, base: -38 * charge } : ARM_SWING[armKey]
      stepSwing(s.arms, armTarget, f, ease, motion)

      // Eyes follow the pointer, or lock onto a snack or the ball; the body tilts toward the pointer.
      const gx = cx + s.x + bx
      const gy = cy + s.y + s.hopY + by + s.ground
      s.origin.x = gx
      s.origin.y = gy
      world.gon.x = gx
      world.gon.y = gy
      world.gon.unit = unit
      const target = running ? null : snack.active ? snack : chasing ? ball : s.pointer.active ? s.pointer : null
      let tx = 0
      let ty = 0
      let tiltTarget = 0
      if (target) {
        const dx = target.x - (gx + FACE_X * unit * side)
        const dy = target.y - (gy + FACE_Y * unit)
        const dist = Math.hypot(dx, dy) || 1
        const amount = snack.active ? 1 : Math.min(1, dist / (140 * unit))
        tx = (dx / dist) * amount
        ty = (dy / dist) * amount
        if (target === s.pointer) tiltTarget = clamp(dx / (window.innerWidth / 2), -1, 1) * 6
      }
      if (running) tx = 0.6
      s.lookX += (tx - s.lookX) * ease
      s.lookY += (ty - s.lookY) * ease
      s.tilt += (clamp(tiltTarget + s.vx * 0.6, -25, 25) - s.tilt) * ease
      const lookX = s.lookX * side

      // Eyelids: blink, sleepy half-closed, yawning or charging squint; wide open for snacks.
      if (now > s.nextBlink && s.mood !== 'dizzy') {
        s.blinkUntil = now + (s.mood === 'sleepy' ? 260 : 140)
        s.nextBlink = now + 2500 + Math.random() * 3500
      }
      let lidTarget = s.mood === 'sleepy' ? 0.5 : s.mood === 'annoyed' ? 0.22 : 0
      if (p.mouth === 'yawn') lidTarget = Math.max(lidTarget, 0.7)
      lidTarget = Math.max(lidTarget, charge * 0.45)
      if (snack.active) lidTarget = 0
      if (now < s.blinkUntil) lidTarget = 1
      s.lid += (lidTarget - s.lid) * (1 - Math.pow(1 - 0.45, f))

      const morph = 1 - Math.pow(1 - 0.16, f)
      s.spread += (face.eyeSpread - s.spread) * morph
      s.faceY += (face.faceY - s.faceY) * morph

      // DOM writes.
      footRefs.current.forEach((el, i) => {
        const lift = running && game.y === 0 && p.runner === 'run' ? -Math.max(0, Math.sin(s.stride + i * Math.PI)) * 7 * motion : 0
        el?.setAttribute('transform', `translate(0 ${lift.toFixed(2)})`)
      })
      const moveT = `translate3d(${(s.x + bx).toFixed(2)}px, ${(s.y + s.hopY + by + s.ground).toFixed(2)}px, 0)`
      if (moverRef.current) moverRef.current.style.transform = `${moveT} rotate(${(s.tilt + rot).toFixed(2)}deg)`
      if (layerRef.current) layerRef.current.style.transform = moveT
      squashRef.current?.setAttribute(
        'transform',
        `translate(0 10) scale(${popK.toFixed(4)}) translate(0 ${FLOOR_Y - 10}) scale(${(sx * flip).toFixed(4)} ${sy.toFixed(4)}) translate(0 ${-FLOOR_Y})`,
      )
      const tailAngle = s.tail.base + Math.sin(s.tail.phase) * s.tail.amp
      const tailT = `translate(${TAIL_X} ${TAIL_Y}) rotate(${tailAngle.toFixed(2)})`
      tailRefs.current.forEach((el) => el?.setAttribute('transform', tailT))
      armRefs.current.forEach((el, i) => {
        const a = s.arms.base + Math.sin(s.arms.phase + i * 1.9) * s.arms.amp
        el?.setAttribute('transform', `translate(${ARMS[i].x} ${ARMS[i].y}) rotate(${a.toFixed(2)})`)
      })
      glowRef.current?.setAttribute('opacity', (charge * 0.55).toFixed(3))
      if (svgRef.current) {
        svgRef.current.style.filter =
          charge > 0.01 ? `drop-shadow(0 0 ${(charge * 16).toFixed(1)}px rgb(255 70 40 / ${(charge * 0.8).toFixed(2)}))` : ''
      }
      const blush = Math.max(charge, s.patK)
      cheekRefs.current.forEach((el) => {
        if (!el) return
        el.setAttribute('transform', `scale(${(1 + charge * 0.9 + s.patK * 0.25).toFixed(3)})`)
        el.setAttribute('opacity', (0.75 + blush * 0.25).toFixed(3))
      })
      hatRef.current?.setAttribute(
        'transform',
        `translate(${(HAT_X + lookX * 3).toFixed(2)} ${HAT_Y}) rotate(${(HAT_TILT + lookX * 5).toFixed(2)})`,
      )
      faceRef.current?.setAttribute(
        'transform',
        `translate(${(FACE_X + lookX * 5).toFixed(2)} ${(FACE_Y + s.lookY * 4 + s.faceY).toFixed(2)})`,
      )
      const open = s.mouthOpen
      staticMouthRef.current?.setAttribute('opacity', open > 0.08 ? '0' : '1')
      if (openMouthRef.current) {
        openMouthRef.current.setAttribute('opacity', open > 0.08 ? '1' : '0')
        openMouthRef.current.setAttribute(
          'transform',
          `translate(0 ${MOUTH_Y + 1}) scale(${(0.6 + open * 0.5).toFixed(3)} ${(0.15 + open).toFixed(3)})`,
        )
      }
      for (let i = 0; i < 2; i++) {
        const sideI = i === 0 ? -1 : 1
        eyeRefs.current[i]?.setAttribute('transform', `translate(${(sideI * EYE_SPREAD * s.spread).toFixed(2)} 0)`)
        pupilRefs.current[i]?.setAttribute('transform', `translate(${(lookX * 3).toFixed(2)} ${(s.lookY * 3).toFixed(2)})`)
        const lidH = 28 * s.lid
        lidRefs.current[i]?.setAttribute('height', (lidH + (s.lid > 0.01 ? 1 : 0)).toFixed(2))
        const line = lidLineRefs.current[i]
        if (line) {
          const y = (-14 + lidH).toFixed(2)
          line.setAttribute('y1', y)
          line.setAttribute('y2', y)
          line.setAttribute('opacity', s.lid > 0.08 && s.lid < 0.95 ? '1' : '0')
        }
      }
      if (shadowRef.current) {
        const lift = -(s.y + s.hopY + by)
        const k = clamp(1 - lift / 320, 0.35, 1.15)
        shadowRef.current.style.transform = `translate3d(${s.x.toFixed(2)}px, ${s.ground.toFixed(2)}px, 0) scale(${(k * (0.4 + popK * 0.6)).toFixed(3)})`
        s.shadowFade += ((p.zeroG ? 0 : 1) - s.shadowFade) * ease
        shadowRef.current.style.opacity = String(clamp(k, 0.25, 1) * s.shadowFade)
      }
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  // Pointer tracking, headpats, dizzy detection, drag and throw.
  useEffect(() => {
    const s = sim.current
    const mover = moverRef.current!
    const local = (e: PointerEvent) => ({
      x: ((e.clientX - s.origin.x) / s.unit) * (Math.sign(s.face) || 1),
      y: (e.clientY - s.origin.y) / s.unit,
    })

    const onWindowMove = (e: PointerEvent) => {
      s.pointer.x = e.clientX
      s.pointer.y = e.clientY
      s.pointer.active = true
      if (s.drag) return
      const now = performance.now()

      // Hovering strokes over the head count as a headpat (mouse and pen).
      if (e.type === 'pointermove' && e.pointerType !== 'touch') {
        const l = local(e)
        if (onHeadTop(l.x, l.y)) feedPat(s, l.x, now)
      }

      // Circling the pointer quickly around Gon (two full turns in 1.6s) makes him dizzy.
      const dx = e.clientX - s.center.x
      const dy = e.clientY - s.center.y
      const dist = Math.hypot(dx, dy)
      if (dist < 20 || dist > 520) {
        s.spin.length = 0
        s.lastAngle = null
        return
      }
      const angle = Math.atan2(dy, dx)
      if (s.lastAngle !== null) {
        let d = angle - s.lastAngle
        if (d > Math.PI) d -= Math.PI * 2
        if (d < -Math.PI) d += Math.PI * 2
        s.spin.push({ t: now, d })
      }
      s.lastAngle = angle
      while (s.spin.length && now - s.spin[0].t > 1600) s.spin.shift()
      const total = s.spin.reduce((sum, v) => sum + v.d, 0)
      if (Math.abs(total) > Math.PI * 4 && now > s.dizzyCooldown) {
        s.dizzyCooldown = now + 4000
        s.spin.length = 0
        propsRef.current.onDizzy()
      }
    }
    const onLeave = () => {
      s.pointer.active = false
    }

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return
      if (s.popAt) return // still reforming after a pop
      e.preventDefault()
      mover.setPointerCapture(e.pointerId)
      const l = local(e)
      s.drag = {
        id: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        startT: performance.now(),
        offX: s.x - e.clientX,
        offY: s.y - e.clientY,
        moved: false,
        pat: e.pointerType === 'touch' && onHeadTop(l.x, l.y),
        samples: [{ x: e.clientX, y: e.clientY, t: performance.now() }],
      }
    }
    const onMove = (e: PointerEvent) => {
      const drag = s.drag
      if (!drag || drag.id !== e.pointerId) return
      const now = performance.now()
      if (drag.pat) {
        feedPat(s, local(e).x, now)
        return
      }
      if (!drag.moved && Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > 6) {
        drag.moved = true
        propsRef.current.onDragStart()
      }
      if (!drag.moved) return
      s.x = e.clientX + drag.offX
      s.y = e.clientY + drag.offY
      s.vx = s.vy = 0
      drag.samples.push({ x: e.clientX, y: e.clientY, t: now })
      while (drag.samples.length > 2 && now - drag.samples[0].t > 100) drag.samples.shift()
    }
    const endDrag = (e: PointerEvent, cancelled: boolean) => {
      const drag = s.drag
      if (!drag || drag.id !== e.pointerId) return
      s.drag = null
      if (mover.hasPointerCapture(e.pointerId)) mover.releasePointerCapture(e.pointerId)
      if (cancelled) return
      const quick = performance.now() - drag.startT < CHARGE_DELAY
      const still = Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < 6
      if (drag.pat || !drag.moved) {
        if (quick && still) propsRef.current.onPoke()
        return
      }
      const first = drag.samples[0]
      const lastS = drag.samples[drag.samples.length - 1]
      const dt = Math.max(lastS.t - first.t, 16)
      s.vx = clamp(((lastS.x - first.x) / dt) * 16.667, -45, 45)
      s.vy = clamp(((lastS.y - first.y) / dt) * 16.667, -45, 45)
      if (Math.hypot(s.vx, s.vy) > 6) propsRef.current.onThrow()
    }
    const onUp = (e: PointerEvent) => endDrag(e, false)
    const onCancel = (e: PointerEvent) => endDrag(e, true)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        if (!e.repeat) propsRef.current.onPoke()
      }
    }

    window.addEventListener('pointermove', onWindowMove, { passive: true })
    window.addEventListener('pointerdown', onWindowMove, { passive: true })
    document.documentElement.addEventListener('mouseleave', onLeave)
    mover.addEventListener('pointerdown', onDown)
    mover.addEventListener('pointermove', onMove)
    mover.addEventListener('pointerup', onUp)
    mover.addEventListener('pointercancel', onCancel)
    mover.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointermove', onWindowMove)
      window.removeEventListener('pointerdown', onWindowMove)
      document.documentElement.removeEventListener('mouseleave', onLeave)
      mover.removeEventListener('pointerdown', onDown)
      mover.removeEventListener('pointermove', onMove)
      mover.removeEventListener('pointerup', onUp)
      mover.removeEventListener('pointercancel', onCancel)
      mover.removeEventListener('keydown', onKey)
    }
  }, [])

  const dizzy = mood === 'dizzy'
  const eyes: 'open' | 'happy' | 'squeeze' | 'cross' =
    runner === 'ko'
      ? 'cross'
      : charging
        ? 'open'
        : patting || (mood === 'happy' && mouth !== 'yawn')
          ? 'happy'
          : mood === 'spicy'
            ? 'squeeze'
            : 'open'
  const expression: Expression = runner === 'ko' ? 'ko' : charging ? 'puff' : patting ? 'pat' : (mouth ?? mood)
  const fill = { fill: color, className: 'gon-fill' }

  return (
    <div
      ref={wrapRef}
      className="relative aspect-square"
      style={{ width: size, transition: 'width 0.6s cubic-bezier(0.3, 1.2, 0.5, 1)' }}
    >
      <div
        ref={shadowRef}
        aria-hidden
        className="gon-shadow pointer-events-none absolute inset-x-[20%] top-[78%] h-[9%] rounded-[50%]"
      />
      <div ref={layerRef} aria-hidden className="pointer-events-none absolute inset-0 z-10">
        {Array.from({ length: SPARK_COUNT }, (_, i) => (
          <span key={i} ref={(el) => void (sparkRefs.current[i] = el)} className="absolute top-1/2 left-1/2 opacity-0">
            <svg viewBox="-10 -10 20 20" className="size-6 overflow-visible">
              <Spark kind={i % 3} fill={i % 4 === 0 ? color : SPARK_COLORS[i % SPARK_COLORS.length]} />
            </svg>
          </span>
        ))}
        {Array.from({ length: HEART_COUNT }, (_, i) => (
          <span key={i} ref={(el) => void (heartRefs.current[i] = el)} className="absolute opacity-0">
            <svg viewBox="-10 -9 20 18" className="size-6 overflow-visible">
              <path
                d={HEART_PATH}
                transform="scale(1.2)"
                fill={i % 2 ? '#FF8FAB' : '#FFB3C6'}
                stroke={INK}
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        ))}
        {Array.from({ length: CRUMB_COUNT }, (_, i) => (
          <span
            key={i}
            ref={(el) => void (crumbRefs.current[i] = el)}
            className="absolute size-2 rounded-[3px] border-[1.5px] border-[#4A3728] opacity-0"
          />
        ))}
      </div>
      <div
        ref={moverRef}
        role="button"
        tabIndex={0}
        aria-label="Gon, bé khủng long con. Bấm để chọc, xoa đầu để cưng, giữ để hắt xì, kéo để ném."
        className={`${runner === 'off' ? '' : 'pointer-events-none'} absolute inset-0 cursor-grab touch-none rounded-full outline-none will-change-transform select-none focus-visible:ring-4 focus-visible:ring-[#4A3728]/25 active:cursor-grabbing`}
      >
        <svg ref={svgRef} viewBox="-100 -100 200 200" className="h-full w-full overflow-visible" aria-hidden>
          <defs>
            <linearGradient id="gon-rainbow" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#FFB3C6" />
              <stop offset="0.28" stopColor="#FFE08A" />
              <stop offset="0.52" stopColor="#B8F2B6" />
              <stop offset="0.76" stopColor="#8FD3FF" />
              <stop offset="1" stopColor="#C9B6FF" />
            </linearGradient>
            <g id="gon-dino-silhouette">
              <path d={BODY_PATH} />
              <ellipse cx={HEAD.cx} cy={HEAD.cy} rx={HEAD.rx} ry={HEAD.ry} />
              <ellipse cx="34" cy="-6" rx="28" ry="22" />
            </g>
            <clipPath id="gon-eye-clip">
              <ellipse rx="10.5" ry="12.5" />
            </clipPath>
            <clipPath id="gon-lid-clip">
              <ellipse rx="12" ry="14" />
            </clipPath>
          </defs>
          <g ref={squashRef}>
            {gear.umbrella && <Umbrella />}
            {/* Ink pass slightly larger than the color pass gives one clean outline around the union. */}
            <g ref={(el) => void (tailRefs.current[0] = el)} transform={`translate(${TAIL_X} ${TAIL_Y})`}>
              <path d={TAIL_PATH} fill={INK} stroke={INK} strokeWidth="6" strokeLinejoin="round" />
            </g>
            {SPIKES.map((t) => (
              <path key={t} d={SPIKE_PATH} transform={t} fill={INK} stroke={INK} strokeWidth="6" strokeLinejoin="round" />
            ))}
            <use href="#gon-dino-silhouette" fill={INK} stroke={INK} strokeWidth="6" strokeLinejoin="round" />

            <g ref={(el) => void (tailRefs.current[1] = el)} transform={`translate(${TAIL_X} ${TAIL_Y})`}>
              <path d={TAIL_PATH} {...fill} />
            </g>
            {SPIKES.map((t) => (
              <path key={t} d={SPIKE_PATH} transform={t} fill={SPIKE} />
            ))}
            <use href="#gon-dino-silhouette" {...fill} />
            <use ref={glowRef} href="#gon-dino-silhouette" fill={GLOW} opacity="0" />

            {/* Soft top-left highlights. */}
            <ellipse cx="-22" cy="-46" rx="14" ry="7" transform="rotate(-32 -22 -46)" fill="#fff" opacity="0.5" />
            <circle cx="-4" cy="-56" r="3" fill="#fff" opacity="0.5" />

            <ellipse cx="4" cy="50" rx="22" ry="13" fill={BELLY} />
            {[
              [-20, 58],
              [20, 58],
            ].map(([x, y]) => (
              <g key={x} ref={(el) => void (footRefs.current[x < 0 ? 0 : 1] = el)}>
                <ellipse cx={x} cy={y} rx="14" ry="8" {...fill} stroke={INK} strokeWidth="3" />
                <circle cx={x + 5} cy={y + 2} r="2" fill={BELLY} />
                <circle cx={x + 10} cy={y} r="2" fill={BELLY} />
              </g>
            ))}
            {ARMS.map((a, i) => (
              <g key={i} ref={(el) => void (armRefs.current[i] = el)} transform={`translate(${a.x} ${a.y})`}>
                <path d="M0 0Q6 -1 9 5" stroke={INK} strokeWidth="11" strokeLinecap="round" fill="none" />
                <path d="M0 0Q6 -1 9 5" stroke={color} className="gon-fill" strokeWidth="5" strokeLinecap="round" fill="none" />
              </g>
            ))}
            {(accessory === 'scarf' || gear.scarf) && <Scarf />}

            <g ref={faceRef} transform={`translate(${FACE_X} ${FACE_Y})`}>
              {[-36, 36].map((x, i) => (
                <g key={x} transform={`translate(${x} 12)`}>
                  <ellipse
                    ref={(el) => void (cheekRefs.current[i] = el)}
                    rx="9"
                    ry="5.5"
                    fill={charging ? '#FF5A5F' : patting ? '#FF7F93' : blush}
                    opacity="0.75"
                    style={{ transition: 'fill 200ms' }}
                  />
                </g>
              ))}
              {[-1, 1].map((side, i) => (
                <g key={side} ref={(el) => void (eyeRefs.current[i] = el)} transform={`translate(${side * EYE_SPREAD} 0)`}>
                  <g style={{ opacity: eyes === 'open' ? 1 : 0, transition: 'opacity 150ms' }}>
                    <g clipPath="url(#gon-eye-clip)">
                      <ellipse rx="10.5" ry="12.5" fill={INK} />
                      <g ref={(el) => void (pupilRefs.current[i] = el)} style={{ opacity: dizzy ? 0 : 1 }}>
                        <circle cx="-3" cy="-4.5" r="3.6" fill="#fff" />
                        <circle cx="3.4" cy="3.6" r="1.8" fill="#fff" />
                      </g>
                      {dizzy && (
                        <path d={SPIRAL_PATH} fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
                          {!reducedMotion && (
                            <animateTransform
                              attributeName="transform"
                              type="rotate"
                              from={side > 0 ? '0' : '360'}
                              to={side > 0 ? '360' : '0'}
                              dur="0.9s"
                              repeatCount="indefinite"
                            />
                          )}
                        </path>
                      )}
                    </g>
                    {/* The lid is clipped a little wider than the eye so no dark edge peeks around it. */}
                    <g clipPath="url(#gon-lid-clip)">
                      <rect ref={(el) => void (lidRefs.current[i] = el)} x="-13" y="-15" width="26" height="0" {...fill} />
                    </g>
                    <g clipPath="url(#gon-eye-clip)">
                      <line
                        ref={(el) => void (lidLineRefs.current[i] = el)}
                        x1="-13"
                        x2="13"
                        y1="-14"
                        y2="-14"
                        stroke={INK}
                        strokeWidth="3"
                        opacity="0"
                      />
                    </g>
                  </g>
                  <path
                    d="M-9 3Q0 -8 9 3"
                    stroke={INK}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    fill="none"
                    style={{ opacity: eyes === 'happy' ? 1 : 0, transition: 'opacity 150ms' }}
                  />
                  <path
                    d={side < 0 ? 'M-6 -6L5 0L-6 6' : 'M6 -6L-5 0L6 6'}
                    stroke={INK}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    style={{ opacity: eyes === 'squeeze' ? 1 : 0, transition: 'opacity 150ms' }}
                  />
                  {eyes === 'cross' && (
                    <path d="M-7 -7L7 7M7 -7L-7 7" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
                  )}
                  <line
                    x1={side * -9}
                    y1={-15}
                    x2={side * 9}
                    y2={-22}
                    stroke={INK}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    style={{
                      opacity: mood === 'annoyed' ? 1 : 0,
                      transform: mood === 'annoyed' ? 'none' : 'translateY(-6px)',
                      transition: 'opacity 180ms, transform 180ms',
                    }}
                  />
                </g>
              ))}
              <FaceAccessory accessory={accessory} />
              <g ref={staticMouthRef}>
                <DinoMouth expression={expression} reducedMotion={reducedMotion} />
              </g>
              {gear.breath && !reducedMotion && <BreathPuffs />}
              <g ref={openMouthRef} opacity="0">
                <ellipse rx="9" ry="9" fill={INK} />
                <ellipse cy="5" rx="5.5" ry="3" fill="#FF8FA3" />
              </g>
            </g>
            <g ref={hatRef} transform={`translate(${HAT_X} ${HAT_Y}) rotate(${HAT_TILT})`}>
              <HeadAccessory accessory={accessory} />
              {gear.headphones && accessory !== 'catphones' && <Headphones band="#8FD3FF" cup="#FFF8E7" />}
            </g>
          </g>
        </svg>
        {mood === 'sleepy' && (
          <div aria-hidden className="pointer-events-none absolute top-[2%] right-[6%] font-black text-[var(--muted)]">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="zzz absolute"
                style={{ animationDelay: `${i * 0.9}s`, fontSize: `${13 + i * 4}px`, right: `${-i * 6}px` }}
              >
                z
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
})

/** Gon's mouth in viewport pixels, from the last drawn frame. */
function mouthPoint(s: Sim) {
  return {
    x: s.origin.x + FACE_X * s.unit * (Math.sign(s.face) || 1),
    y: s.origin.y + (FACE_Y + MOUTH_Y) * s.unit,
  }
}

type Expression = Mood | 'yawn' | 'puff' | 'pat' | 'ko'

/** Cartoon fire and spark puffs blown out of the mouth. */
function FirePuffs({ count, scale }: { count: number; scale: number }) {
  return (
    <g transform={`translate(8 16) scale(${scale})`}>
      {Array.from({ length: count }, (_, i) => (
        <g key={i} className="dino-puff" style={{ animationDelay: `${(i * 0.66) / count}s` }}>
          {i % 3 === 1 ? (
            <circle r="4.5" fill="#FFE38A" stroke={INK} strokeWidth="1.5" />
          ) : (
            <path
              d="M0 -6C4 -2 6 2 2 5C0 6 -3 6 -4 4C-6 0 -2 -2 0 -6Z"
              fill={i % 3 ? '#FFB627' : '#FF6B3D'}
              stroke={INK}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          )}
        </g>
      ))}
    </g>
  )
}

/** Mouth in face coordinates, centered between the eyes. */
function DinoMouth({ expression, reducedMotion }: { expression: Expression; reducedMotion: boolean }) {
  const stroke = { stroke: INK, strokeWidth: 2.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' }
  switch (expression) {
    case 'happy':
      return (
        <g>
          <path d="M-7 13Q0 25 7 13Z" fill={INK} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
          <ellipse cx="0" cy="19" rx="3.5" ry="2" fill="#FF8FA3" />
        </g>
      )
    case 'pat':
      return <path d="M-5 14Q0 19.5 5 14" {...stroke} />
    case 'annoyed':
    case 'spicy': {
      const spicy = expression === 'spicy'
      return (
        <g>
          <ellipse cx="0" cy="16" rx={spicy ? 7 : 5.5} ry={spicy ? 7.5 : 6} fill={INK} />
          <path d="M-2.5 10.4L-1 13.4L0.5 10.2Z" fill="#fff" />
          {!reducedMotion && <FirePuffs count={spicy ? 6 : 3} scale={spicy ? 1.5 : 1} />}
        </g>
      )
    }
    case 'sleepy':
      return <path d="M-3 15Q0 17 3 15" {...stroke} />
    case 'dizzy':
      return (
        <g>
          <path d="M1 16Q1 24 4.5 24Q8 24 8 16Z" fill="#FF8FA3" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M-9 15q2.25-3.5 4.5 0t4.5 0t4.5 0t4.5 0" {...stroke} strokeWidth={2.4} />
        </g>
      )
    case 'yawn':
      return (
        <g>
          <ellipse cx="0" cy="16" rx="6" ry="8" fill={INK} />
          <ellipse cx="0" cy="20" rx="3.5" ry="2.5" fill="#FF8FA3" />
        </g>
      )
    case 'ko':
      return <path d="M-6 16H6" {...stroke} />
    case 'puff':
      return <ellipse cx="0" cy="15" rx="3" ry="2.6" fill={INK} />
    default:
      // A tiny cat-like "w" smile.
      return <path d="M-7 13.5Q-3.5 18.5 0 13.5Q3.5 18.5 7 13.5" {...stroke} />
  }
}

/** One burst particle: a star, a tiny dino spike, or a puff. */
function Spark({ kind, fill }: { kind: number; fill: string }) {
  const outline = { fill, stroke: INK, strokeWidth: 1.4, strokeLinejoin: 'round' as const }
  if (kind === 0) return <path d="M0 -8Q1.6 -1.6 8 0Q1.6 1.6 0 8Q-1.6 1.6 -8 0Q-1.6 -1.6 0 -8Z" {...outline} />
  if (kind === 1) return <path d={SPIKE_PATH} transform="scale(0.7)" {...outline} />
  return <circle r="4.5" {...outline} />
}
