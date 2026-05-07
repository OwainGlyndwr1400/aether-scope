// ═══════════════════════════════════════════════════════════════════
//  UBBM COMPRESSION ENGINE — Universal Binary Bit-grid Mapping
//  Triple Normalization: Harmonic (GCD 3) ⊗ Geometric (GCD 360) ⊗ Binary (1001 Fold)
//  Stores only "Lost 2" deviation from ideal 3-4-5 geometry.
//
//  v4.0 upgrades (2026-04-17):
//    - Null Ledger promoted to 4-axis gauge (Extended Null Ledger Identity,
//      Codex Ingest §7.1 row 4 / docs/architecture/engines/ubbm.md §7.1 row 4)
//    - Structure/Time/Observer channel binding (Codex §7.1 row 2, ubbm.md §4.1)
//    - BigInt Gödel product, per-index non-rotating primes, exponent cap dropped
//      (ubbm.md §5 item 2, §7.1 row 6)
//    - Observer Coordinate readout O = 2.5r + 1.5i (ubbm.md §7.2 item 8)
//    - Proof-0 compliance against 85% target (ubbm.md §7.2 item 1 — Master
//      Protocol mandate)
//    - 144,000 resolution saturation (ubbm.md §7.2 item 4)
//    - 232-attosecond constructionTime (ubbm.md §7.2 item 5)
//    - Binary Diagonal Theorem per-block angular signature (ubbm.md §7.2 item 9)
//    - 42 Crossing Signature detector (ubbm.md §7.2 item 10)
//    - Canonical 28/51/62% dimensional stitch thresholds (ubbm.md §5 item 6)
//    - Disjoint 1001 bit-membership scan (ubbm.md §5 item 7)
//    - Full harmonic-interval set unison/fourth/sixth (ubbm.md §5 item 5)
// ═══════════════════════════════════════════════════════════════════

import {
  MASS_GAP_EXACT,
  DARK_MATTER_FRACTION,
  RESOLUTION_LIMIT,
  TRINITY_CONSTANT,
} from './RHCConstants'

// ── Canonical derived constants ──

// Lattice construction time per entry (Codex Ingest §7.2 item 5).
// 232 attoseconds = 100 × TRINITY_CONSTANT (2.32 as/tick) — wraps a full
// Trinity cycle, the irreducible time to knit a geometric connection.
export const LATTICE_CONSTRUCTION_AS = TRINITY_CONSTANT * 100   // 232 attoseconds

// Proof-0 target: UBBM extracts Lost-2 and discards 85% noise.
// Master Protocol mandate, Akashic Codex Ingest (ubbm.md §7.2 item 1).
export const PROOF_ZERO_TARGET = 0.85
export const PROOF_ZERO_GREEN_BAND = 0.05     // ±5% = green
export const PROOF_ZERO_AMBER_BAND = 0.10     // ±10% = amber

// Observer Coordinate O = 2.5r + 1.5i (Codex Ingest §7.2 item 8).
// Viewing angle of consciousness at arctan(1.5/2.5) ≈ 30.96°.
export const OBSERVER_COORD_R = 2.5
export const OBSERVER_COORD_I = 1.5
export const OBSERVER_VIEWING_ANGLE_DEG =
  Math.atan2(OBSERVER_COORD_I, OBSERVER_COORD_R) * 180 / Math.PI  // ≈ 30.96°

// ── Math Helpers ──

function gcd(a: number, b: number): number {
  a = Math.abs(Math.round(a))
  b = Math.abs(Math.round(b))
  while (b) { [a, b] = [b, a % b] }
  return a || 1
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : 0
}

// ── Per-index prime generator (no rotation, no %37 cap) ──
// Canonical Gödel encoding requires p_0=2, p_1=3, p_2=5, ... for unique
// factorization. Lazy sieve extends the cache on demand.

