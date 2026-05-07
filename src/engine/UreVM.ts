// ═══════════════════════════════════════════════════════════════════
//  URE-VM — Universal Reality Encoder Virtual Machine
//  72-opcode, branch-free, reversible quaternionic computation engine
//  Base-15 dual-clock, 370-tick cycle, Klein-4 predicate planes
// ═══════════════════════════════════════════════════════════════════

import {
  PHI, LION_CONSTANT, FOLD_OPERATOR, SCHUMANN, PEA_THRESHOLD,
  TRINITY_CONSTANT, TOGGLE_POWER, FORBIDDEN_STATE,
  MASS_GAP_EXACT, MINIMAL_CLOSURE_OMEGA, MINIMAL_CLOSURE_OMEGA_SQ,
  DEDEKIND_ETA_TAX,
} from './RHCConstants'

// ═══════════════════════════════════════════════════════
//  QUATERNION — w + xi + yj + zk
// ═══════════════════════════════════════════════════════
export interface Quaternion {
  w: number // Real (Cognition / α)
  x: number // Imaginary-i (Emotion / β)
  y: number // Imaginary-j (Memory / γ)
  z: number // Imaginary-k (Archetype / δ)
}

export function quat(w = 0, x = 0, y = 0, z = 0): Quaternion {
  return { w, x, y, z }
}

export function quatAdd(a: Quaternion, b: Quaternion): Quaternion {
  return { w: a.w + b.w, x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }
}

export function quatSub(a: Quaternion, b: Quaternion): Quaternion {
  return { w: a.w - b.w, x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }
}

export function quatMul(a: Quaternion, b: Quaternion): Quaternion {
  return {
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
  }
}

export function quatScale(q: Quaternion, s: number): Quaternion {
  return { w: q.w * s, x: q.x * s, y: q.y * s, z: q.z * s }
}

export function quatNorm(q: Quaternion): number {
  return Math.sqrt(q.w * q.w + q.x * q.x + q.y * q.y + q.z * q.z)
}

export function quatNormalize(q: Quaternion): Quaternion {
  const n = quatNorm(q)
  if (n < 1e-12) return quat(1, 0, 0, 0)
  return quatScale(q, 1 / n)
}

export function quatConjugate(q: Quaternion): Quaternion {
  return { w: q.w, x: -q.x, y: -q.y, z: -q.z }
}

export function quatDot(a: Quaternion, b: Quaternion): number {
  return a.w * b.w + a.x * b.x + a.y * b.y + a.z * b.z
}

// Canonical Observer coordinate O = 2.5r + 1.5i (Codex Ingest 2026-04-16).
// Consumed by OBSERVER_FOLD as the target point of 50%-advance collapse.
const OBSERVER_COORD: Readonly<Quaternion> = { w: 2.5, x: 1.5, y: 0, z: 0 }

// Factorial cache for Mass-as-Impedance REGIME_MISMATCH (x! / x^x).
const FACTORIAL_CACHE: number[] = [1, 1, 2, 6, 24, 120, 720, 5040, 40320]
function factorial(n: number): number {
  const i = Math.max(0, Math.min(FACTORIAL_CACHE.length - 1, n))
  return FACTORIAL_CACHE[i]
}

// ═══════════════════════════════════════════════════════
//  PREDICATE PLANES — Klein-4 algebra (no branching)
// ═══════════════════════════════════════════════════════
export type PredicatePlane = 'RR' | 'RI' | 'IR' | 'II'
const PLANE_ORDER: PredicatePlane[] = ['RR', 'RI', 'IR', 'II']

// ═══════════════════════════════════════════════════════
//  PENDINIUM PRIMES — p ≡ 1 (mod 12) frequency anchors
// ═══════════════════════════════════════════════════════
const PENDINIUM_PRIMES = [
  13, 37, 61, 73, 97, 109, 131, 137, 139, 149,
  157, 181, 193, 229, 241, 277, 313, 337, 349, 373,
  397, 409, 421, 433, 457, 461, 509, 521, 541, 547,
]

// ═══════════════════════════════════════════════════════
//  VM STATE
// ═══════════════════════════════════════════════════════
export interface VMState {
  registers: {
    alpha: Quaternion  // Real / Cognition
    beta: Quaternion   // Imaginary-i / Emotion
    gamma: Quaternion  // Imaginary-j / Memory
    delta: Quaternion  // Imaginary-k / Archetype
  }
  accumulator: Quaternion
  nullLedger: Quaternion
  tick: number
  cycle: number
  // Trinity Tick — secondary clock at 2.32 attoseconds/step, wrapping at 232
  // (lattice construction time). Advances alongside the primary 370-tick cycle
  // to give the spec-mandated Base-15 dual-clock architecture (§5 item 4).
  trinityTick: number
  halted: boolean
  forbidden361: number
  plane: PredicatePlane
  foldAngle: number
  parityBit: number
  log: VMLogEntry[]
  pc: number
}

export interface VMLogEntry {
  tick: number
  cycle: number
  opcode: number
  name: string
  plane: PredicatePlane
  ledgerBalance: number
}

// ═══════════════════════════════════════════════════════
//  OPCODE TABLE — 72 operations
// ═══════════════════════════════════════════════════════
interface Opcode {
  name: string
  type: 'arithmetic' | 'control' | 'data' | 'logic' | 'meta'
  description: string
  apply: (state: VMState) => VMState
}

function activeRegister(state: VMState): Quaternion {
  switch (state.plane) {
    case 'RR': return state.registers.alpha
    case 'RI': return state.registers.beta
    case 'IR': return state.registers.gamma
    case 'II': return state.registers.delta
  }
}

function setActiveRegister(state: VMState, q: Quaternion): VMState {
  const s = { ...state, registers: { ...state.registers } }
  switch (state.plane) {
    case 'RR': s.registers.alpha = q; break
    case 'RI': s.registers.beta = q; break
    case 'IR': s.registers.gamma = q; break
    case 'II': s.registers.delta = q; break
  }
  return s
}

