import { useState, useEffect, useRef } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { RadarScene } from './RadarScene'
import { GlobeScene } from './GlobeScene'
import { Effects } from './Effects'
import { useStore } from '../store/useStore'
import { MASS_GAP, GEOMETRIC_LOCK } from '../engine/RHCConstants'
import { TargetAnalysis } from '../panels/TargetAnalysis'
import * as THREE from 'three'

// Smoothly moves camera when switching between radar and globe
function CameraAnimator() {
  const feedMode = useStore((s) => s.feedMode)
  const { camera } = useThree()
  const targetRef = useRef({ pos: new THREE.Vector3(0, 16, 6), fov: 55 })
  const animating = useRef(false)

  useEffect(() => {
    const isGlobe = feedMode === 'GLOBE'
    targetRef.current = {
      pos: isGlobe ? new THREE.Vector3(0, 6, 14) : new THREE.Vector3(0, 16, 6),
      fov: isGlobe ? 45 : 55,
    }
    animating.current = true
  }, [feedMode])

  useFrame(() => {
    if (!animating.current) return
    const cam = camera as THREE.PerspectiveCamera
    const t = targetRef.current
    cam.position.lerp(t.pos, 0.08)
    cam.fov += (t.fov - cam.fov) * 0.08
    cam.updateProjectionMatrix()
    if (cam.position.distanceTo(t.pos) < 0.05) animating.current = false
  })

  return null
}

export function RadarCore() {
  const foldAngle = useStore((s) => s.foldAngle)
  const feedMode = useStore((s) => s.feedMode)
  const isGlobe = feedMode === 'GLOBE'

  const headerLabel = isGlobe
    ? 'GLOBE_VIEW // GEOSPATIAL_OVERLAY'
    : feedMode === 'LIVE_FEED'
      ? `RADAR_CORE // NASA_NEO_LIVE // FOLD: ${foldAngle}°`
      : `RADAR_CORE // SIMULATION // FOLD: ${foldAngle}°`

  return (
    <div className="radar-core panel">
      <div className="corner-tl" /><div className="corner-tr" />
      <div className="corner-bl" /><div className="corner-br" />
      <div className="panel-scan" />

      <div className="panel-header">
        <span>{headerLabel}</span>
        <span className="tag">{isGlobe ? 'TERRA INTERCEPT' : 'AETHERIC INTERCEPT'}</span>
      </div>
      <div style={{ position: 'relative', width: '100%', height: 'calc(100% - 32px)' }}>
        <Canvas
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
          camera={{ position: [0, 16, 6], fov: 55, near: 0.1, far: 200 }}
          dpr={[1, 2]}
          style={{ background: '#060709' }}
        >
          <color attach="background" args={['#060709']} />
          <fog attach="fog" args={['#060709', 15, 50]} />
          <OrbitControls
            enableRotate={true}
            enablePan={true}
            enableZoom={true}
            minDistance={7}
            maxDistance={40}
            zoomSpeed={0.8}
            rotateSpeed={0.5}
            panSpeed={0.6}
          />
          <CameraAnimator />
          {isGlobe ? <GlobeScene /> : <RadarScene />}
          <Effects />
        </Canvas>

        {/* HUD overlays — conditional on mode */}
        {isGlobe ? <GlobeHUD /> : (
          <>
            <RadarHUD />
            <TargetAnalysis />
          </>
        )}
      </div>
    </div>
  )
}

