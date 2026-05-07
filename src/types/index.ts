export type BlipType = 'NWTN' | 'LEVY' | 'CLOAK'

export interface Blip {
  id: string
  name: string
  type: BlipType
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  bearing: number
  range: number
  signal: number
  coherence: number
  entropy: number
  quaternionW: number
  gForce: number
  isLocked: boolean
  isEntangled: boolean
  age: number
  trail: Array<[number, number, number]>
}

export interface LogEntry {
  id: string
  timestamp: number
  type: 'SYS' | 'DATA' | 'ALERT' | 'CMD' | 'AI'
  source: string
  message: string
}

export type AIModel = 'GEMINI' | 'OPENAI' | 'LOCAL'
export type FeedMode = 'SIMULATION' | 'LIVE_FEED' | 'GLOBE'

export interface ScopeState {
  // Mode
  feedMode: FeedMode
  setFeedMode: (mode: FeedMode) => void

  // Radar
  foldAngle: number
  setFoldAngle: (angle: number) => void
  kelgLock: boolean
  toggleKelgLock: () => void
  teleforceActive: boolean
  setTeleforceActive: (v: boolean) => void
  timeScale: number
  setTimeScale: (v: number) => void

  // Blips
  blips: Blip[]
  setBlips: (blips: Blip[]) => void
  lockedBlipId: string | null
  setLockedBlipId: (id: string | null) => void

  // Terminal
  logs: LogEntry[]
  addLog: (entry: Omit<LogEntry, 'id' | 'timestamp'>) => void
  clearLogs: () => void

  // System
  physicsLoad: number
  setPhysicsLoad: (v: number) => void

  // Settings
  activeModel: AIModel
  setActiveModel: (m: AIModel) => void
  nasaApiKey: string
  setNasaApiKey: (k: string) => void

  // Space Weather (NOAA)
  spaceWeather: {
    kpIndex: number
    solarWind: number
    bz: number
    xrayFlux: string
    timestamp: string
  }
  setSpaceWeather: (w: ScopeState['spaceWeather']) => void

  // Earthquakes (USGS)
  earthquakes: Array<{
    id: string
    mag: number
    place: string
    time: number
    lat: number
    lon: number
    depth: number
    tsunami: boolean
  }>
  setEarthquakes: (eq: ScopeState['earthquakes']) => void

  // ISS
  issPosition: { latitude: number; longitude: number; altitude: number; velocity: number } | null
  setISSPosition: (pos: ScopeState['issPosition']) => void

  // Local weather
  weather: { temperature: number; windSpeed: number; humidity: number; pressure: number; description: string } | null
  setWeather: (w: ScopeState['weather']) => void

  // Aircraft
  aircraft: Array<{ icao24: string; callsign: string; latitude: number; longitude: number; altitude: number; velocity: number; heading: number; country: string }>
  setAircraft: (a: ScopeState['aircraft']) => void

  // Globe lock target
  lockedGlobeTarget: GlobeLockTarget | null
  setLockedGlobeTarget: (t: GlobeLockTarget | null) => void

  // URE-VM null ledger live feed
  vmLedger: { real: number; imag: number; balance: number; status: string }
  setVmLedger: (l: { real: number; imag: number; balance: number; status: string }) => void
}

export type GlobeTargetKind = 'earthquake' | 'iss' | 'aircraft' | 'user'

export interface GlobeLockTarget {
  kind: GlobeTargetKind
  id: string
  name: string
  lat: number
  lon: number
}