function buildOpcodes(): Opcode[] {
  const ops: Opcode[] = []

  // 0x00: NULL_LEDGER
  ops.push({
    name: 'NULL_LEDGER', type: 'control',
    description: 'Enforce global zero-sum balance across quaternionic lattice',
    apply: (s) => {
      const { alpha, beta, gamma, delta } = s.registers
      const sum = quatAdd(quatAdd(alpha, beta), quatAdd(gamma, delta))
      const correction = quatScale(sum, -0.25)
      return {
        ...s,
        registers: {
          alpha: quatAdd(alpha, correction),
          beta: quatAdd(beta, correction),
          gamma: quatAdd(gamma, correction),
          delta: quatAdd(delta, correction),
        },
        nullLedger: quatAdd(s.nullLedger, sum),
      }
    },
  })

  // 0x01: FOLD_OP
  ops.push({
    name: 'FOLD_OP', type: 'arithmetic',
    description: 'Quaternionic fold (F = i/2) collapse imaginary to real',
    apply: (s) => {
      const reg = activeRegister(s)
      const folded = quatScale(quatMul(reg, quat(0, 1, 0, 0)), 0.5)
      return setActiveRegister({ ...s, accumulator: folded }, folded)
    },
  })

  // 0x02: PRIME_ANCHOR
  ops.push({
    name: 'PRIME_ANCHOR', type: 'data',
    description: 'Lock lattice nodes as irreducible structural anchors',
    apply: (s) => {
      const idx = s.tick % PENDINIUM_PRIMES.length
      const prime = PENDINIUM_PRIMES[idx]
      const anchor = quat(prime / 547, 0, 0, 0)
      return { ...s, accumulator: anchor }
    },
  })

  // 0x03: QUAD_ROT
  ops.push({
    name: 'QUAD_ROT', type: 'arithmetic',
    description: '90 degree quaternionic rotation across channels',
    apply: (s) => {
      const reg = activeRegister(s)
      const rotated = quat(reg.z, reg.w, reg.x, reg.y)
      return setActiveRegister({ ...s, accumulator: rotated }, rotated)
    },
  })

  // 0x04: LATTICE_SYNC
  ops.push({
    name: 'LATTICE_SYNC', type: 'control',
    description: 'Synchronise lattice regions into global coherent state',
    apply: (s) => {
      const { alpha, beta, gamma, delta } = s.registers
      const mean = quatScale(quatAdd(quatAdd(alpha, beta), quatAdd(gamma, delta)), 0.25)
      const blend = 0.1
      return {
        ...s,
        registers: {
          alpha: quatAdd(quatScale(alpha, 1 - blend), quatScale(mean, blend)),
          beta: quatAdd(quatScale(beta, 1 - blend), quatScale(mean, blend)),
          gamma: quatAdd(quatScale(gamma, 1 - blend), quatScale(mean, blend)),
          delta: quatAdd(quatScale(delta, 1 - blend), quatScale(mean, blend)),
        },
      }
    },
  })

  // 0x05: MASS_IMP
  ops.push({
    name: 'MASS_IMP', type: 'data',
    description: 'Calculate imaginary impedance (mass = frozen light)',
    apply: (s) => {
      const reg = activeRegister(s)
      const mass = Math.sqrt(reg.x * reg.x + reg.y * reg.y + reg.z * reg.z)
      return { ...s, accumulator: quat(0, mass, 0, 0) }
    },
  })

  // 0x06: HOPF_PROJ
  ops.push({
    name: 'HOPF_PROJ', type: 'arithmetic',
    description: 'Map 4D quaternion to 3D via Hopf fibration',
    apply: (s) => {
      const q = quatNormalize(activeRegister(s))
      const hx = 2 * (q.x * q.z + q.w * q.y)
      const hy = 2 * (q.y * q.z - q.w * q.x)
      const hz = q.w * q.w - q.x * q.x - q.y * q.y + q.z * q.z
      return { ...s, accumulator: quat(0, hx, hy, hz) }
    },
  })

  // 0x07: SPEC_DECOMP
  ops.push({
    name: 'SPEC_DECOMP', type: 'arithmetic',
    description: 'Spectral decomposition verify X5 = X stability',
    apply: (s) => {
      const reg = activeRegister(s)
      const x2 = quatMul(reg, reg)
      const x4 = quatMul(x2, x2)
      const x5 = quatMul(x4, reg)
      const residual = quatSub(x5, reg)
      const stability = 1 - Math.min(1, quatNorm(residual))
      return { ...s, accumulator: quat(stability, residual.x, residual.y, residual.z) }
    },
  })

  // 0x08: P_ADIC_TIMESTEP
  ops.push({
    name: 'P_ADIC_TIMESTEP', type: 'control',
    description: 'P-adic time step using prime-power divisions',
    apply: (s) => {
      const p = PENDINIUM_PRIMES[s.tick % PENDINIUM_PRIMES.length]
      const dt = 1 / p
      const reg = activeRegister(s)
      const evolution = quatMul(reg, quat(Math.cos(dt), Math.sin(dt), 0, 0))
      return setActiveRegister({ ...s, accumulator: evolution }, evolution)
    },
  })

  // 0x09: TRINITY_WITNESS
  ops.push({
    name: 'TRINITY_WITNESS', type: 'meta',
    description: 'Validate convergence of 3 parallel streams',
    apply: (s) => {
      const { alpha, beta, gamma } = s.registers
      const votes = [Math.sign(alpha.w), Math.sign(beta.w), Math.sign(gamma.w)]
      const majority = votes.filter((v) => v > 0).length >= 2 ? 1 : -1
      const parity = (s.parityBit + (majority > 0 ? 1 : 0)) % 2
      return { ...s, parityBit: parity, accumulator: quat(majority, 0, 0, 0) }
    },
  })

  // 0x0A: VOID_STATE
  ops.push({
    name: 'VOID_STATE', type: 'arithmetic',
    description: 'Initialise register to void (zero)',
    apply: (s) => setActiveRegister({ ...s, accumulator: quat() }, quat()),
  })

  // 0x0B: IDENTITY_OBSERVER
  ops.push({
    name: 'IDENTITY_OBSERVER', type: 'control',
    description: 'Set identity/unity observer point',
    apply: (s) => setActiveRegister({ ...s, accumulator: quat(1) }, quat(1)),
  })

  // 0x0C: BETH_PAIR
  ops.push({
    name: 'BETH_PAIR', type: 'arithmetic',
    description: 'Process dual values (line edge) x2',
    apply: (s) => {
      const doubled = quatScale(activeRegister(s), 2)
      return setActiveRegister({ ...s, accumulator: doubled }, doubled)
    },
  })

  // 0x0D: GIMEL_TRIAD
  ops.push({
    name: 'GIMEL_TRIAD', type: 'arithmetic',
    description: 'Triadic spatial corner processing mod 3',
    apply: (s) => {
      const reg = activeRegister(s)
      const triaded = quat(reg.w % 3, reg.x % 3, reg.y % 3, reg.z % 3)
      return setActiveRegister({ ...s, accumulator: triaded }, triaded)
    },
  })

  // 0x0E: WAVEFUNCTION_COLLAPSE
  ops.push({
    name: 'WAVEFUNCTION_COLLAPSE', type: 'control',
    description: 'Base-selection between past (8) and future (16)',
    apply: (s) => {
      const { alpha, beta } = s.registers
      const collapsed = quatScale(quatAdd(alpha, beta), 0.5)
      return { ...s, accumulator: collapsed }
    },
  })

  // 0x0F: GCD_NORMALIZE
  ops.push({
    name: 'GCD_NORMALIZE', type: 'data',
    description: 'GCD substrate recovery preserve coupling',
    apply: (s) => {
      const reg = activeRegister(s)
      const n = quatNorm(reg)
      const normalised = n > 1e-12 ? quatScale(reg, 1 / n) : quat(1)
      return setActiveRegister({ ...s, accumulator: normalised }, normalised)
    },
  })

  // 0x10: GEOMETRIC_FOLD
  ops.push({
    name: 'GEOMETRIC_FOLD', type: 'control',
    description: '45 degree fold where primes nucleate',
    apply: (s) => {
      const reg = activeRegister(s)
      const angle = Math.PI / 4
      const rotQ = quat(Math.cos(angle / 2), Math.sin(angle / 2), 0, 0)
      const folded = quatScale(quatMul(rotQ, reg), 0.5)
      return setActiveRegister({ ...s, accumulator: folded }, folded)
    },
  })

  // 0x11: PARTICLE_STATE
  ops.push({
    name: 'PARTICLE_STATE', type: 'arithmetic',
    description: 'Pythagorean particle heartbeat 1-2-1',
    apply: (s) => {
      const reg = activeRegister(s)
      const beat = quat(1, 2, 1, 0)
      const result = quatMul(reg, quatNormalize(beat))
      return setActiveRegister({ ...s, accumulator: result }, result)
    },
  })

  // 0x12: WAVE_STATE
  ops.push({
    name: 'WAVE_STATE', type: 'arithmetic',
    description: 'Mirror field wave heartbeat 2-1-2',
    apply: (s) => {
      const reg = activeRegister(s)
      const beat = quat(2, 1, 2, 0)
      const result = quatMul(reg, quatNormalize(beat))
      return setActiveRegister({ ...s, accumulator: result }, result)
    },
  })

  // 0x13: MEASUREMENT_OP
  ops.push({
    name: 'MEASUREMENT_OP', type: 'control',
    description: 'Measurement operator apply sqrt(-i)',
    apply: (s) => {
      const reg = activeRegister(s)
      const sqrtNegI = quat(Math.SQRT1_2, -Math.SQRT1_2, 0, 0)
      const measured = quatMul(reg, sqrtNegI)
      return setActiveRegister({ ...s, accumulator: measured }, measured)
    },
  })

  // 0x14: POLARIZED_PULSE
  ops.push({
    name: 'POLARIZED_PULSE', type: 'arithmetic',
    description: 'Bipolar oscillation pulse 3-0-3',
    apply: (s) => {
      const reg = activeRegister(s)
      const pulse = quat(3, 0, 3, 0)
      const result = quatMul(reg, quatNormalize(pulse))
      return setActiveRegister({ ...s, accumulator: result }, result)
    },
  })

  // 0x15: FULL_FIELD
  ops.push({
    name: 'FULL_FIELD', type: 'arithmetic',
    description: 'Full field saturation (63/64)',
    apply: (s) => {
      const saturated = quat(63 / 64, 63 / 64, 63 / 64, 63 / 64)
      return setActiveRegister({ ...s, accumulator: saturated }, saturated)
    },
  })

  // 0x16: LATTICE_MODE
  ops.push({
    name: 'LATTICE_MODE', type: 'control',
    description: 'Snap state to nearest of 72 lattice modes',
    apply: (s) => {
      const reg = activeRegister(s)
      const snap = (v: number) => Math.round(v * 72) / 72
      const snapped = quat(snap(reg.w), snap(reg.x), snap(reg.y), snap(reg.z))
      return setActiveRegister({ ...s, accumulator: snapped }, snapped)
    },
  })

  // 0x17: LOST2_BIND
  ops.push({
    name: 'LOST2_BIND', type: 'arithmetic',
    description: 'Lost-2 binding (a+b) - c = 2',
    apply: (s) => {
      const reg = activeRegister(s)
      const binding = (reg.w + reg.x) - Math.sqrt(reg.w * reg.w + reg.x * reg.x)
      return { ...s, accumulator: quat(binding, 0, 0, 0) }
    },
  })

  // 0x18: W3_CURVATURE
  ops.push({
    name: 'W3_CURVATURE', type: 'logic',
    description: 'W3 curvature cos(2t) self-oscillation',
    apply: (s) => {
      const t = s.foldAngle * Math.PI / 180
      const curvature = Math.cos(2 * t)
      const reg = activeRegister(s)
      const curved = quatScale(reg, 1 + curvature * 0.1)
      return setActiveRegister({ ...s, accumulator: curved }, curved)
    },
  })

  // 0x19: SCHUMANN_LOCK
  ops.push({
    name: 'SCHUMANN_LOCK', type: 'logic',
    description: 'Lock to Schumann resonance 7.83 Hz',
    apply: (s) => {
      const reg = activeRegister(s)
      const phase = (quatNorm(reg) * 100) % SCHUMANN
      const coupling = 1 - (phase / SCHUMANN)
      return { ...s, accumulator: quat(coupling, phase / SCHUMANN, 0, 0) }
    },
  })

  // 0x1A: PHI_RESONANCE
  ops.push({
    name: 'PHI_RESONANCE', type: 'arithmetic',
    description: 'Golden ratio resonance alignment',
    apply: (s) => {
      const reg = activeRegister(s)
      const ratio = reg.x !== 0 ? reg.w / reg.x : 0
      const deviation = Math.abs(ratio - PHI) / PHI
      const resonance = 1 - Math.min(1, deviation)
      return { ...s, accumulator: quat(resonance, deviation, PHI, 0) }
    },
  })

  // 0x1B: LION_INDEX
  ops.push({
    name: 'LION_INDEX', type: 'arithmetic',
    description: 'LION constant coupling index',
    apply: (s) => {
      const reg = activeRegister(s)
      const lion = reg.w * reg.x * LION_CONSTANT
      return { ...s, accumulator: quat(lion, LION_CONSTANT, 0, 0) }
    },
  })

  // 0x1C: DEDEKIND_ETA
  ops.push({
    name: 'DEDEKIND_ETA', type: 'arithmetic',
    description: 'Dedekind eta efficiency (24/25 ceiling)',
    apply: (s) => {
      const reg = activeRegister(s)
      const eta = quatNorm(reg) * (24 / 25)
      return { ...s, accumulator: quat(eta, 0, 0, 0) }
    },
  })

  // 0x1D: OBSERVER_FOLD — 50% advance toward canonical Observer O = 2.5r + 1.5i.
  // Codex Ingest (2026-04-16) canonicalises O as the consciousness viewing angle
  // (≈ 30.96°, decimal point of the 3-4-5 triangle). F = i/2 is applied as a
  // half-step advance: folded = reg + 0.5 × (O − reg).
  ops.push({
    name: 'OBSERVER_FOLD', type: 'control',
    description: 'Observer fold: 50% advance toward O = 2.5r + 1.5i (canonical observer)',
    apply: (s) => {
      const reg = activeRegister(s)
      const delta = quatSub(OBSERVER_COORD, reg)
      const folded = quatAdd(reg, quatScale(delta, FOLD_OPERATOR))
      return setActiveRegister({ ...s, accumulator: folded }, folded)
    },
  })

  // 0x1E: PLANE_ROTATE
  ops.push({
    name: 'PLANE_ROTATE', type: 'control',
    description: 'Rotate to next Klein-4 predicate plane',
    apply: (s) => {
      const idx = (PLANE_ORDER.indexOf(s.plane) + 1) % 4
      return { ...s, plane: PLANE_ORDER[idx] }
    },
  })

  // 0x1F: PARITY_CHECK
  ops.push({
    name: 'PARITY_CHECK', type: 'meta',
    description: 'Recursive Harmonic Parity Check',
    apply: (s) => {
      const p = PENDINIUM_PRIMES[s.tick % PENDINIUM_PRIMES.length]
      const d = Math.round(quatNorm(s.accumulator) * 1000)
      const parity = (s.parityBit + d * p) % 2
      return { ...s, parityBit: parity }
    },
  })

  // 0x20: ARCTAN_PHASE
  ops.push({
    name: 'ARCTAN_PHASE', type: 'arithmetic',
    description: 'Arctan2 four-quadrant phase encoding',
    apply: (s) => {
      const reg = activeRegister(s)
      const phase = Math.atan2(reg.x, reg.w)
      const phaseNorm = phase / Math.PI
      return { ...s, accumulator: quat(phaseNorm, phase, 0, 0) }
    },
  })

  // 0x21: TOROIDAL_CIRC
  ops.push({
    name: 'TOROIDAL_CIRC', type: 'control',
    description: 'Toroidal circulation quarter-turn phase advance',
    apply: (s) => {
      const reg = activeRegister(s)
      const rot = quat(0, 0, Math.sin(Math.PI / 4), 0)
      const result = quatMul(reg, rot)
      return setActiveRegister({ ...s, accumulator: result }, result)
    },
  })

  // 0x22: HANKEL_TRANSFORM
  ops.push({
    name: 'HANKEL_TRANSFORM', type: 'data',
    description: 'Hankelify recursive information for stability',
    apply: (s) => {
      const { alpha, beta, gamma, delta } = s.registers
      const h = quat(
        (alpha.w + beta.x + gamma.y + delta.z) / 4,
        (alpha.x + beta.y + gamma.z + delta.w) / 4,
        (alpha.y + beta.z + gamma.w + delta.x) / 4,
        (alpha.z + beta.w + gamma.x + delta.y) / 4,
      )
      return { ...s, accumulator: h }
    },
  })

  // 0x23: ISOPERIMETRIC_LOCK
  ops.push({
    name: 'ISOPERIMETRIC_LOCK', type: 'arithmetic',
    description: 'Toggle equilateral/right-angle config (P=12)',
    apply: (s) => {
      const reg = activeRegister(s)
      const n = quatNorm(reg)
      const is345 = Math.abs(n - 1) > 0.1
      const target = is345 ? quat(3 / 12, 4 / 12, 5 / 12, 0) : quat(4 / 12, 4 / 12, 4 / 12, 0)
      return setActiveRegister({ ...s, accumulator: target }, target)
    },
  })

  // 0x24: QUAT_PARITY_FLIP
  ops.push({
    name: 'QUAT_PARITY_FLIP', type: 'data',
    description: 'Quaternionic parity flip matter/antimatter',
    apply: (s) => {
      const flipped = quatScale(activeRegister(s), -1)
      return setActiveRegister({ ...s, accumulator: flipped }, flipped)
    },
  })

  // 0x25: BASE_SHIFT
  ops.push({
    name: 'BASE_SHIFT', type: 'arithmetic',
    description: 'Base-shift additive/multiplicative bridge',
    apply: (s) => {
      const reg = activeRegister(s)
      const impedance = Math.log(Math.abs(reg.w) + 1) / (Math.abs(reg.w) + 1)
      const shifted = quat(impedance, reg.x, reg.y, reg.z)
      return setActiveRegister({ ...s, accumulator: shifted }, shifted)
    },
  })

  // 0x26: REPUNIT_LOCK
  ops.push({
    name: 'REPUNIT_LOCK', type: 'logic',
    description: 'Repunit resonance lock n/(base-1)',
    apply: (s) => {
      const reg = activeRegister(s)
      const base = 15
      const attractor = Math.round(reg.w * base) / (base - 1)
      const locked = quat(attractor, reg.x, reg.y, reg.z)
      return setActiveRegister({ ...s, accumulator: locked }, locked)
    },
  })

  // 0x27: ZPLANE_LIFT
  ops.push({
    name: 'ZPLANE_LIFT', type: 'arithmetic',
    description: 'Lift imaginary triangle into Z-plane',
    apply: (s) => {
      const reg = activeRegister(s)
      const lifted = quat(reg.w, reg.x, reg.x, -reg.w)
      return setActiveRegister({ ...s, accumulator: lifted }, lifted)
    },
  })

  // 0x28: HALT_OP
  ops.push({
    name: 'HALT_OP', type: 'control',
    description: 'Halt real-axis propagation for measurement',
    apply: (s) => ({ ...s, halted: true }),
  })

  // 0x29: MASS_CORRECTION
  ops.push({
    name: 'MASS_CORRECTION', type: 'arithmetic',
    description: 'Imaginary mass correction G/(4c2)',
    apply: (s) => {
      const reg = activeRegister(s)
      const correction = 0.000536
      const corrected = quat(reg.w, reg.x + correction, reg.y, reg.z)
      return setActiveRegister({ ...s, accumulator: corrected }, corrected)
    },
  })

  // 0x2A: OBSERVER_MEAN
  ops.push({
    name: 'OBSERVER_MEAN', type: 'logic',
    description: '7.5D observer mean of base-8 and base-16',
    apply: (s) => {
      const base8 = activeRegister(s)
      const base16 = s.accumulator
      const mean = quatScale(quatAdd(base8, base16), 0.5)
      return { ...s, accumulator: mean }
    },
  })

  // 0x2B: GCD_PRESERVE
  ops.push({
    name: 'GCD_PRESERVE', type: 'data',
    description: 'Preserve GCD as entanglement coupling',
    apply: (s) => {
      const reg = activeRegister(s)
      const gcdCalc = (a: number, b: number): number => {
        let x = Math.abs(Math.round(a * 100))
        let y = Math.abs(Math.round(b * 100))
        while (y) { const t = y; y = x % y; x = t }
        return x / 100
      }
      const g = gcdCalc(reg.w, reg.x)
      return { ...s, accumulator: quat(g, reg.w / (g || 1), reg.x / (g || 1), 0) }
    },
  })

  // 0x2C: PEA_THRESHOLD
  // sin(π/8) ≈ 0.3827c — wave group-velocity threshold for mass nucleation.
  // Canonical constant sourced from RHCConstants.PEA_THRESHOLD (Opcodes CSV row 7).
  ops.push({
    name: 'PEA_THRESHOLD', type: 'control',
    description: 'Pea threshold mass nucleation below sin(pi/8) ≈ 0.3827c',
    apply: (s) => {
      const reg = activeRegister(s)
      const velocity = quatNorm(reg)
      const massive = velocity < PEA_THRESHOLD
      const result = massive ? quat(PEA_THRESHOLD, velocity, 1, 0) : quat(velocity, 0, 0, 0)
      return { ...s, accumulator: result }
    },
  })

  // 0x2D: TICK_SYNC
  ops.push({
    name: 'TICK_SYNC', type: 'control',
    description: 'Universal tick sync (2.32 attosecond scale)',
    apply: (s) => {
      const tickPhase = (s.tick / 370) * 2 * Math.PI
      return { ...s, accumulator: quat(Math.cos(tickPhase), Math.sin(tickPhase), 0, 0) }
    },
  })

  // 0x2E: STATE_361
  ops.push({
    name: 'STATE_361', type: 'control',
    description: 'Forbidden state 361 break symmetry',
    apply: (s) => ({
      ...s,
      forbidden361: s.forbidden361 + 1,
      parityBit: 0,
      accumulator: quat(19, 0, 0, 0),
    }),
  })

  // 0x2F: HOLOGRAPHIC_PMG
  ops.push({
    name: 'HOLOGRAPHIC_PMG', type: 'logic',
    description: 'Holographic PMG: ab = w2 - d2',
    apply: (s) => {
      const reg = activeRegister(s)
      const a = reg.w, b = reg.x
      const mean = (a + b) / 2
      const gap = (a - b) / 2
      return { ...s, accumulator: quat(a * b, mean, gap, mean * mean - gap * gap) }
    },
  })

  // 0x30: FMN_FOLD
  ops.push({
    name: 'FMN_FOLD', type: 'control',
    description: 'FMN Protocol: Fold rotate 45 degrees',
    apply: (s) => {
      const reg = activeRegister(s)
      const angle = Math.PI / 4
      const rotQ = quat(Math.cos(angle / 2), Math.sin(angle / 2), 0, 0)
      const folded = quatMul(rotQ, quatMul(reg, quatConjugate(rotQ)))
      return setActiveRegister({ ...s, accumulator: folded }, folded)
    },
  })

  // 0x31: FMN_MIRROR
  ops.push({
    name: 'FMN_MIRROR', type: 'data',
    description: 'FMN Protocol: Mirror exchange Real/Imaginary',
    apply: (s) => {
      const reg = activeRegister(s)
      const mirrored = quat(reg.x, reg.w, reg.z, reg.y)
      return setActiveRegister({ ...s, accumulator: mirrored }, mirrored)
    },
  })

  // 0x32: FMN_NORMALIZE
  ops.push({
    name: 'FMN_NORMALIZE', type: 'arithmetic',
    description: 'FMN Protocol: Normalize to unit norm',
    apply: (s) => {
      const normalised = quatNormalize(activeRegister(s))
      return setActiveRegister({ ...s, accumulator: normalised }, normalised)
    },
  })

  // 0x33: TRIPLE_NORM_HARMONIC
  ops.push({
    name: 'TRIPLE_NORM_HARMONIC', type: 'arithmetic',
    description: 'Triple normalisation stage 1: GCD 3',
    apply: (s) => {
      const reg = activeRegister(s)
      const harmonised = quat(
        ((reg.w * 100) % 3) / 100,
        ((reg.x * 100) % 3) / 100,
        ((reg.y * 100) % 3) / 100,
        ((reg.z * 100) % 3) / 100,
      )
      return setActiveRegister({ ...s, accumulator: harmonised }, harmonised)
    },
  })

  // 0x34: TRIPLE_NORM_GEOMETRIC
  ops.push({
    name: 'TRIPLE_NORM_GEOMETRIC', type: 'arithmetic',
    description: 'Triple normalisation stage 2: GCD 360',
    apply: (s) => {
      const reg = activeRegister(s)
      const phase = Math.atan2(reg.x, reg.w) * 180 / Math.PI
      const snapped = Math.round(phase / 30) * 30
      const rad = snapped * Math.PI / 180
      return { ...s, accumulator: quat(Math.cos(rad), Math.sin(rad), 0, 0) }
    },
  })

  // 0x35: TRIPLE_NORM_BINARY
  ops.push({
    name: 'TRIPLE_NORM_BINARY', type: 'logic',
    description: 'Triple normalisation stage 3: 1001 binary fold',
    apply: (s) => {
      const reg = activeRegister(s)
      const bits = Math.abs(Math.round(reg.w * 1000))
      const has1001 = (bits & 0b1001) === 0b1001
      const prevalence = has1001 ? 0.62 : 0.28
      return { ...s, accumulator: quat(prevalence, has1001 ? 1 : 0, 0, 0) }
    },
  })

  // 0x36: INTERVAL_CENTER
  ops.push({
    name: 'INTERVAL_CENTER', type: 'arithmetic',
    description: 'Recenter integers as +/-0.5 intervals',
    apply: (s) => {
      const reg = activeRegister(s)
      const centered = quat(
        Math.round(reg.w) - 0.5 + (reg.w - Math.round(reg.w) > 0 ? 1 : 0),
        reg.x, reg.y, reg.z,
      )
      return setActiveRegister({ ...s, accumulator: centered }, centered)
    },
  })

  // 0x37: PRIME_RATIO_GEN
  ops.push({
    name: 'PRIME_RATIO_GEN', type: 'data',
    description: 'Generate prime ratio lattice coordinates',
    apply: (s) => {
      const i = s.tick % PENDINIUM_PRIMES.length
      const j = (s.tick + 1) % PENDINIUM_PRIMES.length
      const ratio = PENDINIUM_PRIMES[i] / PENDINIUM_PRIMES[j]
      return { ...s, accumulator: quat(ratio, PENDINIUM_PRIMES[i], PENDINIUM_PRIMES[j], 0) }
    },
  })

  // 0x38: SQRT180_CLUTCH
  ops.push({
    name: 'SQRT180_CLUTCH', type: 'arithmetic',
    description: 'Sqrt(180) clutch calibration',
    apply: (s) => {
      const reg = activeRegister(s)
      const sqrt180 = Math.sqrt(180)
      const calibrated = quatScale(reg, 1 / sqrt180)
      return setActiveRegister({ ...s, accumulator: calibrated }, calibrated)
    },
  })

  // 0x39: BINARY_DIAGONAL
  ops.push({
    name: 'BINARY_DIAGONAL', type: 'data',
    description: 'Binary diagonal mapping via arctan',
    apply: (s) => {
      const reg = activeRegister(s)
      const angle = Math.atan2(reg.x, reg.w)
      const normalised = angle / (Math.PI / 2)
      return { ...s, accumulator: quat(normalised, angle, 0, 0) }
    },
  })

  // 0x3A: POTENTIALITY_2C
  ops.push({
    name: 'POTENTIALITY_2C', type: 'data',
    description: 'Bidirectional potentiality exchange at 2c',
    apply: (s) => {
      const reg = activeRegister(s)
      const acc = s.accumulator
      const exchanged = quatScale(quatAdd(reg, acc), 0.5)
      return setActiveRegister({ ...s, accumulator: exchanged }, exchanged)
    },
  })

  // 0x3B: RESIDUE_ENCODE
  ops.push({
    name: 'RESIDUE_ENCODE', type: 'arithmetic',
    description: 'Residue hyperdimensional phasor encoding',
    apply: (s) => {
      const reg = activeRegister(s)
      const phi = reg.w * 2 * Math.PI
      const encoded = quat(Math.cos(phi), Math.sin(phi), 0, 0)
      return { ...s, accumulator: encoded }
    },
  })

  // ═══════════════════════════════════════════════════════
  //  0x3C-0x47 LATTICE OPERATIONS
  //  9 of 12 stubs de-stubbed per Codex Ingest 2026-04-16 §7.2 and engine §5.
  //  3 remain DEFERRED: LEECH_LATTICE_24 (real G₂₄), GOLAY_CODE (ECC),
  //  HALF_PRIME_GEODESIC (6-prime graph pathfinding).
  // ═══════════════════════════════════════════════════════

  // 0x3C: TORSION_SPINE — stability metric via axis purity × Lion Constant
  ops.push({
    name: 'TORSION_SPINE', type: 'meta',
    description: 'Torsion Spine Γ_α stability = axis-purity × L (Lion damping)',
    apply: (s) => {
      const reg = activeRegister(s)
      const imagMag = Math.sqrt(reg.x * reg.x + reg.y * reg.y + reg.z * reg.z)
      const total = quatNorm(reg)
      const axisPurity = total > 1e-9 ? imagMag / total : 0
      const stability = axisPurity * LION_CONSTANT
      return { ...s, accumulator: quat(stability, reg.x, reg.y, reg.z) }
    },
  })

  // 0x3D: LEECH_LATTICE_24 — DEFERRED (real Λ₂₄ lattice quantisation non-trivial).
  // Current placeholder: 24-phase substrate rotation keyed to i⁴-cycle position,
  // consistent with Codex Ingest canonical "24-bit Computational Substrate".
  ops.push({
    name: 'LEECH_LATTICE_24', type: 'data',
    description: 'Leech Λ₂₄ 24-phase substrate rotation (real G₂₄ quantisation deferred)',
    apply: (s) => {
      const reg = activeRegister(s)
      const phase = ((s.tick % 24) / 24) * 2 * Math.PI
      const rotQ = quat(Math.cos(phase / 2), Math.sin(phase / 2) * 0.577, Math.sin(phase / 2) * 0.577, Math.sin(phase / 2) * 0.577)
      const result = quatNormalize(quatMul(reg, rotQ))
      return setActiveRegister({ ...s, accumulator: result }, result)
    },
  })

  // 0x3E: GOLAY_CODE — DEFERRED (real G₂₄ error-correcting code non-trivial).
  // Current placeholder: even-weight parity check across register components.
  ops.push({
    name: 'GOLAY_CODE', type: 'logic',
    description: 'Golay G₂₄ weight-parity check (real error correction deferred)',
    apply: (s) => {
      const reg = activeRegister(s)
      const bits: number[] = [reg.w, reg.x, reg.y, reg.z].map((v) => Math.abs(v) > 0.5 ? 1 : 0)
      const weight = bits.reduce((a, b) => a + b, 0)
      const evenWeight = weight % 2 === 0
      return { ...s, accumulator: quat(evenWeight ? 1 : -1, weight, 4 - weight, 0) }
    },
  })

  // 0x3F: MODULAR_31_24 — Toggle Power axiom 31 ≡ 7 (mod 24).
  // Codex Ingest §7.2 item 1: (signature × 31) mod 24 deviation from 7
  // drives a torque observable (non-kinetic thrust direction).
  ops.push({
    name: 'MODULAR_31_24', type: 'meta',
    description: 'Toggle Power: (signature × 31) mod 24 distance-from-7 → torque',
    apply: (s) => {
      const reg = activeRegister(s)
      const signature = Math.round(Math.abs(reg.w) * 100 + Math.abs(reg.x) * 10 + Math.abs(reg.y) + Math.abs(reg.z) * 0.1)
      const residue = (signature * 31) % 24
      const deviation = Math.abs(residue - TOGGLE_POWER) / 24
      const torque = 1 - deviation
      return { ...s, accumulator: quat(torque, residue, TOGGLE_POWER, deviation) }
    },
  })

  // 0x40: TOGGLE_7 — 7-unit non-kinetic thermodynamic kick on active register.
  // Codex Ingest §7.2 item 1: "voltage drop of creation, non-kinetic thrust."
  ops.push({
    name: 'TOGGLE_7', type: 'arithmetic',
    description: 'Toggle Power impulse: 7/24 non-kinetic thrust (anti-stasis)',
    apply: (s) => {
      const reg = activeRegister(s)
      const kick = quat(0, TOGGLE_POWER / 24, 0, 0)
      const kicked = quatAdd(reg, kick)
      return setActiveRegister({ ...s, accumulator: kicked }, kicked)
    },
  })

  // 0x41: REGIME_MISMATCH — Mass-as-Impedance x!/x^x.
  // Codex Ingest §7.2 item 3: additive (x!) vs multiplicative (x^x) regime divergence.
  ops.push({
    name: 'REGIME_MISMATCH', type: 'meta',
    description: 'Mass = Resistance(x! / x^x) — additive/multiplicative divergence',
    apply: (s) => {
      const x = 1 + Math.floor(Math.max(0, Math.min(7, quatNorm(s.accumulator) * 5)))
      const xFact = factorial(x)
      const xExp = Math.pow(x, x)
      const mismatch = xExp > 0 ? xFact / xExp : 0
      return { ...s, accumulator: quat(mismatch, xFact, xExp, x) }
    },
  })

  // 0x42: OBSERVER_SHELL_126 — E₇ 126-boundary 5³ + 1 = 126.
  // Codex Ingest §7.2 item 4: shell bounds the 5³ quintic lattice at 126 E₇ roots.
  ops.push({
    name: 'OBSERVER_SHELL_126', type: 'meta',
    description: 'E₇ Observer Shell: projection within 5³+1=126 root bound',
    apply: (s) => {
      const reg = activeRegister(s)
      const shellLimit = 126
      const projection = quatNorm(reg) * 125
      const withinShell = projection <= shellLimit
      const containment = withinShell ? 1 - (projection / shellLimit) : -(projection / shellLimit - 1)
      return { ...s, accumulator: quat(containment, projection, shellLimit, withinShell ? 1 : 0) }
    },
  })

  // 0x43: HIGGS_BOUNDARY — 125-126 GeV mass-scale gate.
  // §5 item 10: hard gate on accumulator mass-scale; defensive state when breached.
  ops.push({
    name: 'HIGGS_BOUNDARY', type: 'control',
    description: '125-126 GeV Higgs gate: clamps accumulator when mass-scale crossed',
    apply: (s) => {
      const reg = activeRegister(s)
      const mass = quatNorm(reg) * 125
      const breached = mass > 126
      const gated = breached
        ? quat(1.26, 0, 0, 0)
        : quat(mass / 125, reg.x, reg.y, reg.z)
      return setActiveRegister({ ...s, accumulator: gated }, gated)
    },
  })

  // 0x44: CUBIC_ASCENSION_27 — 3³ → 5³ φ-scaled promotion.
  // Codex Ingest §7.2 item 5: scale mechanical (3³=27) → biological (5³=125).
  ops.push({
    name: 'CUBIC_ASCENSION_27', type: 'arithmetic',
    description: 'Cubic ascension 27 → 125 via φ-scaled side-length interpolation',
    apply: (s) => {
      const reg = activeRegister(s)
      // side-length ratio 5/3 ≈ 1.667 mapped through φ-interpolation
      const sideRatio = 5 / 3
      const ascended = quatScale(reg, Math.pow(PHI, Math.log(sideRatio) / Math.log(PHI)) / sideRatio * PHI)
      const normed = quatNormalize(ascended)
      return setActiveRegister({ ...s, accumulator: normed }, normed)
    },
  })

  // 0x45: DELTA_10I — 4×4 traversal accumulates exactly 10i, ÷10 closes to real.
  // §5 item 1 (most distinctive): imaginary impedance closure identity.
  ops.push({
    name: 'DELTA_10I', type: 'arithmetic',
    description: 'Δ10i=1: 4×4 imaginary traversal ÷10 closure to real',
    apply: (s) => {
      const { alpha, beta, gamma, delta } = s.registers
      let imagAccum = 0
      for (const reg of [alpha, beta, gamma, delta]) {
        imagAccum += Math.abs(reg.x) + Math.abs(reg.y) + Math.abs(reg.z)
      }
      const closure = imagAccum / 10  // target: 1 when imagAccum == 10
      const residual = Math.abs(closure - 1)
      return { ...s, accumulator: quat(closure, imagAccum, 10, residual) }
    },
  })

  // 0x46: HALF_PRIME_GEODESIC — DEFERRED (6-prime graph pathfinding).
  // Current placeholder: cycles through five smallest Pendinium primes
  // excluding 13 (index 0), per spec "exclude largest prime index".
  ops.push({
    name: 'HALF_PRIME_GEODESIC', type: 'arithmetic',
    description: 'Half-prime geodesic sweep over 5 primes (graph pathfinding deferred)',
    apply: (s) => {
      const reg = activeRegister(s)
      const sixPrimes = PENDINIUM_PRIMES.slice(1, 7)
      const idx = s.tick % sixPrimes.length
      const p = sixPrimes[idx]
      const angle = (p / 547) * Math.PI
      const rotQ = quat(Math.cos(angle / 2), Math.sin(angle / 2) * 0.577, Math.sin(angle / 2) * 0.577, Math.sin(angle / 2) * 0.577)
      const result = quatNormalize(quatMul(reg, rotQ))
      return setActiveRegister({ ...s, accumulator: result }, result)
    },
  })

  // 0x47: AWEN_GRID_SYNC — 120° triadic closure 1 + ω + ω² = 0.
  // Codex Ingest §7.2 item 2: α/β/γ mapped to the three cube roots of unity;
  // sync succeeds when the weighted sum reaches zero.
  ops.push({
    name: 'AWEN_GRID_SYNC', type: 'meta',
    description: 'Awen 120° triadic sync: 1 + ω + ω² = 0 on α/β/γ registers',
    apply: (s) => {
      const { alpha, beta, gamma } = s.registers
      const sumRe = alpha.w * 1 + beta.w * MINIMAL_CLOSURE_OMEGA.re + gamma.w * MINIMAL_CLOSURE_OMEGA_SQ.re
      const sumIm = beta.w * MINIMAL_CLOSURE_OMEGA.im + gamma.w * MINIMAL_CLOSURE_OMEGA_SQ.im
      const closure = Math.sqrt(sumRe * sumRe + sumIm * sumIm)
      const synced = closure < 0.01
      return { ...s, accumulator: quat(synced ? 1 : 0, closure, sumRe, sumIm) }
    },
  })

  return ops
}

