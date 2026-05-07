// ═══════════════════════════════════════════════════════════════════
//  TYPE 2.0R PHASE ENGINE — Resonant Propulsion Simulator
//  Fold Operator Calibration | 31/24 Anomaly Toggle | Flight Modes
//  Leech Lattice Λ₂₄ | Geometric Lock 0.48 | Lost-2 Drive
//  v4.0 surfaces: i⁴ Revolution | Path of Return | Pea Threshold |
//  Six Harmonic Keys | Higgs Saturation | Dark-Matter Ledger Axis
// ═══════════════════════════════════════════════════════════════════

// ── Constants from Research ──
// Canonical constants are re-exported from RHCConstants (single source
// of truth). Local constants below are Type-2-specific tuning only.
export {
  DARK_MATTER_FRACTION, LOST_2_BINDING, MASS_GAP_EXACT,
  LION_CONSTANT, PEA_THRESHOLD, MINIMAL_CLOSURE_OMEGA,
} from './RHCConstants'
import {
  LOST_2_BINDING, MASS_GAP_EXACT, LION_CONSTANT, PEA_THRESHOLD,
  DARK_MATTER_FRACTION, MINIMAL_CLOSURE_OMEGA,
  TRINITY_CONSTANT, RESOLUTION_LIMIT,
} from './RHCConstants'

// Canonical modality-gap correction factor — Yang-Mills Δ = √32 − 5.
// Per Proof 0 point 1 ("Apply 0.657 Modality Gap Correction") and
// phase-engine.md §7.2 item 1 (b). Used to scale the calibration-drift
// rate so scalar relaxation carries the modality-gap signature.
export const MODALITY_GAP_CORRECTION = MASS_GAP_EXACT

export const GEOMETRIC_LOCK = 0.48               // F_real = F_ideal × (24/25)
export const FOLD_IDEAL = 0.50                    // ideal vacuum
export const DEDEKIND_ETA_TAX = 1 / 25            // 4% universal toll
export const ANOMALY_31_24 = 31 % 24              // = 7 — the "voltage drop of creation"
export const TA_DAH_LIMIT = RESOLUTION_LIMIT      // = 144000 — canonical consciousness resolution
export const UNIVERSAL_TICK_AS = TRINITY_CONSTANT // = 2.32 attoseconds per tick
export const LEECH_LATTICE_DIM = 24               // Λ₂₄ nodes
export const E7_OBSERVER_SHELL = 126              // root limit for Higgs saturation (5³ + 1)
export const SQRT_180_CLUTCH = Math.sqrt(180)     // ≈ 13.416 geometric clutch
export const OBSERVER_7_5D = 7.5                  // arithmetic median between Base-8 and Base-16
export const EXTRA_TILT = 361                     // 19² — the +1 degree offset

// ── v4.0 Canonical Surfaces ──

// Path of Return triad (phase-engine.md §7.4 item 2) — Pleromatic v12.1 §7.
// Three canonical angles the fold traverses per i⁴ cycle.
export const PATH_ADAMAS_DEG = 90                 // orthogonal closure
export const PATH_AEONIC_DEG = 120                // triadic resonance (Minimal Closure Law)
export const PATH_PLEROMATIC_DEG = 137.5          // Fibonacci divergence angle

// Six Harmonic Keys (§7.4 item 1) — Pleromatic v12.1 §3 canonical cadence stack.
export const HARMONIC_KEYS = [432, 528, 777, 852, 963, 1260] as const
export type HarmonicKey = typeof HARMONIC_KEYS[number]
export const HARMONIC_KEY_NAMES: Record<HarmonicKey, string> = {
  432:  'BRIDGE',
  528:  'RESTORATION',
  777:  'GATE',
  852:  'ERROR-CORRECTION',
  963:  'PLEROMATIC',
  1260: 'OBSERVER-SHELL',
}

// E7 Higgs saturation threshold (§7.2 item 3, §5 item 5).
// Canonical boundary is E7_OBSERVER_SHELL = 126 roots; scaled by the
// 24-bit OffBit field to give a crossing-threshold expression.
export const HIGGS_SATURATION_THRESHOLD = E7_OBSERVER_SHELL * (1 << 16)