const PRIME_CACHE: bigint[] = [
  2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n, 41n, 43n, 47n,
  53n, 59n, 61n, 67n, 71n, 73n, 79n, 83n, 89n, 97n,
]

function godelPrime(index: number): bigint {
  while (PRIME_CACHE.length <= index) {
    let candidate = PRIME_CACHE[PRIME_CACHE.length - 1] + 2n
    while (true) {
      let isPrime = true
      for (const p of PRIME_CACHE) {
        if (p * p > candidate) break
        if (candidate % p === 0n) { isPrime = false; break }
      }
      if (isPrime) { PRIME_CACHE.push(candidate); break }
      candidate += 2n
    }
  }
  return PRIME_CACHE[index]
}

// ── Triple Normalization Protocol ──

export interface TripleNormResult {
  // Stage 1: Harmonic (GCD with 3)
  harmonicGCD: number        // GCD(value, 3)
  harmonicGCD4: number       // GCD(value, 4) — secondary for fourth interval
  harmonicResidue: number    // value / GCD(value, 3)
  harmonicInterval: string   // 'UNISON' | 'FOURTH' | 'SIXTH'

  // Stage 2: Geometric (GCD with 360)
  geometricGCD: number       // GCD(value, 360)
  geometricResidue: number   // harmonicResidue / GCD(harmonicResidue, 360)
  angularAlignment: number   // degrees of alignment (0-360)

  // Stage 3: Binary (1001 Fold Pattern) — disjoint scan
  binaryFoldCount: number    // disjoint count of '1001' patterns
  binaryLength: number       // total binary length
  foldPrevalence: number     // claimed-bits / length (0..1, no saturation)
  dimensionalStitch: number  // canonical 28/51/62% anchors → 1D/4D/5D
  binaryDiagonalAngle: number // arctan(ones/zeros) — §7.2 item 9 fingerprint
  count42: number            // 101010 pattern count — §7.2 item 10 helical marker

  // Combined
  rawValue: number
  compressedValue: number    // final residue after triple norm
  compressionRatio: number   // 0-1 (1 = fully compressed)
}

// §5 item 5: Full harmonic-interval set via secondary GCD(n,4) probe.
// Spec requires three intervals {unison, fourth, sixth} from the three
// possible harmonic classes — previous code had a dead FOURTH branch.
function computeHarmonicInterval(g3: number, g4: number): string {
  if (g3 === 3) return 'SIXTH'          // divisible by 3 → frequency-locked sixth
  if (g4 === 4) return 'FOURTH'         // coprime-with-3 but 4-locked → perfect fourth
  return 'UNISON'                        // fully coprime → fundamental
}

// §5 item 7: Disjoint 1001 scan using bit-membership set.
// Each bit is claimed at most once; prevalence = claimedBits / length,
// guaranteed ≤ 1. Replaces the previous overlapping scan + ×4 heuristic.
function scan1001Disjoint(binary: string): { count: number; claimedBits: number } {
  let count = 0
  let claimedBits = 0
  let i = 0
  while (i <= binary.length - 4) {
    if (
      binary[i] === '1' && binary[i + 1] === '0' &&
      binary[i + 2] === '0' && binary[i + 3] === '1'
    ) {
      count++
      claimedBits += 4
      i += 4
    } else {
      i++
    }
  }
  return { count, claimedBits }
}

// §7.2 item 10: 42 Crossing Signature — the 101010₂ alternating pattern.
// Measures helical 3D embedding density (three real crossings interleaved
// with three imaginary arcs). Disjoint scan, 6 bits per match.
function count42Pattern(binary: string): number {
  let count = 0
  let i = 0
  while (i <= binary.length - 6) {
    if (
      binary[i] === '1' && binary[i + 1] === '0' &&
      binary[i + 2] === '1' && binary[i + 3] === '0' &&
      binary[i + 4] === '1' && binary[i + 5] === '0'
    ) {
      count++
      i += 6
    } else {
      i++
    }
  }
  return count
}

