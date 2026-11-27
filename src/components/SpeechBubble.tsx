import { useRef } from 'react'
import type { Speech } from '../hooks/useGonBrain'

/** Speech bubble above Gôn. Keeps the last line while fading out so it never jumps. */
export function SpeechBubble({ speech }: { speech: Speech | null }) {
  const lastRef = useRef<Speech | null>(null)
  if (speech) lastRef.current = speech
  const shown = lastRef.current

  return (
    <div className="flex h-20 items-end justify-center px-4 sm:h-28" aria-live="polite" aria-atomic="true">
      {shown && (
        <div
          className="transition-opacity duration-300"
          style={{ opacity: speech ? 1 : 0 }}
          aria-hidden={!speech}
        >
          <div
            key={shown.id}
            className="bubble-pop relative max-w-[min(80vw,300px)] rounded-[22px] border-2 border-b-4 border-[var(--edge)] bg-[var(--panel)] px-4 py-2.5 text-center text-[15px] leading-snug font-extrabold shadow-[0_10px_24px_-14px_var(--shadow)] sm:text-base"
          >
            {shown.text}
            <span
              aria-hidden
              className="absolute -bottom-[9px] left-1/2 size-3.5 -translate-x-1/2 rotate-45 border-r-2 border-b-[3px] border-[var(--edge)] bg-[var(--panel)]"
            />
          </div>
        </div>
      )}
    </div>
  )
}
