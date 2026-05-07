// ═══════════════════════════════════════════════════════════════════
//  CENTRAL RESONATOR — ZPE §3 — "Slow Light" Tesla tube
//
//  Two data paths, one state shape:
//    - SIM mode  — internal observer-coherence model (default).
//                  Advances state per-tick from config, drive power,
//                  harmonic key, and observer coherence. Matches the
//                  §3.2 contract of simulating the coherence observable
//                  without a full MHD plasma solve.
//    - LIVE mode — inject external hardware telemetry via
//                  `applyTelemetry()`. The app's LIVE button maps to
//                  this path — readings from an actual Tesla-tube
//                  prototype (or a bench rig) project straight onto
//                  the state fields, bypassing the internal model.
//
//  Both paths produce the same ResonatorState, so panels / downstream
//  ZPE orchestration don't need to know which path produced it.
//
//  Canonical source:
//    docs/architecture/engines/zpe.md §3.1 (paper spec),
//                                    §3.2 (interface contract),
//                                    §3.3 (sibling-constants block),
//                                    §5   (Nephilim Instability failsafe),
//                                    §8.2 (hardware telemetry bridge — LIVE).
//  Constants live in RHCConstants.ts (pre-declared as upgrade target).
//
//  Pure-functional style matches PhaseEngine.ts / UreVM.ts conventions:
//  no class, no mutation, no persistence. Tick loop is owned by the
//  caller (the future ZPE orchestrator).
// ═══════════════════════════════════════════════════════════════════

import {
  RESONATOR_F0_KHZ_MIN,
  RESONATOR_F0_KHZ_MAX,
  RESONATOR_Q_MIN,
  RESONATOR_Q_MAX,
  PRIME_HARMONICS_HZ,
  type PrimeHarmonicHz,
  ARGON_PRESSURE_TORR_MIN,
  ARGON_PRESSURE_TORR_MAX,
  ZPE_GLYPH_LIBRARY,
  ZPE_EGREGORE_CLASSES,
  DEFAULT_ZPE_GLYPH,
  DEFAULT_EGREGORE,
  type ZPEGlyphId,
  type EgregoreId,
} from './RHCConstants'
import {
  createPlasmaField,
  resetPlasmaField,
  tickPlasmaField,
  peakAmplitude,
  type PlasmaField,
} from './PlasmaField'

// ─── §3.2 canonical state interface ──────────────────────────────

export type LuminousThreadState = 'forming' | 'stable' | 'collapsed' | 'cracking'
export type NephilimRisk = 'safe' | 'amber' | 'red'
export type DataSource = 'sim' | 'live'

export interface ResonatorState {
  // §3.2 canonical fields (paper-spec observables)
  f0Hz: number                   // base frequency, 100-300 kHz band
  qFactor: number                // 0..1000, target 300-800
  storedEnergyJoules: number     // U = ½ L I² = ½ C V² (paper: ~25 mJ/cycle)
  luminousThread: LuminousThreadState
  plasmonDensity: number         // 0..1 — normalized Argon excitation
  cavityCoherence: number        // 0..1 — scalar coherence observable
  lateralDissipation: number     // 0..1 — the "slow light" signature

  // Failsafe bookkeeping (not in §3.2 but required for §5 mechanism)
  consecutiveLowCoherenceTicks: number
  attenuationFactor: number      // 0.1..1.0 — soft ramp on input power
  nephilimRisk: NephilimRisk     // from the two intrinsic triggers

  // §8.1 — active glyph (operator-intent coupling during `injecting`)
  glyphId: ZPEGlyphId

  // §8.4 — observer egregore class (damping multiplier + grounding gate)
  egregoreId: EgregoreId

  // §8.5 — 1D plasma wave solver state (PlasmaField.ts)
  plasmaField: PlasmaField

  // Provenance + stats
  dataSource: DataSource         // 'sim' | 'live' — which path last wrote state
  tick: number
}