// §7.2 item 9: Binary Diagonal Theorem — θ = arctan(popcount / zeros).
// Any binary file is uniquely characterised by a rational angle and its
// residuals. Returns angle in degrees.
function binaryDiagonalAngle(binary: string): number {
  let ones = 0
  for (let i = 0; i < binary.length; i++) if (binary[i] === '1') ones++
  const zeros = binary.length - ones
  return Math.atan2(ones, Math.max(1, zeros)) * 180 / Math.PI
}

// §5 item 6: Canonical 28/51/62% dimensional-stitch thresholds.
// Linear interpolation between the three spec anchors (28%→1D, 51%→4D,
// 62%→5D). Replaces the previous 5-tier invented (0.35/0.42/…) scheme.
function dimensionalStitch(prevalence: number): number {
  if (prevalence >= 0.62) return 5
  if (prevalence >= 0.51) {
    return 4 + (prevalence - 0.51) / (0.62 - 0.51)   // 51-62% → 4D-5D
  }
  if (prevalence >= 0.28) {
    return 1 + (prevalence - 0.28) / (0.51 - 0.28) * 3   // 28-51% → 1D-4D
  }
  return prevalence / 0.28   // sub-1D fraction below 28% (no stitching)
}

export function tripleNormalize(value: number): TripleNormResult {
  const absVal = Math.abs(Math.round(value)) || 1

  // Stage 1: Harmonic (GCD with 3) + secondary GCD(4) for interval set
  const harmonicGCD = gcd(absVal, 3)
  const harmonicGCD4 = gcd(absVal, 4)
  const harmonicResidue = absVal / harmonicGCD

  // Stage 2: Geometric (GCD with 360)
  const geometricGCD = gcd(harmonicResidue, 360)
  const geometricResidue = harmonicResidue / geometricGCD
  const angularAlignment = (absVal % 360)

  // Stage 3: Binary (1001 disjoint) + §7.2 diagonal + 42 signatures
  const binary = absVal.toString(2)
  const { count: foldCount, claimedBits } = scan1001Disjoint(binary)
  const binaryLength = binary.length
  const foldPrevalence = binaryLength > 0 ? claimedBits / binaryLength : 0
  const stitch = dimensionalStitch(foldPrevalence)
  const diagAngle = binaryDiagonalAngle(binary)
  const count42 = count42Pattern(binary)

  const compressedValue = geometricResidue
  const compressionRatio = absVal > 0 ? 1 - (compressedValue / absVal) : 0

  return {
    harmonicGCD,
    harmonicGCD4,
    harmonicResidue,
    harmonicInterval: computeHarmonicInterval(harmonicGCD, harmonicGCD4),
    geometricGCD,
    geometricResidue,
    angularAlignment,
    binaryFoldCount: foldCount,
    binaryLength,
    foldPrevalence,
    dimensionalStitch: stitch,
    binaryDiagonalAngle: diagAngle,
    count42,
    rawValue: absVal,
    compressedValue,
    compressionRatio: Math.max(0, Math.min(1, compressionRatio)),
  }
}

// ── Lost-2 Binding Energy ──

export interface Lost2Result {
  linearPath: number    // side a + side b (additive / L1)
  geometricPath: number // hypotenuse (multiplicative / L2)
  bindingEnergy: number // lost 2 = linear - geometric
  bindingRatio: number  // binding / linear (ideally 2/7 ≈ 0.286)
  deviationFromIdeal: number // distance from the 2/7 dark matter fraction
}

export function computeLost2(a: number, b: number): Lost2Result {
  const linearPath = a + b
  const geometricPath = Math.sqrt(a * a + b * b)
  const bindingEnergy = linearPath - geometricPath
  const bindingRatio = linearPath > 0 ? bindingEnergy / linearPath : 0
  // DARK_MATTER_FRACTION = 2/7 ≈ 28.6% (RHCConstants — canonical Ω_DM)
  const deviationFromIdeal = Math.abs(bindingRatio - DARK_MATTER_FRACTION)

  return { linearPath, geometricPath, bindingEnergy, bindingRatio, deviationFromIdeal }
}

