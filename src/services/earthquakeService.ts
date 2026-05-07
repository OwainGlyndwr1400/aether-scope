// USGS Earthquake Hazards Program — FREE, no API key needed

export interface Earthquake {
  id: string
  mag: number
  place: string
  time: number
  lat: number
  lon: number
  depth: number
  tsunami: boolean
}

// Fetch recent significant earthquakes (last 24h, magnitude 2.5+)
export async function fetchEarthquakes(): Promise<Earthquake[]> {
  try {
    const res = await fetch(
      'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson'
    )
    const data = await res.json()

    return data.features.slice(0, 20).map((f: any) => ({
      id: f.id,
      mag: f.properties.mag,
      place: f.properties.place || 'Unknown',
      time: f.properties.time,
      lat: f.geometry.coordinates[1],
      lon: f.geometry.coordinates[0],
      depth: f.geometry.coordinates[2],
      tsunami: f.properties.tsunami === 1,
    }))
  } catch {
    return []
  }
}
