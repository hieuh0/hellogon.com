import { useCallback, useEffect, useRef, useState } from 'react'
import { BallToy } from './components/BallToy'
import { CommandPalette, type CommandId } from './components/CommandPalette'
import { Confetti } from './components/Confetti'
import { DinoRunnerGame } from './components/DinoRunnerGame'
import { ExperimentsDrawer } from './components/ExperimentsDrawer'
import { FloatingDock, type Panel } from './components/FloatingDock'
import { GachaModal } from './components/GachaModal'
import { GonMascot, type Gear, type GonHandle } from './components/GonMascot'
import { LofiWidget } from './components/LofiWidget'
import { MiniGons } from './components/MiniGons'
import { SnackTray, type Snack } from './components/SnackTray'
import { SpeechBubble } from './components/SpeechBubble'
import { StageHill } from './components/StageHill'
import { WeatherLayer } from './components/WeatherLayer'
import { lines, pick } from './data/lines'
import { ACCESSORY_BY_ID, SKIN_BY_ID, type Accessory } from './data/wardrobe'
import { useGonBrain, type Mood } from './hooks/useGonBrain'
import { usePetStore, type PullResult } from './hooks/usePetStore'
import { useReducedMotion } from './hooks/useReducedMotion'
import { useWeather, WEATHER_LABEL } from './hooks/useWeather'
import { play, playChime, playNote, setSoundEnabled } from './lib/audioEngine'
import { randomPastel } from './lib/pastel'
import { computeHill, createWorld, gonSize } from './lib/world'

const HOME_TITLE = 'Gôn nè! 🦖'
const AWAY_TITLE = 'Ơ, cậu đi đâu rồi? 👀'
const MOOD_COLOR = { annoyed: '#FF9B8F', spicy: '#FF6B5E' }
const IGNORED_KEYS = new Set(['Tab', 'Escape', 'Shift', 'Control', 'Alt', 'Meta', 'CapsLock'])
/** Keyboard rows bottom-to-top, so higher rows play higher notes. */
const LETTER_ORDER = 'zxcvbnmasdfghjklqwertyuiop'
const ACCENT_FLASH_MS = 900
/** Small Paw Coin bonuses for caring for Gôn (with a cooldown so petting cannot be farmed). */
const PAT_BONUS = 1
const PAT_BONUS_COOLDOWN_MS = 8000
const FEED_BONUS = 2
const FOCUS_BONUS = 15
/** Runner rewards: 1 coin per 10 points, plus every coin picked up. */
const POINTS_PER_COIN = 10

const moodLabel: Record<Mood, string> = {
  idle: 'Bình yên 🌿',
  happy: 'Vui xỉu 😊',
  annoyed: 'Dỗi rồi 😤',
  sleepy: 'Buồn ngủ 😴',
  dizzy: 'Chóng mặt 😵',
  spicy: 'Cay xè 🔥',
}
/** Gôn's feet sit this far down his square wrapper (FLOOR_Y 66 in a -100..100 viewBox). */
const FEET = 0.83
const BUBBLE_H = 80

type GamePhase = 'off' | 'playing' | 'over'