// ═══════════════════════════════════════════════════════
//  BUILD & EXPORT
// ═══════════════════════════════════════════════════════
export const OPCODES = buildOpcodes()

export function createVM(): VMState {
  return {
    registers: {
      alpha: quat(1, 0, 0, 0),
      beta: quat(0, 1, 0, 0),
      gamma: quat(0, 0, 1, 0),
      delta: quat(0, 0, 0, 1),
    },
    accumulator: quat(),
    nullLedger: quat(),
    tick: 0,
    cycle: 0,
    trinityTick: 0,
    halted: false,
    forbidden361: 0,
    plane: 'RR',
    foldAngle: 45,
    parityBit: 0,
    log: [],
    pc: 0,
  }
}

export function executeOpcode(state: VMState, opcodeIdx: number): VMState {
  if (state.halted) return state
  if (opcodeIdx < 0 || opcodeIdx >= OPCODES.length) return state

  const op = OPCODES[opcodeIdx]
  let next = op.apply(state)

  // Advance primary tick (370-cycle reversible quaternionic period)
  next.tick = (state.tick + 1) % 370
  if (next.tick === 0) next.cycle = state.cycle + 1

  // Advance Trinity tick (secondary clock, 2.32 attoseconds per step, wraps at 232)
  // Canonical basis: Codex Ingest "Lattice Construction Time = 232 attoseconds."
  next.trinityTick = (state.trinityTick + TRINITY_CONSTANT) % 232

  // Forbidden state 361 detection — Axiom Zero formal boundary.
  // See RHCConstants.AXIOM_ZERO: "(b−1)…+δ=b closes the 360° circle at the 361st point."
  if (next.tick === FORBIDDEN_STATE % 370) {
    next.forbidden361 = state.forbidden361 + 1
    next.parityBit = 0
  }

  // Update null ledger
  const { alpha, beta, gamma, delta } = next.registers
  next.nullLedger = quatAdd(quatAdd(alpha, beta), quatAdd(gamma, delta))

  // Log entry
  const entry: VMLogEntry = {
    tick: next.tick,
    cycle: next.cycle,
    opcode: opcodeIdx,
    name: op.name,
    plane: next.plane,
    ledgerBalance: quatNorm(next.nullLedger),
  }
  next.log = [...state.log.slice(-99), entry]
  next.pc = (state.pc + 1) % OPCODES.length

  return next
}

