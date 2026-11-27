import { useEffect, useRef, useState } from 'react'
import {
  ACCESSORIES,
  ACCESSORY_BY_ID,
  DUPLICATE_REFUND,
  GACHA_COST,
  SKINS,
  SKIN_BY_ID,
  type Accessory,
  type Prize,
  type SkinId,
} from '../data/wardrobe'
import type { PullResult } from '../hooks/usePetStore'
import { CloseIcon } from './icons'

const INK = '#4A3728'
const CAPSULE_COLORS = ['#FFB3C6', '#8FD3FF', '#FFE08A', '#C9B6FF', '#B8F2B6']

type Tab = 'gacha' | 'wardrobe'
type Stage = 'idle' | 'shake' | 'drop' | 'reveal'

interface GachaModalProps {
  open: boolean
  onClose: () => void
  reducedMotion: boolean
  coins: number
  skins: SkinId[]
  accessories: Accessory[]
  skin: SkinId
  accessory: Accessory | null
  pull: () => PullResult | null
  equipSkin: (s: SkinId) => void
  equipAccessory: (a: Accessory | null) => void
  /** A capsule finished opening (for sounds and Gôn's reaction). */
  onReveal: (r: PullResult) => void
  onBroke: () => void
}

const prizeName = (p: Prize) => (p.kind === 'skin' ? SKIN_BY_ID[p.id].name : ACCESSORY_BY_ID[p.id].name)

function PrizeIcon({ prize, size = 56 }: { prize: Prize; size?: number }) {
  if (prize.kind === 'skin') {
    return (
      <span
        className="inline-block rounded-full border-2 border-[#4A3728]"
        style={{ width: size, height: size, background: SKIN_BY_ID[prize.id].swatch }}
      />
    )
  }
  return (
    <span className="inline-block leading-none" style={{ fontSize: size * 0.8 }}>
      {ACCESSORY_BY_ID[prize.id].emoji}
    </span>
  )
}

/** The capsule toy machine. Shakes while turning, then drops a capsule from the chute. */
function GachaMachine({ stage, capsule }: { stage: Stage; capsule: string }) {
  return (
    <div className="relative mx-auto w-[min(60vw,220px)]">
      <svg viewBox="0 0 200 270" className={`w-full overflow-visible ${stage === 'shake' ? 'gacha-shake' : ''}`} aria-hidden>
        <rect x="88" y="6" width="24" height="16" rx="6" fill="#FF8FAB" stroke={INK} strokeWidth="3" />
        <circle cx="100" cy="92" r="72" fill="#EAF7FF" stroke={INK} strokeWidth="3.5" />
        <g clipPath="url(#gacha-dome)">
          {[
            [62, 120, '#FFB3C6'],
            [98, 132, '#FFE08A'],
            [136, 120, '#8FD3FF'],
            [78, 92, '#C9B6FF'],
            [118, 96, '#B8F2B6'],
            [96, 64, '#FFB3C6'],
            [138, 76, '#FFE08A'],
            [58, 78, '#8FD3FF'],
          ].map(([x, y, c], i) => (
            <g key={i} transform={`translate(${x} ${y}) rotate(${i * 37})`}>
              <circle r="17" fill="#fff" stroke={INK} strokeWidth="2.5" />
              <path d="M-17 0A17 17 0 0 1 17 0Z" fill={c as string} stroke={INK} strokeWidth="2.5" />
            </g>
          ))}
        </g>
        <defs>
          <clipPath id="gacha-dome">
            <circle cx="100" cy="92" r="70" />
          </clipPath>
        </defs>
        <path d="M58 46Q72 32 92 28" stroke="#fff" strokeWidth="7" strokeLinecap="round" fill="none" opacity="0.9" />
        <path d="M28 150Q28 140 40 140H160Q172 140 172 150V250Q172 262 160 262H40Q28 262 28 250Z" fill="#FFB3C6" stroke={INK} strokeWidth="3.5" />
        <rect x="22" y="138" width="156" height="16" rx="8" fill="#FF8FAB" stroke={INK} strokeWidth="3" />
        <g transform="translate(78 200)">
          <circle r="22" fill="#FFF1C2" stroke={INK} strokeWidth="3" />
          <rect x="-5" y="-18" width="10" height="36" rx="5" fill="#FFB627" stroke={INK} strokeWidth="2.5" className={stage === 'shake' ? 'gacha-knob' : ''} />
        </g>
        <rect x="120" y="220" width="40" height="28" rx="8" fill="#7A5A48" stroke={INK} strokeWidth="3" />
        <text x="100" y="176" textAnchor="middle" fontSize="15" fontWeight="900" fill={INK} fontFamily="Nunito, sans-serif">
          GÔN GACHA
        </text>
        <circle cx="48" cy="230" r="5" fill="#fff" opacity="0.8" />
        <circle cx="60" cy="242" r="3" fill="#fff" opacity="0.8" />
      </svg>
      {(stage === 'drop' || stage === 'reveal') && (
        <svg
          viewBox="-20 -20 40 40"
          className={`absolute bottom-[-2%] left-[63%] w-[16%] overflow-visible ${stage === 'drop' ? 'capsule-drop' : 'capsule-open'}`}
          aria-hidden
        >
          <circle r="16" fill="#fff" stroke={INK} strokeWidth="2.5" />
          <path d="M-16 0A16 16 0 0 1 16 0Z" fill={capsule} stroke={INK} strokeWidth="2.5" />
        </svg>
      )}
    </div>
  )
}