export default function App() {
  const { weather, cycle: cycleWeather } = useWeather()
  const reducedMotion = useReducedMotion()

  const [party, setParty] = useState(false)
  const [zeroG, setZeroG] = useState(false)
  const [cloneKey, setCloneKey] = useState<number | null>(null)
  const [cloneOrigin, setCloneOrigin] = useState({ x: 0, y: 0 })
  const [ballKey, setBallKey] = useState<number | null>(null)
  const [game, setGame] = useState<GamePhase>('off')
  const gameRef = useRef<GamePhase>('off')
  gameRef.current = game
  const [chillOpen, setChillOpen] = useState(false)
  const [focus, setFocus] = useState(false)
  const [world] = useState(createWorld)
  const [view, setView] = useState({ w: window.innerWidth, h: window.innerHeight })
  const hill = computeHill(view.w, view.h)
  world.hill = hill
  const spicyTimer = useRef<number | undefined>(undefined)
  const lastPatBonus = useRef(0)

  const baseMood: Mood = party ? 'happy' : weather === 'night' ? 'sleepy' : 'idle'
  const { mood, mouth, speech, say, emote, markActive, poke } = useGonBrain(baseMood)

  const gonRef = useRef<GonHandle>(null)
  const [panel, setPanel] = useState<Panel>(null)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const paletteOpenRef = useRef(false)
  paletteOpenRef.current = paletteOpen
  const [soundOn, setSoundOn] = useState(false)
  const [accent, setAccent] = useState<string | null>(null)
  const accentTimer = useRef<number | undefined>(undefined)

  const closePanel = useCallback(() => setPanel(null), [])
  const closePalette = useCallback(() => setPaletteOpen(false), [])

  /** Show an accent color; without `holdMs` it stays until replaced or reset. */
  const flashAccent = useCallback((color: string | null, holdMs?: number) => {
    window.clearTimeout(accentTimer.current)
    setAccent(color)
    if (holdMs) accentTimer.current = window.setTimeout(() => setAccent(null), holdMs)
  }, [])

  const onAchievement = useCallback(
    (a: Accessory) => {
      say(`Mở khoá phụ kiện: ${ACCESSORY_BY_ID[a].name}!`, 3200)
      emote('happy', 1800)
      play('bloop')
    },
    [say, emote],
  )
  const pet = usePetStore(onAchievement)
  const { record, checkNight, addCoins, submitScore } = pet

  // Any pointer activity resets the idle timer.
  useEffect(() => {
    const opts = { passive: true } as const
    window.addEventListener('pointermove', markActive, opts)
    window.addEventListener('pointerdown', markActive, opts)
    window.addEventListener('wheel', markActive, opts)
    return () => {
      window.removeEventListener('pointermove', markActive)
      window.removeEventListener('pointerdown', markActive)
      window.removeEventListener('wheel', markActive)
    }
  }, [markActive])

  // Keyboard: Cmd/Ctrl+K or "/" opens the palette, letters play notes, any key makes Gôn hop.
  // While the runner is on, its own controls own the keyboard.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      markActive()
      if (gameRef.current !== 'off') return
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((open) => !open)
        return
      }
      if (e.key === 'Escape') {
        if (paletteOpenRef.current) setPaletteOpen(false)
        else setPanel(null)
        return
      }
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey || IGNORED_KEYS.has(e.key)) return
      const target = e.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
      if (e.key === '/') {
        e.preventDefault()
        setPaletteOpen(true)
        return
      }
      if (paletteOpenRef.current) return

      gonRef.current?.hop()
      const letter = LETTER_ORDER.indexOf(e.key.toLowerCase())
      if (letter >= 0) playNote(letter % 10)
      else play('boing')
      flashAccent(randomPastel(), ACCENT_FLASH_MS)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [markActive, flashAccent])

  useEffect(() => () => window.clearTimeout(accentTimer.current), [])
  useEffect(() => () => window.clearTimeout(spicyTimer.current), [])

  useEffect(() => {
    const onResize = () => setView({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Tab-switch easter egg.
  useEffect(() => {
    document.title = HOME_TITLE
    const onVisibility = () => {
      if (document.hidden) {
        document.title = AWAY_TITLE
        return
      }
      document.title = HOME_TITLE
      emote('happy', 1400)
      say(pick(lines.welcomeBack), 2600)
      checkNight()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [emote, say, checkNight])

  /* ----- Gôn interactions ----- */

  const handlePoke = useCallback(() => {
    const result = poke()
    play(result === 'tickle' ? 'boing' : 'pop')
    record('pokes')
  }, [poke, record])

  const handleDragStart = useCallback(() => say(pick(lines.drag), 2000), [say])

  const handleThrow = useCallback(() => {
    say(pick(lines.throw), 1600)
    play('boing')
  }, [say])

  const handleDizzy = useCallback(() => {
    emote('dizzy', 2600)
    say(pick(lines.dizzy), 2600)
    play('boing')
  }, [emote, say])

  const handlePop = useCallback(() => {
    say(pick(lines.pop), 2400)
    play('pop')
  }, [say])

  const handlePat = useCallback(() => {
    play('bloop')
    const now = performance.now()
    if (now - lastPatBonus.current > PAT_BONUS_COOLDOWN_MS) {
      lastPatBonus.current = now
      addCoins(PAT_BONUS)
      say(`${pick(lines.pat)} (+${PAT_BONUS} 🐾)`, 2400)
    } else say(pick(lines.pat), 2400)
  }, [say, addCoins])

  const handleBoop = useCallback(() => {
    play('boing')
    if (Math.random() < 0.3) say(pick(lines.boop), 1200)
  }, [say])

  // In zero-g every wall bounce switches color, like the classic DVD logo.
  const handleWallHit = useCallback(() => {
    play('pop')
    if (zeroG) flashAccent(randomPastel())
  }, [zeroG, flashAccent])

  /* ----- Secret commands ----- */

  const runCommand = useCallback(
    (id: CommandId) => {
      play('bloop')
      if (id === 'party') {
        setParty(true)
        say(pick(lines.party), 2600)
      } else if (id === 'zero-g') {
        setZeroG(true)
        say(pick(lines.zeroG), 2600)
      } else if (id === 'clone') {
        const center = gonRef.current?.getCenter() ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 }
        setCloneOrigin(center)
        setCloneKey(Date.now())
        say(pick(lines.clone), 2600)
      } else {
        setParty(false)
        setZeroG(false)
        setCloneKey(null)
        flashAccent(null)
        say(pick(lines.reset), 2400)
      }
    },
    [say, flashAccent],
  )

  /* ----- Weather ----- */

  const changeWeather = useCallback(() => {
    const next = cycleWeather()
    say(pick(lines.weather[next]), 2800)
    play('pop')
  }, [cycleWeather, say])

  /* ----- Dino Runner ----- */

  const startGame = useCallback(() => {
    setPanel(null)
    setBallKey(null)
    setZeroG(false)
    setGame('playing')
    play('bloop')
  }, [])

  const exitGame = useCallback(() => {
    setGame('off')
    say(pick(lines.gameExit), 2600)
    play('pop')
  }, [say])

  const handleCrash = useCallback(
    (score: number, collected: number) => {
      const earned = Math.floor(score / POINTS_PER_COIN) + collected
      addCoins(earned)
      const isRecord = submitScore(score)
      setGame('over')
      play('boing')
      return { earned, record: isRecord }
    },
    [addCoins, submitScore],
  )

  const handleRestart = useCallback(() => setGame('playing'), [])
  const handleJump = useCallback(() => play('pop'), [])
  const handleCoin = useCallback(() => play('coin'), [])

  /* ----- Gacha ----- */

  const handleReveal = useCallback(
    (r: PullResult) => {
      play(r.duplicate ? 'pop' : 'coin')
      emote('happy', 2000)
      const name = r.prize.kind === 'skin' ? SKIN_BY_ID[r.prize.id].name : ACCESSORY_BY_ID[r.prize.id].name
      say(r.duplicate ? pick(lines.gachaDuplicate) : `${pick(lines.gachaNew)} ${name}!`, 2800)
    },
    [emote, say],
  )
  const handleBroke = useCallback(() => say(pick(lines.gachaBroke), 2600), [say])

  /* ----- Focus mode ----- */

  const handleFocusStart = useCallback(() => {
    say(pick(lines.focusStart), 2600)
    play('bloop')
  }, [say])

  const handleFocusComplete = useCallback(
    (minutes: number) => {
      addCoins(FOCUS_BONUS)
      emote('happy', 3000)
      say(`${pick(lines.focusDone)} ${minutes} phút giỏi quá! +${FOCUS_BONUS} 🐾`, 4200)
      playChime()
    },
    [addCoins, emote, say],
  )

  /* ----- Dock actions ----- */

  const openExperiments = useCallback(() => {
    setPanel((p) => (p === 'experiments' ? null : 'experiments'))
    say(pick(lines.experiments), 2600)
    play('pop')
  }, [say])

  const toggleSnacks = useCallback(() => {
    setPanel((p) => (p === 'snacks' ? null : 'snacks'))
    if (panel !== 'snacks') say(pick(lines.snacks), 2400)
    play('pop')
  }, [panel, say])

  const openGacha = useCallback(() => {
    setPanel((p) => (p === 'gacha' ? null : 'gacha'))
    if (panel !== 'gacha') say(pick(lines.gacha), 2400)
    play('pop')
  }, [panel, say])

  const toggleChill = useCallback(() => {
    setChillOpen((o) => !o)
    play('pop')
  }, [])

  const getMouth = useCallback(() => gonRef.current?.mouthPoint() ?? { x: 0, y: 0 }, [])

  const handleEat = useCallback(
    (snack: Snack) => {
      gonRef.current?.chomp(snack.crumb)
      play('pop')
      record('feeds')
      addCoins(FEED_BONUS)
      window.clearTimeout(spicyTimer.current)
      if (snack.id === 'chili') {
        spicyTimer.current = window.setTimeout(() => {
          emote('spicy', 3200)
          say(pick(lines.spicy), 3000)
          play('boing')
        }, 650)
      } else {
        emote('happy', 2200)
        say(`${pick(lines.fed)} (+${FEED_BONUS} 🐾)`, 2600)
      }
    },
    [emote, say, record, addCoins],
  )

  const handleSnackMiss = useCallback(() => say(pick(lines.snackMiss), 2000), [say])

  const toggleBall = useCallback(() => {
    say(pick(ballKey === null ? lines.ballOn : lines.ballOff), 2400)
    setBallKey(ballKey === null ? Date.now() : null)
    play('bloop')
  }, [ballKey, say])

  const toggleSound = useCallback(() => {
    const next = !soundOn
    setSoundOn(next)
    setSoundEnabled(next)
    say(pick(next ? lines.soundOn : lines.soundOff), 2400)
    play('bloop')
  }, [soundOn, say])

  const sayHi = useCallback(() => {
    setPanel((p) => (p === 'hi' ? null : 'hi'))
    emote('happy', 1800)
    say(pick(lines.sayHi), 2800)
    play('bloop')
  }, [emote, say])

  /* ----- Render ----- */

  const playing = game !== 'off'
  const skin = SKIN_BY_ID[pet.skin]
  const color = accent ?? (mood === 'spicy' ? MOOD_COLOR.spicy : mood === 'annoyed' ? MOOD_COLOR.annoyed : skin.fill)
  const size = gonSize(view.w, view.h, playing)
  const gonX = playing ? Math.max(size * 0.8, view.w * 0.18) : view.w / 2
  const gear: Gear = {
    umbrella: weather === 'rainy' && !playing,
    scarf: weather === 'snowy',
    breath: weather === 'snowy' && !playing,
    headphones: focus && !playing,
  }
  const weatherInfo = WEATHER_LABEL[weather]
  const stageEase = 'cubic-bezier(0.3, 1.15, 0.5, 1)'

  return (
    <main className="relative isolate h-dvh w-full overflow-hidden select-none">
      <WeatherLayer weather={weather} reducedMotion={reducedMotion} onCycle={changeWeather} />
      <StageHill hill={hill} width={view.w} height={view.h} hidden={playing} />
      {party && <div aria-hidden className="party-pulse pointer-events-none absolute inset-0 -z-[4]" />}

      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-2 p-3 text-sm font-extrabold sm:p-5 sm:text-[15px]">
        <div className="flex items-center gap-2">
          <span key={pet.coins} className="pill coin-bump text-[var(--fg)]" aria-label={`Ví Paw Coin: ${pet.coins}`}>
            🐾 <span className="tabular-nums">{pet.coins}</span>
          </span>
          <span className="pill hidden md:inline-flex" aria-live="off">
            Gôn đang: <span className="text-[var(--fg)]">{moodLabel[mood]}</span>
          </span>
        </div>
        <button
          type="button"
          onClick={changeWeather}
          aria-label={`Thời tiết: ${weatherInfo.name}. Bấm để đổi`}
          className="pill candy-pill pointer-events-auto"
        >
          <span aria-hidden>{weatherInfo.emoji}</span>
          <span className="text-[var(--fg)]">{weatherInfo.name}</span>
        </button>
      </header>

      <section
        className={`pointer-events-none absolute inset-x-0 top-[max(4.5rem,9vh)] flex flex-col items-center px-6 text-center transition duration-500 ${
          playing ? '-translate-y-6 opacity-0' : ''
        }`}
      >
        <h1 className="text-4xl font-black tracking-tight sm:text-6xl">
          Xin chào, tui là <span className="title-gon">Gôn</span>!
        </h1>
        <p className="mt-2 max-w-lg text-[15px] font-bold text-[var(--muted)] sm:text-lg">
          Bé khủng long nhỏ giữ góc vườn chơi và mấy dự án lặt vặt.
        </p>
        <p className="mt-3 hidden text-sm font-extrabold text-[var(--muted)] sm:block">
          Xoa đầu · Giữ lâu · Kéo &amp; ném · Gõ phím · Bấm mây
        </p>
      </section>

      <div
        className="absolute flex -translate-x-1/2 flex-col items-center"
        style={{
          left: gonX,
          top: hill.crestY - size * FEET - BUBBLE_H,
          transition: `left 0.7s ${stageEase}, top 0.6s ${stageEase}`,
        }}
      >
        <div className={`relative z-10 transition-opacity duration-300 ${playing ? 'opacity-0' : ''}`}>
          <SpeechBubble speech={speech} />
        </div>
        <GonMascot
          ref={gonRef}
          mood={playing ? 'idle' : mood}
          mouth={playing ? null : mouth}
          color={color}
          blush={skin.blush}
          size={size}
          gear={gear}
          runner={game === 'playing' ? 'run' : game === 'over' ? 'ko' : 'off'}
          reducedMotion={reducedMotion}
          dancing={party && !playing}
          zeroG={zeroG}
          accessory={pet.accessory}
          world={world}
          onPoke={handlePoke}
          onDragStart={handleDragStart}
          onThrow={handleThrow}
          onDizzy={handleDizzy}
          onWallHit={handleWallHit}
          onPop={handlePop}
          onPat={handlePat}
          onBoop={handleBoop}
        />
      </div>

      {playing && (
        <DinoRunnerGame
          world={world}
          best={pet.best}
          reducedMotion={reducedMotion}
          onCrash={handleCrash}
          onRestart={handleRestart}
          onJump={handleJump}
          onCoin={handleCoin}
          onExit={exitGame}
        />
      )}
      {ballKey !== null && !playing && (
        <BallToy key={ballKey} world={world} spawnX={hill.cx + (ballKey % 2 ? -1 : 1) * Math.min(180, view.w * 0.3)} />
      )}
      {party && <Confetti reducedMotion={reducedMotion} />}
      {cloneKey !== null && <MiniGons key={cloneKey} origin={cloneOrigin} reducedMotion={reducedMotion} />}

      <FloatingDock
        panel={panel}
        soundOn={soundOn}
        ballOn={ballKey !== null}
        chillOpen={chillOpen}
        hidden={playing}
        onPlay={startGame}
        onSnacks={toggleSnacks}
        onToggleBall={toggleBall}
        onGacha={openGacha}
        onChill={toggleChill}
        onExperiments={openExperiments}
        onSayHi={sayHi}
        onToggleSound={toggleSound}
        onClosePanel={closePanel}
      >
        <SnackTray
          open={panel === 'snacks'}
          world={world}
          reducedMotion={reducedMotion}
          getMouth={getMouth}
          onEat={handleEat}
          onMiss={handleSnackMiss}
        />
      </FloatingDock>
      <LofiWidget
        open={chillOpen && !playing}
        onClose={toggleChill}
        onFocusChange={setFocus}
        onStart={handleFocusStart}
        onComplete={handleFocusComplete}
      />
      <GachaModal
        open={panel === 'gacha'}
        onClose={closePanel}
        reducedMotion={reducedMotion}
        coins={pet.coins}
        skins={pet.skins}
        accessories={pet.accessories}
        skin={pet.skin}
        accessory={pet.accessory}
        pull={pet.pull}
        equipSkin={pet.equipSkin}
        equipAccessory={pet.equipAccessory}
        onReveal={handleReveal}
        onBroke={handleBroke}
      />
      <ExperimentsDrawer open={panel === 'experiments'} onClose={closePanel} />
      {paletteOpen && (
        <CommandPalette
          active={{ party, 'zero-g': zeroG, clone: cloneKey !== null }}
          onRun={runCommand}
          onClose={closePalette}
        />
      )}
    </main>
  )
}