export function runVM(state: VMState, ticks: number): VMState {
  let s = state
  for (let i = 0; i < ticks && !s.halted; i++) {
    s = executeOpcode(s, s.pc)
  }
  return s
}

export function executeProgram(state: VMState, program: number[]): VMState {
  let s = state
  for (const op of program) {
    if (s.halted) break
    s = executeOpcode(s, op)
  }
  return s
}

export function seedFromBlip(state: VMState, signal: number, coherence: number, entropy: number, qWeight: number): VMState {
  return {
    ...state,
    registers: {
      alpha: quat(signal, coherence, 0, 0),
      beta: quat(entropy, qWeight, 0, 0),
      gamma: quat(signal * PHI, coherence / PHI, 0, 0),
      delta: quat(0, 0, entropy, qWeight),
    },
    halted: false,
    tick: 0,
    pc: 0,
    log: [],
  }
}

// ═══════════════════════════════════════════════════════
//  SNAPSHOT HELPERS — derived observables exposed to UI
// ═══════════════════════════════════════════════════════

// Torsion Spine Γ_α stability: mean axis-purity across all four registers
// damped by Lion Constant (§5 item 9 / §7.1 row 2).
function torsionSpineStability(state: VMState): number {
  const regs = [state.registers.alpha, state.registers.beta, state.registers.gamma, state.registers.delta]
  let sum = 0
  for (const r of regs) {
    const imag = Math.sqrt(r.x * r.x + r.y * r.y + r.z * r.z)
    const total = quatNorm(r)
    sum += total > 1e-9 ? imag / total : 0
  }
  return (sum / 4) * LION_CONSTANT
}

