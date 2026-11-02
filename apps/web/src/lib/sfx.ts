// Tiny WebAudio synth so the game has sound without shipping audio files.

let ctx: AudioContext | null = null
let muted = readMuted()

function readMuted() {
  try {
    return localStorage.getItem('sfx-muted') === '1'
  } catch {
    return false
  }
}

export function isMuted() {
  return muted
}

export function setMuted(value: boolean) {
  muted = value
  try {
    localStorage.setItem('sfx-muted', value ? '1' : '0')
  } catch {
    // Storage unavailable (private mode etc.); keep the in-memory value.
  }
}

function audio() {
  if (muted) return null
  ctx ??= new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function tone(freq: number, start: number, duration: number, type: OscillatorType = 'sine', gain = 0.15) {
  const a = audio()
  if (!a) return
  const t = a.currentTime + start
  const osc = a.createOscillator()
  const amp = a.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  amp.gain.setValueAtTime(gain, t)
  amp.gain.exponentialRampToValueAtTime(0.0001, t + duration)
  osc.connect(amp).connect(a.destination)
  osc.start(t)
  osc.stop(t + duration)
}

export const sfx = {
  hover: () => tone(880, 0, 0.05, 'square', 0.02),
  click: () => tone(520, 0, 0.08, 'triangle', 0.12),
  safe: () => {
    tone(523, 0, 0.12, 'triangle')
    tone(784, 0.09, 0.18, 'triangle')
  },
  turn: () => {
    tone(988, 0, 0.1, 'sine', 0.1)
    tone(1319, 0.08, 0.2, 'sine', 0.1)
  },
  error: () => tone(160, 0, 0.2, 'sawtooth', 0.08),
  boom: () => {
    const a = audio()
    if (!a) return
    const length = a.sampleRate * 1.2
    const buffer = a.createBuffer(1, length, a.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2
    const noise = a.createBufferSource()
    const filter = a.createBiquadFilter()
    const amp = a.createGain()
    noise.buffer = buffer
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(1800, a.currentTime)
    filter.frequency.exponentialRampToValueAtTime(80, a.currentTime + 1.1)
    amp.gain.value = 0.6
    noise.connect(filter).connect(amp).connect(a.destination)
    noise.start()
    tone(70, 0, 0.8, 'sine', 0.5)
  },
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.3, 'triangle', 0.12)),
}
