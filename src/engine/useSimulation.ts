import { useEffect } from 'react'
import { useStore } from '../store/useStore'
import { spawnBlip } from './SimulationEngine'
import { fetchNEOData } from '../services/nasaService'
import { fetchSpaceWeather } from '../services/spaceWeatherService'
import { fetchEarthquakes } from '../services/earthquakeService'
import { fetchISSPosition } from '../services/issService'
import { fetchWeather } from '../services/weatherService'
import { fetchAircraft } from '../services/flightService'
import { playBlipPing, playAlert, updateKpAudio, playCustomAlert, restoreCustomAlert } from '../services/audioService'

// Module-level flag — survives HMR and React re-mounts
let booted = false

export function useSimulation(enabled = true) {
  useEffect(() => {
    if (!enabled) return // Panels skip — they get state via sync

    const store = useStore.getState()

    // Only seed logs + initial blips once per page load
    if (!booted) {
      booted = true
      store.addLog({ type: 'SYS', source: 'SYS', message: 'AETHER_SCOPE v3.5 (AWEN_PRIME) initializing...' })
      store.addLog({ type: 'SYS', source: 'SYS', message: 'Radar core online. GPU renderer active.' })
      store.addLog({ type: 'SYS', source: 'SYS', message: 'Post-processing: BLOOM | SCANLINE | VIGNETTE | ABERRATION' })
      store.addLog({ type: 'DATA', source: 'SYS', message: 'Telluric heartbeat synchronized.' })
      store.addLog({ type: 'SYS', source: 'SYS', message: 'Lumos Terminal v4.0 ready. Awaiting commands...' })

      // Restore custom alert MP3 from localStorage
      restoreCustomAlert()

      // Spawn initial sim blips
      const initial = Array.from({ length: 8 }, () => spawnBlip())
      store.setBlips(initial)
    }

    // Fetch external data immediately on boot, then every 5 minutes
    // Stagger aircraft fetch by 10s so it doesn't compete with other APIs on first load
    fetchAllExternalData()
    setTimeout(async () => {
      try {
        const planes = await fetchAircraft()
        useStore.getState().setAircraft(planes)
        if (planes.length > 0) {
          useStore.getState().addLog({ type: 'DATA', source: 'SKY', message: `OpenSky: ${planes.length} aircraft tracked worldwide.` })
        }
      } catch {}
    }, 10000)
    const externalInterval = setInterval(fetchAllExternalData, 5 * 60 * 1000)

    // Spawner / replenisher loop for SIMULATION mode
    let lastSpawn = performance.now()
    const spawnInterval = setInterval(() => {
      const s = useStore.getState()

      if (s.feedMode === 'SIMULATION') {
        const now = performance.now()
        if (now - lastSpawn > 2000 && s.blips.length < 25) {
          const newBlip = spawnBlip()
          s.setBlips([...s.blips, newBlip])
          lastSpawn = now

          playBlipPing(newBlip.type as 'NWTN' | 'LEVY' | 'CLOAK')

          if (newBlip.type === 'LEVY') {
            // Play custom MP3 alert if loaded, otherwise default alert
            if (!playCustomAlert()) playAlert()
            s.addLog({ type: 'ALERT', source: 'RADAR', message: `ANOMALY SIGNATURE: ${newBlip.name} [LEVY FLIGHT]` })
          } else if (newBlip.type === 'CLOAK') {
            s.addLog({ type: 'ALERT', source: 'RADAR', message: `SCALAR_CLOAK: ${newBlip.name} [HIGH COHERENCE]` })
          } else {
            s.addLog({ type: 'DATA', source: 'NASA', message: `Telemetry: ${newBlip.name} acquired. Range: ${newBlip.range.toFixed(1)}` })
          }
        }
      }
      // LIVE_FEED auto-refresh is handled by PhysicsTick in RadarScene
    }, 500)

    return () => {
      clearInterval(externalInterval)
      clearInterval(spawnInterval)
    }
  }, [enabled])
}

