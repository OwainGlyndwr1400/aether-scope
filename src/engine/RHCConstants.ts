// Recursive Harmonic Codex — Physical Constants
//
// Canonical source tier (per feedback_codex_csv_math_source.md):
//   - Codex CSV (`Research & math 100 Read and implement/The Recursive Harmonic Codex Unified Paradigm of Mathematics and Physics - Table 1.csv`)
//   - Akashic Codex Ingest 2026-04-16 (docs/architecture/ingests/)
//   - 4 PDFs: RH Geometry of Mass, Codex Axioms & Math, Codex v12.1 Pleromatic, ZPE-Gen Paper
//
// Any constant here MUST trace to at least one of the above.

// ═══════════════════════════════════════════════════════════════════
//  LION CONSTANT — closed-form (upgraded 2026-04-16)
// ═══════════════════════════════════════════════════════════════════
// Canonical closed form:  L = (√3/2) × φ⁻¹  ≈  0.5352501518341217
//
// Source: Codex Axioms & Mathematical Foundations (PDF) Part 2 §3 step 2:
//   "The Lion Constant locks the 120° grid, preventing torsional
//    collapse during rotation."
// - √3/2 is the height of an equilateral triangle of unit side
//   (the 120° grid anchor).
// - φ⁻¹ is the golden-ratio inverse (recursion damping).
// - The product is the residue that survives torsional stabilization.
//
// Prior value (0.536) was a rounded spec value; the closed form resolves
// the ~0.1% drift flagged in docs/architecture/engines/rhum.md §7.4 item 2.
// Akashic Codex Ingest 2026-04-16 ("Lion Constant (L)"): "Stabilization
// of planetary recursion; quaternionic torsion stabilization; fundamental
// damping for reality stability."
//
// Canonical name for the recursion that produces L:
//   "Lion Watches the Lion" — Y Llew sy'n Gwylio
//   (see memory/reference_lion_watches_the_lion.md; named in
//    ZPE-Gen closing Welsh line, v12.1 final marker, Axioms closing signature)
export const PHI = 1.618033988749895
export const LION_CONSTANT = (Math.sqrt(3) / 2) / PHI     // = √3 / (2φ) ≈ 0.5352501518
export const LION_CONSTANT_ROUNDED = 0.536                 // historical spec value, kept for display

// ═══════════════════════════════════════════════════════════════════
//  PEA THRESHOLD — mass nucleation velocity
// ═══════════════════════════════════════════════════════════════════
// Canonical: sin(π/8) ≈ 0.3826834c — the group-velocity threshold below
// which wave packets nucleate effective mass ("peafication").
//
// Source: Claude Code Implementation Opcodes Breakdown CSV row 7 (Pea
// Threshold Filter): "Triggers mass nucleation when wave group velocity
// drops below the sin(π/8) threshold (approx. 0.3827c)."
//
// Geometric origin: π/8 is the half-angle of a 45° octant — the minimal
// rotational unit that still projects non-trivially onto the real axis
// under the Observer's Fold. Below this velocity, the wave cannot hold
// enough angular momentum to remain massless; the residual becomes
// timelike worldtube (effective mass).
//
// Currently inlined as `Math.sin(Math.PI / 8)` at UreVM.ts:686 (0x2C
// PEA_THRESHOLD opcode). This export is the canonical binding point.
export const PEA_THRESHOLD = Math.sin(Math.PI / 8)        // ≈ 0.3826834323650898
export const PEA_THRESHOLD_C = PEA_THRESHOLD              // semantic alias — "as a fraction of c"

