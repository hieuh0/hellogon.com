import { useCallback, useEffect, useRef, useState } from 'react'
import {
  DUPLICATE_REFUND,
  GACHA_COST,
  rollPrize,
  type Accessory,
  type Prize,
  type SkinId,
} from '../data/wardrobe'

const STORAGE_KEY = 'gon-pet'
/** Earlier versions stored only hat progress under this key; it is migrated once. */
const LEGACY_KEY = 'gon-accessories'
const POKES_FOR_BANDAID = 15
const FEEDS_FOR_CHEF = 5
const NIGHT_CHECK_DELAY_MS = 2500 // let the greeting show first

export interface PetState {
  coins: number
  best: number
  pokes: number
  feeds: number
  skins: SkinId[]
  accessories: Accessory[]
  skin: SkinId
  accessory: Accessory | null
}

export interface PullResult {
  prize: Prize
  duplicate: boolean
}

const DEFAULT: PetState = {
  coins: 0,
  best: 0,
  pokes: 0,
  feeds: 0,
  skins: ['mint'],
  accessories: [],
  skin: 'mint',
  accessory: null,
}

function load(): PetState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_KEY) ?? '{}'
    const p = JSON.parse(raw) as Partial<PetState> & { unlocked?: Accessory[]; equipped?: Accessory | null }
    const accessories = p.accessories ?? p.unlocked ?? []
    const skins = Array.isArray(p.skins) && p.skins.length ? p.skins : DEFAULT.skins
    const accessory = p.accessory !== undefined ? p.accessory : (p.equipped ?? null)
    const skin = p.skin && skins.includes(p.skin) ? p.skin : 'mint'
    return {
      coins: Math.max(0, Number(p.coins) || 0),
      best: Math.max(0, Number(p.best) || 0),
      pokes: Number(p.pokes) || 0,
      feeds: Number(p.feeds) || 0,
      skins,
      accessories: Array.isArray(accessories) ? accessories : [],
      skin,
      accessory: accessory && accessories.includes(accessory) ? accessory : null,
    }
  } catch {
    return { ...DEFAULT }
  }
}

function save(p: PetState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
  } catch {
    // Storage unavailable: progress lasts for this visit only.
  }
}

const isNightHour = (h: number) => h >= 23 || h < 5

/**
 * Gon's persistent pet state: Paw Coin wallet, runner high score, unlocked and
 * equipped skins and accessories, and the stats that unlock achievement hats.
 */
export function usePetStore(onAchievement: (a: Accessory) => void) {
  const [state, setState] = useState(load)
  const ref = useRef(state)
  const onAchievementRef = useRef(onAchievement)
  onAchievementRef.current = onAchievement

  const commit = useCallback((next: PetState) => {
    ref.current = next
    setState(next)
    save(next)
  }, [])

  const unlockAchievements = useCallback(
    (base: PetState, earned: Accessory[]) => {
      const fresh = earned.filter((a) => !base.accessories.includes(a))
      commit(fresh.length ? { ...base, accessories: [...base.accessories, ...fresh], accessory: fresh[fresh.length - 1] } : base)
      fresh.forEach((a) => onAchievementRef.current(a))
    },
    [commit],
  )

  const record = useCallback(
    (stat: 'pokes' | 'feeds') => {
      const next = { ...ref.current, [stat]: ref.current[stat] + 1 }
      const earned: Accessory[] = []
      if (next.pokes >= POKES_FOR_BANDAID) earned.push('bandaid')
      if (next.feeds >= FEEDS_FOR_CHEF) earned.push('chef')
      unlockAchievements(next, earned)
    },
    [unlockAchievements],
  )

  const checkNight = useCallback(() => {
    if (isNightHour(new Date().getHours())) unlockAchievements(ref.current, ['nightcap'])
  }, [unlockAchievements])

  const addCoins = useCallback((n: number) => commit({ ...ref.current, coins: ref.current.coins + n }), [commit])

  /** Save a runner score; returns true when it is a new record. */
  const submitScore = useCallback(
    (score: number) => {
      if (score <= ref.current.best) return false
      commit({ ...ref.current, best: score })
      return true
    },
    [commit],
  )

  /** Spend GACHA_COST coins on one capsule. Duplicates refund DUPLICATE_REFUND. */
  const pull = useCallback((): PullResult | null => {
    const cur = ref.current
    if (cur.coins < GACHA_COST) return null
    const prize = rollPrize()
    const owned = prize.kind === 'skin' ? cur.skins.includes(prize.id) : cur.accessories.includes(prize.id)
    const coins = cur.coins - GACHA_COST + (owned ? DUPLICATE_REFUND : 0)
    if (owned) commit({ ...cur, coins })
    else if (prize.kind === 'skin') commit({ ...cur, coins, skins: [...cur.skins, prize.id] })
    else commit({ ...cur, coins, accessories: [...cur.accessories, prize.id] })
    return { prize, duplicate: owned }
  }, [commit])

  const equipSkin = useCallback(
    (skin: SkinId) => {
      if (ref.current.skins.includes(skin)) commit({ ...ref.current, skin })
    },
    [commit],
  )

  const equipAccessory = useCallback(
    (accessory: Accessory | null) => {
      if (accessory === null || ref.current.accessories.includes(accessory)) commit({ ...ref.current, accessory })
    },
    [commit],
  )

  useEffect(() => {
    const t = window.setTimeout(checkNight, NIGHT_CHECK_DELAY_MS)
    return () => window.clearTimeout(t)
  }, [checkNight])

  return { ...state, record, checkNight, addCoins, submitScore, pull, equipSkin, equipAccessory }
}