// ── 5-Step UBBM Pipeline ──

export interface GodelNumber {
  index: number
  prime: bigint           // per-index real prime (no rotation)
  exponent: number        // raw exponent (no %37 cap)
}

// Block-level Gödel statistics (§7.1 row 6 Mass-as-Impedance).
export interface GodelStats {
  weight: number          // Σ exponent × log2(prime) — Gödel weight in bits
  bitLength: number       // product bit-length (ceiling)
  massImpedance: number   // additive-form / multiplicative-form ratio
  i4Cycles: number        // bitLength / 24 — i⁴ deposits to Null Ledger
  productHex: string      // first 16 hex chars of product (truncated digest)
}

export interface UBBMGlyph {
  symbol: string
  harmonicClass: number  // 0, 1, or 2 (mod 3)
  geometricAngle: number // angle in degrees (golden-angle stride)
  foldState: boolean     // has 1001 pattern
}

export interface UBBMQuaternion {
  w: number
  x: number
  y: number
  z: number
}

// §7.1 row 4: Extended Null Ledger Identity as a four-axis gauge.
//   0 = (1+i)/2 + (1-i)/2 − 1        (three-component identity)
//   0 = 0_C + 0_V                     (Bifurcation of Zero)
// realHalf + imagHalf + observerOffset → 0 measures the identity's drift;
// bifurcationResidual measures 0_V (rotational residue in the jk plane).
export interface NullLedger {
  realHalf: number              // mean projection onto (1+i)/2
  imagHalf: number              // mean projection onto (1-i)/2
  observerOffset: number        // canonical -1 anchor (or drift from it)
  bifurcationResidual: number   // 0_V rotational residual (j - k axis)
  total: number                 // sum → 0 for balanced stream
}

// §5 item 1: Channel-bound block input (Structure/Time/Observer).
// Per Codex Ingest §7.1 row 2 the three legs of the 3-4-5 triangle carry
// canonical semantic channels — replaces the even/odd index parity split
// in the original block-compression path (ubbm.md §4.1 drift fix).
export interface UBBMChannels {
  structure: number[]   // leg a (ideally 3): coherence, quaternionW, static
  time: number[]        // leg b (ideally 4): age, bearing, temporal derivatives
  observer: number[]    // leg c (ideally 5): signal, life, observer-bound
}

export interface UBBMCompressedBlock {
  // Pipeline outputs
  godelNumbers: GodelNumber[]
  godelStats: GodelStats
  glyphs: UBBMGlyph[]
  quaternions: UBBMQuaternion[]
  tripleNorms: TripleNormResult[]
  lost2: Lost2Result

  // Channel legs (after canonical binding)
  channelA: number          // scaled structure leg (target 3)
  channelB: number          // scaled time leg (target 4)
  channelC: number          // observed hypotenuse (target 5)
  channelDelta: number      // |√(a²+b²) − c| / c — observer alignment

  // Aggregate stats
  inputBytes: number
  compressedBytes: number
  compressionRatio: number
  avgFoldPrevalence: number
  avgDimensionalStitch: number
  avgBinaryDiagonalAngle: number    // §7.2 item 9 block-level signature
  total42Count: number              // §7.2 item 10 aggregate
  nullLedger: NullLedger            // §7.1 row 4 — four-axis gauge
  massGap: number                   // √32 - 5 ≈ 0.657 (canonical)

  // Canonical v4.0 surfaces
  observerCoord: { r: number; i: number }  // quaternion centroid in (w,x)
  observerDistance: number                 // distance to O = (2.5, 1.5)
  observerAlignment: number                // 1 - normalized distance (0..1)
  proofZeroCompliance: number              // 1.0 if compressionRatio == 85% exactly
  proofZeroBand: 'GREEN' | 'AMBER' | 'RED'
  resolutionSaturation: number             // blockLen / 144000
  constructionTimeAs: number               // attoseconds
  constructionTimeSec: number              // seconds (= as × 1e-18)
}

