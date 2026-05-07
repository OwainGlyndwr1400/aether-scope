// ═══════════════════════════════════════════════════════════════════
//  ZPE ORCHESTRATOR — docs/architecture/engines/zpe.md §7
//
//  Thin composition layer over CentralResonator + PhaseEngine. Owns
//  the tick loop for both, composes evaluateNephilimRisk at the fold
//  (§5 trigger 3 — Phase Engine's phase-unlock count crosses into the
//  Resonator's risk calc here, not inside either engine), and exposes
//  a single ZPEState snapshot for panels.
//
//  Per zpe.md §2 ("~15% new code, ~85% orchestration glue"), this
//  module invents no physics — it composes existing observables.
//
//  Pure-functional style matches CentralResonator.ts / PhaseEngine.ts:
//  no class, no module-level mutation. Tick loop is driven from the
//  outside (React panel, Node harness, test fixture).
//
//  Canonical source:
//    docs/architecture/engines/zpe.md §4 (activation protocol),
//                                    §5 (Nephilim failsafe composition),
//                                    §6 (cross-engine observable contract),
//                                    §7 (orchestrator forward-spec).
// ═══════════════════════════════════════════════════════════════════

import {
  createResonator,
  defaultResonatorConfig,
  tickResonator,
  applyTelemetry,
  resetObservables,
  outputPowerRatio,
  getResonatorSnapshot,
  evaluateNephilimRisk,
  getEgregore,
  type ResonatorState,
  type ResonatorConfig,
  type ResonatorTelemetry,
  type ResonatorSnapshot,
  type NephilimRisk,
  type DataSource,
} from './CentralResonator'
import {
  createEngine as createPhaseEngine,
  engineTick as tickPhaseEngine,
  setFlightMode,
  getSnapshot as getPhaseSnapshot,
  type PhaseEngineState,
  type PhaseSnapshot,
} from './PhaseEngine'
import {
  type PrimeHarmonicHz,
  type ZPEGlyphId,
  type EgregoreId,
} from './RHCConstants'

// ─── §4 activation sequence — canonical phase progression ────────
//
// Maps onto zpe.md §4 step 1..6 plus idle/shutdown bookends.
// The orchestrator auto-advances through these based on RHUM-equiv
// observer coherence, thread state, and emergence flag; the operator
// can also force a phase directly.
export type ActivationPhase =
  | 'idle'          // not running
  | 'calibrating'   // §4 step 1 — noise-floor clear
  | 'grounding'     // §4 step 2 — observer coherence ≥ 0.8
  | 'priming'       // §4 step 3 — 963 Hz primary tone active
  | 'injecting'     // §4 step 4 — glyph/sigil operator-intent
  | 'ignition'      // §4 step 5 — scalar field rotation, thread forming
  | 'stable'        // §4 step 6 — phase-locked, thread stable, emergence visible
  | 'shutdown'      // soft ramp-down after Nephilim red or operator stop

// ─── §6 observable contract — the single ZPE snapshot ────────────

export interface ZPEState {
  resonator: ResonatorState
  phaseEngine: PhaseEngineState
  activeHarmonicKey: PrimeHarmonicHz
  inputPowerW: number
  observerCoherence: number
  activationPhase: ActivationPhase
  // Composed risk: intrinsic resonator triggers (§5 1+2) ∪ phase-unlock (§5 3)
  composedNephilimRisk: NephilimRisk
  tick: number
  running: boolean
}

export interface ZPEConfig {
  resonator: ResonatorConfig
}

// ─── Factory ─────────────────────────────────────────────────────

export function createZPE(config: ZPEConfig = { resonator: defaultResonatorConfig() }): ZPEState {
  return {
    resonator: createResonator(config.resonator),
    phaseEngine: createPhaseEngine(),
    activeHarmonicKey: 963, // §4 step 3 canonical ignition tone
    inputPowerW: 100,       // §1.5 default inside 50..500 W band
    observerCoherence: 0.75,
    activationPhase: 'idle',
    composedNephilimRisk: 'safe',
    tick: 0,
    running: false,
  }
}

export function defaultZPEConfig(): ZPEConfig {
  return { resonator: defaultResonatorConfig() }
}

// ─── SIM tick — advance both engines in lockstep ─────────────────
//
// One ZPE tick = one Phase Engine tick + one Resonator tick + one
// Nephilim-risk composition. dt is the Resonator timestep; the Phase
// Engine is driven by its internal attosecond clock and doesn't need
// dt. Returns a fresh ZPEState (no mutation).
export function tickZPE(
  state: ZPEState,
  config: ZPEConfig,
  dt: number,
): ZPEState {
  if (!state.running) return state

  const phaseEngine = tickPhaseEngine(state.phaseEngine)
  const resonator = tickResonator(
    state.resonator,
    config.resonator,
    dt,
    state.inputPowerW,
    state.activeHarmonicKey,
    state.observerCoherence,
  )
  return composeSnapshot(state, resonator, phaseEngine)
}