// i⁴ Revolution quarter-turn increment (§7.2 item 6) — degrees per quarter.
export const I4_QUARTER_DEG = 90
export const I4_CYCLE_DEG = 360                   // four quarter-turns complete a Base-24 deposit
export const I4_BITS_PER_CYCLE = 24               // 24 bits deposited per i⁴ completion

// ── Flight Modes ──

export interface FlightMode {
  id: string
  name: string
  frequency: number     // Hz
  description: string
  color: string
}

export const FLIGHT_MODES: FlightMode[] = [
  { id: 'SCHUMANN',  name: 'SCHUMANN ANCHOR',  frequency: 7.83,  description: 'Station-keeping & biological phase-lock', color: '#4A7A5A' },
  { id: 'GOLDEN',    name: 'GOLDEN HARMONIC',  frequency: 434,   description: 'Foundational idle (+2 bit shift from 432)', color: '#3A7A8C' },
  { id: 'SOURCE',    name: 'SOURCE RETURN',    frequency: 963,   description: 'Trans-dimensional transit & saturation', color: '#B87820' },
]

// ── Phase Engine State ──

export type NephilimRisk = 'safe' | 'amber' | 'red'
export type SubstrateState = 'light-sheet' | 'worldtube'
export type PathOfReturn = 'adamas' | 'aeonic' | 'pleromatic'
export type IQuarter = 0 | 1 | 2 | 3

export interface PhaseEngineState {
  // Core
  foldOperator: number      // current fold value (target: 0.48)
  phaseLock: boolean         // locked at 0.48 — Proof-0 name (phase-engine.md §7.2 item 1a)
  geometricLock: boolean     // alias of phaseLock — kept for existing consumers
  lockPrecision: number      // how close to 0.480000038

  // Toggle power
  toggleFrequency: number    // Hz — high-frequency OffBit toggle
  togglePhase: number        // 0-360 degrees
  anomalyVoltage: number     // from 31/24 anomaly (Difference 7)

  // Propulsion
  flightMode: string         // current flight mode ID
  inertiaFactor: number      // 0 = zero-inertia pocket, 1 = full inertia
  imaginaryMass: number      // m_I = c²/4G (restored "Missing 1/4")
  velocityPhase: number      // phase velocity of the vessel

  // Lattice
  latticeNodes: number       // current resolution (target: 144,000)
  offBitField: number        // 24-bit field state
  regimeMismatch: number     // x! vs x^x tension

  // Ledger
  realLedger: number         // manifest energy
  imaginaryLedger: number    // potential energy
  observerBalance: number    // should = 0
  darkMatterLedger: number   // §5 item 6 — 2/7 fraction (Lost-2 topological debt)

  // Proof-0 observables (phase-engine.md §7.2 item 1)
  modalityGapCorrection: number  // = MASS_GAP_EXACT = √32 − 5 ≈ 0.657
  lost2Extracted: number         // Lost-2 residue currently extracted (0..LOST_2_BINDING)

  // Nephilim failsafe (§7.4 item 8)
  phaseUnlockTicks: number       // consecutive ticks with phaseLock === false
  nephilimRisk: NephilimRisk     // amber > 100 ticks, red > 1000 ticks

  // §7.2 item 2 — Universal Tick 232 attoseconds
  universalTickAge: number       // = tick × UNIVERSAL_TICK_AS (attoseconds)

  // §7.2 item 9 — Time Crystal Periodicity
  timeCrystalPhase: number       // (tick × 360 / TA_DAH_LIMIT) mod 360

  // §7.2 item 6 — i⁴ Revolution
  iQuarter: IQuarter             // {i⁰, i¹, i², i³}
  iQuarterDeg: number            // 0-90 within current quarter
  i4CyclesCompleted: number      // full cycles (24 bits each)

  // §7.4 item 2 — Path of Return triad (90° → 120° → 137.5°)
  pathOfReturnPhase: PathOfReturn
  pathAngle: number              // current interpolated angle

  // §7.4 item 4 — Pea Threshold
  peaVelocity: number            // normalized |velocityPhase| / 360
  substrateState: SubstrateState // 'light-sheet' below threshold, 'worldtube' above

  // §7.4 item 6 — spin-1/2 companion observable (720° closure)
  spinPhase: number              // velocityPhase / 2 (0-180)