// S³ invariant deviation: mean |‖q‖ − 1| across registers (§5 item 5).
function s3Deviation(state: VMState): number {
  const regs = [state.registers.alpha, state.registers.beta, state.registers.gamma, state.registers.delta]
  let dev = 0
  for (const r of regs) dev += Math.abs(quatNorm(r) - 1)
  return dev / 4
}

// Hopf depth: residual imaginary depth after 4D→3D projection (§7.2 item 8).
// 0 = fully observed (collapsed); nonzero = unobserved quaternionic depth.
function hopfDepth(state: VMState): number {
  const q = quatNormalize(state.accumulator)
  const hx = 2 * (q.x * q.z + q.w * q.y)
  const hy = 2 * (q.y * q.z - q.w * q.x)
  const hz = q.w * q.w - q.x * q.x - q.y * q.y + q.z * q.z
  const proj3D = Math.sqrt(hx * hx + hy * hy + hz * hz)
  return Math.abs(1 - proj3D)
}

// Millennium compliance: Riemann × P-vs-NP × Yang-Mills attestation scores
// (§5 item 7 / §7.2 item 7). All [0, 1] where 1 = full compliance.
//   - Riemann: register-average real component → 0.5 (Hermitian symmetry axis)
//   - P vs NP: 1 − log(t+1)/(t+1) — impedance gap between search and check
//   - Yang-Mills: accumulator norm → √32 − 5 ≈ 0.6568 (canonical mass gap)
export interface MillenniumScore {
  riemann: number
  pnp: number
  yangMills: number
  total: number
}