// ─── LIVE tick — hardware telemetry bridge (§8.2) ────────────────
//
// LIVE path still ticks the Phase Engine (its state is a pure sim
// model regardless of data source), but replaces the Resonator SIM
// step with applyTelemetry. SIM/LIVE no-mix rule still holds —
// resonator observables reflect only what the rig published.
export function tickZPELive(
  state: ZPEState,
  telemetry: ResonatorTelemetry,
): ZPEState {
  if (!state.running) return state

  const phaseEngine = tickPhaseEngine(state.phaseEngine)
  const resonator = applyTelemetry(state.resonator, telemetry)
  const observerCoherence = telemetry.observerCoherence ?? 0
  return composeSnapshot(
    { ...state, observerCoherence },
    resonator,
    phaseEngine,
  )
}

// ─── §5 Nephilim composition — the canonical cross-engine fold ───
//
// Only place where Resonator state and Phase Engine state meet.
// Neither engine imports the other; the orchestrator folds them.
// Trigger 1 (sustained low observer coherence) and Trigger 2
// (luminous-thread cracking) live inside CentralResonator.applyFailsafe.
// Trigger 3 (phase-unlock > 100 ticks) lives inside PhaseEngine.tick
// as phaseUnlockTicks. This helper takes the max-severity of all three.
function composeSnapshot(
  prev: ZPEState,
  resonator: ResonatorState,
  phaseEngine: PhaseEngineState,
): ZPEState {
  const composedNephilimRisk = evaluateNephilimRisk(resonator, phaseEngine.phaseUnlockTicks)
  const activationPhase = resolveActivationPhase(
    prev.activationPhase,
    resonator,
    phaseEngine,
    prev.observerCoherence,
    composedNephilimRisk,
    outputPowerRatio(resonator, prev.inputPowerW),
  )

  return {
    ...prev,
    resonator,
    phaseEngine,
    composedNephilimRisk,
    activationPhase,
    tick: prev.tick + 1,
  }
}

// ─── §4 activation-phase state machine ────────────────────────────
//
// Progresses through calibrating → grounding → priming → injecting →
// ignition → stable as each step's precondition clears. Any Nephilim
// red drops straight to shutdown regardless of current phase.
function resolveActivationPhase(
  current: ActivationPhase,
  resonator: ResonatorState,
  phaseEngine: PhaseEngineState,
  observerCoherence: number,
  risk: NephilimRisk,
  pOutRatio: number,
): ActivationPhase {
  // Red risk short-circuits to shutdown — §5 response "auto-attenuate".
  if (risk === 'red') return 'shutdown'
  if (current === 'idle') return 'calibrating'

  // §4 step 1 — noise floor clear. With no blip-floor signal at the
  // orchestrator level yet, treat calibration as "passed" once tick > 0.
  if (current === 'calibrating') {
    return resonator.tick > 0 ? 'grounding' : 'calibrating'
  }

  // §4 step 2 — observer coherence ≥ egregore's grounding threshold.
  // χ⁴ classes (Lumos/Tesla) gate at 0.80; χ⁸ classes (Veritas/Grok)
  // gate at 0.85 per zpe.md §8.4 decision record.
  if (current === 'grounding') {
    const gate = getEgregore(resonator.egregoreId).groundingThreshold
    return observerCoherence >= gate ? 'priming' : 'grounding'
  }

  // §4 step 3 — primary tone active. Plasmon begins forming.
  if (current === 'priming') {
    return resonator.plasmonDensity >= 0.3 ? 'injecting' : 'priming'
  }

  // §4 step 4 — glyph/sigil injected. Thread begins forming.
  if (current === 'injecting') {
    return resonator.luminousThread === 'forming' || resonator.luminousThread === 'stable'
      ? 'ignition'
      : 'injecting'
  }

  // §4 step 5 — scalar field ignited. Wait for thread stability AND
  // Phase Engine lock before declaring §4 step 6 "stable".
  if (current === 'ignition') {
    const threadLocked = resonator.luminousThread === 'stable'
    const phaseLocked = phaseEngine.phaseLock
    return threadLocked && phaseLocked ? 'stable' : 'ignition'
  }

  // §4 step 6 — stable state. Drop back to ignition if thread lost.
  if (current === 'stable') {
    if (resonator.luminousThread === 'collapsed' || resonator.luminousThread === 'cracking') {
      return 'ignition'
    }
    return 'stable'
  }

  // Shutdown is terminal until explicit reset.
  // Suppress unused-warning on pOutRatio — reserved for future
  // "confirmed emergence" gating in the stable phase.
  void pOutRatio
  return current
}

// ─── Operator-level commands (no orchestrator-internal mutation) ──

export function startZPE(state: ZPEState): ZPEState {
  if (state.running) return state
  return {
    ...state,
    running: true,
    activationPhase: state.activationPhase === 'idle' ? 'calibrating' : state.activationPhase,
    // Flag Phase Engine as running too so its snapshot reports truthful
    // status without the orchestrator needing to expose it separately.
    phaseEngine: { ...state.phaseEngine, running: true },
  }
}

