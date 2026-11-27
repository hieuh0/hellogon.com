import { useEffect } from 'react'
import { socials } from '../config/site'

/** Shown instead of the playground while the site is under maintenance (see `maintenanceMode`). */
export function MaintenancePage() {
  useEffect(() => {
    document.title = 'Gôn đang bảo trì 🛠️'
  }, [])

  const email = socials.find((s) => s.label === 'Email')

  return (
    <main className="flex h-full items-center justify-center p-6 text-center">
      <div className="max-w-md rounded-[2rem] border-2 border-b-4 border-[var(--edge)] bg-[var(--panel)] px-8 py-10 shadow-[0_12px_30px_var(--shadow)]">
        <div className="text-7xl motion-safe:animate-bounce" aria-hidden="true">
          🦖
        </div>
        <h1 className="mt-4 text-3xl font-black">
          <span className="title-gon">Gôn</span> đang bảo trì
        </h1>
        <p className="mt-3 text-[var(--muted)]">
          Tui đang dọn dẹp lại góc vườn một xíu. Cậu quay lại sau nha, sắp xong rồi nè! 🛠️
        </p>
        {email && (
          <p className="mt-6 text-sm text-[var(--muted)]">
            Cần gì gấp thì nhắn tui qua{' '}
            <a href={email.href} className="font-black text-[var(--fg)] underline underline-offset-4">
              {email.handle}
            </a>
          </p>
        )}
      </div>
    </main>
  )
}
