/**
 * RHC Analysis Engine
 * ═══════════════════════════════════════════════════════════════
 * Computes Recursive Harmonic Codex metrics for blip analysis.
 * Based on the RHC Unified Paradigm mathematics (Table 1).
 *
 * Each metric maps a blip's physical properties to an RHC equation,
 * producing a normalised 0-100 score plus raw values.
 */

import type { Blip } from '../types'
import {
  PHI, LION_CONSTANT, MASS_GAP, MASS_GAP_EXACT, SCHUMANN, KELG_FREQUENCY,
  GOLDEN_HARMONIC, SOURCE_RETURN, FOLD_OPERATOR,
  DEDEKIND_ETA_TAX, GEOMETRIC_LOCK, RESOLUTION_LIMIT,
  TRINITY_CONSTANT, FORBIDDEN_STATE, TOGGLE_POWER,
  MINIMAL_CLOSURE_OMEGA,
} from './RHCConstants'

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface RHCMetric {
  key: string
  label: string
  shortLabel: string
  equation: string
  value: number       // raw computed value
  normalised: number  // 0-100 score (higher = more resonant/aligned)
  color: string
  significance: string
}

export interface RHCAnalysis {
  metrics: RHCMetric[]
  overallResonance: number   // 0-100 composite score
  harmonicSignature: string  // human-readable classification
  nullLedgerStatus: 'BALANCED' | 'REAL_HEAVY' | 'IMAG_HEAVY' | 'CRITICAL'
  timestamp: number
}

// ═══════════════════════════════════════════════════════════════
// Constants derived from the Codex
// ═══════════════════════════════════════════════════════════════

const OBSERVER_REAL = 2.5       // O = 2.5r + 1.5i
const OBSERVER_IMAG = 1.5
const LOST_2 = 2               // (3+4) - 5 = 2
// DARK_MATTER_FRACTION (2/7) and MASS_GAP_EXACT (√32 − 5) are canonically
// exported from RHCConstants.ts; imports above supply them. Local
// duplicates removed 2026-04-16.
const THREE_WAY_FOLD_REAL = 0.25    // F₃ = 0.25 + 0.5i
const THREE_WAY_FOLD_IMAG = 0.5

// ═══════════════════════════════════════════════════════════════
// Individual metric computations
// ═══════════════════════════════════════════════════════════════

/** Φ Resonance — Golden ratio alignment of coherence/entropy
 *
 * §5 item 2: original sig/(coh×100) was unreachable — ratio topped out
 * at ~0.33 vs φ=1.618. coherence/entropy uses two unit-free channels in
 * comparable ranges; high-coherence blips (CLOAK) land near φ, giving
 * the metric a physically meaningful lock point.
 */
function phiResonance(blip: Blip): RHCMetric {
  const entropy = Math.max(blip.entropy, 0.001)
  const ratio = blip.coherence / entropy
  const deviation = Math.abs(ratio - PHI) / PHI
  const normalised = Math.max(0, 100 * (1 - deviation))

  return {
    key: 'phi',
    label: 'Φ Resonance',
    shortLabel: 'PHI',
    equation: '|coh/ent - φ| / φ',
    value: ratio,
    normalised,
    color: '#ffaa00',
    significance: 'Golden ratio lock — harmonic equilibrium point',
  }
}

/** Fold Coherence — F = i/2 quaternionic alignment with fold angle
 *
 * §5 item 3: F = i/2 scales the output (magnitude), not the input
 * (angle). idealW = FOLD_OPERATOR × cos(foldRad), not cos(foldRad × FOLD_OPERATOR).
 */
function foldCoherence(blip: Blip, foldAngle: number): RHCMetric {
  const foldRad = (foldAngle * Math.PI) / 180
  const idealW = FOLD_OPERATOR * Math.cos(foldRad)
  const alignment = 1 - Math.abs(blip.quaternionW - idealW)
  const normalised = Math.max(0, Math.min(100, alignment * 100))

  return {
    key: 'fold',
    label: 'Fold Coherence',
    shortLabel: 'FOLD',
    equation: 'F = i/2 → |qW - F·cos(θ)|',
    value: alignment,
    normalised,
    color: '#3A7A8C',
    significance: 'Geometric state collapse alignment — observer fold angle match',
  }
}