export async function loadNASAData() {
  const store = useStore.getState()
  store.addLog({ type: 'SYS', source: 'NASA', message: 'Initiating NASA NEO link...' })

  try {
    const blips = await fetchNEOData(store.nasaApiKey)
    store.setBlips(blips)
    store.addLog({ type: 'DATA', source: 'NASA', message: `NASA TELEMETRY: ${blips.length} objects imported.` })

    const hazardous = blips.filter((b) => b.type === 'LEVY')
    const cloaked = blips.filter((b) => b.type === 'CLOAK')
    if (hazardous.length > 0) {
      store.addLog({ type: 'ALERT', source: 'RADAR', message: `${hazardous.length} POTENTIALLY HAZARDOUS ASTEROID(S) DETECTED` })
      playAlert()
    }
    if (cloaked.length > 0) {
      store.addLog({ type: 'ALERT', source: 'RADAR', message: `${cloaked.length} HIGH-VELOCITY OBJECT(S) — SCALAR SIGNATURE` })
    }
  } catch (err: any) {
    store.addLog({ type: 'ALERT', source: 'NASA', message: `NASA API ERROR: ${err.message}` })
    store.addLog({ type: 'SYS', source: 'SYS', message: 'Check API key in Settings. DEMO_KEY allows 30 req/hr.' })
  }
}

async function fetchAllExternalData() {
  const store = useStore.getState()

  try {
    const weather = await fetchSpaceWeather()
    store.setSpaceWeather(weather)
    store.addLog({ type: 'DATA', source: 'NOAA', message: `Space weather: Kp=${weather.kpIndex} | Wind=${weather.solarWind}km/s | Bz=${weather.bz}nT | X-ray=${weather.xrayFlux}` })
    // Update ambient drone to react to Kp level
    updateKpAudio(weather.kpIndex)
    if (weather.kpIndex >= 5) {
      store.addLog({ type: 'ALERT', source: 'NOAA', message: `GEOMAGNETIC STORM: Kp=${weather.kpIndex} — G${Math.min(5, weather.kpIndex - 4)} class` })
    }
  } catch {
    store.addLog({ type: 'SYS', source: 'NOAA', message: 'Space weather feed unavailable.' })
  }

  try {
    const quakes = await fetchEarthquakes()
    store.setEarthquakes(quakes)
    store.addLog({ type: 'DATA', source: 'USGS', message: `Seismic: ${quakes.length} events (M2.5+) in last 24h.` })
    const major = quakes.filter((q) => q.mag >= 5)
    major.forEach((q) => {
      store.addLog({ type: 'ALERT', source: 'USGS', message: `SEISMIC EVENT: M${q.mag.toFixed(1)} — ${q.place}` })
    })
  } catch {
    store.addLog({ type: 'SYS', source: 'USGS', message: 'Earthquake feed unavailable.' })
  }

  // ISS Position
  try {
    const iss = await fetchISSPosition()
    store.setISSPosition(iss)
    store.addLog({ type: 'DATA', source: 'ISS', message: `ISS: LAT ${iss.latitude.toFixed(2)}° LON ${iss.longitude.toFixed(2)}° ALT ${iss.altitude}km VEL ${iss.velocity}km/h` })
  } catch {
    store.addLog({ type: 'SYS', source: 'ISS', message: 'ISS tracker unavailable.' })
  }

  // Local weather
  try {
    const wx = await fetchWeather(51.5, -3.2) // South Wales area
    store.setWeather(wx)
    store.addLog({ type: 'DATA', source: 'WX', message: `Weather: ${wx.description} | ${wx.temperature}°C | Wind ${wx.windSpeed}km/h | Humidity ${wx.humidity}% | ${wx.pressure}hPa` })
  } catch {
    store.addLog({ type: 'SYS', source: 'WX', message: 'Weather feed unavailable.' })
  }

  // Aircraft (wide European coverage for globe view)
  try {
    const planes = await fetchAircraft()
    store.setAircraft(planes)
    if (planes.length > 0) {
      store.addLog({ type: 'DATA', source: 'SKY', message: `OpenSky: ${planes.length} aircraft tracked worldwide.` })
    }
  } catch {
    store.addLog({ type: 'SYS', source: 'SKY', message: 'OpenSky feed unavailable.' })
  }
}