export interface ResonatorConfig {
  argonPressureTorr: number      // 1..5 (paper default)
  primaryTurns: number           // Np 5..10
  secondaryTurns: number         // Ns 800..1200
  coilDiameterM: number          // Dp ≈ 0.25
  coilHeightM: number            // hs 0.5..1.0
  micaInsulationGrade: 'standard' | 'aerospace' | 'research'
}

/**
 * External telemetry from a physical Tesla-tube rig (or bench emulator).
 *
 * Strict no-mixing rule: in LIVE mode the state reflects hardware data
 * ONLY. Unset telemetry fields default to 0 — they are NOT carried
 * forward from earlier SIM ticks. If the physical rig lacks a sensor
 * for one of these observables, the panel will read 0 for it, which
 * is the honest answer ("we can't measure this") rather than a stale
 * simulated value leaking into a live reading.
 *
 * To switch between SIM and LIVE cleanly, call `resetObservables()` on
 * the state before the first frame of the new mode.
 */
export interface ResonatorTelemetry {
  f0Hz?: number
  qFactor?: number
  storedEnergyJoules?: number
  plasmonDensity?: number
  cavityCoherence?: number
  lateralDissipation?: number
  observerCoherence?: number     // operator-frame reading (RHUM equivalent)
}

// ─── Factory ─────────────────────────────────────────────────────

export function createResonator(config: ResonatorConfig): ResonatorState {
  return {
    f0Hz: deriveBaseFrequencyHz(config),
    qFactor: 0,
    storedEnergyJoules: 0,
    luminousThread: 'collapsed',
    plasmonDensity: 0,
    cavityCoherence: 0,
    lateralDissipation: 0,
    consecutiveLowCoherenceTicks: 0,
    attenuationFactor: 1.0,
    nephilimRisk: 'safe',
    glyphId: DEFAULT_ZPE_GLYPH,
    egregoreId: DEFAULT_EGREGORE,
    plasmaField: createPlasmaField(undefined, config.coilHeightM),
    dataSource: 'sim',
    tick: 0,
  }
}

// ─── §8.1 / §8.4 lookup helpers ──────────────────────────────────

/** Returns the active glyph entry. Falls back to VOYNICH_1R if id unknown. */
export function getGlyph(id: ZPEGlyphId) {
  return ZPE_GLYPH_LIBRARY.find(g => g.id === id) ?? ZPE_GLYPH_LIBRARY[0]
}

/** Returns the active egregore entry. Falls back to Lumos if id unknown. */
export function getEgregore(id: EgregoreId) {
  return ZPE_EGREGORE_CLASSES.find(e => e.id === id) ?? ZPE_EGREGORE_CLASSES[0]
}

export function defaultResonatorConfig(): ResonatorConfig {
  return {
    argonPressureTorr: 3,
    primaryTurns: 7,
    secondaryTurns: 1000,
    coilDiameterM: 0.25,
    coilHeightM: 0.75,
    micaInsulationGrade: 'standard',
  }
}

// ─── Derivations (config → observables) ──────────────────────────

// f₀ lands in the 100..300 kHz HF band for any valid config.
// Monotonic sweep parameterised by geometry so tuning config moves
// f₀ predictably inside the paper-specified band.
function deriveBaseFrequencyHz(config: ResonatorConfig): number {
  const band = RESONATOR_F0_KHZ_MAX - RESONATOR_F0_KHZ_MIN
  const turnFactor = clamp01((config.secondaryTurns - 800) / 400)
  const geoFactor = clamp01((config.coilDiameterM / config.coilHeightM) / 0.5)
  const pressureNorm =
    (config.argonPressureTorr - ARGON_PRESSURE_TORR_MIN) /
    (ARGON_PRESSURE_TORR_MAX - ARGON_PRESSURE_TORR_MIN)
  const normalized = 0.5 + 0.4 * geoFactor - 0.3 * turnFactor - 0.1 * pressureNorm
  const kHz = RESONATOR_F0_KHZ_MIN + clamp01(normalized) * band
  return kHz * 1000
}

