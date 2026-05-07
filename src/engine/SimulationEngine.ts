import type { Blip, BlipType } from '../types'
import { PHI, LION_CONSTANT, TOGGLE_POWER } from './RHCConstants'

// ═══════════════════════════════════════════════════════════════════
//  Physics tuning — calibrated 2026-04-17 (Awen Grid v4.0)
// ═══════════════════════════════════════════════════════════════════
// Per-frame damping factors. Multiplied into velocity every tick; at
// 60fps, per-second retention = D^60.
//   LOCKED_DAMPING = 0.92   → ~0.7% retained/sec (canonical superconductor
//                              freeze; ZPE §3 "Cryogenic Soul" and
//                              simulation-engine.md §7.4 item 1).
//   NORMAL_DAMPING = 0.99   → ~55% retained/sec — ohmic flow, blips drift
//                              visibly but decay. Replaces 0.9992 which
//                              retained 95%/sec and let accelerations
//                              accumulate into 1500-unit/sec velocities.
const LOCKED_DAMPING = 0.92
const NORMAL_DAMPING = 0.99

// NWTN orbital tangent kick — Lagrangian Arc Trajectory instantiation.
// Steady-state tangential speed at NORMAL_DAMPING: K/(1-D) = 0.08 per tick
// ≈ 4.8 units/sec. A lazy circumnavigating orbit. Down from 0.02 (which
// gave 25 units/tick = 1500 units/sec runaway).
const NWTN_ORBITAL_K = 0.0008

// CLOAK sinusoidal drift — phase-locked oscillation amplitude per tick.
// Small enough that the RMS steady-state velocity stays under 10 units/sec.
const CLOAK_DRIFT_K = 0.005

// LEVY power-law jump — rare, bounded. TOGGLE_POWER (=7, Codex row 31 mod
// 24) caps the magnitude so a one-in-a-million random draw can't teleport
// a blip off-radar in one tick.
const LEVY_JUMP_PROB = 0.01
const LEVY_JUMP_CAP = TOGGLE_POWER

// Spawn velocity range per axis: [-0.3, 0.3]. At NORMAL_DAMPING the
// initial displacement from spawn velocity is ~30 units; blips then settle
// into NWTN/LEVY/CLOAK drift modes.
const SPAWN_VELOCITY_RANGE = 0.6

// Lifecycle thresholds — extracted from the prune filter (simulation-
// engine.md §5 item 7, §4.3). RADAR_EDGE is slightly past the 100-unit
// visible radius so blips fade at the boundary rather than popping.
export const RADAR_EDGE = 105
export const BLIP_LIFETIME_S = 150

let idCounter = 0

const ASTEROID_NAMES = [
  '(2024 MK)', '(2023 FW13)', '(2025 HD1)', '(2024 QJ3)', '(3011 FY9)',
  '(2020 VU3)', '(2022 BL)', '(2023 RN11)', '(2024 TP7)', '(2025 MJ1)',
  '(3002 TB70)', '(216969)', '(2028 YR3)', '(99942 Apophis)', '(2024 XS)',
  '(523651)', '(2019 OK)', '(2024 BX1)', '(2023 CX1)', '(2021 PH27)',
]

function randomName(): string {
  return ASTEROID_NAMES[Math.floor(Math.random() * ASTEROID_NAMES.length)]
}

function classifyBlip(): BlipType {
  const r = Math.random()
  if (r < 0.05) return 'CLOAK'
  if (r < 0.20) return 'LEVY'
  return 'NWTN'
}

export function spawnBlip(): Blip {
  const type = classifyBlip()
  const bearing = Math.random() * 360
  const range = 10 + Math.random() * 80
  const angle = (bearing * Math.PI) / 180

  return {
    id: `blip-${++idCounter}-${Date.now()}`,
    name: randomName(),
    type,
    x: Math.sin(angle) * range,
    y: 0,
    z: -Math.cos(angle) * range,
    vx: (Math.random() - 0.5) * SPAWN_VELOCITY_RANGE,
    vy: 0,
    vz: (Math.random() - 0.5) * SPAWN_VELOCITY_RANGE,
    bearing,
    range,
    signal: type === 'CLOAK' ? 5 + Math.random() * 15 : 2 + Math.random() * 8,
    coherence: type === 'CLOAK' ? 0.7 + Math.random() * 0.3
             : type === 'LEVY' ? 0.3 + Math.random() * 0.5
             : Math.random() * 0.3,
    entropy: Math.random(),
    quaternionW: Math.cos(Math.random() * Math.PI),
    gForce: Math.random() * 2,
    isLocked: false,
    isEntangled: false,
    age: 0,
    trail: [],
  }
}

