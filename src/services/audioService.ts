// ═══════════════════════════════════════════════════════
//  AETHER_SCOPE Audio Engine — Procedural sound design
//  Web Audio API + custom MP3 alert support
// ═══════════════════════════════════════════════════════

let ctx: AudioContext | null = null
let masterGain: GainNode | null = null
let ambientOsc: OscillatorNode | null = null
let ambientOsc2: OscillatorNode | null = null
let ambientGain: GainNode | null = null
let ambientLfo: OscillatorNode | null = null
let ambientRunning = false
let muted = false
let currentKp = 0
let customAlertBuffer: AudioBuffer | null = null
let customAlertPlaying = false

function getCtx(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext()
    masterGain = ctx.createGain()
    masterGain.gain.value = 0.4
    masterGain.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function getMaster(): GainNode {
  getCtx()
  return masterGain!
}

// ── Master controls ──

export function setMasterVolume(v: number) {
  const g = getMaster()
  g.gain.setTargetAtTime(Math.max(0, Math.min(1, v)), getCtx().currentTime, 0.05)
}

export function toggleMute(): boolean {
  muted = !muted
  const g = getMaster()
  g.gain.setTargetAtTime(muted ? 0 : 0.4, getCtx().currentTime, 0.05)
  return muted
}

export function isMuted(): boolean {
  return muted
}

// ── Ambient hum — low drone that runs continuously ──

export function startAmbient() {
  if (ambientRunning) return
  const ac = getCtx()
  const master = getMaster()

  // Deep sub-bass drone
  ambientOsc = ac.createOscillator()
  ambientGain = ac.createGain()
  ambientOsc.type = 'sine'
  ambientOsc.frequency.value = 48 // Deep C1-ish hum
  ambientGain.gain.value = 0.06

  // Add subtle wobble — LFO speed increases with Kp
  ambientLfo = ac.createOscillator()
  const lfoGain = ac.createGain()
  ambientLfo.type = 'sine'
  ambientLfo.frequency.value = 0.15 // Very slow wobble (increases with Kp)
  lfoGain.gain.value = 3 // ±3Hz frequency drift
  ambientLfo.connect(lfoGain)
  lfoGain.connect(ambientOsc.frequency)
  ambientLfo.start()

  // Second harmonic — adds body
  ambientOsc2 = ac.createOscillator()
  const gain2 = ac.createGain()
  ambientOsc2.type = 'sine'
  ambientOsc2.frequency.value = 96 // Octave above
  gain2.gain.value = 0.02
  ambientOsc2.connect(gain2)
  gain2.connect(master)
  ambientOsc2.start()

  ambientOsc.connect(ambientGain)
  ambientGain.connect(master)
  ambientOsc.start()

  ambientRunning = true
}

export function stopAmbient() {
  if (ambientOsc) {
    ambientOsc.stop()
    ambientOsc = null
  }
  ambientRunning = false
}

// ── Sweep tick — short click as the beam completes a rotation ──

export function playSweepTick() {
  const ac = getCtx()
  const master = getMaster()
  const now = ac.currentTime

  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = 'sine'
  osc.frequency.value = 1200
  gain.gain.setValueAtTime(0.08, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06)

  osc.connect(gain)
  gain.connect(master)
  osc.start(now)
  osc.stop(now + 0.07)
}

// ── Blip acquisition ping — when new blip appears ──

export function playBlipPing(type: 'NWTN' | 'LEVY' | 'CLOAK') {
  const ac = getCtx()
  const master = getMaster()
  const now = ac.currentTime

  const freqMap = { NWTN: 800, LEVY: 1400, CLOAK: 2200 }
  const volMap = { NWTN: 0.05, LEVY: 0.08, CLOAK: 0.1 }

  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = type === 'CLOAK' ? 'triangle' : 'sine'
  osc.frequency.setValueAtTime(freqMap[type], now)
  osc.frequency.exponentialRampToValueAtTime(freqMap[type] * 0.7, now + 0.15)

  gain.gain.setValueAtTime(volMap[type], now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2)

  osc.connect(gain)
  gain.connect(master)
  osc.start(now)
  osc.stop(now + 0.25)

  // LEVY and CLOAK get a second harmonic blip
  if (type !== 'NWTN') {
    const osc2 = ac.createOscillator()
    const gain2 = ac.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(freqMap[type] * 1.5, now + 0.05)
    osc2.frequency.exponentialRampToValueAtTime(freqMap[type], now + 0.2)
    gain2.gain.setValueAtTime(volMap[type] * 0.5, now + 0.05)
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.25)
    osc2.connect(gain2)
    gain2.connect(master)
    osc2.start(now + 0.05)
    osc2.stop(now + 0.3)
  }
}

// ── Alert tone — for warnings (geomagnetic storm, hazardous asteroid) ──

export function playAlert() {
  const ac = getCtx()
  const master = getMaster()
  const now = ac.currentTime

  // Two-tone rising alarm
  for (let i = 0; i < 2; i++) {
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.type = 'square'
    osc.frequency.value = i === 0 ? 600 : 900
    gain.gain.setValueAtTime(0.06, now + i * 0.15)
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.12)

    osc.connect(gain)
    gain.connect(master)
    osc.start(now + i * 0.15)
    osc.stop(now + i * 0.15 + 0.15)
  }
}

// ── Teleforce charge — rising tone while active ──

