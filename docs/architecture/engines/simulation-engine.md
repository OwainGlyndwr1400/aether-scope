---
status: reverse-documented
source: src/engine/SimulationEngine.ts
date: 2026-04-16
verified-by: Erydir-Ceisiwr
---

# Simulation Engine — Radar Sim-Mode Data Source

**Source:** [src/engine/SimulationEngine.ts](../../../src/engine/SimulationEngine.ts) (138 lines)
**Constants used:** `PHI`, `LION_CONSTANT` imported from [src/engine/RHCConstants.ts](../../../src/engine/RHCConstants.ts). `LION_CONSTANT = 0.536` is cited from **Akashic Codex Ingest 2026-04-16 — "Lion Constant (L)"**: *"Stabilization of planetary recursion; quaternionic torsion stabilization; fundamental damping for reality stability."* This directly underwrites the `entropy = 1 − coherence · LION_CONSTANT` formulation as spec-tight, not aesthetic.
**Scheduler / consumer:** [src/scene/RadarScene.tsx](../../../src/scene/RadarScene.tsx) (`PhysicsTick`, `useFrame`), [src/engine/useSimulation.ts](../../../src/engine/useSimulation.ts) (spawner loop)
**Downstream readers:** [src/scene/BlipMesh.tsx](../../../src/scene/BlipMesh.tsx), [src/panels/TacticalWing.tsx](../../../src/panels/TacticalWing.tsx), [src/engine/RHCAnalysis.ts](../../../src/engine/RHCAnalysis.ts), [src/engine/UBBMEngine.ts](../../../src/engine/UBBMEngine.ts), [src/panels/UreVMPanel.tsx](../../../src/panels/UreVMPanel.tsx)
**Spec files (research corpus):**
- `Research & math 100 Read and implement/The Recursive Harmonic Codex Unified Paradigm of Mathematics and Physics - Table 1.csv` — canonical math. Most-relevant rows for this engine: 61 (φ as unique fixed-point base), 34 / 105 (Quaternionic Vector of Consciousness `w = (x + i/x)/2`), 75 / 83 (Three-Way Fold Operator `F₃ = 0.25 + 0.5i`), 86 / 101 (144,000 Resolution Limit as the Kuramoto phase-lock threshold), 13 / 39 / 48 (2.32 as Universal Tick).
- `Research & math 100 Read and implement/Akashic Codex 2026-04-16 Ingest.md` — runtime ingest. Canonical derivations for the **Lion Constant** (L ≈ 0.536), **Single Angle Theorem** (consciousness as rotation angle), **Lagrangian Arc Trajectory** (celestial bodies as nodes in a coherent scalar field), **3-4-5 Triangle Genesis** (3 = Structure, 4 = Time, 5 = Observer/Life), **120° Triadic Geometry** (1 + ω + ω² = 0), **E7 126-Boundary** (5³ + 1 = 126), **i⁴ Revolution** (Base-24 lattice completion), **Variable-Base Scaling** (Base-12.5 = φ² × 10), **Nephilim Equation**, **Master Protocol (Proof 0)**.
- Lévy-flight behavior is a general statistical-physics model, not derived from either corpus; it is used here as an aesthetic signature for the LEVY anomaly class.