function RadarHUD() {
  const blips = useStore((s) => s.blips)
  const teleforceActive = useStore((s) => s.teleforceActive)
  const kelgLock = useStore((s) => s.kelgLock)
  const foldAngle = useStore((s) => s.foldAngle)
  const lockedBlipId = useStore((s) => s.lockedBlipId)
  const [uptime, setUptime] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setUptime((u) => u + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const nwtn = blips.filter((b) => b.type === 'NWTN').length
  const levy = blips.filter((b) => b.type === 'LEVY').length
  const cloak = blips.filter((b) => b.type === 'CLOAK').length
  const entangled = blips.filter((b) => b.isEntangled).length
  const locked = blips.find((b) => b.id === lockedBlipId)

  const hh = String(Math.floor(uptime / 3600)).padStart(2, '0')
  const mm = String(Math.floor((uptime % 3600) / 60)).padStart(2, '0')
  const ss = String(uptime % 60).padStart(2, '0')

  const hudStyle: React.CSSProperties = {
    fontSize: 8,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontFamily: 'var(--font-mono)',
    lineHeight: 1.6,
  }

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      padding: '6px 10px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
    }}>
      {/* ═══ TOP ROW ═══ */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {/* Top-left — system readouts */}
        <div style={{ ...hudStyle, color: 'var(--text-dim)' }}>
          <div>UPTIME: <span style={{ color: 'var(--text-mid)' }}>{hh}:{mm}:{ss}</span></div>
          <div>MASS_GAP: <span style={{ color: 'var(--primary)' }}>{MASS_GAP}</span></div>
          <div>GEO_LOCK: <span style={{ color: 'var(--primary)' }}>{GEOMETRIC_LOCK}</span></div>
          <div>FOLD: <span style={{ color: foldAngle > 60 ? 'var(--accent-violet)' : 'var(--primary)' }}>{foldAngle}° {foldAngle < 30 ? 'MATERIAL' : foldAngle > 60 ? 'AETHERIC' : 'TRANSITIONAL'}</span></div>
          {kelgLock && (
            <div style={{ color: 'var(--ink-primary)', marginTop: 2, letterSpacing: '0.05em' }}>
              ◆ KELG_LOCK // 465Hz // ENTROPY: FROZEN
            </div>
          )}
        </div>

        {/* Top-right — bearing compass */}
        <div style={{ ...hudStyle, color: 'var(--text-dim)', textAlign: 'right' }}>
          <div style={{ color: 'var(--primary)', fontSize: 9 }}>N 000°</div>
          <div>E 090° | W 270°</div>
          <div>S 180°</div>
          <div style={{ marginTop: 4 }}>RNG: 0—100 AU</div>
          <div>RES: {(144000).toLocaleString()}</div>
        </div>
      </div>

      {/* Lock info now handled by TargetAnalysis panel overlay */}

      {/* ═══ BOTTOM ROW ═══ */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
      }}>
        {/* Bottom-left — alerts */}
        <div style={{ ...hudStyle }}>
          {teleforceActive && (
            <div style={{
              color: 'var(--primary)',
              textShadow: '0 0 10px var(--primary-glow)',
              fontSize: 9,
              animation: 'glow-pulse 0.5s infinite',
            }}>
              ⚡ TELEFORCE: CHARGED — φ² INTERSECTION ACTIVE
            </div>
          )}
          {entangled > 0 && (
            <div style={{ color: 'var(--accent-violet)' }}>
              ⟨⟩ ENTANGLED PAIRS: {entangled}
            </div>
          )}
        </div>

        {/* Bottom-right — object counts */}
        <div style={{
          ...hudStyle,
          display: 'flex',
          gap: 12,
          fontSize: 9,
          background: 'rgba(12, 14, 18, 0.6)',
          padding: '3px 8px',
          border: '1px solid var(--border-dim)',
        }}>
          <span>BLIPS: <span style={{ color: 'var(--text-bright)' }}>{blips.length}</span></span>
          <span style={{ color: 'var(--border-mid)' }}>|</span>
          <span style={{ color: '#B87820' }}>NWTN: {nwtn}</span>
          <span style={{ color: '#3A7A8C' }}>LEVY: {levy}</span>
          <span style={{ color: cloak > 0 ? '#E8E4D8' : 'var(--ink-tertiary)' }}>CLOAK: {cloak}</span>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