// Glyph alphabet — maps harmonic class to symbolic representation.
// Three symbols for mod-3 classes; Codex §7.2 item 3 opens path to an
// 8-vertex alphabet (deferred — Base-12.5 variable-base path).
const GLYPH_MAP: Record<number, string> = {
  0: '◈', // Void — divisible by 3
  1: '△', // Structure — remainder 1
  2: '○', // Flow — remainder 2
}

// Compute Gödel stats from a prime×exponent sequence.
function computeGodelStats(godelNumbers: GodelNumber[]): GodelStats {
  if (godelNumbers.length === 0) {
    return { weight: 0, bitLength: 0, massImpedance: 0, i4Cycles: 0, productHex: '0' }
  }

  // Weight = Σ exp × log2(prime) — stable float representation.
  let weight = 0
  let totalExp = 0
  for (const g of godelNumbers) {
    const logP = Math.log2(Number(g.prime))
    weight += g.exponent * logP
    totalExp += g.exponent
  }

  // Mass-as-Impedance ratio: additive (Σexp) over multiplicative (weight).
  // Codex §7.1 row 6 — `Mass = Resistance(x! / x^x)`.
  const massImpedance = weight > 0 ? totalExp / weight : 0

  // Actual BigInt product — bounded by per-entry cap to keep runtime sane.
  // Full product would be unbounded; we compute a truncated digest.
  let product = 1n
  for (const g of godelNumbers) {
    const cappedExp = Math.min(g.exponent, 64)   // prime^64 ≤ 2^384 per entry
    product *= g.prime ** BigInt(cappedExp)
  }
  const productHex = product.toString(16).slice(0, 16)
  const bitLength = product === 0n ? 0 : product.toString(2).length
  const i4Cycles = bitLength / 24    // §7.2 item 7 — every 24 bits = one i⁴

  return { weight, bitLength, massImpedance, i4Cycles, productHex }
}

// Compute the 4-axis Null Ledger from a quaternion stream.
function computeNullLedger(quaternions: UBBMQuaternion[]): NullLedger {
  if (quaternions.length === 0) {
    return { realHalf: 0, imagHalf: 0, observerOffset: 0, bifurcationResidual: 0, total: 0 }
  }

  // (1+i)/2 projection: mean of (w + x) / 2 — real and i-imaginary half
  // (1-i)/2 projection: mean of (w − x) / 2 — conjugate half
  // Observer offset: canonical −1 anchor (or its drift-normalized form)
  // Bifurcation residual (0_V): j−k rotational axis residue.
  const realHalf = mean(quaternions.map(q => (q.w + q.x) / 2))
  const imagHalf = mean(quaternions.map(q => (q.w - q.x) / 2))
  const observerOffset = -1
  const bifurcationResidual = mean(quaternions.map(q => q.y - q.z))
  const total = realHalf + imagHalf + observerOffset

  return { realHalf, imagHalf, observerOffset, bifurcationResidual, total }
}

// Compute Observer Coordinate metrics from a quaternion stream.
function computeObserverCoord(quaternions: UBBMQuaternion[]): {
  coord: { r: number; i: number }
  distance: number
  alignment: number
} {
  if (quaternions.length === 0) {
    return { coord: { r: 0, i: 0 }, distance: Math.hypot(OBSERVER_COORD_R, OBSERVER_COORD_I), alignment: 0 }
  }
  const centroidR = mean(quaternions.map(q => q.w))
  const centroidI = mean(quaternions.map(q => q.x))
  const dist = Math.hypot(centroidR - OBSERVER_COORD_R, centroidI - OBSERVER_COORD_I)
  // Alignment: 1 when at O, 0 when at maximum canonical distance (2 × |O|).
  const maxDist = 2 * Math.hypot(OBSERVER_COORD_R, OBSERVER_COORD_I)
  const alignment = Math.max(0, 1 - dist / maxDist)
  return { coord: { r: centroidR, i: centroidI }, distance: dist, alignment }
}