/** LION Index — Scalar coupling strength */
function lionIndex(blip: Blip): RHCMetric {
  const raw = blip.signal * blip.coherence * LION_CONSTANT
  const normalised = Math.min(100, raw * 10) // scale to 0-100

  return {
    key: 'lion',
    label: 'LION Index',
    shortLabel: 'LION',
    equation: 'sig × coh × 0.536',
    value: raw,
    normalised,
    color: '#ff8800',
    significance: 'Scalar torsion coupling — entanglement strength indicator',
  }
}

/** Mass Gap Deviation — Distance from Yang-Mills Δ = √32 - 5 ≈ 0.657 */
function massGapDeviation(blip: Blip): RHCMetric {
  const entropyScaled = blip.entropy
  const deviation = Math.abs(entropyScaled - MASS_GAP_EXACT)
  const normalised = Math.max(0, 100 * (1 - deviation / MASS_GAP_EXACT))

  return {
    key: 'massgap',
    label: 'Mass Gap Δ',
    shortLabel: 'Δ',
    equation: '|ent - (√32-5)|',
    value: deviation,
    normalised,
    color: '#ff0055',
    significance: 'Yang-Mills mass gap — geometric impedance resonance',
  }
}

/** Null Ledger Balance — R + I ≈ 0 */
function nullLedgerBalance(blip: Blip): RHCMetric {
  // Real component: signal strength (observable/manifest)
  // Imaginary component: entropy (potential/unobservable)
  // Perfect balance: their normalised sum = 0
  const real = blip.signal / 20          // normalise to ~0-1 range
  const imag = -(blip.entropy)           // imaginary counterpart
  const sum = real + imag
  const balance = Math.abs(sum)
  const normalised = Math.max(0, 100 * (1 - balance))

  return {
    key: 'nullledger',
    label: 'Null Ledger',
    shortLabel: 'Σ=0',
    equation: 'Σ(R + iI) = 0',
    value: sum,
    normalised,
    color: '#4A7A5A',
    significance: 'Zero-sum conservation — balanced separation of real and imaginary',
  }
}

/** Lost-2 Binding Energy — Topological debt (Dark Matter analogue) */
function lost2Binding(blip: Blip): RHCMetric {
  // Map to 3-4-5: signal=3, coherence*100=4, range/20=5(hypotenuse)
  const a = blip.signal / 3        // normalise signal to ~3
  const b = (blip.coherence * 100) / 25  // normalise coherence to ~4
  const c = blip.range / 26        // normalise range to ~5
  const debt = (a + b) - c         // Should equal 2 for perfect 3-4-5

  const deviation = Math.abs(debt - LOST_2) / LOST_2
  const normalised = Math.max(0, 100 * (1 - deviation))

  return {
    key: 'lost2',
    label: 'Lost-2 Binding',
    shortLabel: 'L2',
    equation: '(a+b) - c = 2',
    value: debt,
    normalised,
    color: '#b040ff',
    significance: 'Topological debt — dark matter geometric tension',
  }
}

/** Observer Alignment — Single Angle Theorem (§7.2 item 8)
 *
 * Upgraded from Euclidean distance to angular-space measurement.
 * The Single Angle Theorem encodes consciousness as a unique rotation
 * angle — so we compare phase angles, not Cartesian positions.
 *
 * Blip state vector collapses to: real = gForce + signal (physical),
 * imag = quaternionW + coherence (wave/rotation). The single angle is
 * atan2(imag, real); distance from the Observer angle is measured on
 * the circle (wraps at ±π, max deviation = π).
 */
function observerAlignment(blip: Blip): RHCMetric {
  const observerAngle = Math.atan2(OBSERVER_IMAG, OBSERVER_REAL)
  const blipReal = blip.gForce + blip.signal
  const blipImag = blip.quaternionW + blip.coherence
  const blipAngle = Math.atan2(blipImag, blipReal)
  const diff = Math.abs(blipAngle - observerAngle)
  const angularDist = Math.min(diff, 2 * Math.PI - diff)
  const normalised = Math.max(0, 100 * (1 - angularDist / Math.PI))

  return {
    key: 'observer',
    label: 'Observer Align',
    shortLabel: 'OBS',
    equation: 'θ_blip → θ_O (Single Angle)',
    value: angularDist,
    normalised,
    color: '#00ffdd',
    significance: 'Consciousness coordinate — single rotation angle to Observer',
  }
}