//  GLOBE HUD — Geospatial overlay stats + lock panel
// ═══════════════════════════════════════════════════════
// Haversine distance in km between two lat/lon points
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Compass bearing from point 1 to point 2
function bearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = (lon2 - lon1) * Math.PI / 180
  const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180)
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180)
    - Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon)
  return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`
  if (km < 100) return `${km.toFixed(1)}km`
  return `${Math.round(km).toLocaleString()}km`
}

function GlobeHUD() {
  const earthquakes = useStore((s) => s.earthquakes)
  const issPosition = useStore((s) => s.issPosition)
  const aircraft = useStore((s) => s.aircraft)
  const spaceWeather = useStore((s) => s.spaceWeather)
  const lockedTarget = useStore((s) => s.lockedGlobeTarget)
  const setLockedGlobeTarget = useStore((s) => s.setLockedGlobeTarget)
  const addLog = useStore((s) => s.addLog)
  const teleforceActive = useStore((s) => s.teleforceActive)
  const [uptime, setUptime] = useState(0)

  // User origin (South Wales)
  const USER_LAT = 51.5
  const USER_LON = -3.2

  useEffect(() => {
    const id = setInterval(() => setUptime((u) => u + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const hh = String(Math.floor(uptime / 3600)).padStart(2, '0')
  const mm = String(Math.floor((uptime % 3600) / 60)).padStart(2, '0')
  const ss = String(uptime % 60).padStart(2, '0')

  const maxMag = earthquakes.length > 0 ? Math.max(...earthquakes.map((e) => e.mag)) : 0

  // Get details for locked earthquake
  const lockedQuake = lockedTarget?.kind === 'earthquake'
    ? earthquakes.find((e) => e.id === lockedTarget.id) : null

  // Distance + bearing from user to locked target
  const distKm = lockedTarget ? haversineKm(USER_LAT, USER_LON, lockedTarget.lat, lockedTarget.lon) : 0
  const brg = lockedTarget ? bearing(USER_LAT, USER_LON, lockedTarget.lat, lockedTarget.lon) : 0

  // Locked aircraft details
  const lockedAircraft = lockedTarget?.kind === 'aircraft'
    ? aircraft.find((a) => a.icao24 === lockedTarget.id) : null

  // Awen Grid target palette — desat per spec §2.7
  const kindColors: Record<string, string> = {
    earthquake: '#B87820', iss: '#3A7A8C', aircraft: '#5A8070', user: '#8A4A6A',
  }
  const kindIcons: Record<string, string> = {
    earthquake: '◇', iss: '◈', aircraft: '▷', user: '◆',
  }

  const hudStyle: React.CSSProperties = {
    fontSize: 8,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontFamily: 'var(--font-mono)',
    lineHeight: 1.6,
  }

  const handleUnlock = () => {
    if (lockedTarget) {
      addLog({ type: 'SYS', source: 'GLOBE', message: `Target unlocked: ${lockedTarget.name}` })
      setLockedGlobeTarget(null)
    }
  }

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      padding: '6px 10px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
    }}>
      {/* ═══ TOP ROW ═══ */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ ...hudStyle, color: 'var(--text-dim)' }}>
          <div>UPTIME: <span style={{ color: 'var(--text-mid)' }}>{hh}:{mm}:{ss}</span></div>
          <div>MODE: <span style={{ color: 'var(--accent-ink)' }}>GEOSPATIAL OVERLAY</span></div>
          <div>Kp: <span style={{ color: spaceWeather.kpIndex >= 5 ? 'var(--status-alert)' : 'var(--status-caution)' }}>{spaceWeather.kpIndex}</span> | WIND: <span style={{ color: 'var(--status-caution)' }}>{spaceWeather.solarWind}</span>km/s</div>
          <div>ORIGIN: <span style={{ color: 'var(--accent-ink)' }}>51.5°N 3.2°W</span> <span style={{ color: 'var(--text-dim)' }}>(CYMRU)</span></div>
        </div>

        {/* ═══ LOCK TARGET PANEL (top-right) ═══ */}
        {lockedTarget ? (
          <div style={{
            ...hudStyle,
            textAlign: 'right',
            background: 'rgba(12, 14, 18, 0.92)', // --bg-surface
            border: `1px solid ${kindColors[lockedTarget.kind] || 'var(--accent-ink)'}`,
            padding: '8px 12px',
            minWidth: 200,
            maxWidth: 260,
          }}>
            {/* Header with kind icon + unlock button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <div style={{ color: kindColors[lockedTarget.kind], fontSize: 9 }}>
                {kindIcons[lockedTarget.kind] || '◆'} {lockedTarget.kind.toUpperCase()} — LOCKED
              </div>
              <button
                onClick={handleUnlock}
                style={{
                  pointerEvents: 'auto',
                  background: 'rgba(160, 58, 42, 0.14)',
                  border: '1px solid rgba(160, 58, 42, 0.5)',
                  color: 'var(--status-alert)',
                  fontSize: 7,
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: 1,
                  padding: '1px 6px',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(160, 58, 42, 0.32)'
                  e.currentTarget.style.borderColor = 'rgba(160, 58, 42, 0.85)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(160, 58, 42, 0.14)'
                  e.currentTarget.style.borderColor = 'rgba(160, 58, 42, 0.5)'
                }}
              >
                UNLOCK
              </button>
            </div>

            {/* Target name */}
            <div style={{ color: 'var(--text-bright)', fontSize: 8, marginBottom: 6, wordBreak: 'break-word' }}>
              {lockedTarget.name}
            </div>

            {/* Divider */}
            <div style={{ borderTop: `1px solid ${kindColors[lockedTarget.kind]}33`, margin: '4px 0 6px' }} />

            {/* Coordinates */}
            <div style={{ color: 'var(--text-dim)' }}>
              LAT: <span style={{ color: 'var(--text-mid)' }}>{lockedTarget.lat.toFixed(4)}°</span>
              <span style={{ margin: '0 6px', color: 'var(--border-dim)' }}>|</span>
              LON: <span style={{ color: 'var(--text-mid)' }}>{lockedTarget.lon.toFixed(4)}°</span>
            </div>

            {/* Distance + bearing from user */}
            <div style={{ color: 'var(--text-dim)', marginTop: 2 }}>
              DIST: <span style={{ color: 'var(--accent-ink)' }}>{formatDistance(distKm)}</span>
              <span style={{ margin: '0 6px', color: 'var(--border-dim)' }}>|</span>
              BRG: <span style={{ color: 'var(--accent-ink)' }}>{brg.toFixed(0)}°</span>
            </div>

            {/* Extra earthquake details */}
            {lockedQuake && (
              <>
                <div style={{ borderTop: `1px solid ${kindColors[lockedTarget.kind]}22`, margin: '6px 0 4px' }} />
                <div style={{ color: 'var(--text-dim)' }}>
                  MAG: <span style={{ color: lockedQuake.mag >= 5 ? 'var(--status-alert)' : 'var(--status-caution)', fontSize: 10, fontWeight: 'bold' }}>{lockedQuake.mag.toFixed(1)}</span>
                  <span style={{ margin: '0 6px', color: 'var(--border-dim)' }}>|</span>
                  DEPTH: <span style={{ color: 'var(--text-mid)' }}>{lockedQuake.depth.toFixed(1)}km</span>
                </div>
                <div style={{ color: 'var(--text-dim)', marginTop: 2 }}>
                  TIME: <span style={{ color: 'var(--text-mid)' }}>{new Date(lockedQuake.time).toLocaleTimeString()}</span>
                </div>
                <div style={{ color: 'var(--text-dim)', marginTop: 2 }}>
                  PLACE: <span style={{ color: 'var(--text-mid)' }}>{lockedQuake.place}</span>
                </div>
                {lockedQuake.tsunami && (
                  <div style={{ color: 'var(--status-alert)', marginTop: 4, fontSize: 9 }}>
                    !! TSUNAMI WARNING !!
                  </div>
                )}
              </>
            )}

            {/* ISS extra details */}
            {lockedTarget.kind === 'iss' && issPosition && (
              <>
                <div style={{ borderTop: `1px solid ${kindColors[lockedTarget.kind]}22`, margin: '6px 0 4px' }} />
                <div style={{ color: 'var(--text-dim)' }}>
                  ALT: <span style={{ color: 'var(--text-mid)' }}>{issPosition.altitude}km</span>
                  <span style={{ margin: '0 6px', color: 'var(--border-dim)' }}>|</span>
                  VEL: <span style={{ color: 'var(--text-mid)' }}>{issPosition.velocity}km/h</span>
                </div>
                <div style={{ color: 'var(--text-dim)', marginTop: 2 }}>
                  ORBIT: <span style={{ color: '#3A7A8C' }}>LEO</span>
                  <span style={{ margin: '0 6px', color: 'var(--border-dim)' }}>|</span>
                  PERIOD: <span style={{ color: 'var(--text-mid)' }}>~92min</span>
                </div>
              </>
            )}

            {/* Aircraft extra details */}
            {lockedAircraft && (
              <>
                <div style={{ borderTop: `1px solid ${kindColors[lockedTarget.kind]}22`, margin: '6px 0 4px' }} />
                <div style={{ color: 'var(--text-dim)' }}>
                  ALT: <span style={{ color: 'var(--text-mid)' }}>{Math.round(lockedAircraft.altitude)}m</span>
                  <span style={{ margin: '0 6px', color: 'var(--border-dim)' }}>|</span>
                  VEL: <span style={{ color: 'var(--text-mid)' }}>{Math.round(lockedAircraft.velocity)}m/s</span>
                </div>
                <div style={{ color: 'var(--text-dim)', marginTop: 2 }}>
                  HDG: <span style={{ color: 'var(--text-mid)' }}>{Math.round(lockedAircraft.heading)}°</span>
                  <span style={{ margin: '0 6px', color: 'var(--border-dim)' }}>|</span>
                  ICAO: <span style={{ color: 'var(--text-mid)' }}>{lockedAircraft.icao24}</span>
                </div>
                <div style={{ color: 'var(--text-dim)', marginTop: 2 }}>
                  ORIGIN: <span style={{ color: 'var(--text-mid)' }}>{lockedAircraft.country}</span>
                </div>
              </>
            )}

            {/* Teleforce status */}
            {teleforceActive && issPosition && (
              <div style={{
                color: 'var(--status-caution)',
                marginTop: 6,
                fontSize: 9,
                borderTop: '1px solid rgba(184, 120, 32, 0.25)',
                paddingTop: 4,
                animation: 'pulse-caution 2s ease-in-out infinite',
              }}>
                {'!! TELEFORCE: ISS → TARGET !!'}
              </div>
            )}
          </div>
        ) : (
          <div style={{ ...hudStyle, color: 'var(--text-dim)', textAlign: 'right' }}>
            <div style={{ color: 'var(--accent-ink)', fontSize: 9 }}>TERRA VIEW</div>
            <div>SCROLL: ZOOM | DRAG: ROTATE</div>
            <div>CLICK: LOCK TARGET</div>
            <div>REFRESH: 5min</div>
          </div>
        )}
      </div>

      {/* ═══ BOTTOM ROW ═══ */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
      }}>
        {/* Bottom-left — ISS / Teleforce */}
        <div style={{ ...hudStyle }}>
          {issPosition && (
            <div style={{ color: '#3A7A8C' }}>
              ISS: LAT {issPosition.latitude.toFixed(2)}° LON {issPosition.longitude.toFixed(2)}° | ALT {issPosition.altitude}km | VEL {issPosition.velocity}km/h
            </div>
          )}
          {teleforceActive && lockedTarget && (
            <div style={{
              color: 'var(--status-caution)',
              animation: 'pulse-caution 2s ease-in-out infinite',
            }}>
              !! TELEFORCE: CHARGED — ISS ORBITAL STRIKE ACTIVE !!
            </div>
          )}
        </div>

        {/* Bottom-right — data counts */}
        <div style={{
          ...hudStyle,
          display: 'flex',
          gap: 12,
          fontSize: 9,
          background: 'rgba(12, 14, 18, 0.7)',
          padding: '4px 10px',
          border: '1px solid var(--border-dim)',
        }}>
          <span style={{ color: 'var(--status-caution)' }}>QUAKES: {earthquakes.length} {maxMag > 0 ? `(M${maxMag.toFixed(1)} MAX)` : ''}</span>
          <span style={{ color: 'var(--border-mid)' }}>|</span>
          <span style={{ color: 'var(--ink-primary)' }}>ISS: {issPosition ? 'TRACKING' : 'OFFLINE'}</span>
          <span style={{ color: 'var(--border-mid)' }}>|</span>
          <span style={{ color: 'var(--status-nominal)' }}>AIRCRAFT: {aircraft.length}</span>
          {lockedTarget && (
            <>
              <span style={{ color: 'var(--border-mid)' }}>|</span>
              <span style={{ color: kindColors[lockedTarget.kind] }}>
                {kindIcons[lockedTarget.kind]} LOCKED — {formatDistance(distKm)}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
