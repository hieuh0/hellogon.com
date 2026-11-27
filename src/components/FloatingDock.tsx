import { useRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { SayHiPopover } from './SayHiPopover'

export type Panel = 'experiments' | 'hi' | 'snacks' | 'gacha' | null

interface FloatingDockProps {
  panel: Panel
  soundOn: boolean
  ballOn: boolean
  chillOpen: boolean
  /** Slide the dock away (while playing the runner). */
  hidden: boolean
  onPlay: () => void
  onSnacks: () => void
  onToggleBall: () => void
  onGacha: () => void
  onChill: () => void
  onExperiments: () => void
  onSayHi: () => void
  onToggleSound: () => void
  onClosePanel: () => void
  /** Popovers anchored above the dock (the snack tray). */
  children?: ReactNode
}

/** A row of chunky candy buttons at the bottom of the screen. */
export function FloatingDock(props: FloatingDockProps) {
  const { panel, soundOn, ballOn, chillOpen, hidden } = props
  const dockRef = useRef<HTMLDivElement>(null)

  return (
    <div
      inert={hidden}
      className={`pointer-events-none fixed inset-x-0 bottom-[max(0.9rem,env(safe-area-inset-bottom))] z-30 flex justify-center px-2 transition duration-500 ease-[cubic-bezier(0.3,1.3,0.5,1)] ${
        hidden ? 'translate-y-[160%] opacity-0' : ''
      }`}
    >
      <div ref={dockRef} className="pointer-events-auto relative">
        <SayHiPopover open={panel === 'hi'} onClose={props.onClosePanel} containerRef={dockRef} />
        {props.children}
        <nav aria-label="Đồ chơi của Gon" className="flex flex-wrap items-center justify-center gap-1 sm:gap-2">
          <CandyButton label="Chơi game" emoji="🎮" bg="#B8F2B6" onClick={props.onPlay} />
          <CandyButton
            label="Đồ ăn"
            emoji="🍓"
            bg="#FFD1DA"
            active={panel === 'snacks'}
            onClick={props.onSnacks}
            aria-expanded={panel === 'snacks'}
            aria-controls="snack-tray"
          />
          <CandyButton
            label={ballOn ? 'Cất bóng' : 'Thả bóng'}
            emoji="🏐"
            bg="#FFEFA8"
            active={ballOn}
            onClick={props.onToggleBall}
            aria-pressed={ballOn}
          />
          <CandyButton
            label="Gacha & Tủ đồ"
            emoji="🎁"
            bg="#FFC9D9"
            active={panel === 'gacha'}
            onClick={props.onGacha}
            aria-haspopup="dialog"
          />
          <CandyButton label="Chill Lo-fi" emoji="🎧" bg="#E2D6FF" active={chillOpen} onClick={props.onChill} aria-pressed={chillOpen} />
          <CandyButton
            label="Thí nghiệm"
            emoji="🧪"
            bg="#D4F5C4"
            active={panel === 'experiments'}
            onClick={props.onExperiments}
            aria-haspopup="dialog"
          />
          <CandyButton
            label="Nhắn tui"
            emoji="💌"
            bg="#FFDDBF"
            active={panel === 'hi'}
            onClick={props.onSayHi}
            aria-expanded={panel === 'hi'}
            aria-controls="say-hi-popover"
          />
          <CandyButton
            label={soundOn ? 'Có tiếng' : 'Tắt tiếng'}
            emoji={soundOn ? '🔊' : '🔇'}
            bg="#C8ECFF"
            active={soundOn}
            onClick={props.onToggleSound}
            aria-pressed={soundOn}
          />
        </nav>
      </div>
    </div>
  )
}

interface CandyButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  emoji: string
  bg: string
  active?: boolean
}

function CandyButton({ label, emoji, bg, active, ...rest }: CandyButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`candy flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-full px-2 text-[15px] font-extrabold text-[#4A3728] sm:h-12 sm:min-w-12 sm:px-3 xl:px-4 ${
        active ? 'candy-active' : ''
      }`}
      style={{ background: bg }}
      {...rest}
    >
      <span aria-hidden className="text-lg leading-none sm:text-xl">
        {emoji}
      </span>
      <span className="hidden whitespace-nowrap xl:inline">{label}</span>
    </button>
  )
}
