import { create } from 'zustand'
import type { ScopeState, LogEntry } from '../types'

let logCounter = 0

export const useStore = create<ScopeState>((set) => ({
  feedMode: 'SIMULATION',
  setFeedMode: (mode) => set({ feedMode: mode }),

  foldAngle: 45,
  setFoldAngle: (angle) => set({ foldAngle: angle }),
  kelgLock: false,
  toggleKelgLock: () => set((s) => ({ kelgLock: !s.kelgLock })),
  teleforceActive: false,
  setTeleforceActive: (v) => set({ teleforceActive: v }),
  timeScale: 1.0,
  setTimeScale: (v) => set({ timeScale: v }),

  blips: [],
  setBlips: (blips) => set({ blips }),
  lockedBlipId: null,
  setLockedBlipId: (id) => set({ lockedBlipId: id }),

  logs: [],
  addLog: (entry) =>
    set((s) => ({
      logs: [
        ...s.logs.slice(-149),
        {
          ...entry,
          id: `log-${++logCounter}`,
          timestamp: Date.now(),
        },
      ],
    })),
  clearLogs: () => set({ logs: [] }),

  physicsLoad: 0,
  setPhysicsLoad: (v) => set({ physicsLoad: v }),

  activeModel: (localStorage.getItem('active_model') as any) || 'GEMINI',
  setActiveModel: (m) => { localStorage.setItem('active_model', m); set({ activeModel: m }) },
  nasaApiKey: localStorage.getItem('nasa_key') || 'DEMO_KEY',
  setNasaApiKey: (k) => set({ nasaApiKey: k }),

  spaceWeather: { kpIndex: 0, solarWind: 0, bz: 0, xrayFlux: 'A', timestamp: '' },
  setSpaceWeather: (w) => set({ spaceWeather: w }),

  earthquakes: [],
  setEarthquakes: (eq) => set({ earthquakes: eq }),

  issPosition: null,
  setISSPosition: (pos) => set({ issPosition: pos }),

  weather: null,
  setWeather: (w) => set({ weather: w }),

  aircraft: [],
  setAircraft: (a) => set({ aircraft: a }),

  lockedGlobeTarget: null,
  setLockedGlobeTarget: (t) => set({ lockedGlobeTarget: t }),

  // URE-VM null ledger live feed
  vmLedger: { real: 0, imag: 0, balance: 0, status: 'IDLE' as string },
  setVmLedger: (l: { real: number; imag: number; balance: number; status: string }) => set({ vmLedger: l }),
}))

// Expose store for debugging
;(window as any).__store = useStore
