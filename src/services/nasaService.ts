import type { Blip, BlipType } from '../types'

const NEO_API = 'https://api.nasa.gov/neo/rest/v1/feed'

interface NeoObject {
  id: string
  name: string
  estimated_diameter: {
    meters: { estimated_diameter_min: number; estimated_diameter_max: number }
  }
  close_approach_data: Array<{
    relative_velocity: { kilometers_per_second: string }
    miss_distance: { kilometers: string; lunar: string }
  }>
  is_potentially_hazardous_asteroid: boolean
}

export async function fetchNEOData(apiKey: string): Promise<Blip[]> {
  const today = new Date().toISOString().split('T')[0]
  const url = `${NEO_API}?start_date=${today}&end_date=${today}&api_key=${apiKey}`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`NASA API error: ${res.status}`)

  const data = await res.json()
  const neos: NeoObject[] = Object.values(data.near_earth_objects).flat() as NeoObject[]

  return neos.map((neo, i) => {
    const approach = neo.close_approach_data[0]
    const velocity = approach ? parseFloat(approach.relative_velocity.kilometers_per_second) : 5
    const distKm = approach ? parseFloat(approach.miss_distance.kilometers) : 1000000
    const distLunar = approach ? parseFloat(approach.miss_distance.lunar) : 10

    // Spread objects across inner radar field (10-50 range) — closer to center so they
    // visibly fly outward across the radar before removal at range 120
    const range = 10 + ((i * 23) % 35) + Math.random() * 8
    const bearing = (i * 137.508) % 360 // Golden angle spread for even distribution

    // Classify based on characteristics
    let type: BlipType = 'NWTN'
    if (neo.is_potentially_hazardous_asteroid) type = 'LEVY'
    if (velocity > 20) type = 'CLOAK'

    const diameter = neo.estimated_diameter.meters
    const avgDiameter = (diameter.estimated_diameter_min + diameter.estimated_diameter_max) / 2
    const signal = Math.min(20, avgDiameter / 50)

    const angle = (bearing * Math.PI) / 180

    // Fly-by trajectories: cross the radar field with tangential + inward motion
    const vAngle = angle + Math.PI * 0.7 + (Math.random() - 0.5) * 0.8
    const speed = 1.2 + velocity * 0.15 // Fast enough to traverse radar before age-out

    return {
      id: `neo-${neo.id}`,
      name: neo.name.replace(/[()]/g, '').trim(),
      type,
      x: Math.sin(angle) * range,
      y: 0,
      z: -Math.cos(angle) * range,
      vx: Math.cos(vAngle) * speed,
      vy: 0,
      vz: Math.sin(vAngle) * speed,
      bearing,
      range,
      signal,
      coherence: type === 'CLOAK' ? 0.8 + Math.random() * 0.2
               : type === 'LEVY' ? 0.4 + Math.random() * 0.4
               : Math.random() * 0.3,
      entropy: Math.random(),
      quaternionW: Math.cos(Math.random() * Math.PI),
      gForce: velocity * 0.1,
      isLocked: false,
      isEntangled: false,
      age: 0,
      trail: [],
    }
  })
}
