// ═══════════════════════════════════════════════════════════════════
//  GRIMOIRE ASTRO ENGINE — Gnostic Astronomical Timing Node
//  Ported from Python Ultimate Gnostic Astro Timing Node v3.3
//
//  Moon Phase | Planetary Hours | Zodiac | Sidereal Time
//  Fixed Stars | Visible Planets | Solar Events
// ═══════════════════════════════════════════════════════════════════

// ── Constants ──

const DEG = Math.PI / 180
const RAD = 180 / Math.PI

const PLANETS = ['Saturn', 'Jupiter', 'Mars', 'Sun', 'Venus', 'Mercury', 'Moon'] as const
export type PlanetName = typeof PLANETS[number]

const WEEKDAY_RULERS: Record<number, PlanetName> = {
  0: 'Sun',       // Sunday
  1: 'Moon',      // Monday
  2: 'Mars',      // Tuesday
  3: 'Mercury',   // Wednesday
  4: 'Jupiter',   // Thursday
  5: 'Venus',     // Friday
  6: 'Saturn',    // Saturday
}

export const PLANET_GLYPHS: Record<string, string> = {
  Saturn: '♄', Jupiter: '♃', Mars: '♂', Sun: '☉',
  Venus: '♀', Mercury: '☿', Moon: '☽',
}

export const ZODIAC_SIGNS = [
  { name: 'Aries',       glyph: '♈' },
  { name: 'Taurus',      glyph: '♉' },
  { name: 'Gemini',      glyph: '♊' },
  { name: 'Cancer',      glyph: '♋' },
  { name: 'Leo',         glyph: '♌' },
  { name: 'Virgo',       glyph: '♍' },
  { name: 'Libra',       glyph: '♎' },
  { name: 'Scorpio',     glyph: '♏' },
  { name: 'Sagittarius', glyph: '♐' },
  { name: 'Capricorn',   glyph: '♑' },
  { name: 'Aquarius',    glyph: '♒' },
  { name: 'Pisces',      glyph: '♓' },
] as const

export const PLANETARY_TONES_HZ: Record<string, number> = {
  Saturn: 147.0, Jupiter: 183.0, Mars: 105.0, Sun: 126.0,
  Venus: 216.0, Mercury: 192.0, Moon: 174.0,
}

// Fixed star catalog: [RA hours, Dec degrees, magnitude]
const FIXED_STARS: Record<string, { ra: number; dec: number; mag: number }> = {
  Regulus:   { ra: 10.139, dec: 11.967, mag: 1.4 },
  Spica:     { ra: 13.420, dec: -11.161, mag: 1.0 },
  Aldebaran: { ra: 4.599,  dec: 16.509, mag: 0.85 },
  Antares:   { ra: 16.490, dec: -26.432, mag: 1.1 },
  Sirius:    { ra: 6.752,  dec: -16.716, mag: -1.46 },
}

// ── Julian Date ──

function toJD(date: Date): number {
  const y = date.getUTCFullYear()
  const m = date.getUTCMonth() + 1
  const d = date.getUTCDate() + date.getUTCHours() / 24 +
    date.getUTCMinutes() / 1440 + date.getUTCSeconds() / 86400
  let Y = y, M = m
  if (M <= 2) { Y--; M += 12 }
  const A = Math.floor(Y / 100)
  const B = 2 - A + Math.floor(A / 4)
  return Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (M + 1)) + d + B - 1524.5
}

function fromJD(jd: number): Date {
  const z = Math.floor(jd + 0.5)
  const f = jd + 0.5 - z
  let A = z
  if (z >= 2299161) {
    const alpha = Math.floor((z - 1867216.25) / 36524.25)
    A = z + 1 + alpha - Math.floor(alpha / 4)
  }
  const B = A + 1524
  const C = Math.floor((B - 122.1) / 365.25)
  const D = Math.floor(365.25 * C)
  const E = Math.floor((B - D) / 30.6001)
  const day = B - D - Math.floor(30.6001 * E) + f
  const month = E < 14 ? E - 1 : E - 13
  const year = month > 2 ? C - 4716 : C - 4715
  const d = Math.floor(day)
  const h = (day - d) * 24
  const hr = Math.floor(h)
  const min = Math.floor((h - hr) * 60)
  const sec = Math.floor(((h - hr) * 60 - min) * 60)
  return new Date(Date.UTC(year, month - 1, d, hr, min, sec))
}

// ── Moon Phase ──

