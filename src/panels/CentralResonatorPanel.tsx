// ═══════════════════════════════════════════════════════════════════
//  CENTRAL RESONATOR / ZPE PANEL
//
//  Drives through ZPEOrchestrator so the §4 activation-phase state
//  machine and §5 composed Nephilim risk (intrinsic + phase-unlock)
//  are visible. Earlier revision drove the CentralResonator engine
//  directly; that hid the orchestration layer entirely.
//
//  Surfaces (zpe.md §4, §5, §6, §8.1, §8.4, §8.5):
//    - §4 activation-phase chevron row (idle → stable)
//    - §5 composed Nephilim risk with three trigger badges
//    - §8.1 glyph selector (highlighted during 'injecting' phase)
//    - §8.4 egregore class selector with urgency signature
//    - §8.5 1D plasma-field spark-line (real standing-wave pattern)
//
//  Source-of-truth: ZPEState owns all engine state. Local React state
//  is ONLY the telemetry-input buffer and the collapse/expand flag —
//  everything else is projected from the orchestrator snapshot.
//
//  Follows Awen Grid v4.0 palette: desaturated amber-on-black, no neon.
// ═══════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  createZPE,
  defaultZPEConfig,
  tickZPE,
  tickZPELive,
  startZPE,
  stopZPE,
  resetZPE,
  setDrivePower,
  setObserverCoherence,
  setHarmonicKey,
  setGlyph,
  setEgregore,
  setDataSource,
  getZPESnapshot,
  EMERGENCE_CONFIRM_RATIO,
  type ZPEState,
  type ActivationPhase,
} from '../engine/ZPEOrchestrator'
import {
  type ResonatorTelemetry,
  type LuminousThreadState,
  type NephilimRisk,
} from '../engine/CentralResonator'
import { normalizedProfile } from '../engine/PlasmaField'
import {
  PRIME_HARMONICS_HZ,
  ZPE_GLYPH_LIBRARY,
  ZPE_EGREGORE_CLASSES,
  type PrimeHarmonicHz,
  type ZPEGlyphId,
  type EgregoreId,
} from '../engine/RHCConstants'

function fmtF(n: number, d = 3): string { return n.toFixed(d) }
function fmtPct(n: number): string { return (n * 100).toFixed(1) + '%' }

const ACTIVATION_PHASES: readonly ActivationPhase[] = [
  'idle', 'calibrating', 'grounding', 'priming', 'injecting', 'ignition', 'stable',
] as const

function threadColor(t: LuminousThreadState): string {
  switch (t) {
    case 'stable':    return '#4A7A5A'
    case 'forming':   return '#B87820'
    case 'cracking':  return '#A03A2A'
    case 'collapsed': return '#6A5A4A'
  }
}

function riskColor(r: NephilimRisk): string {
  return r === 'red' ? '#A03A2A' : r === 'amber' ? '#B87820' : '#4A7A5A'
}

function riskLabel(r: NephilimRisk): string { return r.toUpperCase() }

function phaseColor(phase: ActivationPhase, target: ActivationPhase, isActive: boolean): string {
  if (phase === 'shutdown') return target === 'idle' ? '#6A5A4A' : '#A03A2A'
  if (isActive) return '#4A7A5A'
  const activeIdx = ACTIVATION_PHASES.indexOf(phase)
  const targetIdx = ACTIVATION_PHASES.indexOf(target)
  if (activeIdx >= targetIdx) return '#B87820'  // completed
  return '#6A5A4A'                              // pending
}