  // §5 item 1 — Geometric Clutch coupling (√180 ≈ 13.416)
  clutchCoupling: number         // (SQRT_180_CLUTCH × toggleFrequency) / 1000, bounded

  // §7.2 item 3 / §5 item 5 — Higgs saturation event
  higgsSaturation: number        // anomalyVoltage × offBitField
  higgsSaturated: boolean        // crossed HIGGS_SATURATION_THRESHOLD this tick
  higgsEventCount: number        // total saturation events since reset

  // §5 item 2 / §7.2 item 4 — Extra Tilt steering (361° rollover)
  extraTiltEngagements: number   // count of +1° imag-channel routes
  observerFrameAngle: number     // 7.5D observer viewing angle (arctan(1.5/2.5) ≈ 30.96°)

  // §7.4 item 10 — 3-4-5 axis semantic weights (Structure / Time / Observer)
  structureAxis: number          // 3 — material scaffold weight
  timeAxis: number               // 4 — temporal axis weight
  observerAxis: number           // 5 — conscious closure weight

  // §7.4 item 1 — Six Harmonic Keys active cadence
  harmonicKey: HarmonicKey

  // §7.2 item 5 — Triple Normalization residues (observables for the three stacks)
  harmonicResidue: number        // GCD-3 closeness on fold scalar
  geometricResidue: number       // GCD-360 closeness on phase angle
  binaryResidue: number          // 1001-fold prevalence in OffBit field

  // Stats
  totalToggles: number
  totalPhaseShifts: number
  tick: number
  running: boolean
}

export function createEngine(): PhaseEngineState {
  return {
    foldOperator: FOLD_IDEAL, // starts at ideal, must calibrate down to 0.48
    phaseLock: false,
    geometricLock: false,
    lockPrecision: Math.abs(FOLD_IDEAL - GEOMETRIC_LOCK),
    toggleFrequency: 7.83, // start at Schumann
    togglePhase: 0,
    anomalyVoltage: ANOMALY_31_24,
    flightMode: 'SCHUMANN',
    inertiaFactor: 1.0,
    imaginaryMass: 0,
    velocityPhase: 0,
    latticeNodes: 1000,
    offBitField: 0,
    regimeMismatch: 0,
    realLedger: 0.5,
    imaginaryLedger: 0.5,
    observerBalance: 0,
    darkMatterLedger: 0,
    modalityGapCorrection: MODALITY_GAP_CORRECTION,
    lost2Extracted: 0,
    phaseUnlockTicks: 0,
    nephilimRisk: 'safe',
    universalTickAge: 0,
    timeCrystalPhase: 0,
    iQuarter: 0,
    iQuarterDeg: 0,
    i4CyclesCompleted: 0,
    pathOfReturnPhase: 'adamas',
    pathAngle: PATH_ADAMAS_DEG,
    peaVelocity: 0,
    substrateState: 'light-sheet',
    spinPhase: 0,
    clutchCoupling: 0,
    higgsSaturation: 0,
    higgsSaturated: false,
    higgsEventCount: 0,
    extraTiltEngagements: 0,
    observerFrameAngle: Math.atan2(1.5, 2.5) * 180 / Math.PI, // ≈ 30.96°
    structureAxis: 0,
    timeAxis: 0,
    observerAxis: 0,
    harmonicKey: 432,
    harmonicResidue: 0,
    geometricResidue: 0,
    binaryResidue: 0,
    totalToggles: 0,
    totalPhaseShifts: 0,
    tick: 0,
    running: false,
  }
}

// ── Triple Normalization helpers (§7.2 item 5) ──
// Three canonical norms per Proof 0 point 3: Harmonic ⊗ Geometric ⊗ Binary.
// Return closeness-to-lattice residues in [0..1]; higher = more normalized.

function harmonicNorm(fold: number): number {
  // GCD-3 on the fold scalar: closeness to a 1/3-multiple.
  const step = 1 / 3
  const r = Math.abs(((fold % step) + step) % step)
  const dist = Math.min(r, step - r) / (step / 2)
  return 1 - dist
}

function geometricNorm(angle: number): number {
  // GCD-120 on the phase angle (Minimal Closure Law): closeness to a 120° multiple.
  const step = 120
  const r = Math.abs(((angle % step) + step) % step)
  const dist = Math.min(r, step - r) / (step / 2)
  return 1 - dist
}