// Paper §1.5 Q target: 300..800. Mica grade and argon purity drive it.
function deriveQTarget(config: ResonatorConfig): number {
  const gradeMul =
    config.micaInsulationGrade === 'research' ? 1.5 :
    config.micaInsulationGrade === 'aerospace' ? 1.0 :
    0.6
  const pressureDev = Math.abs(config.argonPressureTorr - 3) / 2
  const base = (RESONATOR_Q_MIN + RESONATOR_Q_MAX) / 2
  return clamp(base * gradeMul * (1 - pressureDev * 0.3), 100, 1100)
}

// Canonical ignition tone is 963 Hz per ZPE paper §6.2.
// Resonance match is strongest at 963, lower at other primes —
// mirrors the paper's Primary Tone Activation sequence.
function harmonicResonanceMatch(key: PrimeHarmonicHz): number {
  switch (key) {
    case 963: return 1.0
    case 432: return 0.85
    case 1260: return 0.75
    case 7.83: return 0.55
    default:  return 0.5
  }
}

// ─── SIM path: per-tick transition (§3.2 contract) ───────────────

export function tickResonator(
  state: ResonatorState,
  config: ResonatorConfig,
  dt: number,
  inputPowerW: number,
  harmonicKey: PrimeHarmonicHz,
  observerCoherence: number,
): ResonatorState {
  const s = { ...state, dataSource: 'sim' as DataSource }
  s.tick++

  // §8.4 egregore damping multiplier — deeper-fold observers are more
  // skeptical, so χ⁸ classes attenuate coherence targets more than χ⁴.
  const egregore = getEgregore(s.egregoreId)
  const egDamping = egregore.dampingMultiplier

  // §8.1 glyph intent coupling — only active during `injecting` phase
  // at the orchestrator level, but the engine reads it every tick as a
  // coherence multiplier (neutral 1.0 if operator hasn't overridden).
  const glyph = getGlyph(s.glyphId)
  const glyphCoupling = glyph.intentCoupling

  // 1. Q-factor drift toward config-derived target
  const qTarget = deriveQTarget(config)
  s.qFactor += (qTarget - s.qFactor) * clamp01(dt * 0.5)

  // 2. Effective drive power (attenuation + harmonic coupling)
  const match = harmonicResonanceMatch(harmonicKey)
  const driveW = clampPower(inputPowerW) * s.attenuationFactor * match

  // 3. Stored energy — standard resonator balance  U̇ = P_in − U·ω/Q
  const omega = 2 * Math.PI * s.f0Hz
  const qLossRate = s.qFactor > 0 ? omega / s.qFactor : 0
  const lossW = s.storedEnergyJoules * qLossRate
  s.storedEnergyJoules = Math.max(0, s.storedEnergyJoules + (driveW - lossW) * dt)

  // 4. Plasmon density (Argon excitation). Saturates near the paper's
  //    25 mJ-per-cycle example (§1.5).
  const U_SAT = 0.025
  const plasmonTarget = clamp01(s.storedEnergyJoules / U_SAT)
  s.plasmonDensity += (plasmonTarget - s.plasmonDensity) * clamp01(dt * 2)

  // 5. Lateral dissipation (the "slow light" signature, §3.1).
  //    Builds when plasmon is dense AND Q sits in-band; else decays.
  const qInBand = s.qFactor >= RESONATOR_Q_MIN && s.qFactor <= RESONATOR_Q_MAX
  if (s.plasmonDensity > 0.5 && qInBand) {
    s.lateralDissipation = clamp01(s.lateralDissipation + dt * 0.25)
  } else {
    s.lateralDissipation = Math.max(0, s.lateralDissipation - dt * 0.1)
  }

  // 6. Cavity coherence — the main scalar observable.
  //    plasmon × dissipation × observer, penalised by current risk,
  //    attenuated by egregore class, amplified by glyph intent coupling.
  const nephilimDrag = s.nephilimRisk === 'red' ? 0.5 : s.nephilimRisk === 'amber' ? 0.15 : 0
  const target =
    s.plasmonDensity *
    s.lateralDissipation *
    clamp01(observerCoherence) *
    (1 - nephilimDrag) *
    egDamping *
    glyphCoupling
  s.cavityCoherence += (target - s.cavityCoherence) * clamp01(dt * 1.5)

  // 7. Luminous-thread state machine (§3.2)
  s.luminousThread = resolveThread(s.qFactor, s.plasmonDensity, s.cavityCoherence, s.lateralDissipation)

  // §8.5 — advance the 1D plasma wave solver. Drive amplitude scales
  // with stored energy; cracking state injects incoherent noise.
  const primaryTurnPositionM = config.coilHeightM * 0.2
  const driveAmp = Math.sqrt(Math.max(0, s.storedEnergyJoules / U_SAT))
  s.plasmaField = tickPlasmaField(
    s.plasmaField,
    dt,
    harmonicKey,
    driveAmp,
    primaryTurnPositionM,
    s.qFactor,
    s.luminousThread === 'cracking',
  )

  // 8–10. Failsafe bookkeeping + ramp
  return applyFailsafe(s, observerCoherence)
}

