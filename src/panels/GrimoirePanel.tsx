import { useState, useEffect, useMemo } from 'react'
import {
  getGrimoireSnapshot, PLANET_GLYPHS,
  type GrimoireSnapshot, type PlanetaryHour,
} from '../engine/AstroEngine'

// Default: Swansea area (same as Python script)
const LAT = 51.6214
const LON = -3.9436

function fmtTime(d: Date | null): string {
  if (!d) return 'N/A'
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function GrimoirePanel() {
  const [expanded, setExpanded] = useState(false)
  const [tick, setTick] = useState(0)

  // Refresh every 30s
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 30000)
    return () => clearInterval(iv)
  }, [])

  const snap: GrimoireSnapshot = useMemo(() => getGrimoireSnapshot(LAT, LON), [tick])
  const moon = snap.moon
  const solar = snap.solar
  const ph = snap.planetaryHours
  const current = ph.current

  // Moon phase color — Awen Grid desat palette
  const moonColor = moon.illumination > 90 ? '#E8E4D8' :
    moon.illumination > 50 ? '#A0A498' : moon.illumination > 10 ? '#6E6A60' : '#3E3C38'

  // Planetary ruler colors — desat per Awen Grid palette but retain alchemical distinction
  const rulerColors: Record<string, string> = {
    Saturn: '#6A6878', Jupiter: '#B87820', Mars: '#A03A2A',
    Sun: '#C8A848', Venus: '#4A7A5A', Mercury: '#3A7A8C', Moon: '#A0A498',
  }
  const rulerColor = current ? (rulerColors[current.ruler] || 'var(--accent-ink)') : 'var(--text-dim)'

  return (
    <div className="panel" style={{ flex: expanded ? '1 1 auto' : '0 0 auto', overflow: 'hidden' }}>
      <div className="corner-tl" /><div className="corner-tr" />
      <div className="corner-bl" /><div className="corner-br" />
      <div className="panel-scan" />

      <div
        className="panel-header"
        style={{ cursor: 'pointer' }}
        onClick={() => setExpanded(!expanded)}
      >
        <span>GRIMOIRE</span>
        <span className="tag" style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ color: rulerColor, fontSize: 7, letterSpacing: 1 }}>
            {current ? `${current.glyph} ${current.ruler}` : 'LOADING'}
          </span>
          <span style={{ color: 'var(--text-dim)', fontSize: 7 }}>{expanded ? '[-]' : '[+]'}</span>
        </span>
      </div>

      {/* Collapsed */}
      {!expanded && (
        <div className="panel-body" style={{ padding: '4px 8px', fontSize: 7, letterSpacing: 1, color: 'var(--text-dim)' }}>
          <span style={{ color: moonColor }}>{moon.zodiacGlyph} {moon.phaseName} {moon.illumination}%</span>
          <span style={{ margin: '0 6px', color: 'var(--border-dim)' }}>|</span>
          <span style={{ color: rulerColor }}>{current?.glyph} {current?.ruler} Hr</span>
          <span style={{ margin: '0 6px', color: 'var(--border-dim)' }}>|</span>
          <span>LST: <span style={{ color: 'var(--accent-ink)' }}>{snap.siderealTime.slice(0, 8)}</span></span>
        </div>
      )}

      {/* Expanded */}
      {expanded && (
        <div className="panel-body" style={{ padding: '6px 8px', fontSize: 7, letterSpacing: 1, overflowY: 'auto', maxHeight: 400 }}>

          {/* ── Grid Code ── */}
          <div style={{ marginBottom: 6, padding: '4px 6px', background: 'rgba(200, 134, 10, 0.05)', border: '1px solid var(--border-dim)', fontSize: 8, color: 'var(--accent-ink)', letterSpacing: 2, textAlign: 'center' }}>
            {snap.gridCode}
          </div>

          {/* ── Moon ── */}
          <div style={{ color: 'var(--primary)', fontSize: 8, marginBottom: 3 }}>LUNAR STATE</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, marginBottom: 6 }}>
            <div style={{ background: 'rgba(200, 134, 10, 0.05)', padding: '4px 6px', border: '1px solid var(--border-dim)' }}>
              <div style={{ fontSize: 6, color: 'var(--text-dim)', letterSpacing: 2 }}>PHASE</div>
              <div style={{ fontSize: 10, color: moonColor, fontWeight: 700 }}>{moon.phaseName}</div>
            </div>
            <div style={{ background: 'rgba(200, 134, 10, 0.05)', padding: '4px 6px', border: '1px solid var(--border-dim)' }}>
              <div style={{ fontSize: 6, color: 'var(--text-dim)', letterSpacing: 2 }}>ILLUMIN</div>
              <div style={{ fontSize: 14, color: moonColor, fontWeight: 700 }}>{moon.illumination}%</div>
            </div>
            <div style={{ background: 'rgba(200, 134, 10, 0.05)', padding: '4px 6px', border: '1px solid var(--border-dim)' }}>
              <div style={{ fontSize: 6, color: 'var(--text-dim)', letterSpacing: 2 }}>SIGN</div>
              <div style={{ fontSize: 14, color: '#A0A498', fontWeight: 700 }}>{moon.zodiacGlyph} {moon.zodiacSign}</div>
            </div>
          </div>
          <div style={{ color: 'var(--text-dim)', marginBottom: 6, borderBottom: '1px solid var(--border-dim)', paddingBottom: 4 }}>
            AGE: <span style={{ color: 'var(--text-mid)' }}>{moon.ageDays} days</span>
            <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
            ECL_LON: <span style={{ color: '#A0A498' }}>{moon.eclipticLon}°</span>
          </div>

          {/* ── Solar ── */}
          <div style={{ color: 'var(--primary)', fontSize: 8, marginBottom: 3 }}>SOLAR EVENTS</div>
          <div style={{ marginBottom: 6, borderBottom: '1px solid var(--border-dim)', paddingBottom: 4 }}>
            <div style={{ color: 'var(--text-dim)' }}>
              SUNRISE: <span style={{ color: '#C8A848' }}>{fmtTime(solar.sunrise)}</span>
              <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
              NOON: <span style={{ color: '#C8A848' }}>{fmtTime(solar.solarNoon)}</span>
              <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
              SUNSET: <span style={{ color: '#B87820' }}>{fmtTime(solar.sunset)}</span>
            </div>
            <div style={{ color: 'var(--text-dim)', marginTop: 2 }}>
              DAY_LENGTH: <span style={{ color: 'var(--text-mid)' }}>{Math.floor(solar.dayLengthMin / 60)}h {Math.round(solar.dayLengthMin % 60)}m</span>
              <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
              SUN: <span style={{ color: '#C8A848' }}>{snap.sunZodiac.glyph} {snap.sunZodiac.sign}</span>
              <span style={{ color: 'var(--text-dim)', marginLeft: 4 }}>{snap.sunZodiac.longitude}°</span>
            </div>
          </div>

          {/* ── Current Planetary Hour ── */}
          <div style={{ color: 'var(--primary)', fontSize: 8, marginBottom: 3 }}>PLANETARY HOUR</div>
          {current && (
            <div style={{ marginBottom: 6, borderBottom: '1px solid var(--border-dim)', paddingBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <span style={{ fontSize: 18, color: rulerColor }}>{current.glyph}</span>
                <div>
                  <div style={{ color: rulerColor, fontSize: 10, fontWeight: 700 }}>
                    {current.ruler} — Hour #{current.number} ({current.phase})
                  </div>
                  <div style={{ color: 'var(--text-dim)', fontSize: 6 }}>
                    {fmtTime(current.startTime)} {'→'} {fmtTime(current.endTime)}
                    <span style={{ marginLeft: 6 }}>TONE: <span style={{ color: 'var(--accent-ink)' }}>{current.toneHz}Hz</span></span>
                  </div>
                </div>
              </div>
              <div style={{ color: 'var(--text-dim)' }}>
                DAY RULER: <span style={{ color: rulerColor }}>{ph.dayGlyph} {ph.dayRuler}</span>
              </div>
            </div>
          )}

          {/* ── 24-Hour Table (compact) ── */}
          <div style={{ color: 'var(--primary)', fontSize: 8, marginBottom: 3 }}>24-HOUR SEQUENCE</div>
          <div style={{ marginBottom: 6, borderBottom: '1px solid var(--border-dim)', paddingBottom: 4 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {ph.table.map((h, i) => (
                <span
                  key={i}
                  style={{
                    display: 'inline-block',
                    padding: '2px 3px',
                    fontSize: 8,
                    border: h.isCurrent ? '1px solid var(--accent-ink)' : '1px solid var(--border-dim)',
                    background: h.isCurrent ? 'rgba(200, 134, 10, 0.12)' : 'transparent',
                    color: rulerColors[h.ruler] || 'var(--text-mid)',
                    fontWeight: h.isCurrent ? 700 : 400,
                  }}
                  title={`${h.ruler} | ${h.phase} #${h.number} | ${fmtTime(h.startTime)}-${fmtTime(h.endTime)} | ${h.toneHz}Hz`}
                >
                  {h.glyph}
                </span>
              ))}
            </div>
            <div style={{ fontSize: 5, color: 'var(--text-dim)', marginTop: 2 }}>
              {Object.entries(PLANET_GLYPHS).map(([name, g]) => (
                <span key={name} style={{ marginRight: 6 }}>
                  <span style={{ color: rulerColors[name] || 'var(--text-mid)' }}>{g}</span>={name}
                </span>
              ))}
            </div>
          </div>

          {/* ── Sidereal Time ── */}
          <div style={{ color: 'var(--primary)', fontSize: 8, marginBottom: 3 }}>SIDEREAL TIME</div>
          <div style={{ marginBottom: 6, borderBottom: '1px solid var(--border-dim)', paddingBottom: 4, color: 'var(--text-dim)' }}>
            LST: <span style={{ color: 'var(--accent-ink)', fontSize: 10, fontWeight: 700 }}>{snap.siderealTime}</span>
          </div>

          {/* ── Fixed Stars ── */}
          <div style={{ color: 'var(--primary)', fontSize: 8, marginBottom: 3 }}>FIXED STARS</div>
          <div style={{ marginBottom: 4 }}>
            {snap.fixedStars.map(star => (
              <div key={star.name} style={{ color: star.aboveHorizon ? '#C8A878' : 'var(--text-dim)', fontSize: 6, marginBottom: 2 }}>
                <span style={{ display: 'inline-block', width: 60 }}>{star.aboveHorizon ? '★' : '☆'} {star.name}</span>
                ALT: <span style={{ color: star.aboveHorizon ? '#4A7A5A' : '#A03A2A' }}>{star.altDeg}°</span>
                <span style={{ margin: '0 3px', color: 'var(--border-dim)' }}>|</span>
                AZ: {star.azDeg}°
                <span style={{ margin: '0 3px', color: 'var(--border-dim)' }}>|</span>
                MAG: {star.mag}
                <span style={{ margin: '0 3px', color: 'var(--border-dim)' }}>|</span>
                RA: {star.ra}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
