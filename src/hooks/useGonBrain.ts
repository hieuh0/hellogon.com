import { useCallback, useEffect, useRef, useState } from 'react'
import { greetingFor, lines, pick } from '../data/lines'

export type Mood = 'idle' | 'happy' | 'annoyed' | 'sleepy' | 'dizzy' | 'spicy'
export type Mouth = 'yawn' | null
export interface Speech {
  id: number
  text: string
}
export type PokeResult = 'hello' | 'tap' | 'tickle'

const IDLE_AFTER_MS = 15_000
const RAPID_CLICK_WINDOW_MS = 1_800
const ANNOYED_CLICKS = 5

/**
 * Gôn's mood, mouth and speech state. Temporary moods (happy, annoyed, dizzy, spicy)
 * override the base mood chosen by the caller (sleepy in dark mode, happy while partying).
 */
export function useGonBrain(baseMood: Mood) {
  const [tempMood, setTempMood] = useState<Mood | null>(null)
  const [mouth, setMouthState] = useState<Mouth>(null)
  const [speech, setSpeech] = useState<Speech | null>(null)
  const timers = useRef<{ mood?: number; mouth?: number; speech?: number }>({})
  const speechId = useRef(0)
  const lastActive = useRef(performance.now())
  const clicks = useRef<number[]>([])

  const say = useCallback((text: string, ms = 3600) => {
    window.clearTimeout(timers.current.speech)
    setSpeech({ id: ++speechId.current, text })
    timers.current.speech = window.setTimeout(() => setSpeech(null), ms)
  }, [])

  const emote = useCallback((mood: Mood, ms: number) => {
    window.clearTimeout(timers.current.mood)
    setTempMood(mood)
    timers.current.mood = window.setTimeout(() => setTempMood(null), ms)
  }, [])

  const setMouth = useCallback((next: Mouth, ms?: number) => {
    window.clearTimeout(timers.current.mouth)
    setMouthState(next)
    if (next && ms) timers.current.mouth = window.setTimeout(() => setMouthState(null), ms)
  }, [])

  const markActive = useCallback(() => {
    lastActive.current = performance.now()
  }, [])

  const poke = useCallback((): PokeResult => {
    const now = performance.now()
    clicks.current = clicks.current.filter((t) => now - t < RAPID_CLICK_WINDOW_MS)
    clicks.current.push(now)
    const count = clicks.current.length
    if (count >= ANNOYED_CLICKS) {
      clicks.current = []
      emote('annoyed', 3200)
      say(pick(lines.tickle), 2800)
      return 'tickle'
    }
    if (count === 1) {
      emote('happy', 1400)
      say(pick(lines.hello), 2600)
      return 'hello'
    }
    return 'tap'
  }, [emote, say])

  // Time-of-day greeting on load.
  useEffect(() => {
    const t = window.setTimeout(() => say(greetingFor(new Date().getHours()), 5200), 500)
    return () => window.clearTimeout(t)
  }, [say])

  // After 15s without interaction, Gôn yawns or drops a remark (then waits another 15s).
  useEffect(() => {
    const iv = window.setInterval(() => {
      if (document.hidden || performance.now() - lastActive.current < IDLE_AFTER_MS) return
      lastActive.current = performance.now()
      if (Math.random() < 0.45) {
        setMouth('yawn', 2400)
        say(pick(lines.yawn), 3000)
      } else {
        say(pick(lines.idle), 3800)
      }
    }, 1000)
    return () => window.clearInterval(iv)
  }, [say, setMouth])

  useEffect(() => {
    const t = timers.current
    return () => {
      window.clearTimeout(t.mood)
      window.clearTimeout(t.mouth)
      window.clearTimeout(t.speech)
    }
  }, [])

  const mood: Mood = tempMood ?? baseMood
  return { mood, mouth, speech, say, emote, setMouth, markActive, poke }
}
