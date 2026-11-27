import { useEffect, useRef } from 'react'
import type { Weather } from '../hooks/useWeather'

/** Deterministic pseudo-random numbers so the sky looks the same on every render. */
function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
}

const rand = seeded(42)
const STARS = Array.from({ length: 28 }, () => ({
  left: rand() * 100,
  top: rand() * 62,
  size: 6 + rand() * 10,
  delay: rand() * 3,
  duration: 2 + rand() * 2.5,
}))
const SPARKLES = Array.from({ length: 9 }, (_, i) => ({
  left: 6 + rand() * 88,
  top: 8 + rand() * 50,
  size: 10 + rand() * 8,
  delay: rand() * 3,
  color: ['#FFD36E', '#FFB3C6', '#B9E4FF'][i % 3],
}))
const FIREFLIES = Array.from({ length: 12 }, () => ({
  left: 4 + rand() * 92,
  top: 35 + rand() * 45,
  delay: rand() * 6,
  duration: 6 + rand() * 6,
}))
const CLOUDS = [
  { top: 9, width: 150, duration: 95, delay: -20 },
  { top: 24, width: 110, duration: 120, delay: -75 },
  { top: 40, width: 180, duration: 140, delay: -40 },
]

/** Sky tint behind everything, per weather. */
const SKY: Record<Weather, string> = {
  sunny: 'linear-gradient(180deg, #FFF9F0, #FFF1E6)',
  rainy: 'linear-gradient(180deg, #DCE5F2, #EEF0F7)',
  snowy: 'linear-gradient(180deg, #E6ECFF, #F7F2FF)',
  night: 'radial-gradient(120% 80% at 75% 0%, #3a3266 0%, transparent 60%), linear-gradient(180deg, #231F3A, #2D2752)',
}

const STAR_PATH = 'M0 -10Q2 -2 10 0Q2 2 0 10Q-2 2 -10 0Q-2 -2 0 -10Z'

function Star({ fill }: { fill: string }) {
  return (
    <svg viewBox="-11 -11 22 22" className="h-full w-full">
      <path d={STAR_PATH} fill={fill} />
    </svg>
  )
}

function Cloud({ gloomy }: { gloomy: boolean }) {
  return (
    <svg viewBox="0 0 120 60" className="w-full drop-shadow-[0_6px_0_rgb(74_55_40/0.06)]">
      <path
        d="M22 52C10 52 4 44 6 36C8 28 16 25 23 27C24 15 36 8 48 12C54 4 70 3 78 12C88 8 100 14 100 25C110 25 116 33 114 41C112 49 105 52 98 52Z"
        fill={gloomy ? '#C9D3E3' : '#fff'}
        stroke={gloomy ? '#A9B5C9' : '#F2DCCB'}
        strokeWidth="3"
        strokeLinejoin="round"
        style={{ transition: 'fill 0.6s, stroke 0.6s' }}
      />
      <ellipse cx="40" cy="38" rx="5" ry="3" fill="#FFD9DF" opacity="0.8" />
      <ellipse cx="74" cy="38" rx="5" ry="3" fill="#FFD9DF" opacity="0.8" />
      <path
        d={gloomy ? 'M52 40q5 -4 10 0' : 'M52 36q5 4 10 0'}
        stroke="#9C8576"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}

/** Rain streaks or snowflakes on a canvas; only mounted while it rains or snows. */
function Precipitation({ kind, reducedMotion }: { kind: 'rain' | 'snow'; reducedMotion: boolean }) {
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

    const rain = kind === 'rain'
    const count = Math.round((rain ? 110 : 80) * Math.min(1.4, w / 1100 + 0.4))
    const speed = reducedMotion ? 0.35 : 1
    const drops = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      v: rain ? 9 + Math.random() * 6 : 0.6 + Math.random() * 1.1,
      size: rain ? 10 + Math.random() * 10 : 2 + Math.random() * 3.5,
      phase: Math.random() * Math.PI * 2,
    }))

    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const f = Math.min((now - last) / 16.667, 3) * speed
      last = now
      ctx.clearRect(0, 0, w, h)
      if (rain) {
        ctx.strokeStyle = 'rgba(120, 150, 200, 0.55)'
        ctx.lineWidth = 2
        ctx.lineCap = 'round'
        ctx.beginPath()
      } else {
        ctx.fillStyle = '#fff'
        ctx.strokeStyle = 'rgba(150, 170, 215, 0.7)'
        ctx.lineWidth = 1.2
      }
      for (const d of drops) {
        d.y += d.v * f
        if (rain) d.x -= d.v * 0.3 * f
        else {
          d.phase += 0.02 * f
          d.x += Math.sin(d.phase) * 0.5 * f
        }
        if (d.y > h + 20) {
          d.y = -20
          d.x = Math.random() * (w + 200)
        }
        if (rain) {
          ctx.moveTo(d.x, d.y)
          ctx.lineTo(d.x + d.size * 0.3, d.y - d.size)
        } else {
          ctx.beginPath()
          ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2)
          ctx.fill()
          ctx.stroke()
        }
      }
      if (rain) ctx.stroke()
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [kind, reducedMotion])

  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-[1] h-full w-full" />
}

