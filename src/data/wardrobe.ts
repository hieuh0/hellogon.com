/** Everything Gôn can wear: skins (body colors) and accessories, plus the gacha odds. */

export type SkinId = 'mint' | 'strawberry' | 'butter' | 'taro' | 'sky' | 'rainbow'
export type Accessory = 'bandaid' | 'chef' | 'nightcap' | 'duck' | 'shades' | 'catphones' | 'bow' | 'crown' | 'scarf'
export type AccessorySlot = 'head' | 'face' | 'neck'

export interface Skin {
  id: SkinId
  name: string
  /** SVG paint for the body: a color, or a gradient reference defined inside GonMascot. */
  fill: string
  /** Swatch for buttons (CSS background). */
  swatch: string
  blush: string
}

export const SKINS: Skin[] = [
  { id: 'mint', name: 'Xanh Bạc Hà', fill: '#7EE081', swatch: '#7EE081', blush: '#FF9EAA' },
  { id: 'strawberry', name: 'Hồng Dâu', fill: '#FF9EAA', swatch: '#FF9EAA', blush: '#FF6F87' },
  { id: 'butter', name: 'Vàng Bơ', fill: '#FFE066', swatch: '#FFE066', blush: '#FF9EAA' },
  { id: 'taro', name: 'Tím Khoai Môn', fill: '#C8A2FF', swatch: '#C8A2FF', blush: '#FF9EAA' },
  { id: 'sky', name: 'Xanh Trời', fill: '#80D8FF', swatch: '#80D8FF', blush: '#FF9EAA' },
  {
    id: 'rainbow',
    name: 'Cầu Vồng',
    fill: 'url(#gon-rainbow)',
    swatch: 'linear-gradient(135deg, #FFB3C6, #FFE08A, #B8F2B6, #8FD3FF, #C9B6FF)',
    blush: '#FF7F93',
  },
]

export const SKIN_BY_ID = Object.fromEntries(SKINS.map((s) => [s.id, s])) as Record<SkinId, Skin>

export interface AccessoryInfo {
  id: Accessory
  name: string
  emoji: string
  slot: AccessorySlot
  /** How to get it when it is not from the gacha. */
  hint?: string
}

export const ACCESSORIES: AccessoryInfo[] = [
  { id: 'duck', name: 'Vịt vàng đội đầu', emoji: '🐤', slot: 'head' },
  { id: 'shades', name: 'Kính râm pixel', emoji: '🕶️', slot: 'face' },
  { id: 'catphones', name: 'Tai nghe mèo', emoji: '🎧', slot: 'head' },
  { id: 'bow', name: 'Nơ đỏ', emoji: '🎀', slot: 'head' },
  { id: 'crown', name: 'Vương miện nhỏ', emoji: '👑', slot: 'head' },
  { id: 'scarf', name: 'Khăn quàng cổ', emoji: '🧣', slot: 'neck' },
  { id: 'bandaid', name: 'Băng cá nhân', emoji: '🩹', slot: 'face', hint: 'Chọc Gôn 15 lần' },
  { id: 'chef', name: 'Mũ đầu bếp', emoji: '🧑‍🍳', slot: 'head', hint: 'Cho Gôn ăn 5 lần' },
  { id: 'nightcap', name: 'Mũ ngủ', emoji: '🌙', slot: 'head', hint: 'Ghé thăm lúc nửa đêm' },
]

export const ACCESSORY_BY_ID = Object.fromEntries(ACCESSORIES.map((a) => [a.id, a])) as Record<Accessory, AccessoryInfo>

export const GACHA_COST = 20
export const DUPLICATE_REFUND = 10

export type Prize = { kind: 'skin'; id: SkinId } | { kind: 'accessory'; id: Accessory }

/** Gacha pool with weights; the rainbow skin is the rare one. */
export const GACHA_POOL: { prize: Prize; weight: number }[] = [
  ...(['strawberry', 'butter', 'taro', 'sky'] as const).map((id) => ({ prize: { kind: 'skin', id } as Prize, weight: 10 })),
  { prize: { kind: 'skin', id: 'rainbow' }, weight: 2 },
  ...(['duck', 'shades', 'catphones', 'bow', 'crown', 'scarf'] as const).map((id) => ({
    prize: { kind: 'accessory', id } as Prize,
    weight: id === 'crown' ? 5 : 9,
  })),
]

export function rollPrize(): Prize {
  const total = GACHA_POOL.reduce((s, p) => s + p.weight, 0)
  let r = Math.random() * total
  for (const p of GACHA_POOL) {
    r -= p.weight
    if (r < 0) return p.prize
  }
  return GACHA_POOL[0].prize
}