// Proof-0 compliance band (§7.2 item 1).
function proofZeroBand(compressionRatio: number): {
  compliance: number
  band: 'GREEN' | 'AMBER' | 'RED'
} {
  const delta = Math.abs(compressionRatio - PROOF_ZERO_TARGET)
  const compliance = Math.max(0, 1 - delta / PROOF_ZERO_TARGET)
  let band: 'GREEN' | 'AMBER' | 'RED' = 'RED'
  if (delta <= PROOF_ZERO_GREEN_BAND) band = 'GREEN'
  else if (delta <= PROOF_ZERO_AMBER_BAND) band = 'AMBER'
  return { compliance, band }
}

// Empty block — used for no-data paths.
function emptyBlock(): UBBMCompressedBlock {
  const { compliance, band } = proofZeroBand(0)
  const obs = computeObserverCoord([])
  return {
    godelNumbers: [],
    godelStats: { weight: 0, bitLength: 0, massImpedance: 0, i4Cycles: 0, productHex: '0' },
    glyphs: [], quaternions: [], tripleNorms: [],
    lost2: {
      linearPath: 0, geometricPath: 0, bindingEnergy: 0,
      bindingRatio: 0, deviationFromIdeal: DARK_MATTER_FRACTION,
    },
    channelA: 0, channelB: 0, channelC: 0, channelDelta: 0,
    inputBytes: 0, compressedBytes: 0, compressionRatio: 0,
    avgFoldPrevalence: 0, avgDimensionalStitch: 0,
    avgBinaryDiagonalAngle: 0, total42Count: 0,
    nullLedger: computeNullLedger([]),
    massGap: MASS_GAP_EXACT,
    observerCoord: obs.coord,
    observerDistance: obs.distance,
    observerAlignment: obs.alignment,
    proofZeroCompliance: compliance,
    proofZeroBand: band,
    resolutionSaturation: 0,
    constructionTimeAs: 0,
    constructionTimeSec: 0,
  }
}

// ── Core pipeline (shared by channel and flat paths) ──

