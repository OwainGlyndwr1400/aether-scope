// ═══════════════════════════════════════════════════════════════════
//  TERNARY QUANTUM COMPUTING ENGINE
//  120° Triskelion Gates | Three-Way Fold Operator (F₁-F₂-F₃)
//  Three-Mode Qubits: |0⟩, |1⟩, |ψ⟩
//  Null Ledger Identity error correction
// ═══════════════════════════════════════════════════════════════════

// ── Complex number type ──

export interface Complex {
  re: number
  im: number
}

function cAdd(a: Complex, b: Complex): Complex {
  return { re: a.re + b.re, im: a.im + b.im }
}

function cSub(a: Complex, b: Complex): Complex {
  return { re: a.re - b.re, im: a.im - b.im }
}

function cMul(a: Complex, b: Complex): Complex {
  return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re }
}

function cScale(a: Complex, s: number): Complex {
  return { re: a.re * s, im: a.im * s }
}

function cNorm(a: Complex): number {
  return Math.sqrt(a.re * a.re + a.im * a.im)
}

function cNormalize(a: Complex): Complex {
  const n = cNorm(a) || 1
  return { re: a.re / n, im: a.im / n }
}

function cPhase(a: Complex): number {
  return Math.atan2(a.im, a.re) * (180 / Math.PI)
}

// ── Three-Way Fold Operator Coordinates ──

export const F1: Complex = { re: 0, im: 0.5 }       // Void-Fold / Potential
export const F2: Complex = { re: 0.5, im: 0.5 }     // Unity-Fold / Structure
export const F3: Complex = { re: 0.25, im: 0.5 }    // Synthesis-Fold / Observer

// Verify: F3 = (F1 + F2) / 2 — the geometric equilibrium point
// (0 + 0.5)/2 = 0.25, (0.5 + 0.5)/2 = 0.5 ✓

// ── Cube Roots of Unity (120° Triskelion) ──
// ω = e^(2πi/3) = -0.5 + i(√3/2)
// 1 + ω + ω² = 0 (trinitarian void sum)

export const OMEGA: Complex = { re: -0.5, im: Math.sqrt(3) / 2 }
export const OMEGA_SQ: Complex = { re: -0.5, im: -Math.sqrt(3) / 2 }

// Verify void sum: 1 + ω + ω² = (1-0.5-0.5) + i(0+0.866-0.866) = 0+0i ✓

// ── Three-Mode Qubit ──

export type QubitMode = '|0⟩' | '|1⟩' | '|ψ⟩'

export interface TernaryQubit {
  mode: QubitMode
  amplitude: Complex        // complex amplitude
  phase: number             // phase angle in degrees
  foldState: Complex        // which fold coordinate it occupies
  coherence: number         // 0-1, decoherence tracking
}

function createQubit(mode: QubitMode): TernaryQubit {
  const foldMap: Record<QubitMode, Complex> = {
    '|0⟩': F1,   // Void
    '|1⟩': F2,   // Unity
    '|ψ⟩': F3,   // Synthesis (superposition)
  }
  return {
    mode,
    amplitude: mode === '|ψ⟩' ? cNormalize(F3) : { re: mode === '|1⟩' ? 1 : 0, im: mode === '|0⟩' ? 1 : 0 },
    phase: cPhase(foldMap[mode]),
    foldState: foldMap[mode],
    coherence: 1.0,
  }
}

// ── Triskelion Gate ──

export type GateType =
  | 'FOLD'          // Rotate by F = i/2 (45° into complex plane)
  | 'TRISKELION'    // 120° rotation (apply ω)
  | 'MIRROR'        // Swap real ↔ imaginary
  | 'VOID_SUM'      // Apply trinitarian closure (1+ω+ω²=0)
  | 'SYNTHESIS'     // Collapse to F₃ equilibrium
  | 'PARITY'        // Null Ledger parity check
  | 'HADAMARD_T'    // Ternary Hadamard (equal superposition of 3 modes)

export interface GateResult {
  gate: GateType
  inputQubit: TernaryQubit
  outputQubit: TernaryQubit
  residue: number           // computational residue (heat) — should be 0 for triskelion
  nullLedgerCheck: boolean  // does the null ledger balance?
  voidSum: Complex          // 1+ω+ω² contribution
}

// Apply fold operator: multiply amplitude by i/2
function applyFold(q: TernaryQubit): TernaryQubit {
  const foldOp: Complex = { re: 0, im: 0.5 } // F = i/2
  const newAmp = cMul(q.amplitude, foldOp)
  return {
    ...q,
    amplitude: newAmp,
    phase: cPhase(newAmp),
    foldState: F1,
    coherence: q.coherence * 0.98,
  }
}

