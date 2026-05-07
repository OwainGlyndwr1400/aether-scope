// ISS Tracker — Free HTTPS API, no key needed

export interface ISSPosition {
  latitude: number
  longitude: number
  altitude: number
  velocity: number
  timestamp: number
}

export async function fetchISSPosition(): Promise<ISSPosition> {
  // Using wheretheiss.at (HTTPS, no CORS issues)
  const res = await fetch('https://api.wheretheiss.at/v1/satellites/25544')
  const data = await res.json()

  return {
    latitude: data.latitude,
    longitude: data.longitude,
    altitude: Math.round(data.altitude),
    velocity: Math.round(data.velocity),
    timestamp: Date.now(),
  }
}
