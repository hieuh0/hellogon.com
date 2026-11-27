import { useCallback, useEffect, useState } from 'react'

export type Weather = 'sunny' | 'rainy' | 'snowy' | 'night'
export const WEATHERS: Weather[] = ['sunny', 'rainy', 'snowy', 'night']
export const WEATHER_LABEL: Record<Weather, { name: string; emoji: string }> = {
  sunny: { name: 'Nắng đẹp', emoji: '☀️' },
  rainy: { name: 'Mưa rào', emoji: '🌧️' },
  snowy: { name: 'Tuyết rơi', emoji: '❄️' },
  night: { name: 'Đêm sao', emoji: '🌙' },
}

const STORAGE_KEY = 'gon-weather'

/** Weather for Gôn's world. Starry night is the dark theme; the class is first set by index.html. */
export function useWeather() {
  const [weather, setWeather] = useState<Weather>(() => {
    const saved = (() => {
      try {
        return localStorage.getItem(STORAGE_KEY)
      } catch {
        return null
      }
    })()
    if (saved && (WEATHERS as string[]).includes(saved)) return saved as Weather
    return document.documentElement.classList.contains('dark') ? 'night' : 'sunny'
  })

  useEffect(() => {
    const dark = weather === 'night'
    document.documentElement.classList.toggle('dark', dark)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#231F3A' : '#FFF9F0')
  }, [weather])

  /** Move to the next weather and return it. */
  const cycle = useCallback(() => {
    const next = WEATHERS[(WEATHERS.indexOf(weather) + 1) % WEATHERS.length]
    setWeather(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Storage unavailable: the weather still changes for this visit.
    }
    return next
  }, [weather])

  return { weather, cycle }
}