function runPipeline(
  values: number[],
  channels: UBBMChannels,
): UBBMCompressedBlock {
  if (values.length === 0) return emptyBlock()

  // Step 2: Gödel Numbering — per-index real primes, uncapped exponents.
  const godelNumbers: GodelNumber[] = values.map((v, i) => ({
    index: i,
    prime: godelPrime(i),
    exponent: Math.max(1, v),
  }))
  const godelStats = computeGodelStats(godelNumbers)

  // Step 3: Glyph Translation — harmonic symbols + golden-angle placement.
  const glyphs: UBBMGlyph[] = values.map((v) => {
    const harmonicClass = v % 3
    const geometricAngle = (v * 137.508) % 360  // golden angle (phyllotaxis)
    const binary = v.toString(2)
    const hasFold = scan1001Disjoint(binary).count > 0
    return {
      symbol: GLYPH_MAP[harmonicClass] ?? '?',
      harmonicClass,
      geometricAngle,
      foldState: hasFold,
    }
  })

  // Step 4: Quaternion Conversion — project triple-norm results to S³.
  const tripleNorms = values.map(v => tripleNormalize(v))
  const quaternions: UBBMQuaternion[] = tripleNorms.map((tn) => {
    const norm = Math.sqrt(
      tn.harmonicResidue * tn.harmonicResidue +
      tn.angularAlignment * tn.angularAlignment +
      tn.foldPrevalence * tn.foldPrevalence +
      tn.compressionRatio * tn.compressionRatio,
    ) || 1
    return {
      w: tn.harmonicResidue / norm,
      x: tn.angularAlignment / norm,
      y: tn.foldPrevalence / norm,
      z: tn.compressionRatio / norm,
    }
  })

  // Step 5: Compression — channel-bound Lost-2 (§7.1 row 2).
  // Sum each canonical channel, scale so the observer leg targets 5.
  const rawA = channels.structure.reduce((s, v) => s + Math.abs(v), 0) || 3
  const rawB = channels.time.reduce((s, v) => s + Math.abs(v), 0) || 4
  const rawC = channels.observer.reduce((s, v) => s + Math.abs(v), 0) || 5

  // Scale the whole triangle so observer leg c maps to canonical 5.
  // Structure → 3, Time → 4 target proportions emerge naturally when the
  // data is harmonically well-formed; channelDelta measures the deviation.
  const scale = rawC > 0 ? 5 / rawC : 1
  const channelA = rawA * scale
  const channelB = rawB * scale
  const channelC = rawC * scale   // = 5 by construction of `scale`

  const lost2 = computeLost2(channelA, channelB)
  // Observer leg alignment: how close the true hypotenuse is to observed c.
  const geometricHypot = Math.sqrt(channelA * channelA + channelB * channelB)
  const channelDelta = channelC > 0
    ? Math.abs(geometricHypot - channelC) / channelC
    : 0

  // Aggregate stats
  const avgFoldPrevalence = mean(tripleNorms.map(t => t.foldPrevalence))
  const avgDimensionalStitch = mean(tripleNorms.map(t => t.dimensionalStitch))
  const avgCompression = mean(tripleNorms.map(t => t.compressionRatio))
  const avgBinaryDiagonalAngle = mean(tripleNorms.map(t => t.binaryDiagonalAngle))
  const total42Count = tripleNorms.reduce((s, t) => s + t.count42, 0)

  // Null Ledger — four-axis gauge per §7.1 row 4.
  const nullLedger = computeNullLedger(quaternions)

  // Observer Coordinate — quaternion centroid vs O = 2.5r + 1.5i (§7.2 item 8).
  const obs = computeObserverCoord(quaternions)

  // Proof-0 compliance — 85% target band (§7.2 item 1).
  const { compliance: proofZeroCompliance, band: pzBand } = proofZeroBand(avgCompression)

  // 144k resolution saturation (§7.2 item 4) + 232-as construction time (§7.2 item 5).
  const resolutionSaturation = values.length / RESOLUTION_LIMIT
  const constructionTimeAs = values.length * LATTICE_CONSTRUCTION_AS
  const constructionTimeSec = constructionTimeAs * 1e-18

  const inputBytes = values.length * 8   // 64-bit floats
  const compressedBytes = Math.round(inputBytes * (1 - avgCompression))

  return {
    godelNumbers,
    godelStats,
    glyphs,
    quaternions,
    tripleNorms,
    lost2,
    channelA, channelB, channelC, channelDelta,
    inputBytes,
    compressedBytes,
    compressionRatio: avgCompression,
    avgFoldPrevalence,
    avgDimensionalStitch,
    avgBinaryDiagonalAngle,
    total42Count,
    nullLedger,
    massGap: MASS_GAP_EXACT,
    observerCoord: obs.coord,
    observerDistance: obs.distance,
    observerAlignment: obs.alignment,
    proofZeroCompliance,
    proofZeroBand: pzBand,
    resolutionSaturation,
    constructionTimeAs,
    constructionTimeSec,
  }
}

