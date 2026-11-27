/**
 * Tiny Web Audio engine: every sound is generated, no audio files.
 *
 * Two independent buses share one AudioContext:
 * - sound effects (muted by default, toggled from the dock),
 * - ambience for the Góc Chill widget (rain noise and a procedural lo-fi beat),
 *   with its own volume.
 * The AudioContext is created on the first enable, which always happens inside a user gesture.
 */
export type SoundName = 'pop' | 'bloop' | 'boing' | 'coin'

let ctx: AudioContext | null = null
let sfxBus: GainNode | null = null
let ambBus: GainNode | null = null
let sfxEnabled = false
const lastPlayed: Partial<Record<SoundName, number>> = {}
const MIN_GAP_MS = 60

function ensureContext(): AudioContext | null {
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
    sfxBus = ctx.createGain()
    sfxBus.gain.value = 0.22
    sfxBus.connect(ctx.destination)
    ambBus = ctx.createGain()
    ambBus.gain.value = ambVolume
    ambBus.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

/* ---------- Sound effects ---------- */

export function setSoundEnabled(on: boolean) {
  sfxEnabled = on
  if (on) ensureContext()
}

function envelope(c: AudioContext, out: AudioNode, start: number, peak: number, attack: number, release: number) {
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, start)
  g.gain.exponentialRampToValueAtTime(peak, start + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, start + attack + release)
  g.connect(out)
  return g
}

function sweep(c: AudioContext, t: number, type: OscillatorType, from: number, to: number, dur: number, peak: number, out: AudioNode) {
  const osc = c.createOscillator()
  osc.type = type
  osc.frequency.setValueAtTime(from, t)
  osc.frequency.exponentialRampToValueAtTime(to, t + dur * 0.8)
  osc.connect(envelope(c, out, t, peak, 0.005, dur))
  osc.start(t)
  osc.stop(t + dur + 0.05)
}

function boing(c: AudioContext, t: number, out: AudioNode) {
  const osc = c.createOscillator()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(160, t)
  osc.frequency.exponentialRampToValueAtTime(420, t + 0.28)
  // Vibrato that fades out gives the springy "wobble".
  const lfo = c.createOscillator()
  lfo.frequency.value = 22
  const depth = c.createGain()
  depth.gain.setValueAtTime(60, t)
  depth.gain.exponentialRampToValueAtTime(1, t + 0.4)
  lfo.connect(depth).connect(osc.frequency)
  osc.connect(envelope(c, out, t, 0.55, 0.008, 0.42))
  osc.start(t)
  lfo.start(t)
  osc.stop(t + 0.46)
  lfo.stop(t + 0.46)
}

const voices: Record<SoundName, (c: AudioContext, t: number, out: AudioNode) => void> = {
  pop: (c, t, out) => sweep(c, t, 'sine', 880, 220, 0.09, 0.7, out),
  bloop: (c, t, out) => {
    sweep(c, t, 'sine', 240, 720, 0.12, 0.6, out)
    sweep(c, t + 0.1, 'sine', 720, 480, 0.14, 0.4, out)
  },
  boing,
  coin: (c, t, out) => {
    sweep(c, t, 'square', 988, 988, 0.06, 0.18, out)
    sweep(c, t + 0.06, 'square', 1319, 1319, 0.16, 0.18, out)
  },
}

export function play(name: SoundName) {
  if (!sfxEnabled) return
  const now = performance.now()
  if (now - (lastPlayed[name] ?? 0) < MIN_GAP_MS) return
  lastPlayed[name] = now
  const c = ensureContext()
  if (!c || !sfxBus) return
  voices[name](c, c.currentTime + 0.005, sfxBus)
}

/** C major pentatonic (C D E G A), octave 4. */
const PENTATONIC = [261.63, 293.66, 329.63, 392.0, 440.0]

/** Play a soft plucked note; `step` walks up the pentatonic scale across octaves. */
export function playNote(step: number) {
  if (!sfxEnabled) return
  const c = ensureContext()
  if (!c || !sfxBus) return
  const freq = PENTATONIC[step % 5] * 2 ** Math.floor(step / 5)
  const t = c.currentTime + 0.005
  const out = envelope(c, sfxBus, t, 0.4, 0.006, 0.65)
  const body = c.createOscillator()
  body.type = 'triangle'
  body.frequency.value = freq
  const shimmer = c.createOscillator()
  shimmer.type = 'sine'
  shimmer.frequency.value = freq * 2
  const shimmerGain = c.createGain()
  shimmerGain.gain.value = 0.25
  body.connect(out)
  shimmer.connect(shimmerGain).connect(out)
  body.start(t)
  shimmer.start(t)
  body.stop(t + 0.75)
  shimmer.stop(t + 0.75)
}

