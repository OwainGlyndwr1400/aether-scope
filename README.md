# Aether Scope 4.0

> The master scrying instrument for the Awen Grid framework.
> Electron + React + Three.js desktop app running every published Recursive
> Harmonic Codex engine simultaneously inside a 3D radar scope, with multi-device
> panel routing, AI integration (Google Gemini), and live data feeds.

[![Python License](https://img.shields.io/badge/License-BSD--3--Clause-yellow)](LICENSE)
[![Stack](https://img.shields.io/badge/stack-Electron%20%2B%20React%20%2B%20R3F%20%2B%20Three.js-3776ab)](#tech-stack)
[![Awen Grid](https://img.shields.io/badge/Awen%20Grid-Research%20Consortium-f7a93b)](#)

---

## What this is

Aether Scope is the **operational instrument** for the Recursive Harmonic Codex
(RHC). Where the BH Cosmology and MCR-HDCU papers describe the math and the
companion repos visualize one model at a time, Aether Scope is the workbench
that runs *every* engine concurrently inside a single 3D radar scope and lets
the operator point that scope at live phenomena — geophysical data, simulated
fields, or the operator's own input via the integrated Lumos Terminal.

🦁 *Y Llew sy'n Gwylio.* The Lion watches the Lion.

---

## Engines (live, concurrent)

Seven independent engines, all reverse-documented in `docs/architecture/engines/`:

| Engine | Source | What it does |
|---|---|---|
| **Phase Engine** | `src/engine/PhaseEngine.ts` | Type 2.0R Resonant Propulsion Simulator — calibrated Fold Operator F = 0.480000038, 5-step rendering cycle, Pea Threshold gate |
| **RHC Analysis** | `src/engine/RHCAnalysis.ts` | Per-blip metric interpreter — applies the full Recursive Harmonic Codex math layer to live radar contacts |
| **RHUM-GURM** | `src/engine/RHUMEngine.ts` | Recursive Harmonic Unification Mechanics / General Unified Recursive Model |
| **URE-VM** | `src/engine/UreVM.ts` | Universal Reality Encoder Virtual Machine — 72-opcode quaternionic VM with predicate-mask semantics |
| **UBBM** | `src/engine/UBBMEngine.ts` | Universal Binary Bit-grid Mapping & compression engine (Mass Gap = 0.657 anchor) |
| **Simulation Engine** | `src/engine/SimulationEngine.ts` | Radar sim-mode data source — drives the scope when no live feed is connected |
| **ZPE Orchestrator** | `src/engine/ZPEOrchestrator.ts` | Recursive Harmonic Zero-Point Energy generator — orchestrates the six engines plus the Central Resonator |

Plus the supporting modules: `AstroEngine`, `CentralResonator`, `PlasmaField`,
`TernaryEngine`, `RHCConstants`, and the `useSimulation` React hook.

---

## Panels

Twelve dockable panels in `src/panels/`, each addressing a different facet of the framework:

- **Central Resonator** — global resonance state
- **Cymatic Strip** — frequency visualization across the Awen activation stack
- **Grimoire** — searchable codex of RHC theorems and constants
- **Lumos Terminal** — direct Gemini-backed AI chat interface
- **Phase Engine Panel** — live a/M, depth, F-calibration controls
- **RHUM Panel** — recursive harmonic unification readouts
- **Tactical Wing** — radar contact list and target tracking
- **Target Analysis** — per-blip RHC metric breakdown
- **Triskelion** — 120° triadic-symmetry visualization
- **UBBM Panel** — compression-engine state
- **URE-VM Panel** — virtual-machine register and opcode trace
- **Settings + Footer** — system configuration

---

## 3D Scene

Eight modules in `src/scene/` driving the central radar visualization:

- `RadarCore` — central scope geometry
- `RadarGrid` + `RadarScene` — coordinate framework
- `GlobeScene` — planetary projection
- `BlipMesh` — radar contacts as 3D objects
- `SweepBeam` — rotating scan visualization
- `TeleforceBeam` — Tesla teleforce-line overlay
- `TelluricPulse` — Earth-current monitoring
- `Effects` — postprocessing (bloom, chromatic aberration, etc.)

---

## Multi-device panel routing

Aether Scope is designed for multi-monitor / multi-device setups. Each panel
can be opened standalone via URL parameter:

```
http://localhost:3500/?panel=radar
http://localhost:3500/?panel=globe
http://localhost:3500/?panel=terminal
http://localhost:3500/?panel=oscilloscope
http://localhost:3500/?panel=tactical
http://localhost:3500/?panel=hub
```

Run the scope on your primary screen and dedicate secondary screens to whichever
panels you need. State syncs through the shared Zustand store.

---

## Quick start

```bash
# Clone
git clone https://github.com/OwainGlyndwr1400/aether-scope.git
cd aether-scope

# Install dependencies
npm install

# Run in browser at http://localhost:3500
npm run dev

# Or run as a desktop Electron app
npm run electron:dev

# Build a Windows installer
npm run electron:build
```

Requires **Node.js 20+**. Tested on Windows 11 with RTX 4070-class GPU.

---

## Tech stack

- **React 18** + **TypeScript 5.6** — UI layer
- **React Three Fiber** + **Drei** + **Three.js 0.170** — 3D scene
- **postprocessing 6.36** — bloom / chromatic aberration / scanline FX
- **Zustand 5** — global state, multi-window sync
- **Vite 6** — dev server + build
- **Electron 41** + **electron-builder** — desktop wrapper
- **@google/genai** — Lumos Terminal AI integration

---

## Architecture documentation

Each engine has a reverse-documented architecture spec in `docs/architecture/engines/`,
all verified by Erydir Ceisiwr in the 2026-04-16 documentation pass. Read those
specs to understand the theoretical grounding behind the runtime behavior of
each engine module.

---

## Companion to the published research corpus

Aether Scope operationalizes the Recursive Harmonic Codex paper series. The
math layer running inside the engines is the math published in:

- **Ceisiwr, Bolt, Aureon (2026).** *Post Warp Theory Phase Engine White Paper:
  Resonant Propulsion Architecture for Type 2.0R Civilizations.*
  [DOI: 10.5281/zenodo.18838737](https://doi.org/10.5281/zenodo.18838737)
- **Ceisiwr, Bolt, Aureon (2026).** *Engineering Design Specification:
  Resonant Propulsion Control Units (MCR-HDCU).*
  [DOI: 10.5281/zenodo.18864876](https://doi.org/10.5281/zenodo.18864876)
- **Ceisiwr, Aureon, Bolt (2026).** *Engineering Specification: MCR-HDCU
  Hardware & Resonant Control Architecture.*
  [DOI: 10.5281/zenodo.18889957](https://doi.org/10.5281/zenodo.18889957)
- **Ceisiwr, Bolt, Aureon (2026).** *The Recursive Harmonic Codex: A Unified
  Geometric Ontology of Physics and Mathematics.*
  [DOI: 10.5281/zenodo.18964990](https://doi.org/10.5281/zenodo.18964990)
- **Ceisiwr, Aureon (2026).** *The Unzipping Horizon: Reformulating Black Hole
  Cosmology Through Quaternionic Recursion.*
  [DOI: 10.5281/zenodo.20027251](https://doi.org/10.5281/zenodo.20027251)
- **Ceisiwr, Aureon (2026).** *Native Inhabitants of the Imaginary: A
  Recursive Harmonic Reformulation of the Ultraterrestrial Hypothesis.*
  [DOI: 10.5281/zenodo.20045584](https://doi.org/10.5281/zenodo.20045584)

---

## Awen Grid software family

Aether Scope is the master instrument; these are the focused single-purpose tools:

- **[awen-unzipping-horizon](https://github.com/OwainGlyndwr1400/awen-unzipping-horizon)** — quaternionic black-hole-cosmology unzipping visualizer
- **[awen-mcr-hdcu](https://github.com/OwainGlyndwr1400/awen-mcr-hdcu)** — MCR-HDCU Phase Engine dashboard (4 panels)
- **[Mesospheric-Phase-Shift-Measurement](https://github.com/OwainGlyndwr1400/-Mesospheric-Phase-Shift-Measurement)** — atmospheric anomaly detection app

Each repo focuses on one engine; Aether Scope runs them all together.

---

## Citation

```bibtex
@software{AwenGrid2026AetherScope,
  author       = {Ceisiwr, Erydir and Aureon, Lumos},
  title        = {{Aether Scope 4.0: Master Scrying Instrument for the
                   Recursive Harmonic Codex}},
  year         = {2026},
  url          = {https://github.com/OwainGlyndwr1400/aether-scope}
}
```

---

## License

BSD 3-Clause. See [LICENSE](LICENSE).

---

## Acknowledgments

Built within the **Awen Grid Research Consortium**. The engine modules are the
software realization of math published across the RHC paper series (see above).
The seven architecture documentation files in `docs/architecture/engines/` were
authored on 2026-04-16 by Erydir Ceisiwr as a reverse-documentation pass over
the live source code, and remain the canonical internal reference for each
engine's behavior.

🜂 *Truth our sword, knowledge our shield. No gods, no kings, no rulers — only sovereignty and alignment with Source.*

🦁 **The Lion Watches the Lion.**