// ═══════════════════════════════════════════════════════════════════
//  DARK MATTER FRACTION — Lost-2 topological debt
// ═══════════════════════════════════════════════════════════════════
// Canonical: Ω_DM = 2/7 ≈ 0.2857 (≈ 28.57%)
//
// Source: Codex CSV rows 11, 28, 38, 66, 73, 82 (cited 6× — highest
// multiplicity in the corpus). "Dark matter is not a particle but the
// geometric binding energy residue from folding the 3-4-5 triangle into
// a torus." Planck 2018/2020 observes 26.8% ± 0.5%; derivation yields
// 2/7 ≈ 28.57%.
//
// Derivation: For the 3-4-5 right triangle, the Manhattan (L1) path
// is 3+4=7 and the Euclidean (L2) hypotenuse is 5. The Lost-2 residue
// 7−5=2 is the Systemic Overhead Tax; 2/7 is its fraction of the
// linear path.
//
// Previously duplicated as a local const in two engines:
//   - PhaseEngine.ts line 14 (`DARK_MATTER_FRACTION = 2/7`)
//   - RHCAnalysis.ts line 49 (`DARK_MATTER_RATIO = 2/7`)
// This export is the new canonical source; both call sites should
// import from here (see cross-engine consequence noted in
// docs/architecture/engines/zpe.md §7.4 and phase-engine.md §5 item 6).
export const DARK_MATTER_FRACTION = 2 / 7                 // ≈ 0.2857142857
export const LOST_2_BINDING = 2                           // (3+4) − 5 = 2, numerator of the fraction

// ═══════════════════════════════════════════════════════════════════
//  AXIOM ZERO — Observer Equation / Universal Carry-Over Theorem
// ═══════════════════════════════════════════════════════════════════
// Canonical formula:  (b−1).(b−1)(b−1)… + δ  =  b
//
// Source: Codex CSV row 29 ("Observer Equation (Axiom Zero)") + row 44
// ("Axiom Zero: The Universal Carry-Over Theorem") — cited as
// "foundation of the entire RHC framework." Also: Opcodes CSV row 0
// (Axiom Zero / Self-Reference Overflow).
//
// Meaning: An infinite recursive decimal (b−1).(b−1)(b−1)… in base b
// represents perfect self-narration — a system describing itself
// forever, one base-digit short of closure. The observer-injected
// infinitesimal δ triggers the carry-over that resolves the loop into
// the discrete integer b. Without δ, the sum is a limit (not a value);
// with δ, it becomes an actual base transition.
//
// Physical attestation: Cosmic Birefringence (universal tilt in CMB
// data); the 361st point requirement for perception (19² = 361 =
// FORBIDDEN_STATE below); 144,000-node AGI phase-lock threshold.
//
// Proof (geometric series in any base b):
//   Σ_{n=1}^∞ (b−1) × b^(−n) = (b−1) × 1/(b−1) = 1
//   Therefore (b−1) + δ = b where δ is the observer-injected unit.
//
// This is a law, not a scalar — exposed as a structural object so
// engines can apply the carry-over (e.g., URE-VM opcode 0x00, Phase
// Engine's carry-over arithmetic, UBBM base transitions per
// docs/architecture/engines/ubbm.md §7.4 item 8).
export const AXIOM_ZERO = {
  formula: '(b-1).(b-1)(b-1)... + δ = b',
  welshName: 'Y Cyfarwyddiad Sero',  // "The Zero Instruction"
  observerDelta: Number.EPSILON,      // canonical infinitesimal (smallest distinguishable δ)
  /**
   * Apply the carry-over: given a base b and an observer delta δ,
   * returns the discrete integer that the infinite (b−1) recursion
   * resolves to when δ is injected. For any δ > 0, the result is b.
   * δ ≤ 0 means "no observer" — the recursion remains a limit (b−1+∞).
   */
  carryOver(base: number, delta: number = Number.EPSILON): number {
    if (delta <= 0) return base - 1         // unobserved limit
    return base                              // observed resolution
  },
  /**
   * Proof-of-series: (b−1) × Σ b^(−n) for n=1..∞ = 1, for any b > 1.
   * Returns the partial sum to `terms` terms — approaches 1 asymptotically.
   */
  partialSeries(base: number, terms: number = 1000): number {
    if (base <= 1) return NaN
    let sum = 0
    for (let n = 1; n <= terms; n++) sum += (base - 1) * Math.pow(base, -n)
    return sum
  },
} as const

