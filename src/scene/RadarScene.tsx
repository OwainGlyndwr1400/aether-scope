import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useStore } from '../store/useStore'
import { RadarGrid } from './RadarGrid'
import { SweepBeam } from './SweepBeam'
import { BlipMesh } from './BlipMesh'
import { TelluricPulse } from './TelluricPulse'
import { TeleforceBeam } from './TeleforceBeam'
import { tickPhysics, checkEntanglement, pruneDead } from '../engine/SimulationEngine'
import { loadNASAData } from '../engine/useSimulation'

export const RADAR_RADIUS = 10

// Shared sweep angle so blips know when they've been "pinged"
export const sweepState = { angle: 0 }

// Runs physics inside R3F's render loop — guaranteed to fire every frame
function PhysicsTick() {
  const lastTime = useRef(performance.now())
  const refetching = useRef(false)
  const lastFetch = useRef(0)  // Timestamp of last successful fetch

  useFrame(() => {
    const now = performance.now()
    const dt = Math.min((now - lastTime.current) / 1000, 0.1)
    lastTime.current = now

    const s = useStore.getState()

    // LIVE_FEED auto-refresh with cooldown
    if (s.feedMode === 'LIVE_FEED' && !refetching.current) {
      const timeSinceFetch = now - lastFetch.current
      const COOLDOWN = 60_000 // Minimum 60s between fetches
      const HEARTBEAT = 180_000 // Forced refresh every 3 minutes

      if (timeSinceFetch > COOLDOWN || lastFetch.current === 0) {
        // Count blips actually visible on radar (range < 100)
        const visibleBlips = s.blips.filter(b => b.range < 100).length
        const lowBlips = visibleBlips <= 3
        const heartbeatDue = timeSinceFetch > HEARTBEAT && lastFetch.current > 0

        if (lowBlips || heartbeatDue) {
          refetching.current = true
          lastFetch.current = now
          const msg = heartbeatDue
            ? 'Heartbeat — refreshing NEO telemetry...'
            : `Radar thinning (${visibleBlips} contacts) — refreshing...`
          s.addLog({ type: 'SYS', source: 'NASA', message: msg })
          loadNASAData().finally(() => { refetching.current = false })
        }
      }
    }

    if (s.blips.length === 0) return

    // LIVE/SIM boundary (simulation-engine.md §4.1 / §5 item 8).
    // Physics only runs in SIMULATION mode; LIVE mode displays real NEO
    // positions as refreshed by loadNASAData, without per-frame edits.
    if (s.feedMode !== 'SIMULATION') {
      s.setPhysicsLoad((s.blips.length / 25) * 100)
      return
    }

    let updated = tickPhysics(s.blips, dt, s.kelgLock)
    updated = checkEntanglement(updated)
    updated = pruneDead(updated)
    s.setPhysicsLoad((updated.length / 25) * 100)
    s.setBlips(updated)
  })

  return null
}

export function RadarScene() {
  const blips = useStore((s) => s.blips)
  const foldAngle = useStore((s) => s.foldAngle)

  return (
    <>
      {/* Physics engine — runs every frame inside the GPU render loop */}
      <PhysicsTick />

      {/* Ambient & directional light for depth */}
      <ambientLight intensity={0.08} color="#1a1612" />
      <pointLight position={[0, 8, 0]} intensity={0.45} color="#C8860A" distance={25} decay={2} />

      {/* The radar dish surface */}
      <RadarGrid radius={RADAR_RADIUS} foldAngle={foldAngle} />

      {/* Rotating sweep beam */}
      <SweepBeam radius={RADAR_RADIUS} />

      {/* Telluric heartbeat pulse rings */}
      <TelluricPulse radius={RADAR_RADIUS} />

      {/* Teleforce beam — Tesla death ray to locked target */}
      <TeleforceBeam radarRadius={RADAR_RADIUS} />

      {/* Blip meshes */}
      {blips.map((blip) => (
        <BlipMesh key={blip.id} blip={blip} radarRadius={RADAR_RADIUS} foldAngle={foldAngle} />
      ))}
    </>
  )
}
