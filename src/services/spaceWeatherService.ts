// NOAA Space Weather Prediction Center — FREE, no API key needed
// All using /products/summary/ endpoints for consistent simple format

export interface SpaceWeather {
  kpIndex: number
  solarWind: number
  bz: number
  xrayFlux: string
  solarFlux: number
  timestamp: string
}

// Aggregated space weather fetch — all from summary endpoints
export async function fetchSpaceWeather(): Promise<SpaceWeather> {
  const results: SpaceWeather = {
    kpIndex: 0,
    solarWind: 0,
    bz: 0,
    xrayFlux: 'A',
    solarFlux: 0,
    timestamp: new Date().toISOString(),
  }

  // Kp index
  try {
    const res = await fetch('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json')
    const data = await res.json()
    if (Array.isArray(data) && data.length > 0) {
      const latest = data[data.length - 1]
      results.kpIndex = Math.round(parseFloat(latest.Kp ?? latest[1]) * 10) / 10
    }
  } catch {}

  // Solar wind speed
  try {
    const res = await fetch('https://services.swpc.noaa.gov/products/summary/solar-wind-speed.json')
    const data = await res.json()
    const obj = Array.isArray(data) ? data[0] : data
    results.solarWind = Math.round(parseFloat(obj?.proton_speed) || 0)
  } catch {}

  // Magnetic field Bz
  try {
    const res = await fetch('https://services.swpc.noaa.gov/products/summary/solar-wind-mag-field.json')
    const data = await res.json()
    const obj = Array.isArray(data) ? data[0] : data
    results.bz = parseFloat(obj?.bz_gsm) || 0
  } catch {}

  // 10.7cm Solar radio flux (proxy for X-ray activity)
  try {
    const res = await fetch('https://services.swpc.noaa.gov/products/summary/10cm-flux.json')
    const data = await res.json()
    const obj = Array.isArray(data) ? data[0] : data
    const flux = parseFloat(obj?.flux) || 0
    results.solarFlux = flux
    // Classify activity level from solar flux units (SFU)
    if (flux >= 200) results.xrayFlux = 'X'      // Extreme
    else if (flux >= 150) results.xrayFlux = 'M'  // Major
    else if (flux >= 120) results.xrayFlux = 'C'  // Moderate
    else if (flux >= 90) results.xrayFlux = 'B'   // Low
    else results.xrayFlux = 'A'                    // Quiet
  } catch {}

  return results
}