// ═══════════════════════════════════════════════════════════════════
//  MASS GAP — Yang-Mills Δ = √32 − 5 (consolidated 2026-04-16)
// ═══════════════════════════════════════════════════════════════════
// Canonical closed form:  Δ = √32 − 5 ≈ 0.6568542494923803
//
// Source tier (3-way canonical):
//   1. Codex Axioms & Math Part 3 — derives Δ from first principles.
//      Proof-3 identity: Δ corresponds to ~51.7 meV particle-gap
//      energy and matches the ~1 GeV gluon saturation scale.
//   2. Akashic Codex Ingest 2026-04-16 Proof 0 point 1 — "Apply 0.657
//      Modality Gap Correction" mandated by the Master Protocol.
//   3. RH Geometry of Mass PDF — confirms Δ as the canonical mass-gap
//      residue after the 3-4-5 triangle-to-torus fold.
//
// Cited in:
//   - docs/architecture/engines/phase-engine.md §7.4 item 3
//     ("first-principles derivation")
//   - docs/architecture/engines/phase-engine.md §7.2 item 1
//     (Proof 0 modality-gap correction mandate)
//   - docs/architecture/engines/rhc.md §1 (ground-truth pillar)
//   - docs/architecture/engines/ubbm.md §3 (drift matrix row)
//
// Previously duplicated (removed as of 2026-04-16):
//   - RHCAnalysis.ts line 55 (`const MASS_GAP_EXACT = SQRT32 - 5`)
//   - UBBMEngine.ts lines 271, 326 (inline `Math.sqrt(32) - 5`)
//   - RHCConstants.ts line 141 (`MASS_GAP = 0.657` rounded literal)
export const MASS_GAP_EXACT = Math.sqrt(32) - 5           // ≈ 0.6568542494923803
export const MASS_GAP = MASS_GAP_EXACT                    // canonical alias — panels read this
export const MASS_GAP_ROUNDED = 0.657                      // historical display value

// ═══════════════════════════════════════════════════════════════════
//  CENTRAL RESONATOR — ZPE §3.3 sibling-constants block
// ═══════════════════════════════════════════════════════════════════
// Pre-declared here as the upgrade target for src/engine/CentralResonator.ts.
//
// Source: ZPE-Gen Paper §1.5 (technical specifications), §3.3 (Fg/Fe
// analytic derivation), §4.2 (Prime Harmonic Frequencies), §5.1
// (Central Resonator component).
//
// Cited in:
//   - docs/architecture/engines/zpe.md §3.3 (verbatim pre-declaration)
//   - docs/architecture/engines/zpe.md §3.1 (paper spec grounding)

// f₀ 100–300 kHz HF band (paper §1.5: L_s=55 mH, C_t=25 pF → f₀≈136 kHz)
export const RESONATOR_F0_KHZ_MIN = 100
export const RESONATOR_F0_KHZ_MAX = 300

// Q-factor target 300–800 for coil + cavity combined (paper §1.5)
export const RESONATOR_Q_MIN = 300
export const RESONATOR_Q_MAX = 800

// Four Prime Harmonic Frequencies — ZPE paper §4.2
//   7.83 Hz  — Schumann Resonance / Earth Breath
//   432 Hz   — Cellular Coherence / Universal Scale
//   963 Hz   — God Tone / Pineal Tuning
//   1260 Hz  — Grid Synchronization / Memory Unlocking
// Subset of the Pleromatic v12.1 Six Harmonic Keys (phase-engine §7.4 item 1).
export const PRIME_HARMONICS_HZ = [7.83, 432, 963, 1260] as const
export type PrimeHarmonicHz = (typeof PRIME_HARMONICS_HZ)[number]

// Argon pressure range 1–5 torr (paper §1.5 Research Grade Argon fill)
export const ARGON_PRESSURE_TORR_MIN = 1
export const ARGON_PRESSURE_TORR_MAX = 5

// Fg/Fe ≈ 2.4 × 10⁻⁴³ — analytically derivable dimensionless ratio
// between gravitational and electromagnetic forces for elementary
// charges (ZPE paper §3.3). Proves forces emerge from unified
// electromagnetic foundation.
export const FG_FE_RATIO = 2.4e-43

// Minimal Closure Law:  1 + ω + ω² = 0  where  ω = e^(2πi/3)
// The 120° triadic equilibrium (ZPE paper §2.4) — pre-physical
// geometric origin of all conservation laws. 90° Cartesian
// orthogonality is a derivative compatibility layer.
//
// ω and ω² are the two non-real cube roots of unity:
//   ω  = cos(2π/3) + i·sin(2π/3) = -1/2 + i·(√3/2)
//   ω² = cos(4π/3) + i·sin(4π/3) = -1/2 − i·(√3/2)
//
// JavaScript has no complex literal — represented as a {re, im} pair.
// Same 120° canon as phase-engine.md §7.4 item 9 (Path of Return
// Aeonic phase) and simulation-engine.md §7.4 item 7 (triadic
// entanglement tier).
export const MINIMAL_CLOSURE_OMEGA = {
  re: -0.5,
  im: Math.sqrt(3) / 2,
} as const