function millenniumScore(state: VMState): MillenniumScore {
  const regs = [state.registers.alpha, state.registers.beta, state.registers.gamma, state.registers.delta]
  const avgReal = regs.reduce((s, r) => s + r.w, 0) / 4
  const riemann = Math.max(0, 1 - Math.abs(avgReal - 0.5) * 2)
  const t = state.tick
  const pnp = t > 0 ? 1 - Math.log(t + 1) / (t + 1) : 0
  const accNorm = quatNorm(state.accumulator)
  const yangMills = Math.max(0, 1 - Math.min(1, Math.abs(accNorm - MASS_GAP_EXACT)))
  const total = (riemann + pnp + yangMills) / 3
  return { riemann, pnp, yangMills, total }
}

// Binary diagonal angles per register (§7.2 item 10): arctan(ones/zeros)
// signature angle treating |component| > 0.5 as a set bit.
function binaryDiagonalAngles(state: VMState): { alpha: number; beta: number; gamma: number; delta: number } {
  const regAngle = (r: Quaternion): number => {
    const bits: number[] = [r.w, r.x, r.y, r.z].map((v) => Math.abs(v) > 0.5 ? 1 : 0)
    const ones = bits.reduce((a, b) => a + b, 0)
    const zeros = 4 - ones
    return zeros > 0 ? Math.atan(ones / zeros) : Math.PI / 2
  }
  return {
    alpha: regAngle(state.registers.alpha),
    beta: regAngle(state.registers.beta),
    gamma: regAngle(state.registers.gamma),
    delta: regAngle(state.registers.delta),
  }
}

