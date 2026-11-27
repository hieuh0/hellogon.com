import { useEffect, useRef, useState } from 'react'
import { setAmbienceVolume, setLofiOn, setRainOn } from '../lib/audioEngine'
import { CloseIcon } from './icons'

const PRESETS = [25, 15, 5]

interface LofiWidgetProps {
  open: boolean
  onClose: () => void
  /** Focus is active while the timer runs or the lo-fi beat plays (Gon wears headphones). */
  onFocusChange: (active: boolean) => void
  onStart: () => void
  /** A Pomodoro session ran to zero. */
  onComplete: (minutes: number) => void
}

const fmt = (ms: number) => {
  const total = Math.ceil(ms / 1000)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

/**
 * "Góc Chill": a small floating Pomodoro timer with procedural rain and lo-fi audio.
 * It stays mounted while closed so the timer and the music keep going.
 */
export function LofiWidget({ open, onClose, onFocusChange, onStart, onComplete }: LofiWidgetProps) {
  const [preset, setPreset] = useState(25)
  const [remaining, setRemaining] = useState(25 * 60_000)
  const [endAt, setEndAt] = useState<number | null>(null)
  const [rain, setRain] = useState(false)
  const [lofi, setLofi] = useState(false)
  const [volume, setVolume] = useState(60)
  const callbacks = useRef({ onComplete, onFocusChange })
  callbacks.current = { onComplete, onFocusChange }
  const running = endAt !== null

  useEffect(() => {
    if (endAt === null) return
    const iv = window.setInterval(() => {
      const left = endAt - Date.now()
      if (left <= 0) {
        setEndAt(null)
        setRemaining(preset * 60_000)
        callbacks.current.onComplete(preset)
      } else setRemaining(left)
    }, 250)
    return () => window.clearInterval(iv)
  }, [endAt, preset])

  useEffect(() => callbacks.current.onFocusChange(running || lofi), [running, lofi])

  useEffect(() => setRainOn(rain), [rain])
  useEffect(() => setLofiOn(lofi), [lofi])
  useEffect(() => setAmbienceVolume(volume / 100), [volume])
  useEffect(
    () => () => {
      setRainOn(false)
      setLofiOn(false)
    },
    [],
  )

  const choose = (m: number) => {
    setPreset(m)
    setEndAt(null)
    setRemaining(m * 60_000)
  }
  const startPause = () => {
    if (running) {
      setRemaining(endAt - Date.now())
      setEndAt(null)
    } else {
      setEndAt(Date.now() + remaining)
      onStart()
    }
  }
  const reset = () => {
    setEndAt(null)
    setRemaining(preset * 60_000)
  }

  const progress = 1 - remaining / (preset * 60_000)

  return (
    <section
      aria-label="Góc Chill: hẹn giờ tập trung và nhạc lo-fi"
      inert={!open}
      className={`fixed top-[max(4rem,7vh)] right-3 z-30 w-[min(calc(100vw-1.5rem),300px)] rounded-[28px] border-2 border-b-4 border-[var(--edge)] bg-[var(--panel)] p-4 shadow-[0_18px_40px_-18px_var(--shadow)] transition duration-300 ease-[cubic-bezier(0.3,1.4,0.5,1)] sm:right-6 ${
        open ? 'translate-y-0 scale-100 opacity-100' : 'pointer-events-none -translate-y-3 scale-95 opacity-0'
      }`}
    >
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-black">🎧 Góc Chill</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Thu nhỏ Góc Chill"
          className="grid size-9 place-items-center rounded-full text-[var(--muted)] transition hover:bg-[var(--line)]"
        >
          <CloseIcon />
        </button>
      </header>

      <div className="mt-2 flex gap-1.5" role="group" aria-label="Chọn thời gian">
        {PRESETS.map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={preset === m}
            onClick={() => choose(m)}
            className={`h-8 flex-1 rounded-full border-2 text-sm font-extrabold transition ${
              preset === m ? 'border-[#4A3728] bg-[#FFE08A] text-[#4A3728]' : 'border-[var(--line)] text-[var(--muted)]'
            }`}
          >
            {m}:00
          </button>
        ))}
      </div>

      <p className="mt-3 text-center text-5xl font-black tabular-nums" aria-live="off">
        {fmt(remaining)}
      </p>
      <div className="mx-auto mt-2 h-2.5 w-full overflow-hidden rounded-full border-2 border-[var(--line)]">
        <div className="h-full rounded-full bg-[#7EE081] transition-[width] duration-300" style={{ width: `${progress * 100}%` }} />
      </div>
      <p className="mt-1.5 text-center text-xs font-bold text-[var(--muted)]">
        {running ? 'Đang tập trung… Gon ở đây cổ vũ nè!' : 'Sẵn sàng tập trung chưa?'}
      </p>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={startPause}
          className="candy h-11 flex-1 rounded-full bg-[#B8F2B6] text-[15px] font-extrabold text-[#4A3728]"
        >
          {running ? '⏸ Tạm dừng' : '▶ Bắt đầu'}
        </button>
        <button
          type="button"
          onClick={reset}
          className="candy h-11 rounded-full bg-[#FFDDBF] px-4 text-[15px] font-extrabold text-[#4A3728]"
        >
          ↺ Đặt lại
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          aria-pressed={rain}
          onClick={() => setRain(!rain)}
          className={`h-10 rounded-full border-2 text-sm font-extrabold transition ${
            rain ? 'border-[#4A3728] bg-[#C8ECFF] text-[#4A3728]' : 'border-[var(--line)] text-[var(--muted)]'
          }`}
        >
          🌧️ Tiếng mưa
        </button>
        <button
          type="button"
          aria-pressed={lofi}
          onClick={() => setLofi(!lofi)}
          className={`h-10 rounded-full border-2 text-sm font-extrabold transition ${
            lofi ? 'border-[#4A3728] bg-[#E2D6FF] text-[#4A3728]' : 'border-[var(--line)] text-[var(--muted)]'
          }`}
        >
          🎹 Nhạc Lo-fi
        </button>
      </div>

      <label className="mt-3 flex items-center gap-2 text-sm font-extrabold text-[var(--muted)]">
        <span aria-hidden>{volume === 0 ? '🔈' : '🔊'}</span>
        <span className="sr-only">Âm lượng</span>
        <input
          type="range"
          min={0}
          max={100}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          className="cozy-range flex-1"
        />
        <span className="w-8 text-right tabular-nums">{volume}</span>
      </label>
    </section>
  )
}