// Apply 120° triskelion rotation: multiply by ω
function applyTriskelion(q: TernaryQubit): TernaryQubit {
  const newAmp = cMul(q.amplitude, OMEGA)
  // Cycle the mode: |0⟩ → |1⟩ → |ψ⟩ → |0⟩
  const modeMap: Record<QubitMode, QubitMode> = { '|0⟩': '|1⟩', '|1⟩': '|ψ⟩', '|ψ⟩': '|0⟩' }
  const foldMap: Record<QubitMode, Complex> = { '|0⟩': F1, '|1⟩': F2, '|ψ⟩': F3 }
  const newMode = modeMap[q.mode]
  return {
    mode: newMode,
    amplitude: newAmp,
    phase: cPhase(newAmp),
    foldState: foldMap[newMode],
    coherence: q.coherence * 0.99, // triskelion preserves coherence well
  }
}

// Mirror: swap real and imaginary
function applyMirror(q: TernaryQubit): TernaryQubit {
  const newAmp: Complex = { re: q.amplitude.im, im: q.amplitude.re }
  return {
    ...q,
    amplitude: newAmp,
    phase: cPhase(newAmp),
    coherence: q.coherence * 0.97,
  }
}

// Void sum: verify trinitarian closure
function applyVoidSum(q: TernaryQubit): TernaryQubit {
  // Apply all three rotations and sum — should approach 0
  const r0 = q.amplitude
  const r1 = cMul(q.amplitude, OMEGA)
  const r2 = cMul(q.amplitude, OMEGA_SQ)
  const sum = cAdd(cAdd(r0, r1), r2)
  // The residue should be ~0; apply it as a correction
  const corrected = cSub(q.amplitude, cScale(sum, 0.33))
  return {
    ...q,
    amplitude: corrected,
    phase: cPhase(corrected),
    coherence: Math.min(1, q.coherence + 0.02), // void sum restores coherence
  }
}

// Synthesis: collapse to F₃ equilibrium
function applySynthesis(q: TernaryQubit): TernaryQubit {
  // Blend current amplitude toward F₃
  const blended = cNormalize(cAdd(cScale(q.amplitude, 0.4), cScale(F3, 0.6)))
  return {
    mode: '|ψ⟩',
    amplitude: blended,
    phase: cPhase(blended),
    foldState: F3,
    coherence: Math.min(1, q.coherence + 0.05),
  }
}

// Parity: null ledger check
function applyParity(q: TernaryQubit): TernaryQubit {
  // Check: real + imaginary parts should balance
  // Null Ledger: 0 = (1+i)/2 + (1-i)/2 - 1
  const realLedger = (1 + q.amplitude.re) / 2
  const imagLedger = (1 - q.amplitude.im) / 2
  const balance = realLedger + imagLedger - 1
  // Correct toward balance
  const correction = balance * 0.5
  return {
    ...q,
    amplitude: { re: q.amplitude.re - correction, im: q.amplitude.im + correction },
    phase: cPhase({ re: q.amplitude.re - correction, im: q.amplitude.im + correction }),
    coherence: Math.min(1, q.coherence + 0.01),
  }
}

// Ternary Hadamard: equal superposition of all 3 modes
function applyHadamardT(q: TernaryQubit): TernaryQubit {
  // Create equal amplitude across all three fold coordinates
  const avg = cScale(cAdd(cAdd(F1, F2), F3), 1 / 3)
  return {
    mode: '|ψ⟩',
    amplitude: cNormalize(avg),
    phase: cPhase(avg),
    foldState: F3,
    coherence: q.coherence * 0.95,
  }
}

