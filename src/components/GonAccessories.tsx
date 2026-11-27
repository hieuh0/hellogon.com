import type { Accessory } from '../data/wardrobe'

const INK = '#4A3728'
const line = { stroke: INK, strokeWidth: 2.5, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }

/**
 * Head accessories, drawn with the origin on the crown of Gon's head, just in
 * front of his dorsal spikes (negative y is up). The head's center sits at
 * (-10, 44) in these coordinates. GonMascot tilts this origin with the head's parallax.
 */
export function HeadAccessory({ accessory }: { accessory: Accessory | null }) {
  switch (accessory) {
    case 'chef':
      return (
        <g key="chef" className="hat-pop">
          {/* Ink pass slightly larger than the white pass gives one clean outline around the union. */}
          <g fill={INK}>
            <circle cx="-15" cy="-20" r="14.5" />
            <circle cx="0" cy="-30" r="17.5" />
            <circle cx="15" cy="-20" r="14.5" />
            <rect x="-21.5" y="-20" width="43" height="29.5" rx="4" />
          </g>
          <g fill="#fff">
            <circle cx="-15" cy="-20" r="12" />
            <circle cx="0" cy="-30" r="15" />
            <circle cx="15" cy="-20" r="12" />
            <rect x="-19" y="-18" width="38" height="25" rx="3" />
          </g>
          <path d="M-19-1H19M-6-1v-9M6-1v-9" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
        </g>
      )
    case 'nightcap':
      return (
        <g key="nightcap" className="hat-pop">
          <path d="M-28 4Q-22-38 14-42Q36-44 40-16Q30-30 20-22Q24-8 28 4Z" fill="#8FA8FF" {...line} strokeWidth={3} />
          <path d="M-12-26Q4-32 22-30M-20-12Q0-18 21-14" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.35" />
          <rect x="-31" y="-3" width="62" height="11" rx="5.5" fill="#fff" stroke={INK} strokeWidth="3" />
          <circle cx="40" cy="-16" r="7" fill="#fff" stroke={INK} strokeWidth="3" />
        </g>
      )
    case 'duck':
      return (
        <g key="duck" className="hat-pop">
          <path d="M-18 2Q-22-14-4-14L8-14Q20-14 18 2Z" fill="#FFD84D" {...line} />
          <circle cx="8" cy="-24" r="10" fill="#FFD84D" {...line} />
          <path d="M16-25Q25-25 24-20Q20-18 16-20Z" fill="#FF9F43" {...line} strokeWidth={2} />
          <circle cx="10" cy="-26" r="1.8" fill={INK} />
          <path d="M-8-6Q-2-2 4-6" {...line} fill="none" />
          <ellipse cx="4" cy="-20" rx="3" ry="1.8" fill="#FF9EAA" opacity="0.8" />
        </g>
      )
    case 'crown':
      return (
        <g key="crown" className="hat-pop">
          <path d="M-20 4L-22-16L-11-7L0-22L11-7L22-16L20 4Z" fill="#FFD36E" {...line} />
          <rect x="-21" y="-1" width="42" height="7" rx="3.5" fill="#FFC23D" {...line} />
          <circle cx="0" cy="-22" r="3" fill="#FF8FAB" {...line} strokeWidth={1.8} />
          <circle cx="-22" cy="-16" r="2.6" fill="#8FD3FF" {...line} strokeWidth={1.8} />
          <circle cx="22" cy="-16" r="2.6" fill="#8FD3FF" {...line} strokeWidth={1.8} />
          <circle cx="0" cy="2.5" r="2" fill="#FF8FAB" />
        </g>
      )
    case 'bow':
      return (
        <g key="bow" className="hat-pop" transform="translate(-8 4) rotate(-14)">
          <path d="M0 0C-8-12-24-12-22 0C-24 12-8 12 0 0Z" fill="#FF5A6E" {...line} />
          <path d="M0 0C8-12 24-12 22 0C24 12 8 12 0 0Z" fill="#FF5A6E" {...line} />
          <path d="M-15-3Q-10 0-15 3M15-3Q10 0 15 3" stroke="#fff" strokeWidth="1.8" fill="none" opacity="0.6" />
          <ellipse rx="5" ry="6" fill="#FF7A8A" {...line} />
        </g>
      )
    case 'catphones':
      return <Headphones key="catphones" band="#FFB3C6" cup="#FFFFFF" ears />
    default:
      return null
  }
}