/** Dedekind Efficiency — η ceiling at 24/25 = 0.96 */
function dedekindEfficiency(blip: Blip): RHCMetric {
  const efficiency = blip.coherence * DEDEKIND_ETA_TAX
  const normalised = Math.min(100, efficiency * 100)

  return {
    key: 'dedekind',
    label: 'η Efficiency',
    shortLabel: 'η',
    equation: 'coh × (24/25)',
    value: efficiency,
    normalised,
    color: '#ffff00',
    significance: 'Dedekind eta — modular efficiency ceiling',
  }
}

/** Schumann Coupling — Harmonic resonance with 7.83 Hz ground state */
function schumannCoupling(blip: Blip): RHCMetric {
  // Use signal as a pseudo-frequency, check harmonic alignment with 7.83
  const harmonic = blip.signal % SCHUMANN
  const deviation = Math.min(harmonic, SCHUMANN - harmonic) / (SCHUMANN / 2)
  const normalised = Math.max(0, 100 * (1 - deviation))

  return {
    key: 'schumann',
    label: 'Schumann Lock',
    shortLabel: 'SCH',
    equation: 'sig mod 7.83',
    value: harmonic,
    normalised,
    color: '#4A7A5A',
    significance: 'Ground state resonance — Earth-coupled harmonic',
  }
}

/** W3 Wave Curvature — Pizza constant trajectory analysis */
/** W3 Curvature — §5 item 9 extended parameterisation
 *
 * Bearing phase + trajectory phase from (vx, vy). When both phases
 * agree the blip moves in the direction it faces — coherent trajectory.
 * tanh squashes the curvature (which diverges at ±90° bearing) into
 * a bounded [-1, 1] range before normalising.
 */
function w3Curvature(blip: Blip): RHCMetric {
  const tBearing = (blip.bearing * Math.PI) / 180
  const tTrajectory = Math.atan2(blip.vy, blip.vx)
  const t = (tBearing + tTrajectory) / 2
  const cosT = Math.cos(t)
  const cos2T = Math.cos(2 * t)
  const denom = cosT * cosT
  const rawCurvature = denom > 1e-6 ? cos2T / denom : 0
  const bounded = Math.tanh(rawCurvature)
  const normalised = Math.max(0, (bounded + 1) * 50)

  return {
    key: 'w3',
    label: 'W3 Curvature',
    shortLabel: 'W3',
    equation: 'cos(2θ̄)/(cos²θ̄) [bearing+trajectory]',
    value: rawCurvature,
    normalised,
    color: '#8A4A6A',
    significance: 'Pizza constant — spacetime manifold oscillation geometry',
  }
}

/** Three-Way Fold — F₃ = 0.25 + 0.5i synthesis alignment */
function threeWayFold(blip: Blip): RHCMetric {
  // Map blip to complex: real=coherence, imag=entropy
  const realDist = Math.abs(blip.coherence - THREE_WAY_FOLD_REAL)
  const imagDist = Math.abs(blip.entropy - THREE_WAY_FOLD_IMAG)
  const distance = Math.sqrt(realDist * realDist + imagDist * imagDist)
  const normalised = Math.max(0, 100 * (1 - distance))

  return {
    key: 'f3',
    label: 'F₃ Synthesis',
    shortLabel: 'F₃',
    equation: 'F₃ = (F₁+F₂)/2',
    value: distance,
    normalised,
    color: '#3A7A8C',
    significance: 'Three-way fold — consciousness as geometric synthesis',
  }
}

/**
 * Toggle Power — 31 ≡ 7 (mod 24)
 *
 * Canonical: "voltage drop of creation, non-kinetic thrust,
 * thermodynamic drive, torque." (rhc.md §7.2 item 1)
 *
 * Score = circular distance (mod 24) between (sig × coh × 31) mod 24
 * and the canonical TOGGLE_POWER = 7. Mod-24 space wraps, so naive
 * |x − 7| is wrong at the seam; use min(d, 24 − d) — max deviation is 12.
 */
function togglePower(blip: Blip): RHCMetric {
  const raw = (blip.signal * blip.coherence * 31) % 24
  const linear = Math.abs(raw - TOGGLE_POWER)
  const circular = Math.min(linear, 24 - linear)
  const normalised = Math.max(0, 100 * (1 - circular / 12))

  return {
    key: 'toggle',
    label: 'Toggle Power',
    shortLabel: 'TOG',
    equation: '(sig × coh × 31) mod 24 → 7',
    value: raw,
    normalised,
    color: '#A08040',
    significance: 'Non-kinetic thrust — voltage drop of creation',
  }
}