export function tickPhysics(blips: Blip[], dt: number, kelgLock: boolean): Blip[] {
  const time = Date.now() * 0.001

  return blips.map((blip) => {
    const updated = { ...blip }
    updated.age += dt

    // Velocity damping — superconductor phase (kelgLock) vs ohmic flow.
    // Per-tick retention; canonical framing per simulation-engine.md §7.4 item 1.
    const damping = kelgLock ? LOCKED_DAMPING : NORMAL_DAMPING
    updated.vx *= damping
    updated.vz *= damping

    const distFromCenter = Math.max(
      Math.sqrt(updated.x * updated.x + updated.z * updated.z),
      1,
    )

    // Type-specific behavior
    if (blip.type === 'LEVY') {
      // Lévy flight: occasional bounded power-law jump. Cap at TOGGLE_POWER
      // (=7) prevents one-in-a-million random draws from teleporting the blip.
      if (Math.random() < LEVY_JUMP_PROB) {
        const jumpMag = Math.min(
          Math.pow(Math.random(), -1.1) * 3,
          LEVY_JUMP_CAP,
        )
        const jumpAngle = Math.random() * Math.PI * 2
        updated.vx += Math.cos(jumpAngle) * jumpMag
        updated.vz += Math.sin(jumpAngle) * jumpMag
      }
    } else if (blip.type === 'CLOAK') {
      // Scalar cloak: phase-locked sinusoidal drift on time·φ + signal.
      updated.vx += Math.sin(time * PHI + blip.signal) * CLOAK_DRIFT_K
      updated.vz += Math.cos(time * PHI + blip.signal) * CLOAK_DRIFT_K
    } else {
      // NWTN: perpendicular orbital kick. Tangent unit vector is (-z, x)/r
      // (counter-clockwise on the y=0 plane). The previous atan2(x,z)+π/2
      // formulation produced radial pushes on the cardinal axes — §4 drift fix.
      updated.vx += (-updated.z / distFromCenter) * NWTN_ORBITAL_K
      updated.vz += (updated.x / distFromCenter) * NWTN_ORBITAL_K
    }

    // Update position
    updated.x += updated.vx * dt
    updated.z += updated.vz * dt

    // Recalculate polar coords
    updated.range = Math.sqrt(updated.x * updated.x + updated.z * updated.z)
    updated.bearing = ((Math.atan2(updated.x, -updated.z) * 180) / Math.PI + 360) % 360

    // Update coherence with quaternion wobble
    updated.quaternionW = Math.cos((time * PHI) + blip.signal)
    updated.coherence = Math.abs(updated.quaternionW) * (blip.type === 'CLOAK' ? 1.0 : 0.6)

    // Entropy
    updated.entropy = 1 - updated.coherence * LION_CONSTANT

    // G-force from velocity change
    updated.gForce = Math.sqrt(updated.vx * updated.vx + updated.vz * updated.vz)

    // Trail — store position every ~6 frames for a longer visible history
    const trailInterval = Math.floor(updated.age * 10) % 6
    if (trailInterval === 0 || blip.trail.length === 0) {
      updated.trail = [...blip.trail.slice(-50), [updated.x, 0, updated.z]]
    } else {
      updated.trail = blip.trail
    }

    return updated
  })
}

// Extracted from tickPhysics (simulation-engine.md §5 item 7, §4.3 smell).
// Lifecycle pruning is now a separate pure function; the scheduler in
// RadarScene composes tickPhysics → checkEntanglement → pruneDead.
export function pruneDead(blips: Blip[]): Blip[] {
  return blips.filter((b) => b.range < RADAR_EDGE && b.age < BLIP_LIFETIME_S)
}

export function checkEntanglement(blips: Blip[]): Blip[] {
  return blips.map((blip) => {
    const entangled = blips.some(
      (other) =>
        other.id !== blip.id &&
        Math.abs(other.quaternionW - blip.quaternionW) < 0.05
    )
    return { ...blip, isEntangled: entangled }
  })
}