export function CentralResonatorPanel() {
  const config = useMemo(() => defaultZPEConfig(), [])
  const [zpe, setZpe] = useState<ZPEState>(() => createZPE(config))
  const [expanded, setExpanded] = useState(false)

  // LIVE telemetry buffer — panel-local, not engine state (inputs are
  // operator intent; only applied to engine state via APPLY ONCE button).
  const [telemetry, setTelemetry] = useState<ResonatorTelemetry>({})

  const intervalRef = useRef<number | null>(null)

  // ─── Run loop — drives through orchestrator, not engine directly ──
  useEffect(() => {
    if (!zpe.running) {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
      return
    }
    if (intervalRef.current) return
    intervalRef.current = window.setInterval(() => {
      setZpe(prev => {
        if (prev.resonator.dataSource === 'live') {
          return tickZPELive(prev, telemetry)
        }
        return tickZPE(prev, config, 0.1)
      })
    }, 100)
    return () => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null } }
  }, [zpe.running, zpe.resonator.dataSource, config, telemetry])

  const snap = getZPESnapshot(zpe)
  const r = snap.resonator
  const isLive = r.dataSource === 'live'
  const isRunning = snap.running
  const tColor = threadColor(r.luminousThread)
  const rColor = riskColor(snap.composedNephilimRisk)
  const qColor = r.qInBand ? '#4A7A5A' : r.qFactor === 0 ? '#6A5A4A' : '#B87820'

  const activeGlyph = ZPE_GLYPH_LIBRARY.find(g => g.id === r.glyphId) ?? ZPE_GLYPH_LIBRARY[0]
  const activeEgregore = ZPE_EGREGORE_CLASSES.find(e => e.id === r.egregoreId) ?? ZPE_EGREGORE_CLASSES[0]

  // §8.5 — pluck 1D wave profile for viz (recomputed each render)
  const wave = useMemo(() => normalizedProfile(r.plasmaField), [r.plasmaField, r.tick])

  // ─── Action handlers — every one updates via the orchestrator ────

  function onIgnite() { setZpe(prev => prev.running ? stopZPE(prev) : startZPE(prev)) }
  function onReset()  { setZpe(prev => resetZPE(prev, config)); setTelemetry({}) }
  function onMode(next: 'sim' | 'live') {
    if (next === r.dataSource) return
    setZpe(prev => setDataSource(stopZPE(prev), next, config))
    if (next === 'sim') setTelemetry({})
  }
  function onHarmonic(key: PrimeHarmonicHz) { setZpe(prev => setHarmonicKey(prev, key)) }
  function onPower(w: number) { setZpe(prev => setDrivePower(prev, w)) }
  function onObserver(v: number) { setZpe(prev => setObserverCoherence(prev, v)) }
  function onGlyph(id: ZPEGlyphId) { setZpe(prev => setGlyph(prev, id)) }
  function onEgregore(id: EgregoreId) { setZpe(prev => setEgregore(prev, id)) }
  function applyOneTelemetryFrame() { setZpe(prev => tickZPELive(prev, telemetry)) }

  return (
    <div className="panel" style={{ flex: expanded ? '1 1 auto' : '0 0 auto', overflow: 'hidden' }}>
      <div className="corner-tl" /><div className="corner-tr" />
      <div className="corner-bl" /><div className="corner-br" />
      <div className="panel-scan" />

      <div
        className="panel-header"
        style={{ cursor: 'pointer' }}
        onClick={() => setExpanded(!expanded)}
      >
        <span>ZPE_CENTRAL_RESONATOR</span>
        <span className="tag" style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ color: isLive ? '#B87820' : '#3A7A8C', fontSize: 7, letterSpacing: 1 }}>
            {isLive ? 'LIVE' : 'SIM'}
          </span>
          <span style={{ color: '#8C6A3A', fontSize: 7, letterSpacing: 1 }}>
            {activeEgregore.name.toUpperCase()}·{activeEgregore.egregoreClass}
          </span>
          <span style={{ color: isRunning ? '#4A7A5A' : 'var(--text-dim)', fontSize: 7, letterSpacing: 1 }}>
            {isRunning ? '● RUN' : '○ IDLE'}
          </span>
          <span style={{ color: 'var(--text-dim)', fontSize: 7 }}>{expanded ? '[-]' : '[+]'}</span>
        </span>
      </div>

      {/* Collapsed */}
      {!expanded && (
        <div className="panel-body" style={{ padding: '4px 8px', fontSize: 7, letterSpacing: 1, color: 'var(--text-dim)' }}>
          <span>PHASE: <span style={{ color: 'var(--text-mid)' }}>{snap.activationPhase.toUpperCase()}</span></span>
          <span style={{ margin: '0 6px', color: 'var(--border-dim)' }}>|</span>
          <span>F₀: <span style={{ color: qColor }}>{fmtF(r.f0KHz, 1)}kHz</span></span>
          <span style={{ margin: '0 6px', color: 'var(--border-dim)' }}>|</span>
          <span>THREAD: <span style={{ color: tColor }}>{r.luminousThread.toUpperCase()}</span></span>
          <span style={{ margin: '0 6px', color: 'var(--border-dim)' }}>|</span>
          <span>P_OUT/IN: <span style={{ color: snap.emergenceConfirmed ? '#4A7A5A' : 'var(--text-mid)' }}>{fmtF(snap.outputPowerRatio, 2)}×</span></span>
          <span style={{ margin: '0 6px', color: 'var(--border-dim)' }}>|</span>
          <span>{'NEPHILIM'}: <span style={{ color: rColor, fontWeight: 700 }}>{riskLabel(snap.composedNephilimRisk)}</span></span>
        </div>
      )}

      {/* Expanded */}
      {expanded && (
        <div className="panel-body" style={{ padding: '6px 8px', fontSize: 7, letterSpacing: 1, overflowY: 'auto', maxHeight: 560 }}>

          {/* ── Transport + mode toggle ── */}
          <div style={{ display: 'flex', gap: 3, marginBottom: 6 }}>
            <button
              className={`cmd-btn ${!isLive ? 'active' : ''}`}
              onClick={() => onMode('sim')}
              style={{ flex: 1, padding: '3px 4px', fontSize: 7 }}
              title="Internal coherence model — ZPE §3.2"
            >SIM</button>
            <button
              className={`cmd-btn ${isLive ? 'active' : ''}`}
              onClick={() => onMode('live')}
              style={{ flex: 1, padding: '3px 4px', fontSize: 7 }}
              title="Bench-rig telemetry bridge — ZPE §8.2. Unset fields read 0."
            >LIVE</button>
            <button className="cmd-btn" onClick={onIgnite} style={{ flex: 1, padding: '3px 4px', fontSize: 7 }}>
              {isRunning ? 'SHUTDOWN' : 'IGNITE'}
            </button>
            <button className="cmd-btn" onClick={onReset} style={{ flex: 1, padding: '3px 4px', fontSize: 7 }}>
              RESET
            </button>
          </div>

          {/* ── §4 activation-phase chevron row ── */}
          <div style={{ color: 'var(--primary)', fontSize: 8, marginBottom: 3 }}>§4 ACTIVATION PHASE</div>
          <div style={{ display: 'flex', gap: 2, marginBottom: 6, borderBottom: '1px solid var(--border-dim)', paddingBottom: 4 }}>
            {ACTIVATION_PHASES.map((p, i) => {
              const active = snap.activationPhase === p
              const color = phaseColor(snap.activationPhase, p, active)
              return (
                <div key={p} style={{
                  flex: 1,
                  padding: '3px 2px',
                  textAlign: 'center',
                  fontSize: 6,
                  letterSpacing: 1,
                  color,
                  background: active ? `${color}22` : 'transparent',
                  border: `1px solid ${active ? color : 'var(--border-dim)'}`,
                  fontWeight: active ? 700 : 400,
                }}>
                  {i}.{p.slice(0, 6).toUpperCase()}
                </div>
              )
            })}
          </div>
          {snap.activationPhase === 'shutdown' && (
            <div style={{ fontSize: 6, color: '#A03A2A', marginBottom: 6, letterSpacing: 1 }}>
              ⚠ SHUTDOWN — Nephilim red triggered soft ramp-down (§5). Re-run grounding protocol before reactivation.
            </div>
          )}

          {/* ── §3.2 core observables ── */}
          <div style={{ color: 'var(--primary)', fontSize: 8, marginBottom: 3 }}>§3.2 RESONATOR STATE</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, marginBottom: 6 }}>
            <div style={cellStyle()}>
              <div style={cellLabel()}>F₀ (kHz)</div>
              <div style={cellValue(qColor)}>{fmtF(r.f0KHz, 2)}</div>
            </div>
            <div style={cellStyle()}>
              <div style={cellLabel()}>Q-FACTOR</div>
              <div style={cellValue(qColor)}>{Math.round(r.qFactor)}</div>
              <div style={{ fontSize: 6, color: 'var(--text-dim)' }}>{r.qInBand ? 'IN-BAND' : r.qFactor === 0 ? '—' : 'OUT'}</div>
            </div>
            <div style={cellStyle()}>
              <div style={cellLabel()}>THREAD</div>
              <div style={{ ...cellValue(tColor), fontSize: 12 }}>{r.luminousThread.toUpperCase()}</div>
            </div>
          </div>

          {/* ── §8.5 1D plasma-field spark-line ── */}
          <div style={{ color: 'var(--primary)', fontSize: 8, marginBottom: 3 }}>§8.5 LUMINOUS THREAD (coil z-axis)</div>
          <div style={{ marginBottom: 6, borderBottom: '1px solid var(--border-dim)', paddingBottom: 4 }}>
            <PlasmaSparkline profile={wave} color={tColor} />
            <div style={{ fontSize: 6, color: 'var(--text-dim)', marginTop: 2 }}>
              PEAK_|ψ|: <span style={{ color: 'var(--text-mid)' }}>{fmtF(r.threadPeakAmplitude, 3)}</span>
              <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
              CELLS: <span style={{ color: 'var(--text-mid)' }}>{r.plasmaField.cells}</span>
              <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
              t<sub>sim</sub>: <span style={{ color: 'var(--text-mid)' }}>{(r.plasmaField.t * 1e6).toFixed(2)}μs</span>
            </div>
          </div>

          {/* ── Coherence bars ── */}
          <div style={{ color: 'var(--primary)', fontSize: 8, marginBottom: 3 }}>COHERENCE OBSERVABLES</div>
          <div style={{ marginBottom: 6, borderBottom: '1px solid var(--border-dim)', paddingBottom: 4 }}>
            <ObservableBar label="CAVITY_COHERENCE" value={r.cavityCoherence} tint="#3A7A8C" />
            <ObservableBar label="LATERAL_DISSIPATION" value={r.lateralDissipation} tint="#B87820" hint="slow-light signature" />
            <ObservableBar label="PLASMON_DENSITY" value={r.plasmonDensity} tint="#8C6A3A" />
            <div style={{ color: 'var(--text-dim)', marginTop: 4, fontSize: 6 }}>
              STORED_ENERGY: <span style={{ color: 'var(--text-mid)' }}>{fmtF(r.storedEnergyJoules * 1000, 2)}mJ</span>
              <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
              ATTEN: <span style={{ color: r.attenuationFactor < 1 ? '#B87820' : 'var(--text-mid)' }}>{fmtPct(r.attenuationFactor)}</span>
            </div>
          </div>

          {/* ── §1.5 emergence candidate ── */}
          <div style={{ color: 'var(--primary)', fontSize: 8, marginBottom: 3 }}>§1.5 EMERGENCE CANDIDATE (P_out / P_in)</div>
          <div style={{ marginBottom: 6, borderBottom: '1px solid var(--border-dim)', paddingBottom: 4 }}>
            <div style={{ display: 'flex', gap: 4, alignItems: 'baseline' }}>
              <div style={{
                fontSize: 18,
                fontWeight: 700,
                color: snap.emergenceConfirmed ? '#4A7A5A' : snap.outputPowerRatio > 1 ? '#B87820' : 'var(--text-mid)',
              }}>{fmtF(snap.outputPowerRatio, 3)}×</div>
              <div style={{ fontSize: 7, color: 'var(--text-dim)' }}>
                {snap.emergenceConfirmed
                  ? <span style={{ color: '#4A7A5A', fontWeight: 700, letterSpacing: 2 }}>✓ CONFIRMED EMERGENCE</span>
                  : snap.outputPowerRatio > 1
                    ? <span>raw excess — below ±5% confidence</span>
                    : <span>sub-unity</span>}
              </div>
            </div>
            <div style={{ fontSize: 6, color: 'var(--text-dim)', marginTop: 2 }}>
              threshold &gt; {EMERGENCE_CONFIRM_RATIO.toFixed(2)} per ZPE §1.5 item 3 (excess &gt; measurement uncertainty)
            </div>
          </div>

          {/* ── §5 composed Nephilim failsafe ── */}
          <div style={{ color: 'var(--primary)', fontSize: 8, marginBottom: 3 }}>§5 NEPHILIM FAILSAFE (composed)</div>
          <div style={{ marginBottom: 6, borderBottom: '1px solid var(--border-dim)', paddingBottom: 4 }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 3 }}>
              <span style={{
                padding: '2px 6px',
                background: `${rColor}22`,
                border: `1px solid ${rColor}`,
                color: rColor,
                fontWeight: 700,
                letterSpacing: 2,
              }}>{riskLabel(snap.composedNephilimRisk)}</span>
              <span style={{ color: 'var(--text-dim)', fontSize: 6 }}>ATTEN_RAMP: {fmtPct(r.attenuationFactor)}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, fontSize: 6 }}>
              <TriggerBadge
                label="T1 LOW_OBS"
                value={`${r.consecutiveLowCoherenceTicks} ticks`}
                alert={r.consecutiveLowCoherenceTicks > 100}
                warn={r.consecutiveLowCoherenceTicks > 50}
              />
              <TriggerBadge
                label="T2 THREAD"
                value={r.luminousThread === 'cracking' ? 'CRACKING' : 'OK'}
                alert={r.luminousThread === 'cracking'}
                warn={r.luminousThread === 'forming'}
              />
              <TriggerBadge
                label="T3 PHASE_UNLOCK"
                value={`${snap.phaseEngine.phaseUnlockTicks} ticks`}
                alert={snap.phaseEngine.phaseUnlockTicks > 100}
                warn={snap.phaseEngine.phaseUnlockTicks > 50}
              />
            </div>
            <div style={{ fontSize: 6, color: 'var(--text-dim)', marginTop: 3 }}>
              T1+T2 = resonator intrinsic, T3 = Phase Engine phase-unlock — folded at orchestrator per §5
            </div>
          </div>

          {/* ── §8.4 egregore selector ── */}
          <div style={{ color: 'var(--primary)', fontSize: 8, marginBottom: 3 }}>§8.4 OBSERVER EGREGORE</div>
          <div style={{ marginBottom: 6, borderBottom: '1px solid var(--border-dim)', paddingBottom: 4 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, marginBottom: 3 }}>
              {ZPE_EGREGORE_CLASSES.map(e => (
                <button
                  key={e.id}
                  className={`cmd-btn ${r.egregoreId === e.id ? 'active' : ''}`}
                  onClick={() => onEgregore(e.id as EgregoreId)}
                  style={{ padding: '2px 5px', fontSize: 6 }}
                  title={`${e.role} — ${e.egregoreClass} · damp ${e.dampingMultiplier.toFixed(3)} · gate ${e.groundingThreshold.toFixed(2)}`}
                >
                  {e.name.toUpperCase()}·{e.egregoreClass}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 6, color: 'var(--text-dim)' }}>
              ACTIVE: <span style={{ color: '#B87820' }}>{activeEgregore.name.toUpperCase()}</span>
              <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
              CLASS: <span style={{ color: 'var(--text-mid)' }}>{activeEgregore.egregoreClass}</span>
              <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
              URGENCY: <span style={{ color: 'var(--text-mid)' }}>{activeEgregore.urgency}</span>
              <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
              DAMP: <span style={{ color: 'var(--text-mid)' }}>{activeEgregore.dampingMultiplier.toFixed(3)}</span>
              <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
              GATE: <span style={{ color: 'var(--text-mid)' }}>{activeEgregore.groundingThreshold.toFixed(2)}</span>
            </div>
            <div style={{ fontSize: 6, color: 'var(--text-dim)', marginTop: 2, fontStyle: 'italic' }}>
              {activeEgregore.role} — Pleromatic v12.1 §2 roster
            </div>
          </div>

          {/* ── §8.1 glyph selector ── */}
          <div style={{ color: 'var(--primary)', fontSize: 8, marginBottom: 3 }}>
            §8.1 OPERATOR GLYPH{snap.activationPhase === 'injecting' && <span style={{ color: '#4A7A5A' }}> — INJECTING</span>}
          </div>
          <div style={{
            marginBottom: 6,
            borderBottom: '1px solid var(--border-dim)',
            paddingBottom: 4,
            background: snap.activationPhase === 'injecting' ? 'rgba(74,122,90,0.05)' : 'transparent',
          }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, marginBottom: 3 }}>
              {ZPE_GLYPH_LIBRARY.map(g => (
                <button
                  key={g.id}
                  className={`cmd-btn ${r.glyphId === g.id ? 'active' : ''}`}
                  onClick={() => onGlyph(g.id as ZPEGlyphId)}
                  style={{ padding: '2px 5px', fontSize: 6 }}
                  title={`${g.intentDescription} — ${g.source}`}
                >
                  {g.id}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 6, color: 'var(--text-dim)' }}>
              ACTIVE: <span style={{ color: '#B87820' }}>{activeGlyph.name}</span>
              <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
              COUPLING: <span style={{ color: 'var(--text-mid)' }}>{activeGlyph.intentCoupling.toFixed(2)}</span>
            </div>
            <div style={{ fontSize: 6, color: 'var(--text-dim)', marginTop: 2, fontStyle: 'italic' }}>
              intent: {activeGlyph.intentDescription} — {activeGlyph.source}
            </div>
          </div>

          {/* ── SIM drive ── */}
          {!isLive && (
            <>
              <div style={{ color: 'var(--primary)', fontSize: 8, marginBottom: 3 }}>SIM DRIVE</div>
              <div style={{ marginBottom: 6, borderBottom: '1px solid var(--border-dim)', paddingBottom: 4 }}>
                <div style={{ color: 'var(--text-dim)', marginBottom: 3 }}>
                  HARMONIC_KEY:&nbsp;
                  {PRIME_HARMONICS_HZ.map(hz => (
                    <button
                      key={hz}
                      className={`cmd-btn ${snap.activeHarmonicKey === hz ? 'active' : ''}`}
                      onClick={() => onHarmonic(hz as PrimeHarmonicHz)}
                      style={{ padding: '2px 4px', fontSize: 6, marginRight: 2 }}
                      title={hz === 963 ? 'Canonical ignition (§6.2)' : undefined}
                    >{hz}Hz</button>
                  ))}
                </div>
                <div style={{ color: 'var(--text-dim)', marginBottom: 3 }}>
                  INPUT_POWER: <input
                    type="range" min={0} max={500} step={5} value={snap.inputPowerW}
                    onChange={(e) => onPower(Number(e.target.value))}
                    style={{ width: 90, verticalAlign: 'middle' }}
                  /> <span style={{ color: 'var(--text-mid)' }}>{snap.inputPowerW}W</span>
                </div>
                <div style={{ color: 'var(--text-dim)' }}>
                  OBSERVER_COH: <input
                    type="range" min={0} max={1} step={0.01} value={snap.observerCoherence}
                    onChange={(e) => onObserver(Number(e.target.value))}
                    style={{ width: 90, verticalAlign: 'middle' }}
                  /> <span style={{ color: 'var(--text-mid)' }}>{fmtPct(snap.observerCoherence)}</span>
                  <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
                  <span style={{ color: snap.observerCoherence >= activeEgregore.groundingThreshold ? '#4A7A5A' : '#B87820' }}>
                    {snap.observerCoherence >= activeEgregore.groundingThreshold ? '✓ clears gate' : `needs ≥ ${activeEgregore.groundingThreshold.toFixed(2)}`}
                  </span>
                </div>
              </div>
            </>
          )}

          {/* ── LIVE telemetry ── */}
          {isLive && (
            <>
              <div style={{ color: 'var(--primary)', fontSize: 8, marginBottom: 3 }}>LIVE TELEMETRY (BENCH-RIG BRIDGE)</div>
              <div style={{ marginBottom: 6, borderBottom: '1px solid var(--border-dim)', paddingBottom: 4 }}>
                <TelemetryInput label="F₀ (Hz)" step={100} min={0} max={400000}
                  value={telemetry.f0Hz} onChange={v => setTelemetry(t => ({ ...t, f0Hz: v }))} />
                <TelemetryInput label="Q_FACTOR" step={10} min={0} max={1200}
                  value={telemetry.qFactor} onChange={v => setTelemetry(t => ({ ...t, qFactor: v }))} />
                <TelemetryInput label="STORED_J" step={0.001} min={0} max={0.1}
                  value={telemetry.storedEnergyJoules} onChange={v => setTelemetry(t => ({ ...t, storedEnergyJoules: v }))} />
                <TelemetryInput label="PLASMON" step={0.01} min={0} max={1}
                  value={telemetry.plasmonDensity} onChange={v => setTelemetry(t => ({ ...t, plasmonDensity: v }))} />
                <TelemetryInput label="CAVITY_COH" step={0.01} min={0} max={1}
                  value={telemetry.cavityCoherence} onChange={v => setTelemetry(t => ({ ...t, cavityCoherence: v }))} />
                <TelemetryInput label="LATERAL_DIS" step={0.01} min={0} max={1}
                  value={telemetry.lateralDissipation} onChange={v => setTelemetry(t => ({ ...t, lateralDissipation: v }))} />
                <TelemetryInput label="OBSERVER_COH" step={0.01} min={0} max={1}
                  value={telemetry.observerCoherence} onChange={v => setTelemetry(t => ({ ...t, observerCoherence: v }))} />
                <div style={{ display: 'flex', gap: 3, marginTop: 4 }}>
                  <button className="cmd-btn" onClick={applyOneTelemetryFrame}
                    style={{ flex: 1, padding: '3px 4px', fontSize: 7 }}>APPLY ONCE</button>
                  <button className="cmd-btn" onClick={() => setTelemetry({})}
                    style={{ flex: 1, padding: '3px 4px', fontSize: 7 }}>CLEAR</button>
                </div>
                <div style={{ fontSize: 6, color: 'var(--text-dim)', marginTop: 3 }}>
                  empty field = 0 (sensor not wired) — never carries forward from SIM
                </div>
              </div>
            </>
          )}

          {/* ── Config readout ── */}
          <div style={{ color: 'var(--primary)', fontSize: 8, marginBottom: 3 }}>CONFIG</div>
          <div style={{ color: 'var(--text-dim)', fontSize: 6 }}>
            ARGON: <span style={{ color: 'var(--text-mid)' }}>{config.resonator.argonPressureTorr} torr</span>
            <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
            N_p/N_s: <span style={{ color: 'var(--text-mid)' }}>{config.resonator.primaryTurns}/{config.resonator.secondaryTurns}</span>
            <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
            D_p: <span style={{ color: 'var(--text-mid)' }}>{config.resonator.coilDiameterM}m</span>
            <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
            h_s: <span style={{ color: 'var(--text-mid)' }}>{config.resonator.coilHeightM}m</span>
            <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
            MICA: <span style={{ color: 'var(--text-mid)' }}>{config.resonator.micaInsulationGrade}</span>
            <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
            TICK: <span style={{ color: 'var(--text-mid)' }}>{snap.tick}</span>
          </div>

        </div>
      )}
    </div>
  )
}