/* ---------- Ambience: rain noise ---------- */

let ambVolume = 0.6
let rain: { src: AudioBufferSourceNode; gain: GainNode } | null = null

function noiseBuffer(c: AudioContext, seconds: number, color: 'white' | 'brown') {
  const buf = c.createBuffer(2, Math.floor(c.sampleRate * seconds), c.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch)
    let last = 0
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1
      if (color === 'white') data[i] = white
      else {
        last = (last + 0.02 * white) / 1.02
        data[i] = last * 3.5
      }
    }
  }
  return buf
}

function fade(g: GainNode, to: number, seconds: number) {
  const c = g.context
  g.gain.cancelScheduledValues(c.currentTime)
  g.gain.setValueAtTime(g.gain.value, c.currentTime)
  g.gain.linearRampToValueAtTime(to, c.currentTime + seconds)
}

export function setAmbienceVolume(v: number) {
  ambVolume = v
  if (ambBus) fade(ambBus, v, 0.1)
}

/** Soft rain: brown noise for the body plus a quiet filtered hiss for the patter. */
export function setRainOn(on: boolean) {
  if (on === !!rain) return
  const c = ensureContext()
  if (!c || !ambBus) return
  if (on && !rain) {
    const gain = c.createGain()
    gain.gain.value = 0
    gain.connect(ambBus)
    const src = c.createBufferSource()
    src.buffer = noiseBuffer(c, 4, 'brown')
    src.loop = true
    const low = c.createBiquadFilter()
    low.type = 'lowpass'
    low.frequency.value = 1100
    src.connect(low).connect(gain)
    const hiss = c.createBufferSource()
    hiss.buffer = noiseBuffer(c, 3, 'white')
    hiss.loop = true
    const band = c.createBiquadFilter()
    band.type = 'bandpass'
    band.frequency.value = 3200
    band.Q.value = 0.6
    const hissGain = c.createGain()
    hissGain.gain.value = 0.05
    hiss.connect(band).connect(hissGain).connect(gain)
    src.start()
    hiss.start()
    hiss.onended = () => hissGain.disconnect()
    src.addEventListener('ended', () => hiss.stop())
    fade(gain, 0.9, 1.2)
    rain = { src, gain }
  } else if (!on && rain) {
    const { src, gain } = rain
    rain = null
    fade(gain, 0, 0.8)
    src.stop(c.currentTime + 0.85)
  }
}

/* ---------- Ambience: procedural lo-fi beat ---------- */

const BPM = 72
const BEAT = 60 / BPM
const EIGHTH = BEAT / 2
/** ii–V–I–vi in C, voiced like a mellow Rhodes (MIDI note numbers). */
const CHORDS = [
  [50, 53, 57, 60, 64], // Dm9
  [43, 53, 59, 62, 64], // G13
  [48, 52, 55, 59, 62], // Cmaj9
  [45, 48, 55, 59, 60], // Am9
]
const midi = (n: number) => 440 * 2 ** ((n - 69) / 12)

let lofi: {
  bus: GainNode
  crackle: AudioBufferSourceNode
  noise: AudioBuffer
  timer: number
  start: number
  next: number
  step: number
} | null = null

function rhodes(c: AudioContext, out: AudioNode, freq: number, t: number, len: number, vel: number) {
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vel, t + 0.015)
  g.gain.exponentialRampToValueAtTime(vel * 0.35, t + 0.5)
  g.gain.exponentialRampToValueAtTime(0.0001, t + len)
  g.connect(out)
  const body = c.createOscillator()
  body.type = 'sine'
  body.frequency.value = freq
  const bell = c.createOscillator()
  bell.type = 'sine'
  bell.frequency.value = freq * 2.01
  const bellGain = c.createGain()
  bellGain.gain.setValueAtTime(0.25, t)
  bellGain.gain.exponentialRampToValueAtTime(0.01, t + 0.3)
  body.connect(g)
  bell.connect(bellGain).connect(g)
  body.start(t)
  bell.start(t)
  body.stop(t + len + 0.05)
  bell.stop(t + len + 0.05)
}

