import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { World } from '../lib/world'

const INK = '#4A3728'

interface Obstacle {
  kind: 'cactus' | 'pebble' | 'bird' | 'cloud'
  x: number
  /** Size and height of the bottom edge above the track, in Gon units. */
  w: number
  h: number
  lift: number
  variant: number
}

interface Coin {
  x: number
  lift: number
  taken: boolean
}

interface Crash {
  score: number
  collected: number
  earned: number
  record: boolean
}

interface DinoRunnerGameProps {
  world: World
  best: number
  reducedMotion: boolean
  /** Called once per run when Gon crashes; returns the coins added to the wallet and whether it is a record. */
  onCrash: (score: number, collected: number) => { earned: number; record: boolean }
  onRestart: () => void
  onJump: () => void
  onCoin: () => void
  onExit: () => void
}

const pad = (n: number) => String(Math.floor(n)).padStart(5, '0')

/**
 * "Chạy đi Gon!": an endless runner on a scrolling pastel track. The real Gon is the
 * runner; this component owns the jump physics (shared through world.game), the
 * obstacles, the Paw Coins, the score HUD and the game-over card.
 */
export function DinoRunnerGame({ world, best, reducedMotion, onCrash, onRestart, onJump, onCoin, onExit }: DinoRunnerGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scoreRef = useRef<HTMLSpanElement>(null)
  const coinRef = useRef<HTMLSpanElement>(null)
  const [crash, setCrash] = useState<Crash | null>(null)
  const [runId, setRunId] = useState(0)
  const [visible, setVisible] = useState(false)
  const input = useRef({ jump: false, jumpQueued: false, duck: false })
  const props = useRef({ onCrash, onJump, onCoin, best, reducedMotion })
  props.current = { onCrash, onJump, onCoin, best, reducedMotion }

  const restart = useCallback(() => {
    setCrash(null)
    setRunId((n) => n + 1)
    onRestart()
  }, [onRestart])

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true))
    world.game.active = true
    return () => {
      cancelAnimationFrame(t)
      Object.assign(world.game, { active: false, y: 0, vy: 0, duck: false })
    }
  }, [world])

  // One run: physics, spawning, collisions and drawing.
  useEffect(() => {
    const canvas = canvasRef.current
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

    const game = world.game
    Object.assign(game, { y: 0, vy: 0, duck: false })
    input.current.jumpQueued = false
    const obstacles: Obstacle[] = []
    const coins: Coin[] = []
    const started = performance.now()
    let speed = 0
    let score = 0
    let collected = 0
    let travelled = 0
    // A short runway before the first obstacle.
    let gap = w * 0.45
    let over = false
    let raf = 0
    let last = performance.now()

    const spawn = (u: number) => {
      const birdsOk = score > 200
      const r = Math.random()
      let o: Obstacle
      if (birdsOk && r < 0.25) {
        const low = Math.random() < 0.55
        o = { kind: Math.random() < 0.5 ? 'bird' : 'cloud', x: w + 40, w: 46, h: 30, lift: low ? 90 : 152, variant: 0 }
      } else if (r < 0.45) {
        o = { kind: 'pebble', x: w + 40, w: 34, h: 30, lift: 0, variant: 0 }
      } else {
        const v = Math.floor(Math.random() * 3)
        o = { kind: 'cactus', x: w + 40, w: [32, 60, 36][v], h: [56, 48, 72][v], lift: 0, variant: v }
      }
      obstacles.push(o)
      // Paw Coins: an arc over the obstacle, or a short trail along the ground.
      if (Math.random() < 0.55) {
        const over = o.lift === 0 && Math.random() < 0.6
        for (let i = 0; i < 3; i++) {
          coins.push({
            x: o.x + o.w * u * 0.5 + (i - 1) * 34 * u + (over ? 0 : 160 * u),
            lift: over ? 115 + (i === 1 ? 22 : 0) : 26,
            taken: false,
          })
        }
      }
    }

    const roundRect = (x: number, y: number, rw: number, rh: number, rad: number, fill: string, lw: number) => {
      ctx.beginPath()
      ctx.roundRect(x, y, rw, rh, rad)
      ctx.fillStyle = fill
      ctx.fill()
      ctx.lineWidth = lw
      ctx.strokeStyle = INK
      ctx.stroke()
    }

    const drawObstacle = (o: Obstacle, ground: number, u: number, now: number) => {
      const x = o.x
      const bottom = ground - o.lift * u
      const ow = o.w * u
      const oh = o.h * u
      const lw = 2.5 * u
      ctx.lineJoin = 'round'
      if (o.kind === 'cactus') {
        const trunks = o.variant === 1 ? [0, 0.52] : [0]
        trunks.forEach((t, i) => {
          const tw = o.variant === 1 ? ow * 0.48 : ow
          const th = o.variant === 1 && i === 1 ? oh * 0.8 : oh
          const tx = x + t * ow
          const fill = i ? '#B6EBD0' : '#9BE3C1'
          // Arms, then the trunk on top of them.
          roundRect(tx - tw * 0.32, bottom - th * 0.62, tw * 0.42, th * 0.3, tw * 0.2, fill, lw)
          roundRect(tx + tw * 0.9, bottom - th * 0.75, tw * 0.42, th * 0.28, tw * 0.2, fill, lw)
          roundRect(tx, bottom - th, tw, th, tw * 0.5, fill, lw)
          ctx.fillStyle = INK
          ctx.beginPath()
          ctx.arc(tx + tw * 0.33, bottom - th * 0.62, 1.8 * u, 0, Math.PI * 2)
          ctx.arc(tx + tw * 0.67, bottom - th * 0.62, 1.8 * u, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = '#FF9EAA'
          ctx.beginPath()
          ctx.arc(tx + tw * 0.5, bottom - th - 1 * u, 4.5 * u, 0, Math.PI * 2)
          ctx.fill()
          ctx.stroke()
        })
      } else if (o.kind === 'pebble') {
        const r = ow / 2
        const cx = x + r
        const cy = bottom - r * 0.9
        ctx.save()
        ctx.translate(cx, cy)
        ctx.rotate(-travelled / r)
        ctx.beginPath()
        ctx.ellipse(0, 0, r, r * 0.9, 0, 0, Math.PI * 2)
        ctx.fillStyle = '#D9D2F2'
        ctx.fill()
        ctx.lineWidth = lw
        ctx.strokeStyle = INK
        ctx.stroke()
        ctx.fillStyle = '#B9AEE0'
        ctx.beginPath()
        ctx.arc(r * 0.35, r * 0.2, r * 0.18, 0, Math.PI * 2)
        ctx.arc(-r * 0.3, -r * 0.35, r * 0.12, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      } else if (o.kind === 'bird') {
        const cx = x + ow / 2
        const cy = bottom - oh / 2
        const flap = Math.sin(now * 0.02) * 0.8
        ctx.beginPath()
        ctx.ellipse(cx, cy, ow * 0.42, oh * 0.45, 0, 0, Math.PI * 2)
        ctx.fillStyle = '#FFB3C6'
        ctx.fill()
        ctx.lineWidth = lw
        ctx.strokeStyle = INK
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(cx - ow * 0.1, cy - oh * 0.1)
        ctx.lineTo(cx + ow * 0.12, cy - oh * (0.2 + flap * 0.6))
        ctx.lineTo(cx + ow * 0.25, cy - oh * 0.05)
        ctx.closePath()
        ctx.fillStyle = '#FFD1DA'
        ctx.fill()
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(cx - ow * 0.42, cy - oh * 0.05)
        ctx.lineTo(cx - ow * 0.6, cy + oh * 0.05)
        ctx.lineTo(cx - ow * 0.42, cy + oh * 0.15)
        ctx.fillStyle = '#FF9F43'
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = INK
        ctx.beginPath()
        ctx.arc(cx - ow * 0.22, cy - oh * 0.1, 2 * u, 0, Math.PI * 2)
        ctx.fill()
      } else {
        const cx = x + ow / 2
        const cy = bottom - oh / 2
        ctx.fillStyle = '#fff'
        ctx.strokeStyle = '#C9B3A3'
        ctx.lineWidth = lw
        ctx.beginPath()
        ctx.arc(cx - ow * 0.25, cy + oh * 0.1, oh * 0.35, 0, Math.PI * 2)
        ctx.arc(cx + ow * 0.05, cy - oh * 0.1, oh * 0.45, 0, Math.PI * 2)
        ctx.arc(cx + ow * 0.32, cy + oh * 0.12, oh * 0.33, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = INK
        ctx.beginPath()
        ctx.arc(cx - ow * 0.08, cy, 1.8 * u, 0, Math.PI * 2)
        ctx.arc(cx + ow * 0.16, cy, 1.8 * u, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const f = Math.min((now - last) / 16.667, 3)
      last = now
      const u = world.gon.unit
      const ground = world.hill.crestY
      const p = props.current
      if (!speed) speed = 6.5 * u
      const inp = input.current

      // Gon: jump (higher while the button is held), duck, fast-fall when ducking mid-air.
      if (!over) {
        game.duck = inp.duck && game.y === 0
        if (inp.jumpQueued && game.y === 0 && !inp.duck) {
          game.vy = 15.5 * u
          p.onJump()
        }
        inp.jumpQueued = false
      }
      if (game.y > 0 || game.vy > 0) {
        const gravity = inp.duck ? 2.2 : inp.jump && game.vy > 0 && !over ? 0.68 : 0.95
        game.vy -= gravity * u * f
        game.y += game.vy * f
        if (game.y <= 0) {
          game.y = 0
          game.vy = 0
        }
      }

      if (!over) {
        speed = Math.min(15 * u, speed + 0.0012 * u * f)
        const dx = speed * f
        travelled += dx
        score += (speed / u) * f * 0.025
        gap -= dx
        if (gap <= 0) {
          spawn(u)
          gap = speed * 44 + (90 + Math.random() * 260) * u
        }
        obstacles.forEach((o) => (o.x -= dx * (o.kind === 'pebble' ? 1.15 : 1)))
        coins.forEach((c) => (c.x -= dx))
        while (obstacles.length && obstacles[0].x < -200) obstacles.shift()
        while (coins.length && coins[0].x < -100) coins.shift()

        // Gon's hitbox, a little forgiving: body only, feet to the top of the head.
        const gx = world.gon.x
        const feet = ground - game.y
        const box = {
          l: gx - 34 * u,
          r: gx + 40 * u,
          t: feet - (game.duck ? 78 : 116) * u,
          b: feet - 4 * u,
        }
        for (const o of obstacles) {
          const inset = o.w * u * 0.14
          const ol = o.x + inset
          const or = o.x + o.w * u - inset
          const ob = ground - o.lift * u - 2 * u
          const ot = ground - (o.lift + o.h) * u + o.h * u * 0.12
          if (box.r > ol && box.l < or && box.b > ot && box.t < ob) {
            over = true
            const result = p.onCrash(Math.floor(score), collected)
            setCrash({ score: Math.floor(score), collected, ...result })
            break
          }
        }
        for (const c of coins) {
          if (c.taken) continue
          const cy = ground - c.lift * u
          const r = 13 * u
          if (c.x + r > box.l && c.x - r < box.r && cy + r > box.t && cy - r < box.b) {
            c.taken = true
            collected++
            p.onCoin()
          }
        }
        if (scoreRef.current) scoreRef.current.textContent = pad(score)
        if (coinRef.current) coinRef.current.textContent = String(collected)
      }

      // Draw the track, obstacles and coins.
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = '#B8F2B6'
      ctx.fillRect(0, ground, w, h - ground)
      ctx.fillStyle = '#8CE08A'
      ctx.fillRect(0, ground + 30 * u, w, h - ground)
      ctx.strokeStyle = INK
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(0, ground + 1.5)
      ctx.lineTo(w, ground + 1.5)
      ctx.stroke()
      // Scrolling grass tufts and lane dashes.
      const step = 110 * u
      ctx.strokeStyle = '#6CC56A'
      ctx.lineWidth = 2.5
      ctx.lineCap = 'round'
      ctx.beginPath()
      for (let x = -(travelled % step); x < w + step; x += step) {
        const y = ground + 14 * u
        ctx.moveTo(x, y)
        ctx.quadraticCurveTo(x + 3 * u, y - 8 * u, x + 5 * u, y)
        ctx.quadraticCurveTo(x + 8 * u, y - 10 * u, x + 11 * u, y)
      }
      ctx.stroke()
      ctx.fillStyle = 'rgba(255,255,255,0.55)'
      const dash = 70 * u
      for (let x = -((travelled * 1.3) % dash); x < w; x += dash) ctx.fillRect(x, ground + 44 * u, 26 * u, 4 * u)

      for (const o of obstacles) drawObstacle(o, ground, u, now)
      ctx.font = `${Math.round(13 * u)}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      for (const c of coins) {
        if (c.taken) continue
        const bob = p.reducedMotion ? 0 : Math.sin(now * 0.006 + c.x * 0.01) * 3 * u
        const cy = ground - c.lift * u + bob
        ctx.beginPath()
        ctx.arc(c.x, cy, 12 * u, 0, Math.PI * 2)
        ctx.fillStyle = '#FFE08A'
        ctx.fill()
        ctx.lineWidth = 2.5 * u
        ctx.strokeStyle = INK
        ctx.stroke()
        ctx.fillText('🐾', c.x, cy + 1 * u)
      }

      // Hint fades out after a few seconds.
      const hintAge = now - started
      if (hintAge < 4000) {
        ctx.globalAlpha = Math.min(1, (4000 - hintAge) / 800)
        ctx.font = `800 ${Math.max(14, Math.round(15 * u))}px Nunito, sans-serif`
        ctx.fillStyle = INK
        ctx.fillText('Space / ↑ / chạm để nhảy · ↓ để cúi', w / 2, ground + 80 * u)
        ctx.globalAlpha = 1
      }
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [world, runId])

  // Controls: keyboard, tapping anywhere, and the duck button.
  useEffect(() => {
    const inp = input.current
    const crashedAt = { t: 0 }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') {
        e.preventDefault()
        if (crash) {
          if (!e.repeat && performance.now() - crashedAt.t > 500) restart()
          return
        }
        if (!e.repeat) inp.jumpQueued = true
        inp.jump = true
      } else if (e.key === 'ArrowDown' || e.key === 's') {
        e.preventDefault()
        inp.duck = true
      } else if (e.key === 'Escape') {
        onExit()
      } else if (e.key === 'Enter' && crash) {
        restart()
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') inp.jump = false
      if (e.key === 'ArrowDown' || e.key === 's') inp.duck = false
    }
    crashedAt.t = performance.now()
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      inp.jump = inp.duck = false
    }
  }, [crash, restart, onExit])

  const onTapDown = (e: ReactPointerEvent) => {
    if (crash || e.button > 0) return
    input.current.jumpQueued = true
    input.current.jump = true
  }
  const onTapUp = () => {
    input.current.jump = false
  }
  const duck = (on: boolean) => () => {
    input.current.duck = on
  }

  return (
    <>
      {/* The track sits behind Gon; the controls and HUD sit above everything. */}
      <canvas
        ref={canvasRef}
        aria-hidden
        className={`hill pointer-events-none fixed inset-0 -z-[4] h-full w-full transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}
      />
      <div className={`fixed inset-0 z-20 transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}>
      {/* Tapping anywhere jumps. */}
      <div
        aria-hidden
        className="absolute inset-0 touch-none"
        onPointerDown={onTapDown}
        onPointerUp={onTapUp}
        onPointerCancel={onTapUp}
        onPointerLeave={onTapUp}
      />

      <div className="pointer-events-none absolute inset-x-0 top-[max(4.25rem,8vh)] flex justify-center gap-2 px-3 text-sm font-extrabold sm:text-base">
        <span className="pill">
          ĐIỂM <span ref={scoreRef} className="text-[var(--fg)] tabular-nums">00000</span>
        </span>
        <span className="pill">
          KỶ LỤC <span className="text-[var(--fg)] tabular-nums">{pad(Math.max(best, crash?.score ?? 0))}</span>
        </span>
        <span className="pill">
          🐾 <span ref={coinRef} className="text-[var(--fg)] tabular-nums">0</span>
        </span>
      </div>

      <div className="absolute right-3 bottom-[max(1rem,env(safe-area-inset-bottom))] flex gap-2 sm:right-6">
        <button
          type="button"
          onPointerDown={duck(true)}
          onPointerUp={duck(false)}
          onPointerCancel={duck(false)}
          onPointerLeave={duck(false)}
          className="candy flex h-14 touch-none items-center gap-1.5 rounded-full bg-[#C8ECFF] px-5 text-base font-extrabold text-[#4A3728] select-none"
        >
          <span aria-hidden>⬇️</span> Cúi
        </button>
        <button
          type="button"
          onClick={onExit}
          className="candy flex h-14 items-center gap-1.5 rounded-full bg-[#FFD1DA] px-5 text-base font-extrabold text-[#4A3728]"
        >
          <span aria-hidden>🏝️</span> Về đảo
        </button>
      </div>

      {crash && (
        <div className="absolute inset-x-0 top-[22%] flex justify-center px-4">
          <div
            role="dialog"
            aria-label="Kết thúc lượt chạy"
            className="bubble-pop w-[min(92vw,340px)] rounded-[30px] border-2 border-b-[5px] border-[var(--edge)] bg-[var(--panel)] p-5 text-center shadow-[0_20px_50px_-20px_var(--shadow)]"
          >
            <p className="text-3xl" aria-hidden>
              😵‍💫
            </p>
            <h2 className="mt-1 text-2xl font-black">Ôi không, Gon vấp rồi!</h2>
            {crash.record && (
              <p className="mx-auto mt-2 w-fit rounded-full border-2 border-[#4A3728] bg-[#FFE08A] px-3 py-0.5 text-sm font-extrabold text-[#4A3728]">
                🏆 Kỷ lục mới!
              </p>
            )}
            <dl className="mt-4 grid grid-cols-2 gap-2 text-left text-sm font-bold">
              <dt className="text-[var(--muted)]">Điểm</dt>
              <dd className="text-right tabular-nums">{crash.score}</dd>
              <dt className="text-[var(--muted)]">Kỷ lục</dt>
              <dd className="text-right tabular-nums">{Math.max(best, crash.score)}</dd>
              <dt className="text-[var(--muted)]">🐾 nhặt được</dt>
              <dd className="text-right tabular-nums">{crash.collected}</dd>
              <dt className="text-[var(--muted)]">🐾 thưởng điểm</dt>
              <dd className="text-right tabular-nums">{crash.earned - crash.collected}</dd>
            </dl>
            <p className="mt-3 rounded-2xl bg-[#FFF1C2] py-2 text-base font-black text-[#4A3728]">+{crash.earned} 🐾 vào ví</p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                autoFocus
                onClick={restart}
                className="candy h-12 flex-1 rounded-full bg-[#B8F2B6] text-base font-extrabold text-[#4A3728]"
              >
                🔁 Chơi lại
              </button>
              <button
                type="button"
                onClick={onExit}
                className="candy h-12 flex-1 rounded-full bg-[#FFD1DA] text-base font-extrabold text-[#4A3728]"
              >
                🏝️ Về đảo
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  )
}