/** Over-ear headphones around the head; cat ears on the band for the gacha version. */
export function Headphones({ band, cup, ears = false }: { band: string; cup: string; ears?: boolean }) {
  return (
    <g className="hat-pop">
      {ears &&
        [-34, 14].map((x) => (
          <g key={x} transform={`translate(${x} -2)`}>
            <path d="M-9 4L-4-12L9 2Z" fill={band} {...line} />
            <path d="M-4-6L-2-1L3 1Z" fill="#FF8FAB" />
          </g>
        ))}
      <path d="M-70 44A60 54 0 0 1 50 44" stroke={INK} strokeWidth="11" fill="none" strokeLinecap="round" />
      <path d="M-70 44A60 54 0 0 1 50 44" stroke={band} strokeWidth="5.5" fill="none" strokeLinecap="round" />
      {[-70, 50].map((x) => (
        <g key={x}>
          <rect x={x - 9} y="30" width="18" height="30" rx="9" fill={cup} {...line} />
          <circle cx={x} cy="45" r="4" fill={band} />
        </g>
      ))}
    </g>
  )
}

/** Face accessories, drawn in face coordinates (eyes at ±24, 0) so they follow the face parallax. */
export function FaceAccessory({ accessory }: { accessory: Accessory | null }) {
  if (accessory === 'bandaid') {
    return (
      <g transform="translate(-2 -33) rotate(-14)">
        <g className="hat-pop">
          <rect x="-15" y="-5.5" width="30" height="11" rx="5.5" fill="#f4c7a1" stroke={INK} strokeWidth="2" />
          <rect x="-5" y="-4.5" width="10" height="9" rx="1.5" fill="#e3a272" />
          <g fill={INK} opacity="0.35">
            <circle cx="-10" cy="-1.6" r="0.9" />
            <circle cx="-10" cy="1.6" r="0.9" />
            <circle cx="10" cy="-1.6" r="0.9" />
            <circle cx="10" cy="1.6" r="0.9" />
          </g>
        </g>
      </g>
    )
  }
  if (accessory === 'shades') {
    // Chunky "deal with it" pixel glasses: a stepped lens on each eye, joined by a bridge.
    return (
      <g className="hat-pop" fill="#2B211A">
        <rect x="-44" y="-7" width="88" height="4" />
        {[-24, 24].map((x) => (
          <g key={x} transform={`translate(${x} 0)`}>
            <rect x="-14" y="-7" width="28" height="10" />
            <rect x="-11" y="3" width="22" height="3" />
            <rect x="-7" y="6" width="14" height="3" />
            <rect x="-10" y="-4" width="4" height="3" fill="#fff" />
            <rect x="-5" y="-4" width="3" height="3" fill="#fff" />
          </g>
        ))}
      </g>
    )
  }
  return null
}

/** A cozy striped scarf under the chin, in body coordinates. */
export function Scarf() {
  return (
    <g className="hat-pop">
      <path d="M-22 30L-30 56" stroke={INK} strokeWidth="15" strokeLinecap="round" />
      <path d="M-22 30L-30 56" stroke="#FF8FA3" strokeWidth="9.5" strokeLinecap="round" />
      <path d="M-34 18Q4 42 46 16" stroke={INK} strokeWidth="16" strokeLinecap="round" fill="none" />
      <path d="M-34 18Q4 42 46 16" stroke="#FF8FA3" strokeWidth="10.5" strokeLinecap="round" fill="none" />
      <path d="M-34 18Q4 42 46 16" stroke="#fff" strokeWidth="10.5" strokeDasharray="4 9" fill="none" opacity="0.55" />
      <path d="M-27 50L-33 48M-26 54L-32 52" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
    </g>
  )
}

/** A little yellow umbrella held overhead, in body coordinates; drawn behind the body so the handle hides behind the head. */
export function Umbrella() {
  return (
    <g className="umbrella-sway">
      <path d="M24-92L30 40" stroke={INK} strokeWidth="6" strokeLinecap="round" />
      <path d="M24-92L30 40" stroke="#C98B5A" strokeWidth="2.5" strokeLinecap="round" />
      <g transform="translate(24 -92) rotate(8)">
        <path
          d="M-56 0Q-56-40 0-42Q56-40 56 0Q47-8 37 0Q28-8 18 0Q9-8 0 0Q-9-8-18 0Q-28-8-37 0Q-47-8-56 0Z"
          fill="#FFD84D"
          stroke={INK}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path d="M0-42Q-14-20-18 0M0-42Q14-20 18 0" stroke={INK} strokeWidth="2" fill="none" opacity="0.4" />
        <path d="M-40-20Q-30-34-12-38" stroke="#fff" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.6" />
        <circle cy="-44" r="4" fill="#FFD84D" stroke={INK} strokeWidth="2.5" />
      </g>
    </g>
  )
}

/** Warm breath clouds puffing from the mouth in the cold (face coordinates). */
export function BreathPuffs() {
  return (
    <g transform="translate(6 14)">
      {[0, 1, 2].map((i) => (
        <circle
          key={i}
          className="breath-puff"
          r={4 + i}
          fill="#fff"
          stroke="#C9D8F0"
          strokeWidth="1.5"
          style={{ animationDelay: `${i * 0.55}s` }}
        />
      ))}
    </g>
  )
}
