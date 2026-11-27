/**
 * Shared, mutable state for Gon's little world. Gon, the ball and the snack tray
 * each read and write it from their own animation loops, so nothing here triggers
 * React renders.
 */

/** The grassy hill: the top of an ellipse centered horizontally on screen. */
export interface Hill {
  cx: number
  /** Viewport y of the crest (the highest point, where Gon stands). */
  crestY: number
  /** Horizontal and vertical semi-axes of the hill's top arc. */
  a: number
  b: number
}

export interface World {
  hill: Hill
  ball: { active: boolean; held: boolean; x: number; y: number; vx: number; vy: number; r: number }
  /** A snack being dragged toward Gon. */
  snack: { active: boolean; x: number; y: number }
  /** Dino Runner: Gon's jump height above the track (px, up is positive), vertical speed and ducking. */
  game: { active: boolean; y: number; vy: number; duck: boolean }
  /** Where Gon was last drawn: the SVG origin in viewport px and the px size of one SVG unit. */
  gon: { x: number; y: number; unit: number }
}

/** Gon's rendered size in px; smaller while running so the track has room. */
export const gonSize = (w: number, h: number, running = false) =>
  running ? Math.min(w * 0.36, 150, h * 0.22) : Math.min(w * 0.55, 250, h * 0.3)

export function computeHill(w: number, h: number): Hill {
  const top = Math.min(220, Math.max(160, h * 0.25))
  return { cx: w / 2, crestY: h - top, a: Math.max(w * 0.62, 460), b: 90 }
}

/** Viewport y of the hill's surface at x (flat at the crest level beyond the hill's ends). */
export function groundY(hill: Hill, x: number) {
  const u = Math.min(1, Math.abs(x - hill.cx) / hill.a)
  return hill.crestY + hill.b * (1 - Math.sqrt(1 - u * u))
}

export function createWorld(): World {
  return {
    hill: computeHill(window.innerWidth, window.innerHeight),
    ball: { active: false, held: false, x: 0, y: 0, vx: 0, vy: 0, r: 30 },
    snack: { active: false, x: 0, y: 0 },
    game: { active: false, y: 0, vy: 0, duck: false },
    gon: { x: 0, y: 0, unit: 1 },
  }
}