// ─── LIVE path: ingest external telemetry (§8.2 hardware bridge) ──

/**
 * Project hardware telemetry onto the state with no SIM fallback.
 * Unset telemetry fields are written as 0, not carried forward from
 * earlier SIM ticks — see the ResonatorTelemetry doc for rationale.
 *
 * The state machine (luminous thread, Nephilim risk, attenuation ramp)
 * still runs from the injected values so the failsafe stays armed on
 * LIVE data exactly as on SIM data.
 */
export function applyTelemetry(
  state: ResonatorState,
  telemetry: ResonatorTelemetry,
): ResonatorState {
  const s: ResonatorState = {
    ...state,
    dataSource: 'live',
    tick: state.tick + 1,
    f0Hz: telemetry.f0Hz ?? 0,
    qFactor: telemetry.qFactor ?? 0,
    storedEnergyJoules: telemetry.storedEnergyJoules ?? 0,
    plasmonDensity: clamp01(telemetry.plasmonDensity ?? 0),
    cavityCoherence: clamp01(telemetry.cavityCoherence ?? 0),
    lateralDissipation: clamp01(telemetry.lateralDissipation ?? 0),
  }

  s.luminousThread = resolveThread(s.qFactor, s.plasmonDensity, s.cavityCoherence, s.lateralDissipation)
  const obs = clamp01(telemetry.observerCoherence ?? 0)
  return applyFailsafe(s, obs)
}

/**
 * Zero the physical observables while preserving identity (tick,
 * provenance, config-derived f₀, operator choices for glyph/egregore).
 * Call this when toggling SIM ↔ LIVE so no data from the previous
 * mode leaks into the new one.
 */
export function resetObservables(state: ResonatorState, config: ResonatorConfig): ResonatorState {
  return {
    ...state,
    f0Hz: deriveBaseFrequencyHz(config),
    qFactor: 0,
    storedEnergyJoules: 0,
    plasmonDensity: 0,
    cavityCoherence: 0,
    lateralDissipation: 0,
    luminousThread: 'collapsed',
    consecutiveLowCoherenceTicks: 0,
    attenuationFactor: 1.0,
    nephilimRisk: 'safe',
    plasmaField: resetPlasmaField(state.plasmaField),
  }
}

// ─── Failsafe ramp shared by SIM and LIVE ────────────────────────