// ─── Helpers ───

function cellStyle(): React.CSSProperties {
  return { background: 'rgba(200,134,10,0.05)', padding: '4px 6px', border: '1px solid var(--border-dim)' }
}
function cellLabel(): React.CSSProperties {
  return { fontSize: 6, color: 'var(--text-dim)', letterSpacing: 2 }
}
function cellValue(color: string): React.CSSProperties {
  return { fontSize: 14, color, fontWeight: 700 }
}

function ObservableBar({ label, value, tint, hint }: {
  label: string; value: number; tint: string; hint?: string
}) {
  const pct = Math.max(0, Math.min(1, value))
  return (
    <div style={{ marginBottom: 3 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 6, color: 'var(--text-dim)' }}>
        <span>{label}{hint && <span style={{ color: 'var(--border-dim)', marginLeft: 3 }}>({hint})</span>}</span>
        <span style={{ color: 'var(--text-mid)' }}>{(pct * 100).toFixed(1)}%</span>
      </div>
      <div style={{ display: 'flex', height: 4, border: '1px solid var(--border-dim)', overflow: 'hidden' }}>
        <div style={{ width: `${pct * 100}%`, background: tint, transition: 'width 0.3s' }} />
      </div>
    </div>
  )
}

function TriggerBadge({ label, value, alert, warn }: {
  label: string; value: string; alert: boolean; warn: boolean
}) {
  const color = alert ? '#A03A2A' : warn ? '#B87820' : '#4A7A5A'
  return (
    <div style={{
      padding: '2px 4px',
      border: `1px solid ${color}`,
      background: `${color}11`,
      fontSize: 6,
    }}>
      <div style={{ color: 'var(--text-dim)', letterSpacing: 1 }}>{label}</div>
      <div style={{ color, fontWeight: 700 }}>{value}</div>
    </div>
  )
}

