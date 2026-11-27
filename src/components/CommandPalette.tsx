import { useEffect, useRef, useState, type KeyboardEvent } from 'react'

export type CommandId = 'party' | 'zero-g' | 'clone' | 'reset'

const COMMANDS: { id: CommandId; hint: string }[] = [
  { id: 'party', hint: 'Disco: nền nhấp nháy, confetti, Gôn nhảy liên tục' },
  { id: 'zero-g', hint: 'Mất trọng lực: Gôn trôi và dội tường như logo DVD' },
  { id: 'clone', hint: 'Nhân bản 6 bé Gôn mini chạy lung tung' },
  { id: 'reset', hint: 'Trả mọi thứ về như cũ' },
]

interface CommandPaletteProps {
  active: Partial<Record<CommandId, boolean>>
  onRun: (id: CommandId) => void
  onClose: () => void
}

/** Secret command bar, opened with Cmd/Ctrl+K or "/". Mounted only while open. */
export function CommandPalette({ active, onRun, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    inputRef.current?.focus()
    return () => previous?.focus({ preventScroll: true })
  }, [])

  const q = query.trim().replace(/^\//, '').toLowerCase()
  const matches = COMMANDS.filter((c) => c.id.includes(q))
  const current = Math.min(index, matches.length - 1)

  const run = (id: CommandId) => {
    onRun(id)
    onClose()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!matches.length) return
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const step = e.key === 'ArrowDown' ? 1 : -1
      setIndex((current + step + matches.length) % matches.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      run(matches[current].id)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[16vh]">
      <div aria-hidden onClick={onClose} className="absolute inset-0 bg-[#4A3728]/20 backdrop-blur-[2px]" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Lệnh bí mật"
        className="palette-in relative w-[min(92vw,460px)] overflow-hidden rounded-[28px] border-2 border-b-4 border-[var(--edge)] bg-[var(--panel)] shadow-[0_24px_60px_-20px_var(--shadow)]"
      >
        <div className="flex items-center gap-2 border-b-2 border-[var(--line)] px-4">
          <span className="text-lg font-black text-[var(--muted)]">/</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setIndex(0)
            }}
            onKeyDown={onKeyDown}
            placeholder="Gõ lệnh bí mật…"
            aria-label="Lệnh"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-list"
            aria-activedescendant={matches.length ? `command-${matches[current].id}` : undefined}
            autoComplete="off"
            spellCheck={false}
            className="h-14 flex-1 bg-transparent text-base font-bold outline-none placeholder:text-[var(--muted)]"
          />
          <kbd className="rounded-full border-2 border-[var(--line)] px-2 py-0.5 text-[11px] font-extrabold text-[var(--muted)]">esc</kbd>
        </div>
        <ul id="command-list" role="listbox" className="p-1.5">
          {matches.map((c, i) => (
            <li
              key={c.id}
              id={`command-${c.id}`}
              role="option"
              aria-selected={i === current}
              onMouseEnter={() => setIndex(i)}
              onClick={() => run(c.id)}
              className={`flex cursor-pointer items-center justify-between gap-3 rounded-2xl px-3 py-2.5 ${
                i === current ? 'bg-[var(--line)]' : ''
              }`}
            >
              <span className="flex min-w-0 flex-col">
                <span className="text-[15px] font-black">/{c.id}</span>
                <span className="truncate text-xs font-semibold text-[var(--muted)]">{c.hint}</span>
              </span>
              {active[c.id] && (
                <span className="shrink-0 rounded-full border-2 border-[#4A3728] bg-[#B8F2B6] px-2 py-0.5 text-[11px] font-extrabold text-[#4A3728]">
                  Đang bật
                </span>
              )}
            </li>
          ))}
          {!matches.length && (
            <li className="px-3 py-4 text-center text-sm font-bold text-[var(--muted)]">Không có lệnh này. Thử /party?</li>
          )}
        </ul>
        <p className="border-t-2 border-[var(--line)] px-4 py-2 text-xs font-bold text-[var(--muted)]">
          ↑↓ chọn · ↵ chạy · esc đóng
        </p>
      </div>
    </div>
  )
}
