import { useEffect, useRef } from 'react'
import { projects, statusLabel, type ProjectStatus } from '../data/projects'
import { ArrowIcon, CloseIcon } from './icons'

const statusDot: Record<ProjectStatus, string> = {
  live: 'bg-[#7EE081]',
  wip: 'bg-[#FFD36E]',
  idea: 'bg-[#C9B6FF]',
}

export function ExperimentsDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)

  // Move focus in on open and restore it on close.
  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    closeRef.current?.focus({ preventScroll: true })
    return () => previous?.focus({ preventScroll: true })
  }, [open])

  return (
    <div inert={!open} className="fixed inset-0 z-40" style={{ pointerEvents: open ? 'auto' : 'none' }}>
      <div
        aria-hidden
        onClick={onClose}
        className={`absolute inset-0 bg-[#4A3728]/25 backdrop-blur-[2px] transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="experiments-title"
        className={`absolute inset-x-0 bottom-0 flex max-h-[82dvh] flex-col rounded-t-[32px] border-2 border-b-0 border-[var(--edge)] bg-[var(--panel)] shadow-2xl sm:border-b-4 transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] select-text sm:inset-y-3 sm:right-3 sm:left-auto sm:max-h-none sm:w-[420px] sm:rounded-[32px] ${
          open ? 'translate-x-0 translate-y-0' : 'translate-y-full sm:translate-x-[110%] sm:translate-y-0'
        }`}
      >
        <header className="flex items-start justify-between gap-4 p-6 pb-4">
          <div>
            <p className="text-sm font-extrabold text-[var(--muted)]">
              🧪 {projects.length} trò đang vọc
            </p>
            <h2 id="experiments-title" className="mt-1 text-2xl font-black">
              Phòng chơi của Gôn
            </h2>
            <p className="mt-1 text-sm font-semibold text-[var(--muted)]">Mấy món đồ chơi đang vọc. Có cái chạy được, có cái… chưa.</p>
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

        <ul className="flex flex-col gap-3 overflow-y-auto px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {projects.map((p, i) => {
            const published = p.href !== '#'
            return (
              <li key={p.title}>
                <article className="group rounded-3xl border-2 border-[var(--line)] p-4 transition hover:-translate-y-0.5 hover:border-[var(--edge)]">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-extrabold text-[var(--muted)]">
                      {String(i + 1).padStart(2, '0')} · {p.tag}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--line)] px-2 py-0.5 text-[11px] font-extrabold">
                      <span className={`size-2 rounded-full ${statusDot[p.status]}`} />
                      {statusLabel[p.status]}
                    </span>
                  </div>
                  <h3 className="mt-2 text-lg font-black">{p.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed font-semibold text-[var(--muted)]">{p.description}</p>
                  {published ? (
                    <a
                      href={p.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1 text-sm font-extrabold underline-offset-4 outline-none hover:underline focus-visible:underline"
                    >
                      Xem thử <ArrowIcon />
                    </a>
                  ) : (
                    <span className="mt-3 inline-block text-sm font-bold text-[var(--muted)]">Sắp có…</span>
                  )}
                </article>
              </li>
            )
          })}
        </ul>
      </aside>
    </div>
  )
}