interface WeatherLayerProps {
  weather: Weather
  reducedMotion: boolean
  /** Clicking a cloud changes the weather. */
  onCycle: () => void
}

/**
 * The sky: sun and fluffy clouds, rain showers, gentle snow, or a starry night with
 * a crescent moon and fireflies. Each layer crossfades so changes feel soft.
 */
export function WeatherLayer({ weather, reducedMotion, onCycle }: WeatherLayerProps) {
  const night = weather === 'night'
  const show = (on: boolean) => `transition-opacity duration-700 ${on ? 'opacity-100' : 'opacity-0'}`

  return (
    <>
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        {(Object.keys(SKY) as Weather[]).map((w) => (
          <div key={w} className={`absolute inset-0 ${show(w === weather)}`} style={{ background: SKY[w] }} />
        ))}

        <div className={`absolute inset-0 ${show(weather === 'sunny')}`}>
          <div className="sun absolute top-[24%] right-[7%] size-16 sm:top-[10%] sm:right-[12%] sm:size-24">
            <svg viewBox="-50 -50 100 100" className="h-full w-full overflow-visible">
              <g className="sun-rays">
                {Array.from({ length: 8 }, (_, i) => (
                  <rect key={i} x="-4" y="-48" width="8" height="14" rx="4" fill="#FFD36E" transform={`rotate(${i * 45})`} />
                ))}
              </g>
              <circle r="28" fill="#FFE08A" stroke="#F2B84B" strokeWidth="3" />
              <ellipse cx="-12" cy="6" rx="5" ry="3" fill="#FFB3C6" />
              <ellipse cx="12" cy="6" rx="5" ry="3" fill="#FFB3C6" />
              <path d="M-6 0q6 6 12 0" stroke="#B3833A" strokeWidth="3" strokeLinecap="round" fill="none" />
            </svg>
          </div>
          {SPARKLES.map((s, i) => (
            <span
              key={i}
              className="twinkle absolute"
              style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size, animationDelay: `${s.delay}s` }}
            >
              <Star fill={s.color} />
            </span>
          ))}
        </div>

        <div className={`absolute inset-0 ${show(night)}`}>
          <div className="moon absolute top-[24%] right-[7%] size-14 sm:top-[9%] sm:right-[12%] sm:size-24">
            <svg viewBox="-50 -50 100 100" className="h-full w-full overflow-visible">
              <defs>
                <mask id="moon-cut">
                  <rect x="-50" y="-50" width="100" height="100" fill="#fff" />
                  <circle cx="18" cy="-12" r="34" fill="#000" />
                </mask>
              </defs>
              <circle r="40" fill="#FFE9A8" mask="url(#moon-cut)" />
              <g mask="url(#moon-cut)">
                <ellipse cx="-24" cy="14" rx="6" ry="3.5" fill="#FFB3C6" opacity="0.8" />
                <path d="M-30 2q4 -4 8 0" stroke="#B38B4A" strokeWidth="3" strokeLinecap="round" fill="none" />
              </g>
            </svg>
          </div>
          {STARS.map((s, i) => (
            <span
              key={i}
              className="twinkle absolute"
              style={{
                left: `${s.left}%`,
                top: `${s.top}%`,
                width: s.size,
                height: s.size,
                animationDelay: `${s.delay}s`,
                animationDuration: `${s.duration}s`,
              }}
            >
              <Star fill={i % 5 === 0 ? '#FFB3C6' : '#FFF1C2'} />
            </span>
          ))}
          {night &&
            FIREFLIES.map((f, i) => (
              <span
                key={i}
                className="firefly absolute size-2 rounded-full"
                style={{ left: `${f.left}%`, top: `${f.top}%`, animationDelay: `${-f.delay}s`, animationDuration: `${f.duration}s` }}
              />
            ))}
        </div>
      </div>

      {/* Clouds sit above the sky but below Gôn; clicking one changes the weather. */}
      <div className={`pointer-events-none absolute inset-0 -z-[6] overflow-hidden ${show(!night)}`}>
        {CLOUDS.map((c, i) => (
          <button
            key={i}
            type="button"
            tabIndex={-1}
            aria-hidden
            onClick={onCycle}
            title="Bấm vào mây để đổi thời tiết"
            className={`cloud absolute left-0 cursor-pointer ${night ? '' : 'pointer-events-auto'}`}
            style={{ top: `${c.top}%`, width: c.width, animationDuration: `${c.duration}s`, animationDelay: `${c.delay}s` }}
          >
            <Cloud gloomy={weather === 'rainy'} />
          </button>
        ))}
      </div>

      {weather === 'rainy' && <Precipitation key="rain" kind="rain" reducedMotion={reducedMotion} />}
      {weather === 'snowy' && <Precipitation key="snow" kind="snow" reducedMotion={reducedMotion} />}
    </>
  )
}