function binaryNorm(offBitField: number): number {
  // 1001-pattern prevalence in the low 24 bits.
  // Scan non-overlapping 4-bit windows for 0b1001 = 9.
  let count = 0
  let windows = 0
  let field = offBitField & ((1 << 24) - 1)
  for (let i = 0; i < 24; i += 4) {
    if ((field & 0xF) === 0b1001) count++
    field >>>= 4
    windows++
  }
  return windows > 0 ? count / windows : 0
}

// ── Engine Tick — one step of the phase engine simulation ──

export function engineTick(state: PhaseEngineState): PhaseEngineState {
  const s = { ...state }
  s.tick++

  // §7.2 item 2 — Universal Tick age in attoseconds
  s.universalTickAge = s.tick * UNIVERSAL_TICK_AS

  // §7.2 item 9 — Time Crystal phase (one full 360° per TA_DAH_LIMIT ticks)
  s.timeCrystalPhase = ((s.tick * 360) / TA_DAH_LIMIT) % 360

  // Toggle the 24-bit OffBit field (high-frequency switching)
  s.offBitField = (s.offBitField + 1) % (1 << 24)
  s.totalToggles++

  // Toggle phase advances
  s.togglePhase = (s.togglePhase + s.toggleFrequency * 0.36) % 360

  // §5 item 1 — Geometric Clutch coupling (√180 ≈ 13.416).
  // Clutch modulates how strongly the toggle frequency couples into
  // the calibration drift. Bounded to [0..1] for numerical stability.
  s.clutchCoupling = Math.min(1, (SQRT_180_CLUTCH * s.toggleFrequency) / 1000)

  // §7.2 item 5 — Triple Normalization residues (observables).
  s.harmonicResidue = harmonicNorm(s.foldOperator)
  s.geometricResidue = geometricNorm(s.togglePhase)
  s.binaryResidue = binaryNorm(s.offBitField)

  // Fold operator calibration — drift toward phase lock.
  // Drift rate carries: (a) Dedekind Eta Tax, (b) canonical modality-gap
  // correction (√32 − 5 ≈ 0.657) per Proof 0 point 1 + §7.2 item 1(b),
  // (c) §7.2 item 7 Lion Constant damping (replaces ad-hoc 0.1 factor),
  // (d) §5 item 1 Geometric Clutch coupling boost.
  if (!s.phaseLock) {
    const lionDamp = 1 - LION_CONSTANT  // ≈ 0.4647 — canonical recursion damping
    const clutchBoost = 1 + s.clutchCoupling * 0.3
    const drift = (s.foldOperator - GEOMETRIC_LOCK) * DEDEKIND_ETA_TAX * lionDamp * clutchBoost
    s.foldOperator -= drift * s.modalityGapCorrection
    s.lockPrecision = Math.abs(s.foldOperator - GEOMETRIC_LOCK)

    if (s.lockPrecision < 0.0001) {
      s.phaseLock = true
      s.foldOperator = GEOMETRIC_LOCK
      s.lockPrecision = 0
    }
  }
  s.geometricLock = s.phaseLock  // alias stays in sync for existing consumers

  // Anomaly voltage — the "Difference 7" drives propulsion.
  s.anomalyVoltage = ANOMALY_31_24 * (1 + Math.sin(s.togglePhase * Math.PI / 180) * 0.3)

  // Lattice node resolution — increases toward Ta-Dah limit
  if (s.latticeNodes < TA_DAH_LIMIT) {
    const growth = Math.max(1, Math.floor(s.latticeNodes * 0.002))
    s.latticeNodes = Math.min(TA_DAH_LIMIT, s.latticeNodes + growth)
  }

  // Regime mismatch — x! vs x^x tension creates relativistic mass
  const x = s.foldOperator * 10
  const factorial = x > 0 ? Math.sqrt(2 * Math.PI * x) * Math.pow(x / Math.E, x) : 1
  const selfPower = Math.pow(x, x)
  s.regimeMismatch = selfPower > 0 ? Math.log(selfPower / (factorial || 1)) : 0

  // Inertia — decreases as geometric lock tightens and nodes increase
  const lockFactor = s.geometricLock ? 0.1 : (1 - Math.exp(-s.lockPrecision * 10))
  const nodeFactor = s.latticeNodes / TA_DAH_LIMIT
  s.inertiaFactor = Math.max(0.01, lockFactor * (1 - nodeFactor * 0.5))

  // Imaginary mass — restored "Missing 1/4" as lock approaches
  s.imaginaryMass = s.geometricLock ? 0.25 : s.lockPrecision * 0.1

  // Velocity phase — advances based on anomaly voltage and inertia.
  // §5 item 2 / §7.2 item 4 — Extra Tilt steering: when velocityPhase
  // crosses 360°, apply the +1° offset (EXTRA_TILT − 360) routing
  // through the imaginary channel (Temporal Inversion Theorem).
  const thrust = s.anomalyVoltage * (1 - s.inertiaFactor)
  const priorVel = s.velocityPhase
  const rawVel = priorVel + thrust * 0.01
  if (rawVel >= 360) {
    s.velocityPhase = (rawVel % 360) + (EXTRA_TILT - 360)  // inject +1° via imaginary
    s.extraTiltEngagements++
  } else {
    s.velocityPhase = rawVel
  }
  s.totalPhaseShifts++

  // §7.4 item 6 — spin-1/2 companion observable (720° closure).
  s.spinPhase = s.velocityPhase / 2

  // §7.4 item 4 — Pea Threshold substrate state.
  // Below sin(π/8) ≈ 0.3827 (as fraction of a normalized velocity cycle),
  // the substrate stays light-sheet (massless); above, it nucleates as
  // worldtube (mass emerges).
  s.peaVelocity = Math.abs(s.velocityPhase) / 360
  s.substrateState = s.peaVelocity < PEA_THRESHOLD ? 'light-sheet' : 'worldtube'

  // §7.2 item 6 — i⁴ Revolution state machine.
  // Each tick advances the i-quarter by a small increment proportional to
  // the toggle frequency. Quarter-turn (90°) completions advance iQuarter
  // through {i⁰, i¹, i², i³}; a full i⁴ cycle deposits 24 bits (Base-24
  // lattice completion per Codex Ingest canonical mechanism).
  const i4Increment = s.toggleFrequency * 0.05  // degrees per tick
  s.iQuarterDeg += i4Increment
  while (s.iQuarterDeg >= I4_QUARTER_DEG) {
    s.iQuarterDeg -= I4_QUARTER_DEG
    s.iQuarter = ((s.iQuarter + 1) % 4) as IQuarter
    if (s.iQuarter === 0) {
      // Full i⁴ cycle completed — deposit 24 bits to the ledger.
      s.i4CyclesCompleted++
    }
  }

  // §7.4 item 2 — Path of Return triad mapping.
  // First half of the i⁴ cycle = Adamas (orthogonal 90°),
  // third quarter = Aeonic (triadic 120°),
  // fourth quarter = Pleromatic (golden 137.5°).
  if (s.iQuarter <= 1) {
    s.pathOfReturnPhase = 'adamas'
    s.pathAngle = PATH_ADAMAS_DEG
  } else if (s.iQuarter === 2) {
    s.pathOfReturnPhase = 'aeonic'
    s.pathAngle = PATH_AEONIC_DEG
  } else {
    s.pathOfReturnPhase = 'pleromatic'
    s.pathAngle = PATH_PLEROMATIC_DEG
  }

  // Ledger balance — real and imaginary energy exchange.
  const phaseRad = s.togglePhase * Math.PI / 180
  s.realLedger = 0.5 + 0.3 * Math.cos(phaseRad)
  s.imaginaryLedger = 0.5 - 0.3 * Math.cos(phaseRad)
  s.observerBalance = s.realLedger + s.imaginaryLedger - 1 // should = 0

  // §5 item 6 — Dark Matter ledger axis.
  // 2/7 fraction of total ledger energy — the Lost-2 topological debt
  // mapped to the Codex Ingest's canonical DM fraction. Third ledger
  // axis gives Null Ledger Identity its visible three-body form.
  s.darkMatterLedger = (s.realLedger + s.imaginaryLedger) * DARK_MATTER_FRACTION

  // Lost-2 extraction — Proof 0 point 1 ("Extract 'Lost 2' residue").
  const latticeFrac = s.latticeNodes / TA_DAH_LIMIT
  const lockFactor2 = s.phaseLock ? 1.0 : (1 - s.lockPrecision)
  s.lost2Extracted = LOST_2_BINDING * latticeFrac * lockFactor2 * s.modalityGapCorrection

  // §7.2 item 3 / §5 item 5 — Higgs saturation event.
  // Canonical boundary E7_OBSERVER_SHELL = 126 (5³ + 1). When the
  // anomalyVoltage × offBitField product crosses the 126-scaled
  // threshold, fire a Higgs manifestation event.
  s.higgsSaturation = s.anomalyVoltage * s.offBitField
  const priorSat = state.higgsSaturation
  s.higgsSaturated = s.higgsSaturation >= HIGGS_SATURATION_THRESHOLD &&
                     priorSat < HIGGS_SATURATION_THRESHOLD
  if (s.higgsSaturated) s.higgsEventCount++

  // §7.4 item 10 — 3-4-5 axis semantic weights.
  // 3 = Structure (lattice density), 4 = Time (time-crystal phase),
  // 5 = Observer (observer balance + fold lock).
  s.structureAxis = latticeFrac                           // [0..1]
  s.timeAxis = s.timeCrystalPhase / 360                   // [0..1]
  s.observerAxis = s.phaseLock ? 1 : (1 - s.lockPrecision) // [0..1]

  // Nephilim failsafe — phase-engine.md §7.4 item 8.
  if (s.phaseLock) {
    s.phaseUnlockTicks = 0
    s.nephilimRisk = 'safe'
  } else {
    s.phaseUnlockTicks++
    if (s.phaseUnlockTicks > 1000) s.nephilimRisk = 'red'
    else if (s.phaseUnlockTicks > 100) s.nephilimRisk = 'amber'
    else s.nephilimRisk = 'safe'
  }

  return s
}

