// OpenSky Network — Flight tracking API
// Authenticated requests get higher rate limits (~4x)
// Docs: https://openskynetwork.github.io/opensky-api/

export interface Aircraft {
  icao24: string
  callsign: string
  country: string
  latitude: number
  longitude: number
  altitude: number // meters
  velocity: number // m/s
  heading: number
  onGround: boolean
}

// Cache last-known aircraft so they persist through failed fetches
let cachedAircraft: Aircraft[] = []

// Rotate through world regions each fetch cycle for global spread
// [lat, lon, radius]
const WORLD_REGIONS: [number, number, number][] = [
  [51, 0, 15],      // Europe
  [40, -90, 15],    // North America
  [35, 120, 15],    // East Asia
  [20, 80, 15],     // South Asia
  [-25, 135, 15],   // Australia
  [-10, -50, 15],   // South America
  [30, 35, 12],     // Middle East
  [5, 30, 15],      // Africa
]
let regionIndex = 0

const GLOBAL_CAP = 80

export async function fetchAircraft(): Promise<Aircraft[]> {
  // Fetch ONE region per cycle, rotating through all 8 over time
  // This keeps us well within rate limits (1 req per 5 min cycle)
  const region = WORLD_REGIONS[regionIndex % WORLD_REGIONS.length]
  regionIndex = (regionIndex + 1) % WORLD_REGIONS.length

  const [lat, lon, radius] = region
  let url = `/api/opensky/states/all?lamin=${lat - radius}&lamax=${lat + radius}&lomin=${lon - radius}&lomax=${lon + radius}`

  // Append Client ID if configured (OpenSky credit-based auth)
  const clientId = localStorage.getItem('opensky_client_id')
  if (clientId) {
    url += `&client_id=${encodeURIComponent(clientId)}`
  }

  try {
    const res = await fetch(url)
    if (!res.ok) return cachedAircraft

    const data = await res.json()
    if (!data.states) return cachedAircraft

    const fresh: Aircraft[] = data.states.slice(0, 15).map((s: any[]) => ({
      icao24: s[0] || '',
      callsign: (s[1] || '').trim(),
      country: s[2] || '',
      latitude: s[6] || 0,
      longitude: s[5] || 0,
      altitude: s[7] || 0,
      velocity: s[9] || 0,
      heading: s[10] || 0,
      onGround: s[8] || false,
    })).filter((a: Aircraft) => !a.onGround && a.latitude && a.longitude)

    if (fresh.length > 0) {
      // Merge: keep cached aircraft from other regions, add fresh ones
      const freshIds = new Set(fresh.map(a => a.icao24))
      const kept = cachedAircraft.filter(a => !freshIds.has(a.icao24))
      cachedAircraft = [...kept, ...fresh].slice(0, GLOBAL_CAP)
    }

    return cachedAircraft
  } catch {
    return cachedAircraft
  }
}