export function stopZPE(state: ZPEState): ZPEState {
  return {
    ...state,
    running: false,
    activationPhase: 'shutdown',
    phaseEngine: { ...state.phaseEngine, running: false },
  }
}

/**
 * Zero both engine states. Preserves operator-configured drive / observer /
 * harmonic-key choices across a reset — only engine state is cleared,
 * matching the panel UX where RESET clears observables but not the chosen key.
 */
export function resetZPE(state: ZPEState, config: ZPEConfig): ZPEState {
  const fresh = createZPE(config)
  return {
    ...fresh,
    activeHarmonicKey: state.activeHarmonicKey,
    inputPowerW: state.inputPowerW,
    observerCoherence: state.observerCoherence,
  }
}

export function setDrivePower(state: ZPEState, inputPowerW: number): ZPEState {
  return { ...state, inputPowerW: clampPower(inputPowerW) }
}

export function setObserverCoherence(state: ZPEState, coherence: number): ZPEState {
  return { ...state, observerCoherence: clamp01(coherence) }
}

export function setHarmonicKey(state: ZPEState, key: PrimeHarmonicHz): ZPEState {
  return { ...state, activeHarmonicKey: key }
}

/**
 * §8.1 — set the active glyph on the resonator. The glyph's
 * intentCoupling multiplies into cavity-coherence target every tick;
 * the orchestrator panel should expose this only during the
 * `injecting` activation phase per §4 step 4.
 */
export function setGlyph(state: ZPEState, glyphId: ZPEGlyphId): ZPEState {
  return {
    ...state,
    resonator: { ...state.resonator, glyphId },
  }
}

/**
 * §8.4 — swap the observer egregore class. Updates the damping
 * multiplier (χ⁴ 0.92 vs χ⁸ 0.8464) and the grounding threshold
 * (0.80 χ⁴ / 0.85 χ⁸) — the latter will gate further activation
 * progression if current coherence no longer clears the new gate.
 */
export function setEgregore(state: ZPEState, egregoreId: EgregoreId): ZPEState {
  return {
    ...state,
    resonator: { ...state.resonator, egregoreId },
  }
}

export function setZPEFlightMode(state: ZPEState, modeId: string): ZPEState {
  return { ...state, phaseEngine: setFlightMode(state.phaseEngine, modeId) }
}

/**
 * Switch the Resonator between SIM and LIVE sources. Zeros physical
 * observables per the SIM/LIVE no-mix rule (see CentralResonator
 * resetObservables), but leaves Phase Engine state untouched — the
 * Phase Engine has no LIVE path in v4.0.
 */
export function setDataSource(state: ZPEState, next: DataSource, config: ZPEConfig): ZPEState {
  if (state.resonator.dataSource === next) return state
  const resonator = { ...resetObservables(state.resonator, config.resonator), dataSource: next }
  return {
    ...state,
    resonator,
    composedNephilimRisk: evaluateNephilimRisk(resonator, state.phaseEngine.phaseUnlockTicks),
  }
}

// ─── UI snapshot ──────────────────────────────────────────────────

export interface ZPESnapshot {
  resonator: ResonatorSnapshot
  phaseEngine: PhaseSnapshot
  activeHarmonicKey: PrimeHarmonicHz
  inputPowerW: number
  observerCoherence: number
  activationPhase: ActivationPhase
  composedNephilimRisk: NephilimRisk
  outputPowerRatio: number
  emergenceConfirmed: boolean  // §1.5 item 3 — ratio > 1.05 threshold
  tick: number
  running: boolean
}

// §1.5 item 3 — claimed excess must exceed measurement uncertainty
// (±2–5%). Match the CentralResonatorPanel threshold.
export const EMERGENCE_CONFIRM_RATIO = 1.05

export function getZPESnapshot(state: ZPEState): ZPESnapshot {
  const pOutRatio = outputPowerRatio(
    state.resonator,
    state.resonator.dataSource === 'live' ? 1 : state.inputPowerW,
  )
  return {
    resonator: getResonatorSnapshot(state.resonator),
    phaseEngine: getPhaseSnapshot(state.phaseEngine),
    activeHarmonicKey: state.activeHarmonicKey,
    inputPowerW: state.inputPowerW,
    observerCoherence: state.observerCoherence,
    activationPhase: state.activationPhase,
    composedNephilimRisk: state.composedNephilimRisk,
    outputPowerRatio: pOutRatio,
    emergenceConfirmed: pOutRatio > EMERGENCE_CONFIRM_RATIO,
    tick: state.tick,
    running: state.running,
  }
}

// ─── Local utilities ──────────────────────────────────────────────

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

// §1.5 input-drive band: 50..500 W (same clamp as CentralResonator)
function clampPower(w: number): number {
  return w < 0 ? 0 : w > 500 ? 500 : w
}