function noiseHit(c: AudioContext, out: AudioNode, buf: AudioBuffer, t: number, type: BiquadFilterType, freq: number, dur: number, vel: number) {
  const src = c.createBufferSource()
  src.buffer = buf
  const f = c.createBiquadFilter()
  f.type = type
  f.frequency.value = freq
  src.connect(f).connect(envelope(c, out, t, vel, 0.003, dur))
  src.start(t, Math.random() * 1.5)
  src.stop(t + dur + 0.05)
}

function scheduleStep(c: AudioContext, out: AudioNode, noise: AudioBuffer, step: number, t: number) {
  const inBar = step % 8
  const bar = Math.floor(step / 8) % CHORDS.length
  const swing = inBar % 2 ? EIGHTH * 0.12 : 0
  const at = t + swing
  if (inBar === 0) {
    CHORDS[bar].forEach((n, i) => rhodes(c, out, midi(n + 12), at + i * 0.012, BEAT * 3.6, 0.09))
    rhodes(c, out, midi(CHORDS[bar][0]), at, BEAT * 1.8, 0.16)
  }
  if (inBar === 5) CHORDS[bar].slice(2).forEach((n) => rhodes(c, out, midi(n + 12), at, BEAT * 1.4, 0.045))
  if (inBar === 4) rhodes(c, out, midi(CHORDS[bar][0]), at, BEAT * 1.6, 0.12)
  // Kick on 1 and 3 (plus a lazy pickup), snare on 2 and 4, soft hats on the eighths.
  if (inBar === 0 || inBar === 4 || (inBar === 7 && bar % 2)) {
    const osc = c.createOscillator()
    osc.frequency.setValueAtTime(110, at)
    osc.frequency.exponentialRampToValueAtTime(42, at + 0.12)
    osc.connect(envelope(c, out, at, 0.7, 0.004, 0.28))
    osc.start(at)
    osc.stop(at + 0.35)
  }
  if (inBar === 2 || inBar === 6) noiseHit(c, out, noise, at, 'bandpass', 1700, 0.16, 0.22)
  noiseHit(c, out, noise, at, 'highpass', 7000, 0.035, inBar % 2 ? 0.03 : 0.05)
}

export function setLofiOn(on: boolean) {
  if (on === !!lofi) return
  const c = ensureContext()
  if (!c || !ambBus) return
  if (on && !lofi) {
    const bus = c.createGain()
    bus.gain.value = 0
    const warm = c.createBiquadFilter()
    warm.type = 'lowpass'
    warm.frequency.value = 2000
    warm.Q.value = 0.4
    bus.connect(warm).connect(ambBus)
    // Vinyl crackle: sparse clicks over a faint hiss, looped.
    const crackleBuf = c.createBuffer(1, c.sampleRate * 3, c.sampleRate)
    const d = crackleBuf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() < 0.0006 ? (Math.random() * 2 - 1) * 0.7 : 0) + (Math.random() * 2 - 1) * 0.004
    const crackle = c.createBufferSource()
    crackle.buffer = crackleBuf
    crackle.loop = true
    const crackleGain = c.createGain()
    crackleGain.gain.value = 0.35
    crackle.connect(crackleGain).connect(bus)
    crackle.start()
    const noise = noiseBuffer(c, 2, 'white')
    const start = c.currentTime + 0.1
    lofi = { bus, crackle, noise, timer: 0, start, next: start, step: 0 }
    const state = lofi
    const tick = () => {
      while (state.next < c.currentTime + 0.25) {
        scheduleStep(c, bus, noise, state.step, state.next)
        state.step++
        state.next += EIGHTH
      }
    }
    tick()
    state.timer = window.setInterval(tick, 60)
    fade(bus, 0.9, 1)
  } else if (!on && lofi) {
    const { bus, crackle, timer } = lofi
    lofi = null
    window.clearInterval(timer)
    fade(bus, 0, 0.6)
    crackle.stop(c.currentTime + 0.65)
    window.setTimeout(() => bus.disconnect(), 1500)
  }
}

/** Position within the current beat (0..1), synced to the lo-fi loop when it plays. */
export function beatPhase() {
  if (lofi && ctx) return (((ctx.currentTime - lofi.start) / BEAT) % 1 + 1) % 1
  return (performance.now() / 1000 / BEAT) % 1
}

/** A gentle three-note chime on the ambience bus (plays even when sound effects are muted). */
export function playChime() {
  const c = ensureContext()
  if (!c || !ambBus) return
  const t = c.currentTime + 0.02
  ;[72, 76, 79].forEach((n, i) => rhodes(c, ambBus!, midi(n), t + i * 0.16, 1.4, 0.25))
}