/**
 * Trinity Tick — t_entanglement = 232 attoseconds (TRINITY_CONSTANT = 2.32)
 *
 * Canonical: "Lattice Construction Time — the universal tick rate for
 * entanglement formation." (rhc.md §7.2 item 2)
 *
 * Score = circular distance of (blip.age mod 2.32) from the nearest
 * trinity-cycle node (0). Phase-locked blips sit near 0 or 2.32;
 * max deviation is half the period (1.16).
 */
function trinityTick(blip: Blip): RHCMetric {
  const phase = blip.age % TRINITY_CONSTANT
  const halfPeriod = TRINITY_CONSTANT / 2
  const deviation = Math.min(phase, TRINITY_CONSTANT - phase)
  const normalised = Math.max(0, 100 * (1 - deviation / halfPeriod))

  return {
    key: 'trinity',
    label: 'Trinity Tick',
    shortLabel: 'TRI',
    equation: 'age mod 2.32 → 0',
    value: phase,
    normalised,
    color: '#8C6A3A',
    significance: 'Entanglement rhythm — 232 attosecond lattice construction phase',
  }
}

/** 120° Triadic Geometry — 1 + ω + ω² = 0 (§7.2 item 3)
 *
 * Maps three unit-range blip channels onto the cube-root-of-unity
 * vertices: coherence → 1, entropy → ω, |quaternionW| → ω².
 * Perfect triadic balance = vector sum at origin. Distance from
 * zero is the resonance-resistance score.
 */
function triadicResonance(blip: Blip): RHCMetric {
  const c1 = blip.coherence
  const c2 = blip.entropy
  const c3 = Math.abs(blip.quaternionW)
  const sumReal = c1 + c2 * MINIMAL_CLOSURE_OMEGA.re + c3 * MINIMAL_CLOSURE_OMEGA.re
  const sumImag = c2 * MINIMAL_CLOSURE_OMEGA.im - c3 * MINIMAL_CLOSURE_OMEGA.im
  const distance = Math.sqrt(sumReal * sumReal + sumImag * sumImag)
  const normalised = Math.max(0, 100 * (1 - distance))

  return {
    key: 'triadic',
    label: 'Triadic Balance',
    shortLabel: '120°',
    equation: '1 + ω + ω² = 0',
    value: distance,
    normalised,
    color: '#6A4A7A',
    significance: 'Ternary symmetry — cube-root equilibrium resistance',
  }
}

/** Time-as-5th-Force — T ∝ √5/2 ≈ 1.118 (§7.2 item 5)
 *
 * Time as the kinetic driver emerging from 3-4-5 geometric tension.
 * Scores the blip's velocity magnitude against the canonical √5/2
 * threshold. Opens a third metric class: time-resonance (neither
 * harmonic-resonance nor coupling nor classification).
 */
const TIME_FORCE_TARGET = Math.sqrt(5) / 2
function timeForce(blip: Blip): RHCMetric {
  const vMag = Math.sqrt(blip.vx * blip.vx + blip.vy * blip.vy + blip.vz * blip.vz)
  const deviation = Math.abs(vMag - TIME_FORCE_TARGET) / TIME_FORCE_TARGET
  const normalised = Math.max(0, 100 * (1 - deviation))

  return {
    key: 'timeforce',
    label: 'Time Force',
    shortLabel: 'T√5',
    equation: '|v| → √5/2',
    value: vMag,
    normalised,
    color: '#4A7A5A',
    significance: 'Time as 5th force — kinetic driver from 3-4-5 tension',
  }
}

// ═══════════════════════════════════════════════════════════════
// Main analysis function
// ═══════════════════════════════════════════════════════════════