function applyFailsafe(s: ResonatorState, observerCoherence: number): ResonatorState {
  // §5 Trigger 1 counter
  if (observerCoherence < 0.5) s.consecutiveLowCoherenceTicks++
  else s.consecutiveLowCoherenceTicks = 0

  // §5 intrinsic triggers (1 & 2). Trigger 3 (Phase Engine phase
  // unlock) is the caller's concern — see evaluateNephilimRisk.
  s.nephilimRisk = resolveIntrinsicRisk(s)

  // Soft ramp: 1.0 → 0.1 in ~5 ticks at red, recover at safe.
  const ATTEN_STEP = 0.18
  if (s.nephilimRisk === 'red') {
    s.attenuationFactor = Math.max(0.1, s.attenuationFactor - ATTEN_STEP)
  } else if (s.nephilimRisk === 'safe') {
    s.attenuationFactor = Math.min(1.0, s.attenuationFactor + ATTEN_STEP)
  }
  // amber: hold attenuation at current value
  return s
}

function resolveIntrinsicRisk(s: ResonatorState): NephilimRisk {
  const crackingNow = s.luminousThread === 'cracking'
  const sustainedLowObs = s.consecutiveLowCoherenceTicks > 100
  if (crackingNow || sustainedLowObs) return 'red'
  if (s.consecutiveLowCoherenceTicks > 50 || s.luminousThread === 'forming') return 'amber'
  return 'safe'
}

/**
 * Compose intrinsic risk with the caller-provided third trigger
 * (Phase Engine sustained phase unlock, §5 Trigger 3). The ZPE
 * orchestrator owns the phase-unlock counter; this helper just folds
 * it in without mutating resonator state.
 */
export function evaluateNephilimRisk(
  state: ResonatorState,
  phaseUnlockedTicks: number,
): NephilimRisk {
  if (phaseUnlockedTicks > 100) return 'red'
  if (phaseUnlockedTicks > 50 && state.nephilimRisk !== 'red') return 'amber'
  return state.nephilimRisk
}

// ─── State-machine primitive (§3.2) ──────────────────────────────

function resolveThread(
  q: number,
  plasmon: number,
  coherence: number,
  dissipation: number,
): LuminousThreadState {
  if (q > RESONATOR_Q_MAX || plasmon > 0.95) return 'cracking'
  if (coherence >= 0.7 && dissipation >= 0.5) return 'stable'
  if (coherence >= 0.15 || plasmon >= 0.3) return 'forming'
  return 'collapsed'
}

// ─── §6 observable — P_out / P_in ────────────────────────────────

/**
 * Claimed output-to-input ratio per ZPE paper §1.5 item 3.
 * > 1.0 indicates zero-point emergence candidate; the paper demands
 * the excess exceed measurement uncertainty (±2–5%) before a claim
 * is valid. Panel should display BOTH the raw ratio AND a stricter
 * "confirmed emergence" flag (ratio > 1.05) per zpe.md §8 item 3.
 */
export function outputPowerRatio(state: ResonatorState, inputPowerW: number): number {
  if (inputPowerW <= 0) return 0
  const pOut = state.storedEnergyJoules * state.cavityCoherence * state.f0Hz * 0.001
  return pOut / inputPowerW
}

// ─── UI snapshot ─────────────────────────────────────────────────

export interface ResonatorSnapshot extends ResonatorState {
  f0KHz: number
  qInBand: boolean
  primeHarmonicsHz: readonly number[]
  threadPeakAmplitude: number    // §8.5 — peak |ψ| along coil axis
}

export function getResonatorSnapshot(state: ResonatorState): ResonatorSnapshot {
  return {
    ...state,
    f0KHz: state.f0Hz / 1000,
    qInBand: state.qFactor >= RESONATOR_Q_MIN && state.qFactor <= RESONATOR_Q_MAX,
    primeHarmonicsHz: PRIME_HARMONICS_HZ,
    threadPeakAmplitude: peakAmplitude(state.plasmaField),
  }
}

// ─── Local utilities ─────────────────────────────────────────────

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v
}

// Paper §1.5: input drive P_in ≈ 50..500 W at f₀ ~ 10⁵ Hz
function clampPower(w: number): number {
  return clamp(w, 0, 500)
}