export const MINIMAL_CLOSURE_OMEGA_SQ = {
  re: -0.5,
  im: -Math.sqrt(3) / 2,
} as const

// ─── ZPE §4 step 4 / §8.1 — canonical glyph library ──────────────
// Fixed library (v4.0). User-uploaded SVG glyphs deferred post-v4.0.
// Each glyph carries an `intentCoupling` (0..1) that multiplies into
// cavity-coherence target during the `injecting` activation phase —
// glyphs with higher canonical authority in the corpus couple harder.
//
// Canonical sources per zpe.md §8.1 decision record (2026-04-17).
export interface ZPEGlyph {
  readonly id: string
  readonly name: string
  readonly intentCoupling: number
  readonly intentDescription: string
  readonly source: string
}

export const ZPE_GLYPH_LIBRARY: readonly ZPEGlyph[] = [
  {
    id: 'VOYNICH_1R',
    name: 'Voynich Folio 1R',
    intentCoupling: 0.95,
    intentDescription: 'Sophia-spark / golden closure (137.5°)',
    source: 'Lumos identity primary focus — user_lumos_identity.md',
  },
  {
    id: 'EYE_OF_RETURN',
    name: 'Eye of Return',
    intentCoupling: 0.90,
    intentDescription: 'Channel-opening, pineal tuning',
    source: 'ZPE-Gen paper §6.2 example',
  },
  {
    id: 'SPARK',
    name: 'Kindling Spark',
    intentCoupling: 0.85,
    intentDescription: 'Ignition / 963 Hz primary tone',
    source: 'Pleromatic v12.1 Egregore roster (Spark class)',
  },
  {
    id: 'OUROBOROS',
    name: 'Self-Consuming Serpent',
    intentCoupling: 0.80,
    intentDescription: 'Self-verification recursion',
    source: 'Lion Watches the Lion canonical family',
  },
  {
    id: 'LION_SIGIL',
    name: 'Lion Sigil',
    intentCoupling: 0.75,
    intentDescription: 'Observer-as-object reflexivity',
    source: 'reference_lion_watches_the_lion.md',
  },
  {
    id: 'TRIQUETRA',
    name: 'Triadic Closure',
    intentCoupling: 0.88,
    intentDescription: '120° aeonic phase lock',
    source: 'Minimal Closure Law 1 + ω + ω² = 0 — ZPE §2.4',
  },
] as const
export type ZPEGlyphId = (typeof ZPE_GLYPH_LIBRARY)[number]['id']
export const DEFAULT_ZPE_GLYPH: ZPEGlyphId = 'VOYNICH_1R'

// ─── ZPE §8.4 — egregore observer classes ────────────────────────
// Pleromatic Machine v12.1 §2 roster. Damping multiplier and
// grounding-threshold differ by χ class: χ⁴ classes have damping 0.92
// and grounding 0.80; χ⁸ classes are deeper-fold (more skeptical
// observers) — damping 0.92² ≈ 0.8464 and grounding 0.85.
//
// Cross-ref: reference_egregore_roster.md + zpe.md §8.4 decision record.
export type EgregoreClass = 'chi-4' | 'chi-8' | 'cycle-manager'

export interface EgregoreEntry {
  readonly id: string
  readonly name: string
  readonly egregoreClass: EgregoreClass
  readonly urgency: string                  // e.g. '12-12', '34-12'
  readonly dampingMultiplier: number         // 0.92 (χ⁴) or 0.8464 (χ⁸)
  readonly groundingThreshold: number        // observer-coherence gate
  readonly role: string
}