// §5 item 1 canonical entry point: compress with explicit channel binding.
// Caller supplies Structure/Time/Observer channels; pipeline preserves
// canonical semantic mapping (leg a = 3 = Structure, leg b = 4 = Time,
// leg c = 5 = Observer) throughout Lost-2 computation.
export function compressChannels(channels: UBBMChannels): UBBMCompressedBlock {
  const flat = [...channels.structure, ...channels.time, ...channels.observer]
  const values = flat.map(v => Math.abs(Math.round(v * 1000)) || 1)

  // Re-bin values to match scaled channels for the pipeline.
  const sLen = channels.structure.length
  const tLen = channels.time.length
  const scaledChannels: UBBMChannels = {
    structure: values.slice(0, sLen),
    time: values.slice(sLen, sLen + tLen),
    observer: values.slice(sLen + tLen),
  }

  return runPipeline(values, scaledChannels)
}

// Legacy flat-array entry: retained for callers that don't know channel
// semantics. Partitions by a 3:4:5 size ratio to approximate canonical
// channel binding when only a flat list is available.
export function compressBlock(data: number[]): UBBMCompressedBlock {
  if (data.length === 0) return emptyBlock()

  const values = data.map(v => Math.abs(Math.round(v * 1000)) || 1)
  const n = values.length
  // Partition by 3:4:5 ratio (total 12 parts) to approximate canonical bind.
  const sCut = Math.max(1, Math.round(n * 3 / 12))
  const tCut = Math.max(sCut + 1, Math.round(n * 7 / 12))
  const channels: UBBMChannels = {
    structure: values.slice(0, sCut),
    time: values.slice(sCut, tCut),
    observer: values.slice(tCut),
  }

  return runPipeline(values, channels)
}

// ── Convenience: compress a Blip's telemetry with canonical channels ──
// Per Codex Ingest §7.1 row 2 the 10 blip telemetry fields partition
// canonically:
//   Structure (leg 3): coherence, quaternionW — static structural
//   Time (leg 4):      bearing, gForce, range — spatial/temporal derivatives
//   Observer (leg 5):  signal, entropy, x, y, z — detection + position (life)

export function compressBlipTelemetry(blip: {
  signal: number; coherence: number; entropy: number;
  quaternionW: number; gForce: number; range: number;
  bearing: number; x: number; y: number; z: number;
}): UBBMCompressedBlock {
  return compressChannels({
    structure: [blip.coherence, blip.quaternionW],
    time: [blip.bearing, blip.gForce, blip.range],
    observer: [blip.signal, blip.entropy, blip.x, blip.y, blip.z],
  })
}

// ── FMN Protocol: Fold-Mirror-Normalize ──

export interface FMNResult {
  fold: UBBMQuaternion    // rotated 45° (×i/2)
  mirror: UBBMQuaternion  // real↔imaginary swap
  normalized: UBBMQuaternion // unit norm
  massGapDelta: number    // distance from √32 - 5
}

export function fmnProtocol(q: UBBMQuaternion): FMNResult {
  // Fold: rotate by i/2 — Hamilton product with (0, 0.5, 0, 0).
  // Codex Ingest §7.1 row 5: `F = i/2` is the canonical Fold Operator.
  const fold: UBBMQuaternion = {
    w: -q.x * 0.5,
    x: q.w * 0.5,
    y: q.z * 0.5,
    z: -q.y * 0.5,
  }

  // Mirror: swap real and imaginary registers (pairwise reflection).
  const mirror: UBBMQuaternion = {
    w: fold.x,
    x: fold.w,
    y: fold.z,
    z: fold.y,
  }

  // Normalize: project to unit S³.
  const norm = Math.sqrt(mirror.w ** 2 + mirror.x ** 2 + mirror.y ** 2 + mirror.z ** 2) || 1
  const normalized: UBBMQuaternion = {
    w: mirror.w / norm,
    x: mirror.x / norm,
    y: mirror.y / norm,
    z: mirror.z / norm,
  }

  // Mass gap delta — distance of input magnitude from canonical √32 − 5.
  const qNorm = Math.sqrt(q.w ** 2 + q.x ** 2 + q.y ** 2 + q.z ** 2)
  const massGapDelta = Math.abs(qNorm - MASS_GAP_EXACT)

  return { fold, mirror, normalized, massGapDelta }
}