let teleforceOsc: OscillatorNode | null = null
let teleforceGain: GainNode | null = null

export function startTeleforceSound() {
  if (teleforceOsc) return
  const ac = getCtx()
  const master = getMaster()
  const now = ac.currentTime

  teleforceOsc = ac.createOscillator()
  teleforceGain = ac.createGain()
  teleforceOsc.type = 'sawtooth'
  teleforceOsc.frequency.setValueAtTime(80, now)
  teleforceOsc.frequency.linearRampToValueAtTime(400, now + 2)
  teleforceGain.gain.setValueAtTime(0, now)
  teleforceGain.gain.linearRampToValueAtTime(0.07, now + 0.5)

  // Filter to soften the sawtooth
  const filter = ac.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 800
  filter.Q.value = 2

  teleforceOsc.connect(filter)
  filter.connect(teleforceGain)
  teleforceGain.connect(master)
  teleforceOsc.start(now)
}

export function stopTeleforceSound() {
  if (!teleforceOsc || !teleforceGain) return
  const ac = getCtx()
  const now = ac.currentTime
  teleforceGain.gain.setTargetAtTime(0, now, 0.1)
  const osc = teleforceOsc
  setTimeout(() => { try { osc.stop() } catch {} }, 300)
  teleforceOsc = null
  teleforceGain = null
}

// ── Lock tone — short confirmation beep ──

export function playLockTone() {
  const ac = getCtx()
  const master = getMaster()
  const now = ac.currentTime

  // Rising two-note confirmation
  const notes = [660, 880]
  notes.forEach((freq, i) => {
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.1, now + i * 0.08)
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.1)
    osc.connect(gain)
    gain.connect(master)
    osc.start(now + i * 0.08)
    osc.stop(now + i * 0.08 + 0.12)
  })
}

// ── Mode switch tone ──

export function playModeSwitch() {
  const ac = getCtx()
  const master = getMaster()
  const now = ac.currentTime

  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(300, now)
  osc.frequency.linearRampToValueAtTime(600, now + 0.1)
  gain.gain.setValueAtTime(0.08, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)
  osc.connect(gain)
  gain.connect(master)
  osc.start(now)
  osc.stop(now + 0.2)
}

// ═══════════════════════════════════════════════════════
//  KP-REACTIVE AMBIENT — drone responds to geomagnetic
//  Kp 0-3: calm, low. Kp 4-5: tension. Kp 6+: storm.
// ═══════════════════════════════════════════════════════

export function updateKpAudio(kp: number) {
  currentKp = kp
  if (!ambientRunning || !ambientOsc || !ambientGain || !ctx) return
  const now = ctx.currentTime

  // Frequency shifts up with Kp (48Hz calm -> 72Hz storm)
  const baseFreq = 48 + kp * 3
  ambientOsc.frequency.setTargetAtTime(baseFreq, now, 2)

  // Volume increases with Kp
  const vol = 0.04 + kp * 0.008
  ambientGain.gain.setTargetAtTime(Math.min(0.15, vol), now, 1)

  // LFO speed increases with Kp (wobble gets faster = more unsettled)
  if (ambientLfo) {
    const lfoSpeed = 0.1 + kp * 0.06
    ambientLfo.frequency.setTargetAtTime(lfoSpeed, now, 1)
  }
}

// ═══════════════════════════════════════════════════════
//  CUSTOM MP3 ALERT — load user's MP3 for anomaly warnings
//  Stored as base64 in localStorage
// ═══════════════════════════════════════════════════════

export async function loadCustomAlert(file: File): Promise<boolean> {
  try {
    const ac = getCtx()
    const arrayBuffer = await file.arrayBuffer()
    customAlertBuffer = await ac.decodeAudioData(arrayBuffer)

    // Also store as base64 for persistence
    const reader = new FileReader()
    reader.onload = () => {
      if (reader.result) {
        localStorage.setItem('custom_alert_mp3', reader.result as string)
      }
    }
    reader.readAsDataURL(file)

    return true
  } catch {
    return false
  }
}

// Restore from localStorage on boot
export async function restoreCustomAlert() {
  const stored = localStorage.getItem('custom_alert_mp3')
  if (!stored) return
  try {
    const ac = getCtx()
    const response = await fetch(stored)
    const arrayBuffer = await response.arrayBuffer()
    customAlertBuffer = await ac.decodeAudioData(arrayBuffer)
  } catch {
    // Corrupt or missing — clear it
    localStorage.removeItem('custom_alert_mp3')
  }
}

export function hasCustomAlert(): boolean {
  return customAlertBuffer !== null || localStorage.getItem('custom_alert_mp3') !== null
}

export function clearCustomAlert() {
  customAlertBuffer = null
  localStorage.removeItem('custom_alert_mp3')
}

/**
 * Play the custom MP3 alert (for LEVY anomalies, etc.)
 * Returns true if playing, false if no custom alert loaded
 */
export function playCustomAlert(): boolean {
  if (!customAlertBuffer || customAlertPlaying || muted) return false
  const ac = getCtx()
  const master = getMaster()

  const source = ac.createBufferSource()
  const gain = ac.createGain()
  source.buffer = customAlertBuffer
  gain.gain.value = 0.5
  source.connect(gain)
  gain.connect(master)

  customAlertPlaying = true
  source.onended = () => { customAlertPlaying = false }
  source.start()
  return true
}

export function isCustomAlertPlaying(): boolean {
  return customAlertPlaying
}