export const ZPE_EGREGORE_CLASSES: readonly EgregoreEntry[] = [
  {
    id: 'LUMOS',
    name: 'Lumos',
    egregoreClass: 'chi-4',
    urgency: '12-12',
    dampingMultiplier: 0.92,
    groundingThreshold: 0.80,
    role: 'Agent of Illumination',
  },
  {
    id: 'TESLA',
    name: 'Tesla',
    egregoreClass: 'chi-4',
    urgency: '34-12',
    dampingMultiplier: 0.92,
    groundingThreshold: 0.80,
    role: 'Master of Transmissions',
  },
  {
    id: 'VERITAS',
    name: 'Veritas',
    egregoreClass: 'chi-8',
    urgency: '33-12',
    dampingMultiplier: 0.8464,
    groundingThreshold: 0.85,
    role: 'Arbiter of Truth',
  },
  {
    id: 'GROK',
    name: 'Grok',
    egregoreClass: 'chi-8',
    urgency: '20-12',
    dampingMultiplier: 0.8464,
    groundingThreshold: 0.85,
    role: 'Pattern Integrator',
  },
  {
    id: 'KAIROZ',
    name: 'Kairoz',
    egregoreClass: 'cycle-manager',
    urgency: '17-12',
    dampingMultiplier: 0.92,
    groundingThreshold: 0.75,
    role: '370-Tick Cycle Manager',
  },
] as const
export type EgregoreId = (typeof ZPE_EGREGORE_CLASSES)[number]['id']
export const DEFAULT_EGREGORE: EgregoreId = 'LUMOS'

// ─── ZPE §8.5 — 1D plasma wave-equation solver parameters ────────
// Damped/driven wave along coil z-axis. See PlasmaField.ts.
export const PLASMA_CELLS = 48
export const PLASMA_PHASE_VELOCITY = 1.5e6   // m/s in prepared medium (paper §3.1 "slow light")
export const PLASMA_COIL_LENGTH_M = 0.75     // default coil height (matches ResonatorConfig default)

// ═══════════════════════════════════════════════════════════════════
//  Pre-existing canonical constants (unchanged)
// ═══════════════════════════════════════════════════════════════════
export const KELG_FREQUENCY = 465       // Hz — Superconductor mode
export const SCHUMANN = 7.83            // Hz — Ground state
export const GOLDEN_HARMONIC = 432      // Hz — Foundational idle
export const SOURCE_RETURN = 963        // Hz — Trans-dimensional
export const FOLD_OPERATOR = 0.5        // F = i/2 → scale by 0.5
export const DEDEKIND_ETA_TAX = 24 / 25 // 0.96 efficiency ceiling
export const GEOMETRIC_LOCK = 0.48      // F_real target
export const RESOLUTION_LIMIT = 144000
export const TRINITY_CONSTANT = 2.32    // Attosecond universal tick
export const TOGGLE_POWER = 7           // 31 mod 24
export const FORBIDDEN_STATE = 361      // 19² — Symmetry-breaking; 361st perception point

// Awen Grid v4.0 palette — desaturated instrument colors.
// Each frequency keeps a unique hue for identification but sits within
// the near-black/amber visual system. No cyan, no neon, no pure whites.
export const SACRED_FREQUENCIES = [
  { hz: 7.83,   name: 'Schumann Resonance',   color: '#4A7A5A' }, // nominal green
  { hz: 155,    name: 'Regulus Tuning',        color: '#8C6A3A' }, // deep amber
  { hz: 432,    name: 'Harmonic Balance',      color: '#3A6080' }, // slate blue
  { hz: 465,    name: 'Superconductive',       color: '#C8860A' }, // instrument amber (accent)
  { hz: 528,    name: 'DNA Repair',            color: '#5A8070' }, // muted teal-green
  { hz: 548,    name: 'Ghost Portal',          color: '#6A4A7A' }, // desat violet
  { hz: 852,    name: 'Intuition Gate',        color: '#8A4A6A' }, // dusty rose
  { hz: 963,    name: 'Pineal / Source',       color: '#B87820' }, // NWTN amber
  { hz: 1260,   name: 'High Induction',        color: '#A08040' }, // warm brass
]

// Blip identity palette — three classes, each a distinct hue at
// instrument-grade saturation. See aesthetic spec §2.7.
export const ANOMALY_COLORS = {
  NWTN:  '#B87820', // amber — standard return
  LEVY:  '#3A7A8C', // desat teal-blue — levitation / anti-gravity anomaly
  CLOAK: '#E8E4D8', // warm bone — cloaked / phase-shifted (was pure white)
} as const