// Known New Moon: Jan 6, 2000 18:14 UTC
const NEW_MOON_EPOCH = new Date(Date.UTC(2000, 0, 6, 18, 14, 0)).getTime()
const SYNODIC_MONTH = 29.53058867

export interface MoonInfo {
  illumination: number       // 0-100%
  phaseName: string
  ageDays: number
  eclipticLon: number        // degrees
  zodiacSign: string
  zodiacGlyph: string
}

export function getMoonPhase(date: Date): MoonInfo {
  const diffMs = date.getTime() - NEW_MOON_EPOCH
  const diffDays = diffMs / 86400000
  const ageDays = ((diffDays % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH

  // Illumination from age (sinusoidal approximation)
  const illumination = Math.round((1 - Math.cos(2 * Math.PI * ageDays / SYNODIC_MONTH)) / 2 * 1000) / 10

  // Phase name
  let phaseName: string
  if (ageDays < 1.5 || ageDays > SYNODIC_MONTH - 1.5) phaseName = 'New Moon'
  else if (ageDays < 6.5) phaseName = 'Waxing Crescent'
  else if (ageDays < 8.5) phaseName = 'First Quarter'
  else if (ageDays < 13.5) phaseName = 'Waxing Gibbous'
  else if (ageDays < 16.5) phaseName = 'Full Moon'
  else if (ageDays < 21.5) phaseName = 'Waning Gibbous'
  else if (ageDays < 23.5) phaseName = 'Last Quarter'
  else phaseName = 'Waning Crescent'

  // Approximate ecliptic longitude (Moon moves ~13.176°/day)
  const eclipticLon = (ageDays * 13.176 + 0) % 360 // relative to Sun, approximate

  // More accurate: use mean longitude formula
  const T = (toJD(date) - 2451545.0) / 36525
  const L0 = (218.3165 + 481267.8813 * T) % 360
  const lon = ((L0 % 360) + 360) % 360

  const signIdx = Math.floor(lon / 30)
  const sign = ZODIAC_SIGNS[signIdx]

  return {
    illumination,
    phaseName,
    ageDays: Math.round(ageDays * 100) / 100,
    eclipticLon: Math.round(lon * 100) / 100,
    zodiacSign: sign.name,
    zodiacGlyph: sign.glyph,
  }
}

// ── Sunrise / Sunset (NOAA Algorithm) ──

export interface SolarTimes {
  sunrise: Date | null
  solarNoon: Date | null
  sunset: Date | null
  dayLengthMin: number
}

export function getSolarTimes(date: Date, lat: number, lon: number): SolarTimes {
  const jd = toJD(date)
  const jc = (jd - 2451545) / 36525

  // Solar geometry
  const geomMeanLon = (280.46646 + jc * (36000.76983 + 0.0003032 * jc)) % 360
  const geomMeanAnom = 357.52911 + jc * (35999.05029 - 0.0001537 * jc)
  const eccEarth = 0.016708634 - jc * (0.000042037 + 0.0000001267 * jc)
  const sunEqCtr = Math.sin(geomMeanAnom * DEG) * (1.914602 - jc * (0.004817 + 0.000014 * jc)) +
    Math.sin(2 * geomMeanAnom * DEG) * (0.019993 - 0.000101 * jc) +
    Math.sin(3 * geomMeanAnom * DEG) * 0.000289
  const sunTrueLon = geomMeanLon + sunEqCtr
  const sunAppLon = sunTrueLon - 0.00569 - 0.00478 * Math.sin((125.04 - 1934.136 * jc) * DEG)
  const meanObliq = 23 + (26 + (21.448 - jc * (46.815 + jc * (0.00059 - jc * 0.001813))) / 60) / 60
  const obliqCorr = meanObliq + 0.00256 * Math.cos((125.04 - 1934.136 * jc) * DEG)
  const sunDeclin = Math.asin(Math.sin(obliqCorr * DEG) * Math.sin(sunAppLon * DEG)) * RAD

  const varY = Math.tan(obliqCorr / 2 * DEG) ** 2
  const eqOfTime = 4 * RAD * (
    varY * Math.sin(2 * geomMeanLon * DEG) -
    2 * eccEarth * Math.sin(geomMeanAnom * DEG) +
    4 * eccEarth * varY * Math.sin(geomMeanAnom * DEG) * Math.cos(2 * geomMeanLon * DEG) -
    0.5 * varY * varY * Math.sin(4 * geomMeanLon * DEG) -
    1.25 * eccEarth * eccEarth * Math.sin(2 * geomMeanAnom * DEG)
  )

  const haSunrise = Math.acos(
    Math.cos(90.833 * DEG) / (Math.cos(lat * DEG) * Math.cos(sunDeclin * DEG)) -
    Math.tan(lat * DEG) * Math.tan(sunDeclin * DEG)
  ) * RAD

  if (isNaN(haSunrise)) {
    return { sunrise: null, solarNoon: null, sunset: null, dayLengthMin: 0 }
  }

  const noon = (720 - 4 * lon - eqOfTime) / 1440
  const rise = noon - haSunrise * 4 / 1440
  const set = noon + haSunrise * 4 / 1440

  const baseDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const msDay = 86400000

  return {
    sunrise: new Date(baseDate.getTime() + rise * msDay),
    solarNoon: new Date(baseDate.getTime() + noon * msDay),
    sunset: new Date(baseDate.getTime() + set * msDay),
    dayLengthMin: Math.round(haSunrise * 8 * 100) / 100,
  }
}

// ── Planetary Hours ──

export interface PlanetaryHour {
  number: number          // 1-12
  phase: 'day' | 'night'
  ruler: PlanetName
  glyph: string
  toneHz: number
  startTime: Date
  endTime: Date
  isCurrent: boolean
}

export interface PlanetaryHourInfo {
  current: PlanetaryHour | null
  dayRuler: PlanetName
  dayGlyph: string
  table: PlanetaryHour[]
}

export function getPlanetaryHours(date: Date, lat: number, lon: number): PlanetaryHourInfo {
  const solar = getSolarTimes(date, lat, lon)
  if (!solar.sunrise || !solar.sunset) {
    return { current: null, dayRuler: 'Sun', dayGlyph: '☉', table: [] }
  }

  // Get next day sunrise for night hours
  const tomorrow = new Date(date.getTime() + 86400000)
  const solarTomorrow = getSolarTimes(tomorrow, lat, lon)
  const nextSunrise = solarTomorrow.sunrise || new Date(solar.sunset.getTime() + 43200000)

  const dayMs = solar.sunset.getTime() - solar.sunrise.getTime()
  const nightMs = nextSunrise.getTime() - solar.sunset.getTime()
  const dayHourMs = dayMs / 12
  const nightHourMs = nightMs / 12

  // Day ruler from weekday (note: JS getDay() 0=Sunday)
  const weekday = solar.sunrise.getDay()
  const dayRuler = WEEKDAY_RULERS[weekday]
  const dayGlyph = PLANET_GLYPHS[dayRuler]
  const rulerIndex = PLANETS.indexOf(dayRuler)

  // Chaldean sequence: 24 hours cycling through 7 planets
  const sequence = Array.from({ length: 24 }, (_, i) => PLANETS[(rulerIndex + i) % 7])

  const table: PlanetaryHour[] = []
  let current: PlanetaryHour | null = null
  const now = date.getTime()

  for (let i = 0; i < 24; i++) {
    const isDayHour = i < 12
    const start = isDayHour
      ? new Date(solar.sunrise.getTime() + i * dayHourMs)
      : new Date(solar.sunset.getTime() + (i - 12) * nightHourMs)
    const end = isDayHour
      ? new Date(solar.sunrise.getTime() + (i + 1) * dayHourMs)
      : new Date(solar.sunset.getTime() + (i - 11) * nightHourMs)

    const ruler = sequence[i]
    const hour: PlanetaryHour = {
      number: (i % 12) + 1,
      phase: isDayHour ? 'day' : 'night',
      ruler,
      glyph: PLANET_GLYPHS[ruler],
      toneHz: PLANETARY_TONES_HZ[ruler],
      startTime: start,
      endTime: end,
      isCurrent: now >= start.getTime() && now < end.getTime(),
    }

    table.push(hour)
    if (hour.isCurrent) current = hour
  }

  return { current, dayRuler, dayGlyph, table }
}

// ── Sidereal Time ──

export function getSiderealTime(date: Date, lon: number): string {
  const jd = toJD(date)
  const T = (jd - 2451545.0) / 36525
  // Greenwich Mean Sidereal Time in hours
  let gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) +
    0.000387933 * T * T - T * T * T / 38710000
  gmst = ((gmst % 360) + 360) % 360
  // Local sidereal time
  const lst = ((gmst + lon) % 360 + 360) % 360
  const hours = lst / 15
  const h = Math.floor(hours)
  const m = Math.floor((hours - h) * 60)
  const s = Math.floor(((hours - h) * 60 - m) * 60)
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

// ── Fixed Stars ──

export interface FixedStarInfo {
  name: string
  altDeg: number
  azDeg: number
  mag: number
  ra: string
  dec: string
  aboveHorizon: boolean
}

export function getFixedStars(date: Date, lat: number, lon: number): FixedStarInfo[] {
  const lst = (() => {
    const jd = toJD(date)
    const T = (jd - 2451545.0) / 36525
    let gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) +
      0.000387933 * T * T - T * T * T / 38710000
    return ((gmst + lon) % 360 + 360) % 360 // degrees
  })()

  return Object.entries(FIXED_STARS).map(([name, star]) => {
    // Hour angle
    const ha = (lst - star.ra * 15 + 360) % 360

    // Alt-Az from HA, Dec, Lat
    const haRad = ha * DEG
    const decRad = star.dec * DEG
    const latRad = lat * DEG

    const sinAlt = Math.sin(decRad) * Math.sin(latRad) + Math.cos(decRad) * Math.cos(latRad) * Math.cos(haRad)
    const alt = Math.asin(sinAlt)
    const cosAz = (Math.sin(decRad) - Math.sin(alt) * Math.sin(latRad)) / (Math.cos(alt) * Math.cos(latRad))
    let az = Math.acos(Math.max(-1, Math.min(1, cosAz)))
    if (Math.sin(haRad) > 0) az = 2 * Math.PI - az

    const raH = Math.floor(star.ra)
    const raM = Math.floor((star.ra - raH) * 60)
    const raS = Math.floor(((star.ra - raH) * 60 - raM) * 60)

    return {
      name,
      altDeg: Math.round(alt * RAD * 100) / 100,
      azDeg: Math.round(az * RAD * 100) / 100,
      mag: star.mag,
      ra: `${raH}h${raM}m${raS}s`,
      dec: `${star.dec >= 0 ? '+' : ''}${star.dec.toFixed(1)}°`,
      aboveHorizon: alt > 0,
    }
  })
}

// ── Sun Zodiac Position ──

export function getSunZodiac(date: Date): { sign: string; glyph: string; longitude: number } {
  const jd = toJD(date)
  const T = (jd - 2451545.0) / 36525
  const L0 = (280.46646 + 36000.76983 * T) % 360
  const M = 357.52911 + 35999.05029 * T
  const C = Math.sin(M * DEG) * 1.9146 + Math.sin(2 * M * DEG) * 0.0200 + Math.sin(3 * M * DEG) * 0.0003
  const lon = ((L0 + C) % 360 + 360) % 360
  const idx = Math.floor(lon / 30)
  return {
    sign: ZODIAC_SIGNS[idx].name,
    glyph: ZODIAC_SIGNS[idx].glyph,
    longitude: Math.round(lon * 100) / 100,
  }
}

// ── Full Grimoire Snapshot ──

export interface GrimoireSnapshot {
  timestamp: Date
  moon: MoonInfo
  solar: SolarTimes
  planetaryHours: PlanetaryHourInfo
  siderealTime: string
  fixedStars: FixedStarInfo[]
  sunZodiac: { sign: string; glyph: string; longitude: number }
  gridCode: string
}

export function getGrimoireSnapshot(lat: number, lon: number, date?: Date): GrimoireSnapshot {
  const now = date || new Date()
  const moon = getMoonPhase(now)
  const solar = getSolarTimes(now, lat, lon)
  const planetaryHours = getPlanetaryHours(now, lat, lon)
  const siderealTime = getSiderealTime(now, lon)
  const fixedStars = getFixedStars(now, lat, lon)
  const sunZodiac = getSunZodiac(now)

  // Grid code — compact astronomical state
  const regulus = fixedStars.find(s => s.name === 'Regulus')
  const gridCode = [
    moon.zodiacGlyph,
    planetaryHours.current ? `${planetaryHours.current.glyph}${planetaryHours.current.ruler}` : '?',
    `☽${moon.illumination.toFixed(0)}%`,
    regulus ? `Reg${regulus.aboveHorizon ? '↑' : '↓'}${regulus.altDeg.toFixed(0)}°` : '',
    `LST:${siderealTime.slice(0, 5)}`,
  ].join(' | ')

  return {
    timestamp: now,
    moon,
    solar,
    planetaryHours,
    siderealTime,
    fixedStars,
    sunZodiac,
    gridCode,
  }
}