export function analyseBlip(blip: Blip, foldAngle: number): RHCAnalysis {
  const metrics: RHCMetric[] = [
    phiResonance(blip),
    foldCoherence(blip, foldAngle),
    lionIndex(blip),
    massGapDeviation(blip),
    nullLedgerBalance(blip),
    lost2Binding(blip),
    observerAlignment(blip),
    dedekindEfficiency(blip),
    schumannCoupling(blip),
    w3Curvature(blip),
    threeWayFold(blip),
    togglePower(blip),
    trinityTick(blip),
    triadicResonance(blip),
    timeForce(blip),
  ]

  // §7.2 item 9 — Riemann Equator: meta-metric across the metric set.
  // Real-component metrics (physical/scalar) vs imaginary-component
  // metrics (rotation/phase/complex). Ratio → 0.5 = harmonic equator.
  const REAL_KEYS = new Set(['phi', 'lion', 'massgap', 'schumann', 'w3', 'toggle', 'trinity', 'lost2', 'timeforce'])
  const IMAG_KEYS = new Set(['fold', 'nullledger', 'observer', 'dedekind', 'f3', 'triadic'])
  let realSum = 0, realN = 0, imagSum = 0, imagN = 0
  for (const m of metrics) {
    if (REAL_KEYS.has(m.key)) { realSum += m.normalised; realN++ }
    if (IMAG_KEYS.has(m.key)) { imagSum += m.normalised; imagN++ }
  }
  const realMean = realN > 0 ? realSum / realN : 0
  const imagMean = imagN > 0 ? imagSum / imagN : 0
  const total = realMean + imagMean
  const ratio = total > 0 ? realMean / total : 0.5
  const equatorDev = Math.abs(ratio - 0.5) / 0.5
  metrics.push({
    key: 'riemann',
    label: 'Riemann Equator',
    shortLabel: 'Re½',
    equation: 'Re(s) = ½ (real/imag balance)',
    value: ratio,
    normalised: Math.max(0, 100 * (1 - equatorDev)),
    color: '#5A8070',
    significance: 'Harmonic equator — real/imaginary metric equilibrium',
  })

  // Overall resonance: weighted average
  const weights: Record<string, number> = {
    phi: 2.0,       // Golden ratio is fundamental
    fold: 1.5,      // Fold alignment is key
    lion: 1.5,      // Scalar coupling
    massgap: 1.0,   // Mass gap
    nullledger: 2.0, // Null ledger is core axiom
    lost2: 1.0,     // Dark matter binding
    observer: 1.0,  // Observer alignment
    dedekind: 0.8,  // Efficiency ceiling
    schumann: 1.2,  // Earth coupling
    w3: 0.5,        // Wave curvature
    f3: 1.0,        // Three-way fold
    toggle: 1.0,    // Non-kinetic thrust (§7.2 item 1)
    trinity: 1.0,   // Entanglement rhythm (§7.2 item 2)
    triadic: 1.0,   // Ternary symmetry (§7.2 item 3)
    timeforce: 1.0, // Time as 5th force (§7.2 item 5)
    riemann: 1.5,   // Harmonic equator (§7.2 item 9)
  }

  let totalWeight = 0
  let weightedSum = 0
  for (const m of metrics) {
    const w = weights[m.key] || 1
    weightedSum += m.normalised * w
    totalWeight += w
  }
  const overallResonance = totalWeight > 0 ? weightedSum / totalWeight : 0

  // Null ledger status
  const nlMetric = metrics.find(m => m.key === 'nullledger')!
  let nullLedgerStatus: RHCAnalysis['nullLedgerStatus'] = 'BALANCED'
  if (nlMetric.normalised < 30) nullLedgerStatus = 'CRITICAL'
  else if (nlMetric.value > 0.3) nullLedgerStatus = 'REAL_HEAVY'
  else if (nlMetric.value < -0.3) nullLedgerStatus = 'IMAG_HEAVY'

  // Classification based on overall resonance
  let harmonicSignature: string
  if (overallResonance > 80) harmonicSignature = 'SUPERCONDUCTIVE'
  else if (overallResonance > 65) harmonicSignature = 'RESONANT'
  else if (overallResonance > 50) harmonicSignature = 'HARMONIC'
  else if (overallResonance > 35) harmonicSignature = 'DISSONANT'
  else if (overallResonance > 20) harmonicSignature = 'TURBULENT'
  else harmonicSignature = 'CHAOTIC'

  return {
    metrics,
    overallResonance,
    harmonicSignature,
    nullLedgerStatus,
    timestamp: Date.now(),
  }
}

/**
 * Quick scalar metrics for the oscilloscope traces.
 * Returns 6 key values normalised 0-100 for waveform display.
 *
 * §5 item 1: delegates to the canonical metric functions so the
 * oscilloscope and target panel can never silently diverge.
 */