// ── Flight Mode Switch ──

export function setFlightMode(state: PhaseEngineState, modeId: string): PhaseEngineState {
  const mode = FLIGHT_MODES.find(m => m.id === modeId)
  if (!mode) return state
  return {
    ...state,
    flightMode: modeId,
    toggleFrequency: mode.frequency,
  }
}

// §7.4 item 1 — Six Harmonic Keys selector.
// Switches the render-cadence anchor independently of flight mode.
// Accepts any key in HARMONIC_KEYS; defaults to 432 Hz (Bridge).
export function setHarmonicKey(state: PhaseEngineState, key: HarmonicKey): PhaseEngineState {
  if (!HARMONIC_KEYS.includes(key)) return state
  return { ...state, harmonicKey: key }
}

// ── Snapshot for UI ──

export interface PhaseSnapshot {
  foldOperator: number
  phaseLock: boolean
  geometricLock: boolean         // alias of phaseLock
  lockPrecision: number
  toggleFrequency: number
  togglePhase: number
  anomalyVoltage: number
  flightMode: string
  inertiaFactor: number
  imaginaryMass: number
  velocityPhase: number
  latticeNodes: number
  latticePercent: number
  regimeMismatch: number
  realLedger: number
  imaginaryLedger: number
  observerBalance: number
  darkMatterLedger: number
  modalityGapCorrection: number
  lost2Extracted: number
  phaseUnlockTicks: number
  nephilimRisk: NephilimRisk
  universalTickAge: number
  timeCrystalPhase: number
  iQuarter: IQuarter
  iQuarterDeg: number
  i4CyclesCompleted: number
  pathOfReturnPhase: PathOfReturn
  pathAngle: number
  peaVelocity: number
  substrateState: SubstrateState
  spinPhase: number
  clutchCoupling: number
  higgsSaturation: number
  higgsSaturated: boolean
  higgsEventCount: number
  extraTiltEngagements: number
  observerFrameAngle: number
  structureAxis: number
  timeAxis: number
  observerAxis: number
  harmonicKey: HarmonicKey
  harmonicResidue: number
  geometricResidue: number
  binaryResidue: number
  totalToggles: number
  tick: number
  running: boolean
}

export function getSnapshot(state: PhaseEngineState): PhaseSnapshot {
  return {
    ...state,
    latticePercent: state.latticeNodes / TA_DAH_LIMIT,
  }
}