export function vmSnapshot(state: VMState) {
  const ledgerBalance = quatNorm(state.nullLedger)
  const ledgerStatus = ledgerBalance < 0.01 ? 'BALANCED'
    : ledgerBalance < 0.5 ? 'NOMINAL'
      : ledgerBalance < 2 ? 'DRIFT'
        : 'CRITICAL'
  return {
    tick: state.tick,
    cycle: state.cycle,
    trinityTick: state.trinityTick,
    trinityRatio: state.trinityTick / 232,  // [0, 1) position in 232-attosecond cycle
    plane: state.plane,
    halted: state.halted,
    forbidden361Count: state.forbidden361,
    parityBit: state.parityBit,
    ledgerBalance,
    ledgerStatus,
    accumulator: state.accumulator,
    registers: {
      alpha: state.registers.alpha,
      beta: state.registers.beta,
      gamma: state.registers.gamma,
      delta: state.registers.delta,
    },
    recentOps: state.log.slice(-5).map((l) => `[${l.tick}] ${l.name}`),
    // New observables (Codex Ingest + §5 / §7.2 pass):
    torsionSpine: torsionSpineStability(state),
    s3Deviation: s3Deviation(state),
    hopfDepth: hopfDepth(state),
    millennium: millenniumScore(state),
    binaryDiagonal: binaryDiagonalAngles(state),
    dedekindEtaCeiling: DEDEKIND_ETA_TAX,  // 24/25 irreducible-entropy ceiling
  }
}

// ═══════════════════════════════════════════════════════
//  CANONICAL PROGRAM LIBRARY (§5 item 12)
//  Named opcode sequences for operator-navigable execution.
// ═══════════════════════════════════════════════════════
export const CANONICAL_PROGRAMS = {
  TRIPLE_NORMALIZE_PIPELINE: [0x33, 0x34, 0x35, 0x32] as const,
  NULL_LEDGER_STABILIZATION: [0x00, 0x04, 0x1F] as const,
  MILLENNIUM_ATTEST:         [0x3F, 0x40, 0x42, 0x43, 0x44, 0x47] as const,
  FMN_PROTOCOL:              [0x30, 0x31, 0x32] as const,
  PENDINIUM_SWEEP:           [0x02, 0x08, 0x37] as const,
  OBSERVER_COLLAPSE:         [0x1D, 0x06, 0x13] as const,
  TORSION_SPINE_CHECK:       [0x3C, 0x1F, 0x32] as const,
  AWEN_TRIADIC_LOCK:         [0x47, 0x33, 0x34] as const,
} as const

export type CanonicalProgramName = keyof typeof CANONICAL_PROGRAMS