/** "Gacha & Tủ đồ": spend Paw Coins on capsules, then mix and match what Gôn has unlocked. */
export function GachaModal(props: GachaModalProps) {
  const { open, onClose, reducedMotion, coins, skins, accessories, skin, accessory } = props
  const [tab, setTab] = useState<Tab>('gacha')
  const [stage, setStage] = useState<Stage>('idle')
  const [result, setResult] = useState<PullResult | null>(null)
  const [capsule, setCapsule] = useState(CAPSULE_COLORS[0])
  const [note, setNote] = useState<string | null>(null)
  const timers = useRef<number[]>([])
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    closeRef.current?.focus({ preventScroll: true })
    return () => previous?.focus({ preventScroll: true })
  }, [open])

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), [])

  const later = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, reducedMotion ? Math.min(ms, 150) : ms))

  const turn = () => {
    if (stage === 'shake' || stage === 'drop') return
    const r = props.pull()
    if (!r) {
      setNote(`Cần ${GACHA_COST} 🐾 mới quay được. Chạy game kiếm thêm nha!`)
      props.onBroke()
      return
    }
    setNote(null)
    setResult(r)
    setCapsule(CAPSULE_COLORS[Math.floor(Math.random() * CAPSULE_COLORS.length)])
    setStage('shake')
    later(750, () => setStage('drop'))
    later(1550, () => {
      setStage('reveal')
      props.onReveal(r)
    })
  }

  const tryOn = (p: Prize) => {
    if (p.kind === 'skin') props.equipSkin(p.id)
    else props.equipAccessory(p.id)
  }

  return (
    <div inert={!open} className="fixed inset-0 z-40" style={{ pointerEvents: open ? 'auto' : 'none' }}>
      <div
        aria-hidden
        onClick={onClose}
        className={`absolute inset-0 bg-[#4A3728]/20 backdrop-blur-[2px] transition-opacity duration-300 sm:bg-transparent sm:backdrop-blur-none ${open ? 'opacity-100' : 'opacity-0'}`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="gacha-title"
        className={`absolute inset-x-0 bottom-0 flex max-h-[86dvh] flex-col rounded-t-[32px] border-2 border-b-0 border-[var(--edge)] bg-[var(--panel)] shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] select-none sm:inset-y-3 sm:right-3 sm:left-auto sm:max-h-none sm:w-[400px] sm:rounded-[32px] sm:border-b-4 ${
          open ? 'translate-x-0 translate-y-0' : 'translate-y-full sm:translate-x-[110%] sm:translate-y-0'
        }`}
      >
        <header className="flex items-center justify-between gap-3 p-5 pb-3">
          <div>
            <h2 id="gacha-title" className="text-2xl font-black">
              Gacha &amp; Tủ đồ
            </h2>
            <p className="text-sm font-extrabold text-[var(--muted)]">
              Ví của Gôn: <span className="text-[var(--fg)]">{coins} 🐾</span>
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="candy grid size-11 shrink-0 place-items-center rounded-full bg-[#FFD1DA] text-[#4A3728]"
          >
            <CloseIcon />
          </button>
        </header>

        <div role="tablist" aria-label="Chọn mục" className="mx-5 flex gap-2 rounded-full border-2 border-[var(--line)] p-1">
          {(
            [
              ['gacha', '🎰 Quay gacha'],
              ['wardrobe', '👗 Tủ đồ'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`h-10 flex-1 rounded-full text-[15px] font-extrabold transition ${
                tab === id ? 'border-2 border-b-4 border-[#4A3728] bg-[#FFE08A] text-[#4A3728]' : 'text-[var(--muted)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {tab === 'gacha' ? (
            <div className="flex flex-col items-center text-center">
              <GachaMachine stage={stage} capsule={capsule} />
              <div className="mt-3 min-h-[118px] w-full" aria-live="polite">
                {stage === 'reveal' && result ? (
                  <div className="bubble-pop flex flex-col items-center rounded-3xl border-2 border-[var(--line)] p-3">
                    <PrizeIcon prize={result.prize} />
                    <p className="mt-1 text-lg font-black">{prizeName(result.prize)}</p>
                    {result.duplicate ? (
                      <p className="text-sm font-bold text-[var(--muted)]">
                        Trùng rồi nè! Gôn hoàn lại {DUPLICATE_REFUND} 🐾 cho cậu nha.
                      </p>
                    ) : (
                      <p className="text-sm font-bold text-[var(--muted)]">
                        Mới toanh! {result.prize.kind === 'skin' ? 'Màu da' : 'Phụ kiện'} đã vào tủ đồ.
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => tryOn(result.prize)}
                      className="candy mt-2 h-10 rounded-full bg-[#B8F2B6] px-4 text-sm font-extrabold text-[#4A3728]"
                    >
                      Mặc thử luôn
                    </button>
                  </div>
                ) : (
                  <p className="pt-6 text-sm font-bold text-[var(--muted)]">
                    {note ?? `Mỗi lượt ${GACHA_COST} 🐾. Màu Cầu Vồng hiếm lắm á ✨`}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={turn}
                disabled={stage === 'shake' || stage === 'drop'}
                className="candy mt-3 h-14 w-full rounded-full bg-[#FFB3C6] text-lg font-black text-[#4A3728] disabled:opacity-60"
              >
                {stage === 'shake' || stage === 'drop' ? 'Đang quay…' : `Quay 1 lượt · ${GACHA_COST} 🐾`}
              </button>
            </div>
          ) : (
            <div>
              <h3 className="text-sm font-extrabold text-[var(--muted)]">Màu da</h3>
              <ul className="mt-2 grid grid-cols-3 gap-2">
                {SKINS.map((s) => {
                  const owned = skins.includes(s.id)
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        disabled={!owned}
                        aria-pressed={skin === s.id}
                        onClick={() => props.equipSkin(s.id)}
                        className={`flex w-full flex-col items-center gap-1 rounded-2xl border-2 p-2 text-xs font-extrabold transition disabled:opacity-50 ${
                          skin === s.id ? 'border-[#4A3728] bg-[#FFF1C2] text-[#4A3728]' : 'border-[var(--line)]'
                        }`}
                      >
                        <span
                          className="grid size-10 place-items-center rounded-full border-2 border-[#4A3728] text-base"
                          style={{ background: owned ? s.swatch : '#E8E1DA' }}
                        >
                          {owned ? '' : '🔒'}
                        </span>
                        {owned ? s.name : '???'}
                      </button>
                    </li>
                  )
                })}
              </ul>

              <h3 className="mt-5 text-sm font-extrabold text-[var(--muted)]">Phụ kiện</h3>
              <ul className="mt-2 grid grid-cols-3 gap-2">
                <li>
                  <button
                    type="button"
                    aria-pressed={accessory === null}
                    onClick={() => props.equipAccessory(null)}
                    className={`flex h-full w-full flex-col items-center gap-1 rounded-2xl border-2 p-2 text-xs font-extrabold ${
                      accessory === null ? 'border-[#4A3728] bg-[#FFF1C2] text-[#4A3728]' : 'border-[var(--line)]'
                    }`}
                  >
                    <span className="text-3xl leading-10">🚫</span>
                    Không đội
                  </button>
                </li>
                {ACCESSORIES.map((a) => {
                  const owned = accessories.includes(a.id)
                  return (
                    <li key={a.id}>
                      <button
                        type="button"
                        disabled={!owned}
                        aria-pressed={accessory === a.id}
                        title={owned ? a.name : (a.hint ?? 'Quay gacha để mở khoá')}
                        onClick={() => props.equipAccessory(a.id)}
                        className={`flex h-full w-full flex-col items-center gap-1 rounded-2xl border-2 p-2 text-xs font-extrabold disabled:opacity-55 ${
                          accessory === a.id ? 'border-[#4A3728] bg-[#FFF1C2] text-[#4A3728]' : 'border-[var(--line)]'
                        }`}
                      >
                        <span className="text-3xl leading-10">{owned ? a.emoji : '🔒'}</span>
                        <span>{owned ? a.name : (a.hint ?? 'Quay gacha')}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}
