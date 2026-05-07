// ═══════════════════════════════════════════════════════════════════
//  PLASMA FIELD — 1D damped/driven wave solver for luminous-thread viz
//
//  Implements zpe.md §8.5 decision: minimal 1D standing-wave solver
//  along the coil z-axis. Produces a `threadProfile` amplitude array
//  that the panel renders as a spark-line — a real standing-wave
//  pattern, not a stylized bar.
//
//  Solves the damped/driven scalar wave equation:
//
//      ∂²ψ/∂z² − (1/c²)∂²ψ/∂t² − (γ/c²)∂ψ/∂t + F(z, t) = 0
//
//  where:
//      ψ(z, t)        field amplitude along coil axis
//      c              phase velocity in prepared medium (§3.1 "slow light")
//      γ = ω₀/Q       damping from Q-factor
//      F(z, t)        drive at active harmonic key, Gaussian at primary-turn position
//
//  Leapfrog time integration (symplectic — preserves energy under no
//  drive, matches the physical intuition that a well-tuned Tesla tube
//  is nearly lossless). First-order Mur absorbing BC at both ends so
//  we don't get false standing waves from reflections — the thread
//  should be a driven mode, not a box mode.
//
//  Why leapfrog specifically: the §5 failsafe triggers on plasmon > 0.95
//  (thread `cracking`). A drifty scheme like RK4 can slowly accumulate
//  numerical energy and false-trip that failsafe. Leapfrog is stable
//  and bounded when CFL is respected.
//
//  Canonical source:
//    docs/architecture/engines/zpe.md §8.5 decision record (2026-04-17)
// ═══════════════════════════════════════════════════════════════════

import {
  PLASMA_CELLS,
  PLASMA_PHASE_VELOCITY,
  PLASMA_COIL_LENGTH_M,
} from './RHCConstants'

export interface PlasmaField {
  readonly cells: number          // spatial resolution (cells along z)
  readonly length: number         // physical coil length, metres
  readonly dz: number             // spatial step, metres
  psi: Float32Array               // current-timestep amplitude (cells)
  psiPrev: Float32Array           // previous-timestep amplitude (cells) — leapfrog needs 2 frames
  t: number                       // accumulated simulation time, seconds
}

export function createPlasmaField(
  cells: number = PLASMA_CELLS,
  length: number = PLASMA_COIL_LENGTH_M,
): PlasmaField {
  return {
    cells,
    length,
    dz: length / (cells - 1),
    psi: new Float32Array(cells),
    psiPrev: new Float32Array(cells),
    t: 0,
  }
}

export function resetPlasmaField(field: PlasmaField): PlasmaField {
  field.psi.fill(0)
  field.psiPrev.fill(0)
  field.t = 0
  return field
}

// ─── Stability: Courant–Friedrichs–Lewy (CFL) constraint ──────────
//
// For 1D explicit wave integration the dimensionless Courant number
// α = c · dt / dz must satisfy α ≤ 1. We compute an internal timestep
// cap to guarantee this regardless of the caller's dt.
function safeDt(field: PlasmaField, dtRequested: number): number {
  const dtCFL = 0.9 * field.dz / PLASMA_PHASE_VELOCITY
  return Math.min(dtRequested, dtCFL)
}

// ─── One leapfrog step with damped/driven wave equation ───────────
//
// Discretization (central differences in space, 3-level in time):
//
//   ψ[j]_{n+1} = (1 / (1 + α·γ·dt/2)) · (
//       2·ψ[j]_n − ψ[j]_{n−1}
//       + C² · (ψ[j+1]_n − 2ψ[j]_n + ψ[j−1]_n)
//       + γ·dt/2 · ψ[j]_{n−1}
//       + dt² · F[j]_n
//   )
//
// where C = c·dt/dz (Courant number) and F[j] is the drive term.
// Boundary cells j=0 and j=N-1 use Mur first-order absorbing BC.
export function tickPlasmaField(
  field: PlasmaField,
  dt: number,
  driveFreqHz: number,
  driveAmplitude: number,           // peak amplitude of the forcing term
  primaryTurnPositionM: number,     // where drive couples in, default ~ 0.2L
  qFactor: number,                  // Q → damping γ = ω₀/Q
  couplingCrack: boolean,           // §5 cracking? inject noise instead of coherent drive
): PlasmaField {
  if (dt <= 0 || driveAmplitude === 0) {
    return { ...field }
  }

  const step = safeDt(field, dt)
  const cells = field.cells
  const dz = field.dz
  const c = PLASMA_PHASE_VELOCITY

  const omega = 2 * Math.PI * driveFreqHz
  const gamma = qFactor > 0 ? omega / qFactor : omega * 10 // huge damping if Q=0
  const C = c * step / dz
  const C2 = C * C
  const dt2 = step * step

  // Gaussian drive shape centred on the primary-turn coupling point
  const driveCentre = Math.min(Math.max(primaryTurnPositionM, 0), field.length)
  const driveSigmaCells = Math.max(1, cells / 12)
  const driveCentreCell = (driveCentre / field.length) * (cells - 1)

  const denom = 1 + gamma * step / 2

  const next = new Float32Array(cells)

  // Interior cells: central-difference Laplacian + damping + drive
  for (let j = 1; j < cells - 1; j++) {
    const laplacian = field.psi[j + 1] - 2 * field.psi[j] + field.psi[j - 1]
    const cellOffset = j - driveCentreCell
    const gauss = Math.exp(-(cellOffset * cellOffset) / (2 * driveSigmaCells * driveSigmaCells))
    // Cracking mode injects incoherent noise — §5 Trigger 2 signature.
    const driveTerm = couplingCrack
      ? (Math.random() - 0.5) * 2 * driveAmplitude
      : driveAmplitude * Math.sin(omega * field.t) * gauss

    next[j] = (
      2 * field.psi[j]
      - field.psiPrev[j]
      + C2 * laplacian
      + (gamma * step / 2) * field.psiPrev[j]
      + dt2 * driveTerm
    ) / denom
  }

  // Mur first-order absorbing boundaries (outgoing-wave only).
  // ψ[0]_{n+1} = ψ[1]_n + ((C−1)/(C+1))·(ψ[1]_{n+1} − ψ[0]_n)
  // Approximation: treat ψ[1]_{n+1} as next[1] from the interior update.
  const murCoef = (C - 1) / (C + 1)
  next[0] = field.psi[1] + murCoef * (next[1] - field.psi[0])
  next[cells - 1] = field.psi[cells - 2] + murCoef * (next[cells - 2] - field.psi[cells - 1])

  return {
    ...field,
    psi: next,
    psiPrev: field.psi,
    t: field.t + step,
  }
}

// ─── Derived observables ──────────────────────────────────────────

/**
 * Peak absolute amplitude across the profile — used to modulate
 * plasmon density / coherence when the panel wants wave-solver fidelity.
 */
export function peakAmplitude(field: PlasmaField): number {
  let peak = 0
  for (let j = 0; j < field.cells; j++) {
    const a = Math.abs(field.psi[j])
    if (a > peak) peak = a
  }
  return peak
}

/**
 * Normalized profile in [-1, 1] range for visualization. Copies;
 * caller can mutate freely.
 */
export function normalizedProfile(field: PlasmaField): Float32Array {
  const peak = peakAmplitude(field)
  if (peak === 0) return new Float32Array(field.cells)
  const out = new Float32Array(field.cells)
  for (let j = 0; j < field.cells; j++) {
    out[j] = field.psi[j] / peak
  }
  return out
}