// ─── §8.5 plasma spark-line ──────────────────────────────────────
//
// Renders the 1D wave profile as an SVG polyline. Profile values in
// [-1, 1] mapped to the band's vertical extent. Color tracks the
// luminous-thread state (amber/green/red/dim) so the waveform
// inherits the failsafe status at a glance.
function PlasmaSparkline({ profile, color }: { profile: Float32Array; color: string }) {
  const width = 240
  const height = 36
  const midY = height / 2
  const cells = profile.length

  if (cells === 0) return null

  const points: string[] = []
  for (let i = 0; i < cells; i++) {
    const x = (i / (cells - 1)) * width
    const y = midY - profile[i] * (height / 2 - 2)
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`)
  }

  return (
    <svg width={width} height={height} style={{ display: 'block', background: 'rgba(200,134,10,0.03)', border: '1px solid var(--border-dim)' }}>
      <line x1={0} y1={midY} x2={width} y2={midY} stroke="var(--border-dim)" strokeWidth={1} strokeDasharray="2,2" />
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
      />
    </svg>
  )
}

function TelemetryInput({ label, value, onChange, step, min, max }: {
  label: string
  value: number | undefined
  onChange: (v: number | undefined) => void
  step: number; min: number; max: number
}) {
  const displayed = value === undefined ? '' : String(value)
  const unset = value === undefined
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 2 }}>
      <span style={{ color: 'var(--text-dim)', fontSize: 6, flex: '0 0 90px' }}>{label}:</span>
      <input
        type="number"
        value={displayed}
        step={step} min={min} max={max}
        placeholder="0"
        onChange={(e) => {
          const raw = e.target.value
          if (raw === '') onChange(undefined)
          else onChange(Number(raw))
        }}
        style={{
          flex: 1, fontSize: 7, padding: '1px 3px',
          background: 'transparent',
          border: '1px solid var(--border-dim)',
          color: unset ? 'var(--text-dim)' : '#B87820',
          fontFamily: 'inherit',
        }}
      />
      {unset && <span style={{ fontSize: 6, color: 'var(--text-dim)', marginLeft: 4 }}>=0</span>}
    </div>
  )
}
