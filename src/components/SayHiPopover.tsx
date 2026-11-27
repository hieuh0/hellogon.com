import { useEffect, useRef, type RefObject } from 'react'
import { socials } from '../config/site'
import { ArrowIcon } from './icons'

interface SayHiPopoverProps {
  open: boolean
  onClose: () => void
  /** Clicks inside this element (the dock) do not count as "outside". */
  containerRef: RefObject<HTMLElement | null>
}

export function SayHiPopover({ open, onClose, containerRef }: SayHiPopoverProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    ref.current?.querySelector<HTMLElement>('a')?.focus({ preventScroll: true })
    const onDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) onClose()
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open, onClose, containerRef])

  return (
    <div
      ref={ref}
      id="say-hi-popover"
      role="dialog"
      aria-label="Liên hệ"
      inert={!open}
      className={`absolute bottom-full left-1/2 mb-3 w-[min(86vw,280px)] -translate-x-1/2 rounded-[26px] border-2 border-b-4 border-[var(--edge)] bg-[var(--panel)] p-2 shadow-[0_16px_40px_-16px_var(--shadow)] transition duration-200 ease-out ${
        open ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'
      }`}
    >
      <p className="px-3 pt-2 pb-1 text-sm font-extrabold text-[var(--muted)]">
        💌 Nhắn cho Gon nha
      </p>
      <ul>
        {socials.map((s) => (
          <li key={s.label}>
            <a
              href={s.href}
              target={s.href.startsWith('http') ? '_blank' : undefined}
              rel="noopener noreferrer"
              className="group flex items-center justify-between rounded-2xl px-3 py-2.5 outline-none hover:bg-[var(--line)] focus-visible:bg-[var(--line)]"
            >
              <span className="flex flex-col">
                <span className="text-sm font-extrabold">{s.label}</span>
                <span className="text-xs font-semibold text-[var(--muted)]">{s.handle}</span>
              </span>
              <span className="text-[var(--muted)] transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[var(--fg)]">
                <ArrowIcon />
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
