// Text-to-Speech Service
// Supports: ElevenLabs (premium) and Browser-native (free fallback)
// Mode stored in localStorage as 'tts_mode': 'elevenlabs' | 'browser'

// ═══════════════════════════════════════════════
//  ELEVENLABS — Pre-made voices (male UK/Celtic)
// ═══════════════════════════════════════════════
export const TTS_VOICES = [
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', accent: 'British (deep, authoritative)' },
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', accent: 'British (warm, narrative)' },
  { id: 'N2lVS1w4EtoT3dr4eOWO', name: 'Callum', accent: 'Scottish (hoarse, intense)' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', accent: 'Irish (young, bright)' },
  { id: 'bIHbv24MWmeRgasZH58o', name: 'Will', accent: 'British (friendly, young)' },
  { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie', accent: 'British (natural, casual)' },
] as const

export type TTSVoice = typeof TTS_VOICES[number]
export type TTSMode = 'elevenlabs' | 'browser'

const DEFAULT_VOICE = TTS_VOICES[0].id // Daniel

// ═══════════════════════════════════════════════
//  STATE — persisted in localStorage
// ═══════════════════════════════════════════════
export function getTTSMode(): TTSMode {
  const mode = localStorage.getItem('tts_mode')
  return mode === 'elevenlabs' ? 'elevenlabs' : 'browser'
}

export function setTTSMode(mode: TTSMode) {
  localStorage.setItem('tts_mode', mode)
}

export function isTTSEnabled(): boolean {
  return localStorage.getItem('tts_enabled') === 'true'
}

export function setTTSEnabled(enabled: boolean) {
  localStorage.setItem('tts_enabled', enabled ? 'true' : 'false')
}

export function getTTSVoiceName(): string {
  const mode = getTTSMode()
  if (mode === 'browser') {
    const name = localStorage.getItem('browser_voice') || ''
    return name ? name.split(' ')[0] : 'Browser'
  }
  const voiceId = localStorage.getItem('tts_voice') || DEFAULT_VOICE
  const voice = TTS_VOICES.find(v => v.id === voiceId)
  return voice?.name || 'Daniel'
}

// ═══════════════════════════════════════════════
//  AUDIO QUEUE — sequential playback
// ═══════════════════════════════════════════════
let audioQueue: HTMLAudioElement[] = []
let isPlaying = false
let currentAudio: HTMLAudioElement | null = null

function playNext() {
  if (audioQueue.length === 0) {
    isPlaying = false
    currentAudio = null
    return
  }
  isPlaying = true
  currentAudio = audioQueue.shift()!
  currentAudio.onended = playNext
  currentAudio.onerror = playNext
  currentAudio.play().catch(playNext)
}

export function stopSpeech() {
  // Stop ElevenLabs audio
  if (currentAudio) {
    currentAudio.pause()
    currentAudio = null
  }
  audioQueue = []
  isPlaying = false
  // Stop browser speech
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel()
  }
}

// ═══════════════════════════════════════════════
//  CLEAN TEXT — strip markdown for speech
// ═══════════════════════════════════════════════
function cleanForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' code block ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/[═─│┌┐└┘├┤┬┴┼◈△○▌]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// ═══════════════════════════════════════════════
//  BROWSER NATIVE TTS — free, uses Web Speech API
//  Works in Chrome, Edge, Electron (Chromium)
// ═══════════════════════════════════════════════
export function getBrowserVoices(): SpeechSynthesisVoice[] {
  if (!window.speechSynthesis) return []
  return window.speechSynthesis.getVoices()
}

// Get UK male voices sorted by preference
export function getUKVoices(): SpeechSynthesisVoice[] {
  const voices = getBrowserVoices()
  // Prefer en-GB, then en-IE, en-AU, then any English
  const uk = voices.filter(v =>
    v.lang.startsWith('en-GB') || v.lang.startsWith('en-IE')
  )
  const english = voices.filter(v =>
    v.lang.startsWith('en') && !uk.includes(v)
  )
  return [...uk, ...english]
}

function speakBrowser(text: string): boolean {
  if (!window.speechSynthesis) return false

  const clean = cleanForSpeech(text)
  if (!clean || clean.length < 2) return false

  // Truncate for performance
  const truncated = clean.length > 2000 ? clean.slice(0, 2000) + '... message truncated.' : clean

  const utterance = new SpeechSynthesisUtterance(truncated)

  // Try to use saved voice preference
  const savedVoiceName = localStorage.getItem('browser_voice')
  const voices = getBrowserVoices()

  if (savedVoiceName) {
    const match = voices.find(v => v.name === savedVoiceName)
    if (match) utterance.voice = match
  } else {
    // Auto-pick: prefer en-GB male voices
    const ukVoices = voices.filter(v => v.lang.startsWith('en-GB'))
    // Try to find one with "Male" or "David" or "George" in the name
    const male = ukVoices.find(v =>
      /male|david|george|james|daniel|ryan/i.test(v.name)
    ) || ukVoices[0]
    if (male) {
      utterance.voice = male
      localStorage.setItem('browser_voice', male.name)
    }
  }

  utterance.rate = 1.0
  utterance.pitch = 0.9  // Slightly deeper
  utterance.volume = 1.0

  window.speechSynthesis.cancel() // Clear any pending
  window.speechSynthesis.speak(utterance)
  return true
}

// ═══════════════════════════════════════════════
//  ELEVENLABS TTS — premium, high quality
// ═══════════════════════════════════════════════
async function speakElevenLabs(text: string): Promise<boolean> {
  const apiKey = localStorage.getItem('elevenlabs_key') || ''
  if (!apiKey) {
    // Fallback to browser if no API key
    return speakBrowser(text)
  }

  const clean = cleanForSpeech(text)
  if (!clean || clean.length < 2) return false

  // Truncate to save credits
  const maxChars = 1000
  const truncated = clean.length > maxChars
    ? clean.slice(0, maxChars) + '... message truncated for voice.'
    : clean

  try {
    const voiceId = localStorage.getItem('tts_voice') || DEFAULT_VOICE
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text: truncated,
        model_id: 'eleven_turbo_v2_5',  // Cheapest + fastest
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.3,
          use_speaker_boost: false,  // Save credits
        },
      }),
    })

    if (!res.ok) {
      console.error('[TTS] ElevenLabs error:', res.status)
      // Fallback to browser on API error
      return speakBrowser(text)
    }

    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    audio.onended = () => URL.revokeObjectURL(url)

    audioQueue.push(audio)
    if (!isPlaying) playNext()
    return true
  } catch (err) {
    console.error('[TTS] Failed, falling back to browser:', err)
    return speakBrowser(text)
  }
}

// ═══════════════════════════════════════════════
//  PUBLIC API
// ═══════════════════════════════════════════════
export async function speak(text: string): Promise<boolean> {
  const mode = getTTSMode()
  if (mode === 'elevenlabs') {
    return speakElevenLabs(text)
  }
  return speakBrowser(text)
}

export async function speakIfEnabled(text: string): Promise<boolean> {
  if (!isTTSEnabled()) return false
  return speak(text)
}