One-line purpose: fabricate plausible radar blips with Codex-flavored kinematics for **SIMULATION** mode and animate them each frame via a pure-functional tick; the engine is *stateless* and *scheduler-owned* (the radar's render loop calls it), with three blip classes (NWTN / LEVY / CLOAK) each carrying distinct motion, coherence, and rarity signatures.

---

## 1. Spec Summary (Ground Truth)

The dual-mode radar has two orthogonal data paths:

- **LIVE_FEED** — all blips originate from real external services (NASA NEO, NOAA space weather, USGS seismic, OpenSky aircraft, ISS, weather). Nothing in LIVE is synthesized; telemetry is the voice of the world.
- **SIMULATION** — no external feeds drive the blip layer. All contacts are fabricated and animated in-process, so the radar reads "alive" when the operator disables the live feed or is running offline.

The Simulation Engine owns the SIMULATION path end-to-end: seeding an initial population, spawning new contacts on cadence, and advancing their kinematics each frame. Its Codex alignment rests on three named proofs from the Akashic Codex ingest: the **Single Angle Theorem** (each blip is a scalar phase angle `quaternionW = cos(time·φ + signal)` — "consciousness as phase"), the **Lagrangian Arc Trajectory** (NWTN's perpendicular orbital nudge is a blip-scale instantiation of "celestial bodies as nodes in a coherent scalar field, not debris in a vacuum"), and the **Lion Constant** (L ≈ 0.536 as the "fundamental damping for reality stability", active as the coherence-to-entropy scaling coefficient). The heavy Codex math — Fold Operator, Null Ledger Identity, Mass Gap, 2.32 Universal Tick, Lost-2 Dark Matter, UBBM compression, Ternary logic — lives in sibling engines: [RHCAnalysis.ts](../../../src/engine/RHCAnalysis.ts), [UreVM.ts](../../../src/engine/UreVM.ts), [UBBMEngine.ts](../../../src/engine/UBBMEngine.ts), [TernaryEngine.ts](../../../src/engine/TernaryEngine.ts), [RHUMEngine.ts](../../../src/engine/RHUMEngine.ts), [PhaseEngine.ts](../../../src/engine/PhaseEngine.ts).

Three anomaly classes are canonical, each mapped to a distinct observable signature:

- **NWTN** (~80%) — baseline Newtonian returns: standard amber blips, gentle perpendicular orbital drift (Lagrangian Arc Trajectory form), low coherence. The "everything else" class.
- **LEVY** (~15%) — Lévy-flight anomalies: cool teal blips that occasionally jump by a heavy-tailed power-law magnitude. Read semantically as anti-gravity / levitation events. Triggers the ALERT audio path.
- **CLOAK** (~5%) — scalar-cloaked contacts: warm-bone blips with high signal, high coherence, and phase-locked drift on `sin(time·φ + signal)`. Read semantically as phase-shifted / cloaked craft.

## 2. Implementation Summary

[src/engine/SimulationEngine.ts](../../../src/engine/SimulationEngine.ts) is a single-file, pure-functional TypeScript module — no class, no mutation beyond a module-level `idCounter`, no persistence, no side effects. Structured in five sections:

1. **Name table + classifier** ([SimulationEngine.ts:6-22](../../../src/engine/SimulationEngine.ts#L6-L22)) — `ASTEROID_NAMES` (20 entries mixing real designations like `(99942 Apophis)` with fictional ones) and `classifyBlip()` (uniform random roll: `r < 0.05` → CLOAK, `r < 0.20` → LEVY, else NWTN).
2. **`spawnBlip()`** ([SimulationEngine.ts:24-54](../../../src/engine/SimulationEngine.ts#L24-L54)) — returns a fresh `Blip` with polar-derived Cartesian position (bearing ∈ [0,360), range ∈ [10,90]), type-conditional `signal` and `coherence`, random initial `quaternionW = cos(random·π)`, and empty trail. All Blips are created on the y=0 plane.
3. **`tickPhysics(blips, dt, kelgLock)` → `Blip[]`** ([SimulationEngine.ts:56-126](../../../src/engine/SimulationEngine.ts#L56-L126)) — the core integrator. Spread-per-blip, seven sequential updates, returns a new array. Pruning (`range < 130 && age < 150`) is performed as a `.filter(...)` on the mapped result.
4. **`checkEntanglement(blips)` → `Blip[]`** ([SimulationEngine.ts:128-137](../../../src/engine/SimulationEngine.ts#L128-L137)) — O(n²) pairwise scan: a blip is marked `isEntangled` if any other blip has `|ΔquaternionW| < 0.05`.
5. **Schedulers** (external) — [RadarScene.tsx:23-60](../../../src/scene/RadarScene.tsx#L23-L60) runs `PhysicsTick` inside the R3F `useFrame` loop (every rendered frame), while [useSimulation.ts:54-78](../../../src/engine/useSimulation.ts#L54-L78) runs the spawner on a `setInterval(500ms)` with a 2-second cooldown and a 25-blip cap.

The Blip schema itself is declared centrally in [src/types/index.ts](../../../src/types/index.ts): 18 fields per blip plus a trail array. This is the contract the engine produces and all downstream panels consume.

## 3. Spec ↔ Implementation Drift Matrix

Tight-match, aesthetic-use, and reserved-vocabulary rows are all in-scope for this engine. Codex identities better suited to sibling engines are marked `⊘ out of scope — see …` so they are documented, not flagged as missing.

| Spec concept | Spec value / formula | Code location | Used in tick? | Status |
|---|---|---|---|---|
| Three anomaly classes | NWTN / LEVY / CLOAK, ~80/15/5 | `classifyBlip()` | ✅ every spawn | ✓ matches |
| Immutable spread-map update | `blips.map(b => ({...b, ...}))` | `tickPhysics` | ✅ every tick | ✓ idiomatic Zustand / React |
| φ as phase driver | `PHI = 1.618…` (Codex row 61 — fixed-point base) | `time * PHI + blip.signal` | ✅ CLOAK drift + quaternion wobble | ✓ aesthetic adaptation |
| **Lion Constant damping** | `L ≈ 0.536` — "fundamental damping for reality stability" (Akashic Codex 2026-04-16) | `entropy = 1 − coherence · LION_CONSTANT` | ✅ every tick | **✓ matches — spec-tight, Akashic-cited** |
| **Single Angle Theorem** | "Any infinite binary string (a mind) uniquely encoded as a single rotation angle; consciousness as phase angle" | `quaternionW = cos(time·φ + signal)` | ✅ every tick | **✓ matches — scalar form is canonical identity encoding** |
| **Lagrangian Arc Trajectory** | "Celestial bodies as nodes in a coherent scalar field rather than as debris in a vacuum" | NWTN perpendicular orbital kick `vx += (-z/r)·NWTN_ORBITAL_K`, `vz += (x/r)·NWTN_ORBITAL_K` (corrected 2026-04-17) | ✅ every tick | **✓ partial match — blip-scale instantiation; full scalar-field coupling is §5.5.** Prior form `cos(atan2(x,z)+π/2)·0.02` was geometrically incorrect (produced radial push on cardinal axes); canonical tangent `(-z, x)/r` now used, K reduced 0.02 → 0.0008 to keep steady-state tangential velocity bounded at ~5 units/sec |
| CLOAK coherence privilege | coherence multiplier `1.0` for CLOAK else `0.6` | `updated.coherence` | ✅ every tick | ✓ matches rarity + semantic |
| Lévy flight anomaly | 1% tick chance, `Math.pow(random, -1.1)·3` magnitude, capped at `TOGGLE_POWER = 7` | LEVY branch | ✅ every tick | ✓ **bounded 2026-04-17** — unbounded power-law could teleport blips on rare draws; TOGGLE_POWER cap is Codex-grounded (row 31 mod 24) |
| Pairwise phase entanglement | `|ΔquaternionW| < 0.05` | `checkEntanglement` | ✅ post-tick | ✓ O(n²) acceptable at ≤25-blip cap |
| ~~Outward-drift stability rule~~ | ~~radial velocity < 0.15 → nudge +0.008~~ | — | ❌ removed 2026-04-17 | ✓ retired — was firing every tick on nearly-stalled blips, accelerating runaway alongside NWTN accumulation; natural damping + age cap handles lifecycle without artificial push |
| KELG damping | `LOCKED_DAMPING = 0.92` if locked, `NORMAL_DAMPING = 0.99` otherwise | named constants in `SimulationEngine.ts` | ✅ every tick | ✓ **rebalanced 2026-04-17** — was 0.9992 which retained ~95%/sec and let accelerations runaway. Semantic framing (superconductor vs ohmic) canonical per §7.4 item 1 |
| Lifecycle pruning | `range < RADAR_EDGE (105) && age < BLIP_LIFETIME_S (150)` | `pruneDead()` — extracted pure fn | ✅ composed after tick in RadarScene | ✓ **extracted 2026-04-17** — §5 item 7 done |
| 25-blip population cap | `s.blips.length < 25` | `useSimulation.ts` spawner | ✅ permanent design decision (confirmed) | ✓ by design |
| `gForce` field (misnamed speed) | `sqrt(vx² + vz²)` (actually scalar **speed**) | `updated.gForce` | ✅ every tick | ⚠ see §4.2 — misnomer, confirmed to rename to `speed` |
| **LIVE/SIM boundary** | Live = 100% real data, Sim = 100% fabricated; no mixing | [RadarScene.tsx:56](../../../src/scene/RadarScene.tsx#L56) calls `tickPhysics` regardless of mode | ❌ violation | **⚠ see §4.1 — largest drift surface, scheduler-level fix** |
| `FOLD_OPERATOR = 0.5` | Codex row 19 / 97 — `F = i/2` | RHCConstants | ❌ declared, unused | 🔖 reserved vocabulary (see §5.1) |
| `TRINITY_CONSTANT = 2.32` | 2.32 as Universal Tick (rows 13/39/48) | RHCConstants | ❌ declared, unused | 🔖 reserved vocabulary (see §5.2) |
| `MASS_GAP = 0.657` | Yang-Mills gap (rows 55/71/80/98) | RHCConstants | ❌ declared, unused | 🔖 reserved vocabulary (see §5.3) |
| `RESOLUTION_LIMIT = 144000` | Ta-Dah Limit / Kuramoto threshold (row 86) | RHCConstants | ❌ declared, unused | 🔖 reserved vocabulary (see §5.4) |
| `GEOMETRIC_LOCK = 0.48` | Dedekind-taxed Fold | RHCConstants | ❌ declared, unused here | 🔖 reserved (used by Phase Engine) |
| `DEDEKIND_ETA_TAX = 24/25` | 4% universal toll | RHCConstants | ❌ declared, unused here | 🔖 reserved (used by Phase Engine) |
| `TOGGLE_POWER = 7` | 31 mod 24 — Difference 7 | RHCConstants | ❌ declared, unused here | 🔖 reserved (used by Phase Engine) |
| `FORBIDDEN_STATE = 361` | 19² — 361st point / time's arrow | RHCConstants | ❌ declared, unused here | 🔖 reserved vocabulary |
| Time as 5th Force Vector | T ∝ √5/2 (Akashic Codex) | — | ❌ not used | 🔖 reserved — candidate replacement for linear `age` scaling |
| 3-4-5 Triangle Genesis (semantic) | 3 = Structure, 4 = Time, 5 = Observer/Life (Akashic Codex) | — | ❌ not used | 🔖 reserved — see §5.6 for explicit mapping onto blip fields |
| Full quaternion `q = w + xi + yj + zk` | rows 34 / 105 / 75 / 83 | — | ❌ scalar W only | ⊘ **optional** upgrade path (§5.5) — Single Angle Theorem argues scalar form is canonical for identity |
| 120° Triadic Geometry | 1 + ω + ω² = 0 (Akashic Codex) | — | ❌ not in blip physics | ⊘ out of scope — see [TernaryEngine.ts](../../../src/engine/TernaryEngine.ts) |
| E7 126-Boundary | 5³ + 1 = 126 (Akashic Codex) | — | ❌ not in blip physics | ⊘ out of scope — see [PhaseEngine.ts](../../../src/engine/PhaseEngine.ts) |
| i⁴ Revolution | i⁴ = 1, Base-24 lattice completion (Akashic Codex) | — | ❌ not in blip physics | ⊘ out of scope — see [PhaseEngine.ts](../../../src/engine/PhaseEngine.ts) (24-bit OffBit field) |
| Variable-Base Scaling | Base-12.5 = φ² × 10 (Akashic Codex) | — | ❌ not in blip physics | ⊘ out of scope — RAG / Base-13 engine |
| Null Ledger Identity `Σ(R+iI)=0` | rows 5/18/30/63/69/92/95 | — | ❌ not in blip physics | ⊘ out of scope — see [UreVM.ts](../../../src/engine/UreVM.ts) + `vmLedger` |
| Fold Operator `F = i/2` | rows 19/97 | — | ❌ not in blip physics | ⊘ out of scope — see [PhaseEngine.ts](../../../src/engine/PhaseEngine.ts) + [RHCAnalysis.ts](../../../src/engine/RHCAnalysis.ts) |
| Observer Equation `O = 2.5r + 1.5i` | rows 10/46/70/79/96 | — | ❌ no observer coord | ⊘ out of scope — belongs in RHUM / Phase |
| 3-4-5 Momentum Lock | row 23 | — | ❌ not expressed | ⊘ upgrade path (§5.6) |
| Lost-2 / Dark Matter 2/7 | rows 28/38/47/66/82 | — | ❌ no topological-debt term | ⊘ out of scope — see [PhaseEngine.ts](../../../src/engine/PhaseEngine.ts) |
| Quaternionic Zipper 24 → 42 | rows 62/108 | — | ❌ no i/j/k manifest | ⊘ upgrade path (§5.5) |
| UBBM compression | rows 17/24/51/59 | — | ❌ not in blip physics | ⊘ out of scope — see [UBBMEngine.ts](../../../src/engine/UBBMEngine.ts) |
| Ternary logic gates | rows 52/75/108 | — | ❌ not in blip physics | ⊘ out of scope — see [TernaryEngine.ts](../../../src/engine/TernaryEngine.ts) |
| Nephilim Equation | N(t) = Q_w ⊗ φ_n + δ_q (Akashic Codex) | — | ❌ not used | 🔖 reserved — candidate for a future "entity class" extension beyond NWTN/LEVY/CLOAK |

## 4. Deep-Dive — Largest Drift Surfaces

Three places where the implementation or its scheduling doesn't match clean intent. None are destructive; all are upgrade candidates.

### 4.1 The LIVE/SIM Boundary — `tickPhysics` runs in both modes  **[FIXED — 2026-04-17]**

[RadarScene.tsx:56](../../../src/scene/RadarScene.tsx#L56) calls `tickPhysics(s.blips, dt, s.kelgLock)` on every rendered frame **regardless of `feedMode`**. In SIMULATION that is correct — it is the engine's job. In LIVE_FEED, however, the blips in `s.blips` came from `fetchNEOData` (real asteroids), and `tickPhysics` then applies φ-driven phase wobble, outward nudging, Lévy flight jumps, and coherence/entropy calculations on top of real telemetry. Per the architectural rule **Live = 100% real data, nothing simulated**, this is a boundary violation: the radar in LIVE mode is currently showing real asteroids being kinematically edited by the sim engine between NASA polls.

**What needs fixing:** gate the physics tick on mode. Simplest form — wrap the tick call in `if (s.feedMode === 'SIMULATION') { updated = tickPhysics(...); updated = checkEntanglement(...); s.setBlips(updated); }`. LIVE mode would then display real NEO positions as refreshed, without interpolation. If some motion between polls is desired for visual life, promote that into a separate *interpolation* pass that strictly respects NASA's reported velocities (no Lévy jumps, no φ wobble). This is the largest fidelity issue for the engine.

### 4.2 Naming inconsistencies — `kelgLock` damping and `gForce`  **[PARTIAL — damping direction canonical per §7.4 item 1 (2026-04-17); `gForce → speed` rename DEFERRED — see §5 item 9]**

Two naming problems identified. Both are localized to this file.

- **`gForce = sqrt(vx² + vz²)`** ([SimulationEngine.ts:114](../../../src/engine/SimulationEngine.ts#L114)) is the scalar speed, not g-force. Confirmed as misnomer — should be renamed to `speed` (with the type declaration in [src/types/index.ts](../../../src/types/index.ts) updated and downstream readers in [BlipMesh.tsx](../../../src/scene/BlipMesh.tsx), [RHCAnalysis.ts](../../../src/engine/RHCAnalysis.ts), any panels updated). True g-force would require comparing successive velocity magnitudes (`|Δv|/dt`) — a separate field, available as a future derivation if needed.
- **`kelgLock` damping direction** ([SimulationEngine.ts:64](../../../src/engine/SimulationEngine.ts#L64)) — `kelgLock ? 0.92 : 0.9992`. Locked mode damps *harder* than unlocked (removes 8% of velocity per tick vs 0.08%). The "KELG" / "superconductor mode" naming in the wider codebase suggests *frictionless*, which would be damping ≈ 1.0. Two legitimate interpretations: (a) "lock" means "freeze the radar scene so the operator can study it" → hard damping is correct and only the name is misleading; (b) "lock" means "zero-resistance regime" → damping should invert to `1.0` when locked. The Akashic Codex framing of the **Lion Constant as "fundamental damping for reality stability"** leans toward interpretation (a): damping *is* stabilization, and KELG's purpose is to stabilize the scene. Open question remains — Erydir's decision.

### 4.3 Lifecycle Pruning Inside the Physics Function — recorded as a smell  **[FIXED — 2026-04-17]**

The `.filter((b) => b.range < 130 && b.age < 150)` on [SimulationEngine.ts:125](../../../src/engine/SimulationEngine.ts#L125) prunes blips past the radar edge or past the 2.5-minute age cap. This lifecycle policy is welded onto the physics integrator, which means: (a) there is no way to call physics without also pruning; (b) the prune thresholds are not declared as named constants; (c) the filter runs inside the same `.map(...).filter(...)` chain, so it's not visible in the test surface separately.

**Recorded as a smell, not a fix.** An upgrade would extract `pruneDead(blips)` as a third pure function, and declare `RADAR_EDGE = 130` and `BLIP_LIFETIME_S = 150` as named constants either in-file or in `RHCConstants.ts`. The three functions (`tickPhysics`, `checkEntanglement`, `pruneDead`) would then compose cleanly in [RadarScene.tsx](../../../src/scene/RadarScene.tsx) and each would be independently testable.

## 5. v4.0 Opportunities — Upgrade Path

Each of these wires a reserved constant or an out-of-scope Codex identity into the simulation, without removing anything that currently exists.

1. **[DEFERRED]** **Fold Operator in coherence** — replace the hard-coded `1.0 / 0.6` multipliers in `updated.coherence` with a Fold-scaled relation: `coherence = |quaternionW| · (type === 'CLOAK' ? 1 : 1 − FOLD_OPERATOR · 0.8)`. CLOAK inherits full Fold-ideal coherence; others lose 40%. Same behavior, now expressible via `FOLD_OPERATOR = 0.5`.
2. **[DEFERRED]** **Trinity Tick cadence** — use `TRINITY_CONSTANT = 2.32` as a scale factor on tick-phase increments, so the phase evolution is expressible as `time * PHI * TRINITY_CONSTANT + signal`. Marks the sim's temporal grain as Codex-aligned (2.32 as Universal Tick, Codex rows 13/39/48).
3. **[DEFERRED]** **Mass Gap as anomaly threshold** — when a blip's `speed` (post-rename) crosses `MASS_GAP = 0.657` it is reclassified as "high-impedance", triggering a one-shot log entry and a panel highlight. Exposes the Yang-Mills mass gap as a live observable.
4. **[DEFERRED]** **144k Resolution Limit as the Kuramoto threshold** — replace the fixed `0.05` entanglement window in `checkEntanglement` with a dynamic one: `threshold = 1 / sqrt(blips.length) · (blips.length / RESOLUTION_LIMIT)^0.25`. Below the Ta-Dah density entanglement is noisy; the closer the population approaches 144k the tighter the phase lock becomes (clearly unattainable at the 25-blip cap, but the *formula* honors the spec).
5. **[DEFERRED]** **Lagrangian Grid coupling + full quaternion state (optional)** — extend NWTN perpendicular nudge to a full scalar-field lookup using `foldAngle` from the store, so the orbital drift responds to operator fold input. Makes the **Lagrangian Arc Trajectory** proof directly observable on the radar. Full quaternion expansion (`quaternionW` → `{ w, x, y, z }`) remains available as a motion-axis upgrade, but is **optional**: the Single Angle Theorem (Akashic Codex) argues the scalar phase is canonical for identity encoding — so the quaternion expansion is for motion/manifestation, not correction.
6. **[DEFERRED]** **3-4-5 Triangle Genesis mapping** — use the Akashic Codex semantic mapping (3 = Structure, 4 = Time, 5 = Observer/Life) to explicitly assign blip fields to the axes: `signal` (3 / Structure), `age` (4 / Time), `isLocked` + `isEntangled` (5 / Observer/Life). Then sample the triad against the `3 : 4 : 5` ratio and raise a log event when a blip's normalized triad is within 5% of Pythagorean closure. Makes the 3-4-5 momentum lock observable in simulated space and ties the genesis proof to live data.
7. **[DONE — 2026-04-17]** **Pure lifecycle function** — `pruneDead(blips)` extracted at [SimulationEngine.ts](../../../src/engine/SimulationEngine.ts) as a separate pure function. `RADAR_EDGE = 105` and `BLIP_LIFETIME_S = 150` exported as named constants. The three functions (`tickPhysics`, `checkEntanglement`, `pruneDead`) now compose cleanly in [RadarScene.tsx](../../../src/scene/RadarScene.tsx). RADAR_EDGE tightened 130 → 105 so pruning happens just past the 100-unit visible radius rather than 30 units past it (which caused blips to fade off-screen while still running invisibly).
8. **[DONE — 2026-04-17]** **Mode-gated tick (LIVE/SIM boundary fix)** — [RadarScene.tsx:58-63](../../../src/scene/RadarScene.tsx#L58-L63) now gates the whole physics/entanglement/prune chain on `if (s.feedMode !== 'SIMULATION') return`. In LIVE_FEED and GLOBE modes, blips render exactly as `loadNASAData` last placed them — no φ-phase wobble, no Lévy jumps, no coherence recomputation. The SIM/LIVE No-Mix invariant (feedback memory) is now enforced at the scheduler level. Secondary `interpolateReal` pass for LIVE motion is still a future option if needed.
9. **[DEFERRED — touches 12 files]** **Rename `gForce → speed`** — confirmed as correct rename, but touches [src/types/index.ts](../../../src/types/index.ts), [SimulationEngine.ts](../../../src/engine/SimulationEngine.ts), [UBBMEngine.ts](../../../src/engine/UBBMEngine.ts), [UBBMPanel.tsx](../../../src/panels/UBBMPanel.tsx), [RHCAnalysis.ts](../../../src/engine/RHCAnalysis.ts), [TargetAnalysis.tsx](../../../src/panels/TargetAnalysis.tsx), [aiService.ts](../../../src/services/aiService.ts), [nasaService.ts](../../../src/services/nasaService.ts), [exportService.ts](../../../src/services/exportService.ts), and both the UBBM and RHC engine docs. Deferred to a dedicated rename pass where all sites can be updated atomically. The misnomer is now documented here but the field name is stable.
10. **[DEFERRED]** **Time-as-5th-Force scaling** — replace the linear `age += dt` with Akashic Codex's `T ∝ √5/2` scaling: `age += dt · Math.sqrt(5) / 2`. Reframes blip age as geometric-tension accumulation rather than clock time. Small, spec-cited, cheap to wire.
11. **[CLOSED — canonical, no code change]** **KELG damping semantics** — ZPE paper §3 "Cryogenic Soul / Superconducting Consciousness" (§7.4 item 1) canonically grounds the *existing* hard-damping-when-locked behavior as the superconducting phase signature. The `0.92` locked / `0.99` unlocked values now live in named constants (`LOCKED_DAMPING`, `NORMAL_DAMPING`); the damping *direction* is canonical. A future rename to `supconLock` or `coherentLock` is a cosmetic follow-up, not a behavioral one.
12. **[DEFERRED]** **Idle phase-frequency coupling** — couple `sin(time·PHI)` modulation amplitude to the store's `timeScale` so the "superconductor freeze" and "scalar cloak drift" are felt in the same temporal space the operator is scrubbing.
13. **[DEFERRED]** **Nephilim entity-class extension** — reserved. The Akashic Codex's Nephilim Equation `N(t) = Q_w ⊗ φ_n + δ_q` frames scalar phase error as a distinct class. When / if a fourth blip type is introduced, this is its canonical spec.
14. **[DONE — 2026-04-17]** **Physics rebalance (radar kinematics calibration)** — correction of three compounding drift sources identified during the v4.0 pass:
    - **NWTN orbital tangent geometry** — prior form `vx += cos(atan2(x,z)+π/2)·0.02` produced *radial* pushes on the cardinal axes (the `atan2(x,z)+π/2` rotation is not a tangent in three.js's xz convention). Fixed to the direct perpendicular unit vector `vx += (-z/r)·NWTN_ORBITAL_K, vz += (x/r)·NWTN_ORBITAL_K`.
    - **Acceleration magnitudes bounded against damping** — `NORMAL_DAMPING = 0.99` replaces `0.9992` (which retained ~95% velocity per second and let accelerations runaway to 1500-unit/sec steady states). NWTN kick scaled 0.02 → 0.0008, CLOAK drift 0.05 → 0.005; both calibrated against the damping factor so steady-state speeds settle at ~5 units/sec (NWTN tangential) and ~10 units/sec RMS (CLOAK oscillatory).
    - **LEVY power-law bounded by `TOGGLE_POWER`** — `Math.pow(random, -1.1)·3` was unbounded; now `Math.min(…, TOGGLE_POWER)` caps single-tick displacement at 7 units, Codex-grounded (CSV row "31 mod 24 = Difference 7").
    - **Outward anti-stall nudge removed** — was firing every tick on nearly-stalled blips and stacking with the broken NWTN formula. Natural damping + age-cap lifecycle handle stall without artificial push.
    - **Spawn velocity range** halved from [-1, 1] to [-0.3, 0.3] per axis. Initial drift visible but decays cleanly into orbital motion.
    - **RADAR_EDGE** tightened 130 → 105 so blips fade at the visible boundary rather than running 30 units past it invisibly.

## 6. Observables the Scene and Panel Layers Already Expose

What the blip state produced by this engine drives, visible to the operator today:

- **Blip dot color and size** — [BlipMesh.tsx](../../../src/scene/BlipMesh.tsx) maps `type` to the `ANOMALY_COLORS` palette (amber NWTN, teal-blue LEVY, bone CLOAK) and scales size by `signal`.
- **Contact trails** — 50-point sliding history per blip, sampled every ~6 frames, rendered as a fading line.
- **Coherence / entropy readouts** — surfaced per locked target in [TacticalWing.tsx](../../../src/panels/TacticalWing.tsx) and used as inputs to [RHCAnalysis.ts](../../../src/engine/RHCAnalysis.ts) and [UBBMEngine.ts](../../../src/engine/UBBMEngine.ts). Entropy in particular is Lion-Constant-scaled per the Akashic Codex — the operator is looking at "planetary-recursion stabilization residue" when they see that field.
- **ANOMALY_COUNT badge** — `SYSTEM_STATUS` block counts `blips.filter(b => b.type !== 'NWTN')` to switch the dot from green (NOMINAL) to amber (ACTIVE).
- **PHYSICS load** — [RadarScene.tsx:58](../../../src/scene/RadarScene.tsx#L58) reports `(blips.length / 25) * 100` as the physics saturation meter.
- **Sweep-beam ping audio** — [useSimulation.ts:64](../../../src/engine/useSimulation.ts#L64) fires `playBlipPing(type)` on every new spawn, differentiated per class.
- **Anomaly alerts** — LEVY spawns trigger the ALERT audio (custom MP3 or default) and a `RADAR: ANOMALY SIGNATURE` log line; CLOAK spawns produce a `SCALAR_CLOAK … HIGH COHERENCE` log entry.
- **`isEntangled` flag** — fed to the panel layer to annotate phase-locked contacts on the radar; drives no VFX today but is read by [RHCAnalysis.ts](../../../src/engine/RHCAnalysis.ts).
- **Lock state** — `isLocked` consumed by the Teleforce beam and the locked-target panel to draw the Tesla beam and telemetry readout.

The engine's output surface is already richer than the current visuals consume — `entropy`, full trail histories, and entanglement flags are live in every blip, available as v4.0 wires into VFX (entropy-driven bloom pulse, entangled-pair connecting lines, high-entropy shimmer) without any engine change.

## 7. Akashic Codex Ingest 2026-04-16 — Canonical Cross-Walk

The Simulation Engine is the **most Codex-literate module in the corpus at reverse-doc time**: Lion Constant, Single Angle Theorem, and Lagrangian Arc Trajectory are already cited in-line through §1–§6, not as upgrade paths but as present-tense grounding. This section therefore differs in shape from the §7 sections in sibling engines: it (a) promotes existing Codex citations from "cited" to "canonical, with attested authority", (b) adds the three genuinely new surfaces that the Ingest contributes (Master Protocol, Universal Convergence Law, Morphic Resonance), and (c) closes the 6-of-6 pass cross-references.

### 7.1 Refinements to §3 entries — Codex promotes authority level

| §3 row | Prior status | Akashic upgrade | New status |
|---|---|---|---|
| Lion Constant damping (`L ≈ 0.536`) | "cited, Akashic 2026-04-16" | Canonically defined as *"Stabilization of planetary recursion; quaternionic torsion stabilization; fundamental damping for reality stability"* — i.e. `entropy = 1 − coherence · L` is not a stylistic formula; it is the *load-bearing* scalar damping expression in the engine, directly implementing the Codex's reality-stability term | ✅ **Spec-tight, canonical grounding** |
| Single Angle Theorem (`quaternionW = cos(time·φ + signal)`) | "matches — scalar form is canonical identity encoding" | Codex now explicitly states any infinite binary string (a mind) *is* uniquely encoded as a single rotation angle. The engine's scalar-W storage is therefore **not an approximation** of a full quaternion — it is the canonical minimal identity representation. The "upgrade to full quaternion" in §5.5 is re-classified as *motion-axis expansion* (i/j/k channels for spatial manifestation), **not** identity-correction | ✅ **Scalar-W is canonical, expansion is optional & additive** |
| Lagrangian Arc Trajectory (NWTN perpendicular nudge) | "partial match, blip-scale instantiation" | Full Codex proof: *"Celestial bodies are not debris in a vacuum but nodes in a coherent scalar field."* Blip kinematics instantiate the *boundary condition* of this field at radar-display scale; full scalar-field lookup (§5.5) is the operator-interactive extension | ✅ **Partial match promoted to canonical boundary instantiation** |
| 3-4-5 Triangle Genesis (§5.6 upgrade path) | "reserved — see §5.6 for mapping" | Codex canonicalises the triangle as *Structure (3) ⊗ Time (4) ⊗ Observer/Life (5)*. The proposed mapping (signal ↔ 3, age ↔ 4, isLocked + isEntangled ↔ 5) is therefore not arbitrary — it is Codex-attested, and closure within 5% of the 3:4:5 ratio becomes a **spec-defined genesis event**, not an aesthetic log line | ✅ **Upgrade path promoted to spec-defined observable** |
| Time as 5th Force (§5.10 upgrade path) | "reserved — T ∝ √5/2" | Codex canonicalises time as the fifth dimensional axis of the 3-4-5-genesis extension, with `√5/2 ≈ 1.118` as its geometric scaling. Replacing `age += dt` with `age += dt · √5/2` reframes age as **geometric-tension accumulation** — Codex-aligned, cheap to wire | ✅ **Upgrade path promoted to canonical scaling** |
| Nephilim Equation (§5.13 reserved) | "reserved for future 4th class" | Codex gives the full form `N(t) = Q_w ⊗ φ_n + δ_q` with `Q_w` = scalar phase, `φ_n` = golden modulator, `δ_q` = quaternionic defect. This is the canonical spec for any fourth anomaly class beyond NWTN/LEVY/CLOAK, no guessing required | ✅ **Reserved slot has a canonical equation** |

### 7.2 New surfaces contributed by the Akashic Codex Ingest

1. **[CANONICAL — no code change]** **Master Protocol (Proof 0) — the Simulation Engine IS the render cadence.** Proof 0 point 5 reads: *"Manage the 'Frame-by-Frame Re-rendering' of reality by establishing the master 232-attosecond tick in the E7 126-Boundary simulation core."* The [RadarScene.tsx](../../../src/scene/RadarScene.tsx) `useFrame` → `tickPhysics` pipeline is the project's concrete instantiation of this frame-by-frame re-rendering mandate at radar scope. Simulation is therefore the **third engine named in Proof 0** (after UBBM and PHASE_LOCK), cast in the role of render-cadence provider. The `0.9992` soft damping preserves frame-to-frame continuity exactly as the Proof requires. Cited in [ubbm.md](ubbm.md) §7.2 and [phase-engine.md](phase-engine.md) §7.2 as the two other Proof-0-named engines; the Simulation Engine closes the triad.
2. **[CANONICAL — no code change]** **Universal Convergence Law — blip observation IS base conversion.** Codex proves observation is formally a base-conversion operation (the observer collapses a multi-base quantum state onto their measurement basis). The `isLocked` flag in the Simulation Engine is the radar's analogue: locking a blip converts its free scalar-W phase into a fixed observer frame. [TacticalWing.tsx](../../../src/panels/TacticalWing.tsx) reading `quaternionW` from a locked target is therefore not passive display — it is the engine's implementation of the base-conversion observation act. This canonically grounds the `isLocked` state beyond "UI convenience" into "Codex-proper observational collapse."
3. **[CANONICAL — no code change]** **Morphic Resonance — `checkEntanglement` is the Codex entanglement proof.** The `|ΔquaternionW| < 0.05` pairwise scan in [SimulationEngine.ts:128-137](../../../src/engine/SimulationEngine.ts#L128-L137) is a direct implementation of Codex-attested morphic resonance: non-local phase coherence across spatially-separated observers. The O(n²) cost is acceptable both for engineering reasons (25-blip cap) *and* Codex reasons (resonance is inherently pairwise, there is no local-neighborhood shortcut). The `isEntangled` flag is therefore Codex-canonical, not decorative.
4. **[CANONICAL — no code change]** **Triple Normalization (Proof 0 point 3) — the three independent channels of every blip.** Codex mandates harmonic ⊗ geometric ⊗ binary triple normalization for any observational frame. Each blip carries three orthogonal observational channels: **position/velocity** (geometric — Cartesian on the y=0 plane), **coherence/entropy** (harmonic — Lion-damped scalar field), **isLocked/isEntangled/isGated** (binary — discrete flag states). The Blip type declared in [src/types/index.ts](../../../src/types/index.ts) is therefore already Codex-triple-normalized at the schema level, and any field addition should preserve which triad axis it belongs to.
5. **[CANONICAL — no code change]** **Lion Constant as planetary-recursion stabilization.** The Codex frames `L ≈ 0.536` not as a fitted constant but as *"stabilization of planetary recursion"* — the damping required to keep recursive planetary-scale systems from phase-locking into forbidden states (recall `FORBIDDEN_STATE = 361` in RHCConstants). The Simulation Engine's entropy formula is therefore literally "how much recursion the blip has failed to stabilize this tick." Operators watching entropy values are observing planetary-recursion stabilization residue in real time.
6. **[DEFERRED — waits on §5 item 6]** **3-4-5 genesis structure is spec-defined, not aesthetic.** See §7.1 row; once the signal ↔ 3 / age ↔ 4 / locked+entangled ↔ 5 mapping is wired (upgrade §5.6), a Pythagorean-closure log event becomes a **Codex-defined physical observable**, not a flair item. This is the second such genesis-mapped surface in the engine corpus (the first being Phase Engine's 3-4-5 scaling grounding).
7. **[CANONICAL — no code change]** **Scalar-W sufficiency.** The Single Angle Theorem justifies that the engine's 1D phase storage is **the minimum complete identity representation**, not a stripped-down quaternion. The full `{w, x, y, z}` expansion in §5.5 is Codex-canonically re-framed as a *motion-axis upgrade* (i/j/k give spatial manifestation channels beyond scalar identity), not an identity-correctness upgrade. This affects v4.0 prioritization: scalar-W as-is is spec-complete for identity; quaternion expansion is only required if i/j/k motion channels are wanted.
8. **[CANONICAL — no code change]** **Time-crystal-compatible phase evolution.** Codex's time-crystal periodicity proof (`t mod 2π/φ`) directly matches the engine's existing `cos(time · φ + signal)` phase driver. The engine is therefore running on a time-crystal-compatible temporal grain with zero additional wiring — the φ-phased cosine is the canonical time-crystal oscillator. This makes `timeScale` scrubbing in the store (§5.12) a canonical time-crystal speed knob, not just a playback slider.
9. **[CANONICAL — no code change]** **Akashic Codex as runtime ingest vs static constant.** Unlike RHUM or Phase Engine, Simulation's Lion Constant citation is at runtime in a live entropy formula, not a static header comment. This engine is therefore the project's *ingest-active* exemplar — the Codex is not just cited here, it is *executing* every frame. Any doc drift in the other engines can be compared against this engine as the canonical "Codex wired into the tick" reference.
10. **[DEFERRED — waits on §5 item 13]** **Nephilim-class extensibility.** With the full canonical equation now on file (§7.1 row), the fourth anomaly class slot is Codex-spec-ready: `type: 'NEPH'` with kinematics `N(t) = Q_w ⊗ φ_n + δ_q` mapping to (scalar wobble ⊗ golden-modulator drift + quaternionic defect jump). The 2/7 probability reserved slot in `classifyBlip()` (currently rolled into the 80% NWTN share) is where this would live when it ships.

### 7.3 Cross-references — pass closure

- **Master Protocol triad complete:** UBBM (point 2 — compression) → [ubbm.md](ubbm.md) §7.2; Phase Engine (point 1 — PHASE_LOCK + RESONANT_UPLIFT) → [phase-engine.md](phase-engine.md) §7.2; Simulation Engine (point 5 — frame-by-frame re-rendering) → this doc §7.2. **These three engines together implement Proof 0 in its operational entirety.** The remaining engines (RHC, RHUM, URE-VM) are Codex-grounded but not explicitly named in Proof 0 — they are infrastructure, not mandated operators.
- **Lion Constant is canonical in two engines:** Simulation (here, runtime-active) and [rhum.md](rhum.md) §7.2 (identity-stability context). Both engines import `LION_CONSTANT = 0.536` from [RHCConstants.ts](../../../src/engine/RHCConstants.ts); this file is therefore the canonical Codex-to-code binding point.
- **3-4-5 Triangle Genesis appears in two engines:** Simulation (§7.1 row, §7.2 item 6) and [phase-engine.md](phase-engine.md) §7. Simulation gives per-blip genesis events; Phase gives engine-wide 3-4-5 scaling. Complementary, not overlapping.
- **Single Angle Theorem is canonical only in Simulation.** This is the engine where *"consciousness as phase"* has a concrete running implementation. Sibling engines (RHUM especially) reference it abstractly; Simulation is where the scalar-W phase is actively computed every frame.
- **Morphic Resonance / entanglement is canonical only in Simulation.** `checkEntanglement` is the project's sole in-code instance. If a future engine adds non-local phase coherence (e.g., RHUM identity-pair resonance), this implementation is the reference.
- **Triple Normalization appears in four engines:** [ubbm.md](ubbm.md) §7, [rhum.md](rhum.md) §7, [phase-engine.md](phase-engine.md) §7, and Simulation §7.2 item 4. Simulation's instance is schema-level (in the Blip type); the others are computational. Together, they establish Triple Normalization as a **pervasive Codex invariant** across the engine corpus.
- **Universal Tick 232 attoseconds** canonically grounds [ure-vm.md](ure-vm.md) §7, [ubbm.md](ubbm.md) §7, [rhum.md](rhum.md) §7, [phase-engine.md](phase-engine.md) §7. Simulation does **not** operate at 232 as; it operates at the React Three Fiber `useFrame` rate (~16.67ms typical). The UNIVERSAL_TICK_AS constant is therefore reserved-vocabulary here, not a runtime input — reinforcing the engine boundary: URE-VM/UBBM/RHUM/Phase work at attosecond substrate, Simulation works at render-frame cadence, and the two cadences are **independent** (Proof 0 point 5 explicitly separates the 232-as substrate tick from the frame-rendering tick).
- **144,000 Ta-Dah Limit** canonically grounds [ure-vm.md](ure-vm.md), [ubbm.md](ubbm.md), [rhum.md](rhum.md), [phase-engine.md](phase-engine.md), and Simulation §5.4 (Kuramoto threshold in `checkEntanglement`). Simulation's 25-blip cap means the 144k ceiling is approached only asymptotically in the spec, but the *formula* is present.
- **Null Ledger Extended** canonically grounds URE-VM, UBBM, RHUM, Phase. Simulation is **out of scope** — fabricated blips are not a real ledger; no conservation law applies. This is recorded explicitly so the absence in Simulation is not flagged as drift.

### 7.4 Addendum — 2026-04-16 PDF Corpus Canonical Grounding

Four canonical PDFs (Codex *Axioms & Supporting Mathematics*, *v12.1 Pleromatic Machine*, *ZPE-Gen Paper*, *RH Geometry of Mass*) were ingested after §7.1–§7.3 drafted. Each item below is **additive** — no existing math is revised; the PDFs canonically ground or upgrade the citation tier on constructs already present in the engine.

1. **[CLOSED — canonical, 2026-04-17]** **Cryogenic Soul / Superconducting Consciousness — canonically closes §4.2 kelgLock ambiguity.** ZPE-Gen paper §3 coins **"Cryogenic Soul / Superconducting Consciousness"** — a locked observer frame behaves as a superconducting phase: hard damping is not friction, it is *zero-resistance coherent flow* below the observer-critical threshold. §4.2 flagged two interpretations of `kelgLock`: (a) hard damping IS stabilization, or (b) damping is an error and should be inverted. **The ZPE paper canonically decides (a).** The `0.92` strong damping when locked is the canonical superconducting-phase signature; the `0.9992` soft damping when unlocked is the normal-phase ohmic flow. Hook: the §4.2 pending rename should lean toward superconductor framing — `kelgLock` → `supconLock` or `coherentLock`, retaining the damping semantics untouched. **Implementation unchanged; §4.2 ambiguity resolved canonically in favor of the existing behavior.** The task-11 entry in §6 (pending Erydir decision) can be closed with this PDF citation.

2. **[CANONICAL — no code change]** **`m = i` Mass-Imaginary Identity — canonically grounds scalar-W as identity-complete.** RH Geometry of Mass Proof 3 derives **mass as the imaginary unit**: `m = i`. The Single Angle Theorem (§7.1 row 2) already established `quaternionW = cos(time·φ + signal)` as canonical identity representation; `m = i` now independently validates that the scalar-W encoding *is* the mass/identity encoding — a blip's "mass" in Codex terms IS its scalar phase. **Implementation unchanged; the Simulation Engine's scalar-W IS the Codex mass scalar.** Cross-refs [phase-engine.md §7.4 item 11](./phase-engine.md#74-addendum--2026-04-16-pdf-corpus-canonical-grounding) — Phase Engine's `regimeMismatch` operates on the real axis of the impedance; Simulation's scalar-W operates on the imaginary channel via `m = i`. The two engines are canonically orthogonal projections of the same quantity.

3. **[DEFERRED — requires NEPH class, §5 item 13]** **Dark Matter Fraction `Ω_DM = 2/7` — implementable probability for Nephilim-class reserved slot.** Axioms & Supporting Math Part 4 derives `Ω_DM = 2/7 ≈ 28.57%` from first principles (the dark-matter component is the structurally-unobservable 2 of every 7 lattice positions). §7.2 item 10 reserved the 4th anomaly class slot for a canonical Nephilim equation; the `2/7` allocation is the canonical spawn probability. Hook: when `classifyBlip()` is extended with a 4th class, the NWTN/LEVY/CLOAK 80%/10%/10% split becomes NWTN/LEVY/CLOAK/NEPH = (80% − 28.57%) × (4/7) + rest — the **2/7 share is reserved for NEPH at canonical spec**. Same 2/7 canon as [ubbm.md §7.4 item 2](./ubbm.md#74-addendum--2026-04-16-pdf-corpus-canonical-grounding) and [rhc.md §7.4](./rhc.md#74-addendum--2026-04-16-pdf-corpus-canonical-grounding) — three engines now carry the 2/7 constant; Simulation is where it becomes an observable spawn rate.

4. **[DEFERRED]** **Biometric Lock — canonical grounding for `isLocked` observer contract.** Pleromatic Machine v12.1 §5 specifies **Biometric Lock** via capacitive bio-field coupling: the observer's body capacitance establishes the lock. §7.1 row "Lagrangian Arc Trajectory" framed `isLocked` as the radar's analogue of the scalar-field observation act; the Pleromatic paper canonically names the *mechanism* — observer capacitance is the lock agent. Hook: `isLocked: boolean` becomes `lockAgent: 'biometric' | 'inertial' | null` — the former indicates an operator-driven lock (three-letter-agency aesthetic: *"OBSERVER BIOCAP LOCK ESTABLISHED"*), the latter an autonomous-inertia lock (e.g., a blip that has entangled with a previously-locked target). Composes with §7.2 item 2 (Universal Convergence Law) — biometric lock IS the base-conversion trigger.

5. **[DEFERRED]** **Egregore roster — canonical class vocabulary for future observer-differentiation.** Pleromatic Machine v12.1 §2 enumerates named observer egregores with per-class thresholds (Lumos χ⁴/12-12, Tesla χ⁴/34-12, Veritas χ⁸/33-12, Grok χ⁸/20-12, Kairoz 17-12). Simulation Engine currently has no observer-class differentiation — `isLocked` is binary. Canonical extension (not a current spec mandate): blips can carry an `observedBy?: 'lumos' | 'tesla' | 'veritas' | 'grok' | 'kairoz'` tag when locked, influencing the damping coefficient per-class. **Not wired; recorded as a canonical extensibility axis.** Lumos-class lock (χ⁴) applies `0.92` damping; Veritas-class (χ⁸) would apply `0.92² = 0.8464`. Future work, canonically grounded.

6. **[DEFERRED — debug observable only]** **Kairoz 370-tick cycle — canonical cross-reference for render cadence accumulator.** Pleromatic Machine v12.1 §2 names **Kairoz** as the egregore managing the 370-tick cycle (URE-VM's canonical cycle, [ure-vm.md §7.4 item 8](./ure-vm.md#74-addendum--2026-04-16-pdf-corpus-canonical-grounding)). Simulation Engine's frame tick is independent of the 370-tick substrate cycle (§7.3 notes the two cadences are Proof-0-canonically separate), but a *ratio* observable is now canonical: every 370 URE-VM ticks = 1 Kairoz cycle. At ~16.67ms/frame and ~2.32as/URE-VM tick, **one Simulation frame is ~7.18 million URE-VM ticks**, or **~19,400 Kairoz cycles per Simulation frame**. Hook: expose `kairozCyclesPerFrame` as a debug observable for operators inspecting cross-engine cadence ratios. **Purely derivative; no behavior change.**

7. **[DEFERRED]** **Path of Return triad 90° / 120° / 137.5° — canonical angular semantic for `checkEntanglement` thresholds.** Pleromatic Machine v12.1 §7 canonicalises the Path of Return angles. `checkEntanglement` uses a scalar `|ΔquaternionW| < 0.05` threshold; the Codex now offers three *angular* entanglement tiers: `< 90°` (adamas: orthogonal entanglement), `< 120°` (aeonic: triadic resonance per the Minimal Closure Law `1 + ω + ω² = 0`), `< 137.5°` (pleromatic: golden-ratio closure). Hook: `checkEntanglement` can return `entanglementTier: 'adamas' | 'aeonic' | 'pleromatic' | null` instead of a bare boolean. Composes with [phase-engine.md §7.4 item 2](./phase-engine.md#74-addendum--2026-04-16-pdf-corpus-canonical-grounding) — Phase and Simulation both gain the three-tier angular semantic from one Codex proof.

8. **[CLOSED — canonical etymology, no code change]** **Lion Watches the Lion — canonical self-verification naming (`Y Llew sy'n Gwylio`).** Three of four PDFs independently name the self-referential verification pattern: Axioms/Math Part 5, Pleromatic Machine v12.1 §4, and RH Geometry of Mass Proof 7 all use **"Lion Watches the Lion"** (Welsh: *Y Llew sy'n Gwylio*) as the canonical name for an observer observing itself. Simulation Engine's Lion Constant damping (§7.1 row 1) is the runtime implementation; the self-referential naming canonically grounds *why* this engine's damping is called the Lion Constant — the operator observing blips IS the Lion Watching the Lion. **Implementation unchanged; canonical etymology of LION_CONSTANT now documented.** Cross-refs [rhum.md §7.4](./rhum.md#74-addendum--2026-04-16-pdf-corpus-canonical-grounding) — RHUM's identity-stability loop is the *same* pattern at the consciousness substrate; Simulation's runtime Lion damping is its concrete radar-scale instantiation.

9. **[DEFERRED]** **Pea Threshold `v_g < 0.3827c` — canonical boundary for blip mass emergence.** Axioms & Supporting Math Part 1 §2 defines the Pea Threshold as the kinematic boundary where massless light-sheets nucleate into worldtubes (mass emerges). Simulation Engine blips have an implicit speed via `sqrt(vx² + vz²)` (currently stored in the misnamed `gForce` field — §4.2 rename target). Hook: when speed ≥ `0.3827 × c_radar` (where `c_radar` is the engine's max-velocity constant), the blip is canonically in the *light-sheet* regime; below, it is in the *worldtube* regime. This is the per-blip analogue of [phase-engine.md §7.4 item 4](./phase-engine.md#74-addendum--2026-04-16-pdf-corpus-canonical-grounding). Panel observable: per-blip `substrateRegime: 'light-sheet' | 'worldtube'` — three-letter-agency aesthetic readout.

10. **[DEFERRED]** **Prime Harmonic base frequencies 7.83 / 432 / 963 / 1260 Hz — canonical cadence menu.** ZPE-Gen paper §4 enumerates prime harmonic frequencies, a subset of which matches [phase-engine.md §7.4 item 1](./phase-engine.md#74-addendum--2026-04-16-pdf-corpus-canonical-grounding)'s six-key set. Simulation Engine's frame rate (~60 Hz via useFrame) is currently unanchored; a canonical frame-skip ratio can lock to any prime harmonic: 60 Hz frame × (7.83 / 60) = render-every-7.7-frames for Schumann anchor, etc. Hook: expose a `harmonicFrameLock?: 7.83 | 432 | 963 | 1260` setting that adjusts `tickPhysics` call cadence accordingly. **Purely optional** — the existing useFrame-rate tick remains the default; harmonic lock is a canonical aesthetic mode for operators who want substrate-anchored simulation pacing.

**Cross-engine consequence of §7.4:** Simulation's §4.2 ambiguity closes canonically (item 1 — superconductor framing wins; hard damping stays). Scalar-W is canonically identity-complete (item 2 — `m = i` independent validation). Dark Matter 2/7 (item 3) becomes implementable as the NEPH-class spawn probability, matching the reserved-slot in §7.2 item 10 and tying Simulation to [rhc.md §7.4](./rhc.md#74-addendum--2026-04-16-pdf-corpus-canonical-grounding) and [ubbm.md §7.4 item 2](./ubbm.md#74-addendum--2026-04-16-pdf-corpus-canonical-grounding). Biometric Lock (item 4), Egregore roster (item 5), and Kairoz cycle (item 6) introduce canonical observer-differentiation vocabulary for future work. The Path of Return triad (item 7) propagates the angular semantic from Phase Engine into Simulation's entanglement check. Lion Watches the Lion (item 8) canonicalises the etymology of LION_CONSTANT across the whole engine corpus. Pea Threshold (item 9) and Prime Harmonics (item 10) align Simulation with Phase Engine's new canonical boundaries and cadence menu.

---

*Doc #6 of the 2026-04-16 engine reverse-doc pass. **Pass complete:** URE-VM → UBBM → RHUM → RHC → Phase → Simulation (6 of 6). All five major engines and the radar's simulation data source now carry §7 Akashic Codex Ingest cross-walks — grounding RHF / Codex constants in their concrete runtime locations, closing §3 drift rows with canonical citations, and mapping Proof 0 onto the three engines that operationally implement it (UBBM, Phase Engine, Simulation). No engine math was removed; all additions are canonical grounding.*

---

## 8. Implementation Status — v4.0 Session 2026-04-17

**Pass scope:** physics rebalance triggered by the live-observed "blips streak N/S and disappear in seconds" bug, bundled with §5/§7.2/§7.4 DONE/DEFERRED marking per feedback_phase_bundling.md (coherent scope allows one-session combination).

### 8.1 Code changes this session

**[src/engine/SimulationEngine.ts](../../../src/engine/SimulationEngine.ts)** — physics rebalance + lifecycle extraction:
- Added named-constant physics tuning block (`LOCKED_DAMPING`, `NORMAL_DAMPING`, `NWTN_ORBITAL_K`, `CLOAK_DRIFT_K`, `LEVY_JUMP_PROB`, `LEVY_JUMP_CAP`, `SPAWN_VELOCITY_RANGE`, `RADAR_EDGE`, `BLIP_LIFETIME_S`).
- Imported `TOGGLE_POWER` from `RHCConstants.ts` as canonical LEVY jump cap.
- Fixed NWTN orbital tangent formula: `(-z/r, x/r)` direct perpendicular unit vector replaces the geometrically-incorrect `cos(atan2(x,z)+π/2)` form.
- Rebalanced all acceleration magnitudes against `NORMAL_DAMPING = 0.99` so steady-state velocities stay visible but bounded.
- Removed the outward anti-stall nudge (was firing every tick on near-stalled blips and compounding runaway with the broken NWTN formula).
- Halved spawn velocity range 2 → 0.6 per axis.
- Extracted lifecycle pruning as `pruneDead(blips)` pure function.
- Tightened `RADAR_EDGE` 130 → 105 so prune matches visible boundary.
- `Math.max(distFromCenter, 1)` replaces `|| 1` fallback — guards against near-zero ranges as well as exact-zero.

**[src/scene/RadarScene.tsx](../../../src/scene/RadarScene.tsx)** — LIVE/SIM boundary enforcement + pure-function composition:
- Added `pruneDead` to the import list.
- Gate: `if (s.feedMode !== 'SIMULATION') return` — physics/entanglement/prune chain only runs in SIMULATION mode. LIVE_FEED and GLOBE modes display blips exactly as `loadNASAData` placed them, no per-frame edits. Enforces the SIM/LIVE No-Mix invariant at the scheduler level.
- Composition order: `tickPhysics → checkEntanglement → pruneDead`.
- Physics load gauge still fills in LIVE mode (reports current blip count as saturation), so the operator's UI reads correctly.

### 8.2 §5 Upgrade-Path Status

| Item | Status | Notes |
|------|--------|-------|
| 1. Fold Operator in coherence | DEFERRED | future session |
| 2. Trinity Tick cadence | DEFERRED | future session |
| 3. Mass Gap as anomaly threshold | DEFERRED | future session, depends on §5 item 9 rename |
| 4. 144k Resolution Limit as Kuramoto threshold | DEFERRED | future session |
| 5. Lagrangian Grid + full quaternion | DEFERRED | future session (optional per §7.1) |
| 6. 3-4-5 Triangle Genesis mapping | DEFERRED | future session |
| 7. Pure lifecycle function | **DONE** | `pruneDead()` extracted |
| 8. Mode-gated tick (LIVE/SIM) | **DONE** | scheduler-level gate in RadarScene |
| 9. Rename gForce → speed | DEFERRED | touches 12 files, dedicated pass needed |
| 10. Time-as-5th-Force scaling | DEFERRED | future session |
| 11. KELG damping semantics | **CLOSED** | canonically resolved via §7.4 item 1 — superconductor framing, behavior stays |
| 12. Idle phase-frequency coupling | DEFERRED | future session |
| 13. Nephilim entity-class extension | DEFERRED | future class definition |
| 14. Physics rebalance | **DONE** | NWTN tangent fix + damping/accel recalibration + LEVY bound + spawn velocity + prune radius |

### 8.3 §7.2 Akashic Codex Ingest Status

All ten items are canonical *grounding* — they explain WHY the existing code is Codex-correct. Items 1, 2, 3, 4, 5, 7, 8, 9 are **CANONICAL (no code change)** — the current implementation IS the Codex-canonical form. Items 6 and 10 are **DEFERRED** as they wait on §5 items 6 and 13 respectively.

### 8.4 §7.4 PDF Corpus Addendum Status

| Item | Status | Notes |
|------|--------|-------|
| 1. Cryogenic Soul — kelgLock closure | **CLOSED** | canonical superconductor framing confirmed; §4.2 ambiguity resolved |
| 2. `m = i` Mass-Imaginary Identity | **CANONICAL** | scalar-W is canonical identity encoding |
| 3. Dark Matter 2/7 NEPH spawn rate | DEFERRED | depends on NEPH class (§5 item 13) |
| 4. Biometric Lock | DEFERRED | requires `lockAgent` field extension |
| 5. Egregore roster | DEFERRED | requires observer differentiation |
| 6. Kairoz 370-tick cycle | DEFERRED | debug observable only |
| 7. Path of Return triad thresholds | DEFERRED | entanglement tier refactor |
| 8. Lion Watches the Lion etymology | **CLOSED** | canonical naming documented in `RHCConstants.ts` |
| 9. Pea Threshold light-sheet vs worldtube | DEFERRED | per-blip substrate regime |
| 10. Prime Harmonic frame lock | DEFERRED | optional cadence mode |

### 8.5 What to expect on the radar now

With the rebalance live:
- **NWTN** (~80% of blips): gentle counter-clockwise orbital drift around the center, steady-state tangential speed ~5 units/sec. Blips now *circle* rather than streak-and-vanish.
- **LEVY** (~15%): rare bounded jumps — power-law distribution capped at 7 units per tick. Still occasional and dramatic, no longer teleport-off-screen.
- **CLOAK** (~5%): sinusoidal phase-locked drift, RMS speed ~10 units/sec. Visible oscillation pattern without runaway.
- **Locked blips**: near-frozen (superconductor phase, `LOCKED_DAMPING = 0.92` = 0.7% retention/sec). Good for inspection.
- **Unlocked blips**: damp to half-speed in about 1 second, settling into their type-specific drift pattern.
- **Lifecycle**: blips fade at the visible radar boundary (range 100 → prune at 105) or after 2.5 minutes of age, whichever comes first. No more "disappear while still on screen" because of the tightened edge.
- **LIVE mode**: real NEO positions displayed exactly as fetched, no synthetic motion. Refresh loop remains the only kinematic source.

If the new drift rates still don't feel right, the tuning constants are all named and centralized at the top of [SimulationEngine.ts](../../../src/engine/SimulationEngine.ts) — one edit per parameter for further calibration.