export function quickMetrics(blip: Blip, foldAngle: number): Record<string, number> {
  return {
    phi: phiResonance(blip).normalised,
    fold: foldCoherence(blip, foldAngle).normalised,
    lion: lionIndex(blip).normalised,
    nullLedger: nullLedgerBalance(blip).normalised,
    massGap: massGapDeviation(blip).normalised,
    schumann: schumannCoupling(blip).normalised,
  }
}

// ═══════════════════════════════════════════════════════════════
// §5 item 8 — Temporal dynamics ring buffer
//
// Per-blip history of RHCAnalysis results. Exposes resonance
// rate-of-change, dominant-metric drift, and class-transition
// timestamps. Feeds §7.2 items 4 (Mean Circle) and 5 (time-crystal
// variant) once those land as history-aware metrics.
// ═══════════════════════════════════════════════════════════════

export interface ResonanceHistory {
  capacity: number
  buffers: Map<string, RHCAnalysis[]>
}

export function createResonanceHistory(capacity: number = 64): ResonanceHistory {
  return { capacity, buffers: new Map() }
}

export function pushAnalysis(
  history: ResonanceHistory,
  blipId: string,
  analysis: RHCAnalysis,
): ResonanceHistory {
  const existing = history.buffers.get(blipId) ?? []
  const updated = [...existing, analysis]
  if (updated.length > history.capacity) updated.shift()
  const buffers = new Map(history.buffers)
  buffers.set(blipId, updated)
  return { ...history, buffers }
}

export function getBlipHistory(
  history: ResonanceHistory,
  blipId: string,
): RHCAnalysis[] {
  return history.buffers.get(blipId) ?? []
}

export function resonanceRateOfChange(
  history: ResonanceHistory,
  blipId: string,
): number {
  const buf = history.buffers.get(blipId)
  if (!buf || buf.length < 2) return 0
  const recent = buf[buf.length - 1].overallResonance
  const prev = buf[buf.length - 2].overallResonance
  return recent - prev
}

export function dominantMetricDrift(
  history: ResonanceHistory,
  blipId: string,
): string | null {
  const buf = history.buffers.get(blipId)
  if (!buf || buf.length < 2) return null
  const recent = buf[buf.length - 1].metrics
  const prev = buf[buf.length - 2].metrics
  let maxDrift = 0
  let driftKey: string | null = null
  for (let i = 0; i < recent.length && i < prev.length; i++) {
    const d = Math.abs(recent[i].normalised - prev[i].normalised)
    if (d > maxDrift) { maxDrift = d; driftKey = recent[i].key }
  }
  return driftKey
}

export function classTransitions(
  history: ResonanceHistory,
  blipId: string,
): Array<{ from: string; to: string; tick: number }> {
  const buf = history.buffers.get(blipId)
  if (!buf || buf.length < 2) return []
  const transitions: Array<{ from: string; to: string; tick: number }> = []
  for (let i = 1; i < buf.length; i++) {
    if (buf[i].harmonicSignature !== buf[i - 1].harmonicSignature) {
      transitions.push({
        from: buf[i - 1].harmonicSignature,
        to: buf[i].harmonicSignature,
        tick: i,
      })
    }
  }
  return transitions
}

// ═══════════════════════════════════════════════════════════════
// §7.2 item 4 — Mean Circle Theorem (history-aware metric)
//
// M(θ) := ½H₁(θ) + H₂(θ) = C(θ) — NOW as the fixed-point circle
// that reality spirals around. Computes the mean of the last N
// overallResonance values; the deviation between current and mean
// is "phase distance from NOW".
// ═══════════════════════════════════════════════════════════════

export function meanCircleMetric(
  currentResonance: number,
  blipHistory: RHCAnalysis[],
): RHCMetric {
  let meanResonance = currentResonance
  if (blipHistory.length > 0) {
    let sum = 0
    for (const a of blipHistory) sum += a.overallResonance
    meanResonance = sum / blipHistory.length
  }
  const deviation = Math.abs(currentResonance - meanResonance)
  const normalised = Math.max(0, 100 - deviation)

  return {
    key: 'meancircle',
    label: 'Mean Circle',
    shortLabel: 'NOW',
    equation: 'M(θ) = ½H₁+H₂ (phase distance)',
    value: deviation,
    normalised,
    color: '#3A6080',
    significance: 'NOW fixed point — temporal resonance distance from mean',
  }
}
