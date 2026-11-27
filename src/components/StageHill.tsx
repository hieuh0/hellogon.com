import { groundY, type Hill } from '../lib/world'

const INK = '#4A3728'
/** Decorations along the hill, as fractions of its half-width. */
const TUFTS = [-0.62, -0.38, -0.16, 0.22, 0.44, 0.7]
const FLOWERS = [
  { u: -0.5, color: '#FFB3C6' },
  { u: -0.27, color: '#FFE08A' },
  { u: 0.33, color: '#FFB3C6' },
  { u: 0.58, color: '#C9B6FF' },
]

/** The pastel grassy hill Gôn lives on. Its top arc is exactly the ground Gôn and the ball walk on. */
export function StageHill({ hill, width, height, hidden = false }: { hill: Hill; width: number; height: number; hidden?: boolean }) {
  const { cx, crestY, a, b } = hill
  const arc = (dy: number, shrink: number) =>
    `M${cx - a * shrink} ${crestY + b + dy}A${a * shrink} ${b} 0 0 1 ${cx + a * shrink} ${crestY + b + dy}V${height + 10}H${cx - a * shrink}Z`
  const at = (u: number, lift = 0) => {
    const x = cx + u * a
    return { x, y: groundY(hill, x) + 10 - lift }
  }

  return (
    <svg
      aria-hidden
      width={width}
      height={height}
      className={`hill pointer-events-none absolute inset-0 -z-[5] transition-opacity duration-500 ${hidden ? 'opacity-0' : ''}`}
    >
      <path d={arc(0, 1)} fill="#B8F2B6" stroke={INK} strokeWidth="3" />
      <path d={arc(34, 0.94)} fill="#8CE08A" />
      <path d={arc(34, 0.94)} fill="none" stroke={INK} strokeWidth="2.5" strokeDasharray="0" opacity="0.18" />
      {/* Shine along the crest. */}
      <path
        d={`M${cx - a * 0.35} ${groundY(hill, cx - a * 0.35) + 12}Q${cx} ${crestY + 8} ${cx + a * 0.18} ${groundY(hill, cx + a * 0.18) + 10}`}
        stroke="#fff"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
        opacity="0.55"
      />
      {TUFTS.map((u) => {
        const { x, y } = at(u, -8)
        return (
          <path
            key={u}
            d={`M${x - 8} ${y}q3 -9 5 0q3 -11 6 0q3 -9 5 0`}
            stroke="#6CC56A"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        )
      })}
      {FLOWERS.map(({ u, color }) => {
        const { x, y } = at(u, -16)
        return (
          <g key={u} transform={`translate(${x} ${y})`}>
            {[0, 72, 144, 216, 288].map((deg) => (
              <circle key={deg} cx="0" cy="-5" r="4" fill={color} stroke={INK} strokeWidth="1.5" transform={`rotate(${deg})`} />
            ))}
            <circle r="3" fill="#FFE08A" stroke={INK} strokeWidth="1.5" />
          </g>
        )
      })}
    </svg>
  )
}