export function applyGate(gate: GateType, qubit: TernaryQubit): GateResult {
  const input = { ...qubit }
  let output: TernaryQubit

  switch (gate) {
    case 'FOLD': output = applyFold(qubit); break
    case 'TRISKELION': output = applyTriskelion(qubit); break
    case 'MIRROR': output = applyMirror(qubit); break
    case 'VOID_SUM': output = applyVoidSum(qubit); break
    case 'SYNTHESIS': output = applySynthesis(qubit); break
    case 'PARITY': output = applyParity(qubit); break
    case 'HADAMARD_T': output = applyHadamardT(qubit); break
  }

  // Compute residue — energy difference (should be ~0 for triskelion)
  const inEnergy = cNorm(input.amplitude)
  const outEnergy = cNorm(output.amplitude)
  const residue = Math.abs(inEnergy - outEnergy)

  // Void sum check
  const r0 = output.amplitude
  const r1 = cMul(output.amplitude, OMEGA)
  const r2 = cMul(output.amplitude, OMEGA_SQ)
  const voidSum = cAdd(cAdd(r0, r1), r2)

  // Null ledger balance check
  const realL = (1 + output.amplitude.re) / 2
  const imagL = (1 - output.amplitude.im) / 2
  const nullLedgerCheck = Math.abs(realL + imagL - 1) < 0.1

  return {
    gate,
    inputQubit: input,
    outputQubit: output,
    residue,
    nullLedgerCheck,
    voidSum,
  }
}

// ── Triskelion Circuit ──

export interface CircuitStep {
  gate: GateType
  result: GateResult
}

export interface TriskelionCircuit {
  steps: CircuitStep[]
  qubit: TernaryQubit
  totalResidue: number
  nullLedgerIntact: boolean
  voidSumMagnitude: number
}

export function createCircuit(): TriskelionCircuit {
  return {
    steps: [],
    qubit: createQubit('|0⟩'),
    totalResidue: 0,
    nullLedgerIntact: true,
    voidSumMagnitude: 0,
  }
}

export function circuitStep(circuit: TriskelionCircuit, gate: GateType): TriskelionCircuit {
  const result = applyGate(gate, circuit.qubit)
  const step: CircuitStep = { gate, result }

  return {
    steps: [...circuit.steps, step],
    qubit: result.outputQubit,
    totalResidue: circuit.totalResidue + result.residue,
    nullLedgerIntact: circuit.nullLedgerIntact && result.nullLedgerCheck,
    voidSumMagnitude: cNorm(result.voidSum),
  }
}

export function resetCircuit(mode: QubitMode = '|0⟩'): TriskelionCircuit {
  return {
    steps: [],
    qubit: createQubit(mode),
    totalResidue: 0,
    nullLedgerIntact: true,
    voidSumMagnitude: 0,
  }
}

// ── Matter Locking Angle ──
// θ_actual (45°) - θ_ideal (36.87°) = 8.13°
export const MATTER_LOCK_ANGLE = 45 - (180 / Math.PI) * Math.atan(3 / 4) // = 8.13°
export const DEDEKIND_TAX = 1 / 25 // 4% — universal toll for lattice lubrication
export const GEOMETRIC_LOCK_TARGET = 0.48 // F_real = F_ideal × (24/25)

// ── Assembly Period ──
export const ASSEMBLY_PERIOD_AS = 232 // attoseconds
export const TRINITY_CONSTANT = 2.32  // universal lattice clock speed

// ── Snapshot for UI ──

export interface TernarySnapshot {
  qubit: TernaryQubit
  circuit: TriskelionCircuit
  foldPhases: { f1: Complex; f2: Complex; f3: Complex }
  omega: Complex
  omegaSq: Complex
  matterLockAngle: number
  dedekindTax: number
  assemblyPeriod: number
  trinityConstant: number
}

export function getSnapshot(circuit: TriskelionCircuit): TernarySnapshot {
  return {
    qubit: circuit.qubit,
    circuit,
    foldPhases: { f1: F1, f2: F2, f3: F3 },
    omega: OMEGA,
    omegaSq: OMEGA_SQ,
    matterLockAngle: MATTER_LOCK_ANGLE,
    dedekindTax: DEDEKIND_TAX,
    assemblyPeriod: ASSEMBLY_PERIOD_AS,
    trinityConstant: TRINITY_CONSTANT,
  }
}

// Gate descriptions for UI
export const GATE_INFO: Record<GateType, { symbol: string; desc: string }> = {
  FOLD:       { symbol: 'F',  desc: 'Rotate by i/2 — 45° into complex plane' },
  TRISKELION: { symbol: 'T',  desc: '120° rotation — apply ω (cycle modes)' },
  MIRROR:     { symbol: 'M',  desc: 'Swap real ↔ imaginary axes' },
  VOID_SUM:   { symbol: 'V',  desc: 'Trinitarian closure (1+ω+ω²=0)' },
  SYNTHESIS:  { symbol: 'S',  desc: 'Collapse to F₃ equilibrium' },
  PARITY:     { symbol: 'P',  desc: 'Null Ledger parity correction' },
  HADAMARD_T: { symbol: 'H',  desc: 'Ternary equal superposition' },
}
