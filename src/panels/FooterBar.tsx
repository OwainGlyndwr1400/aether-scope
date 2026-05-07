import { useState, useEffect, useRef } from 'react'
import { useStore } from '../store/useStore'
import { SCHUMANN, KELG_FREQUENCY, GOLDEN_HARMONIC } from '../engine/RHCConstants'

export function FooterBar() {
  const [clock, setClock] = useState('')
  const [utc, setUtc] = useState('')
  const feedMode = useStore((s) => s.feedMode)
  const blips = useStore((s) => s.blips)
  const kelgLock = useStore((s) => s.kelgLock)
  const foldAngle = useStore((s) => s.foldAngle)
  const spaceWeather = useStore((s) => s.spaceWeather)
  const earthquakes = useStore((s) => s.earthquakes)
  const issPosition = useStore((s) => s.issPosition)
  const weather = useStore((s) => s.weather)
  const aircraft = useStore((s) => s.aircraft)
  const [ticker, setTicker] = useState<string[]>([])
  const prevBlipCount = useRef(0)

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setClock(now.toLocaleTimeString('en-GB', { hour12: false }) + '.' + String(now.getMilliseconds()).padStart(3, '0'))
      setUtc(now.toISOString().replace('T', ' ').substring(0, 23) + 'Z')
    }
    tick()
    const id = setInterval(tick, 47)
    return () => clearInterval(id)
  }, [])

  // Watch for new blip arrivals and add to ticker
  useEffect(() => {
    if (blips.length > prevBlipCount.current && prevBlipCount.current > 0) {
      // New blips arrived — announce them
      const newCount = blips.length - prevBlipCount.current
      const newest = blips.slice(-newCount)
      const msgs = newest.map(b => `ACQUIRED: ${b.name} [${b.type}] BRG:${b.bearing.toFixed(0)}° RNG:${b.range.toFixed(0)}`)
      setTicker(prev => [...prev.slice(-8), ...msgs])

      // Also log to terminal
      const store = useStore.getState()
      newest.forEach(b => {
        store.addLog({
          type: b.type === 'NWTN' ? 'DATA' : 'ALERT',
          source: 'RADAR',
          message: `CONTACT: ${b.name} [${b.type}] — BRG ${b.bearing.toFixed(1)}° RNG ${b.range.toFixed(1)} SIG ${b.signal.toFixed(2)} COH ${b.coherence.toFixed(3)}`
        })
      })
    }
    prevBlipCount.current = blips.length
  }, [blips.length])

  // Watch for space weather changes
  useEffect(() => {
    if (spaceWeather.timestamp) {
      setTicker(prev => [...prev.slice(-8),
        `SPACE_WX: Kp=${spaceWeather.kpIndex} WIND=${spaceWeather.solarWind}km/s Bz=${spaceWeather.bz}nT X-RAY=${spaceWeather.xrayFlux}`
      ])
    }
  }, [spaceWeather.timestamp])

  // Watch for earthquake updates
  useEffect(() => {
    if (earthquakes.length > 0) {
      const top = earthquakes[0]
      setTicker(prev => [...prev.slice(-8),
        `SEISMIC: ${earthquakes.length} events | Latest: M${top.mag.toFixed(1)} ${top.place}`
      ])
    }
  }, [earthquakes.length])

  // ISS position updates
  useEffect(() => {
    if (issPosition) {
      setTicker(prev => [...prev.slice(-8),
        `ISS PASS: LAT ${issPosition.latitude.toFixed(2)}° LON ${issPosition.longitude.toFixed(2)}° ALT ${issPosition.altitude}km`
      ])
    }
  }, [issPosition?.latitude])

  // Aircraft updates
  useEffect(() => {
    if (aircraft.length > 0) {
      const top = aircraft[0]
      setTicker(prev => [...prev.slice(-8),
        `AIRSPACE: ${aircraft.length} aircraft | ${top.callsign || top.country} HDG ${top.heading.toFixed(0)}° ALT ${(top.altitude).toFixed(0)}m`
      ])
    }
  }, [aircraft.length])

  // Weather updates
  useEffect(() => {
    if (weather) {
      setTicker(prev => [...prev.slice(-8),
        `LOCAL_WX: ${weather.description} ${weather.temperature}°C WIND ${weather.windSpeed}km/h HUM ${weather.humidity}% PRS ${weather.pressure}hPa`
      ])
    }
  }, [weather?.temperature])

  const anomalies = blips.filter((b) => b.type !== 'NWTN').length
  const entangled = blips.filter((b) => b.isEntangled).length
  const activeFreq = kelgLock ? KELG_FREQUENCY : GOLDEN_HARMONIC
  const maxQuake = earthquakes.length > 0 ? Math.max(...earthquakes.map((q) => q.mag)) : 0

  // Kp color
  const kpColor = spaceWeather.kpIndex >= 7 ? 'var(--alert)'
    : spaceWeather.kpIndex >= 5 ? 'var(--secondary)'
    : spaceWeather.kpIndex >= 3 ? 'var(--primary)'
    : 'var(--text-mid)'

  return (
    <div className="footer-bar" style={{ flexDirection: 'column', gap: 0, padding: '0 12px' }}>
      {/* TOP ROW — Scrolling data ticker */}
      <div style={{
        width: '100%',
        overflow: 'hidden',
        height: 10,
        fontSize: 8,
        letterSpacing: 1.2,
        color: 'var(--primary)',
        fontFamily: 'var(--font-mono)',
        whiteSpace: 'nowrap',
        opacity: 0.7,
      }}>
        <div style={{
          display: 'inline-block',
          animation: ticker.length > 0 ? 'ticker-scroll 30s linear infinite' : 'none',
        }}>
          {ticker.length > 0
            ? ticker.map((msg, i) => (
              <span key={i}>
                <span style={{ color: 'var(--border-mid)' }}> // </span>
                {msg}
              </span>
            ))
            : <span style={{ color: 'var(--text-dim)' }}>AWAITING TELEMETRY...</span>
          }
        </div>
      </div>

      {/* BOTTOM ROW — Static readouts */}
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
        {/* LEFT — Clock & recording */}
        <div className="footer-section">
          <span><span className="rec-dot" /> REC</span>
          <span className="footer-separator">|</span>
          <span>LOCAL <span className="footer-val live">{clock}</span></span>
          <span className="footer-separator">|</span>
          <span>UTC <span className="footer-val">{utc}</span></span>
        </div>

        {/* CENTER — Mode, frequencies, space weather */}
        <div className="footer-section">
          <span>FOLD: <span className="footer-val">{foldAngle}°</span></span>
          <span className="footer-separator">|</span>
          <span>FREQ: <span className="footer-val live">{activeFreq}Hz</span></span>
          <span className="footer-separator">|</span>
          <span>Kp: <span className="footer-val" style={{ color: kpColor }}>{spaceWeather.timestamp ? spaceWeather.kpIndex : '—'}</span></span>
          <span className="footer-separator">|</span>
          <span>WIND: <span className="footer-val">{spaceWeather.timestamp ? spaceWeather.solarWind : '—'}<span style={{ fontSize: 7 }}>km/s</span></span></span>
          <span className="footer-separator">|</span>
          <span>X-RAY: <span className="footer-val" style={{ color: spaceWeather.xrayFlux === 'M' || spaceWeather.xrayFlux === 'X' ? 'var(--alert)' : 'var(--text-mid)', fontSize: 11, fontWeight: 700 }}>{spaceWeather.timestamp ? `[${spaceWeather.xrayFlux}]` : '—'}</span></span>
          <span className="footer-separator">|</span>
          <span>SEISMIC: <span className="footer-val" style={{ color: maxQuake >= 5 ? 'var(--secondary)' : 'var(--text-mid)' }}>
            {earthquakes.length > 0 ? `${earthquakes.length} EVT / M${maxQuake.toFixed(1)} MAX` : '—'}
          </span></span>
        </div>

        {/* RIGHT — ISS, weather, objects */}
        <div className="footer-section">
          {issPosition && (
            <>
              <span>ISS: <span className="footer-val" style={{ color: 'var(--accent-violet)' }}>{issPosition.latitude.toFixed(1)}°/{issPosition.longitude.toFixed(1)}°</span></span>
              <span className="footer-separator">|</span>
            </>
          )}
          {weather && (
            <>
              <span>WX: <span className="footer-val">{weather.temperature}°C {weather.description}</span></span>
              <span className="footer-separator">|</span>
            </>
          )}
          {aircraft.length > 0 && (
            <>
              <span>AIR: <span className="footer-val">{aircraft.length}</span></span>
              <span className="footer-separator">|</span>
            </>
          )}
          <span>BLIPS: <span className="footer-val">{blips.length}</span></span>
          <span className="footer-separator">|</span>
          <span style={{ color: '#B87820' }}>NWTN: <span className="footer-val">{blips.filter(b => b.type === 'NWTN').length || '—'}</span></span>
          <span className="footer-separator">|</span>
          <span style={{ color: '#3A7A8C' }}>LEVY: <span className="footer-val">{blips.filter(b => b.type === 'LEVY').length || '—'}</span></span>
          <span className="footer-separator">|</span>
          <span>CLOAK: <span className="footer-val">{blips.filter(b => b.type === 'CLOAK').length || '—'}</span></span>
          <span className="footer-separator">|</span>
          <span style={{ color: 'var(--primary)', letterSpacing: 2 }}>AWEN_PRIME</span>
        </div>
      </div>
    </div>
  )
}
