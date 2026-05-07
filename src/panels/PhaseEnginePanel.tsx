import { useState, useEffect, useRef } from 'react'
import {
  createEngine, engineTick, setFlightMode, setHarmonicKey, getSnapshot,
  FLIGHT_MODES, GEOMETRIC_LOCK, TA_DAH_LIMIT,
  SQRT_180_CLUTCH, OBSERVER_7_5D, EXTRA_TILT,
  HARMONIC_KEYS, HARMONIC_KEY_NAMES, HIGGS_SATURATION_THRESHOLD,
  PATH_ADAMAS_DEG, PATH_AEONIC_DEG, PATH_PLEROMATIC_DEG,
  type PhaseEngineState, type HarmonicKey,
} from '../engine/PhaseEngine'
import { LOST_2_BINDING, DARK_MATTER_FRACTION, PEA_THRESHOLD } from '../engine/RHCConstants'

function fmtF(n: number, d = 3): string { return n.toFixed(d) }
function fmtPct(n: number): string { return (n * 100).toFixed(1) + '%' }

function fmtAs(as: number): string {
  // Format attoseconds with scientific notation beyond 10,000 as.
  if (as < 1000) return `${as.toFixed(2)}as`
  if (as < 1e6) return `${(as / 1000).toFixed(2)}k·as`
  if (as < 1e9) return `${(as / 1e6).toFixed(2)}M·as`
  return as.toExponential(2) + 'as'
}

export function PhaseEnginePanel() {
  const [engine, setEngine] = useState<PhaseEngineState>(createEngine())
  const [expanded, setExpanded] = useState(false)
  const [running, setRunning] = useState(false)
  const [speed, setSpeed] = useState(10)
  const intervalRef = useRef<number | null>(null)

  // Run loop
  useEffect(() => {
    if (running && !intervalRef.current) {
      intervalRef.current = window.setInterval(() => {
        setEngine(prev => {
          let s = prev
          for (let i = 0; i < speed; i++) s = engineTick(s)
          return s
        })
      }, 100)
    }
    if (!running && intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running, speed])

  const snap = getSnapshot(engine)
  const currentMode = FLIGHT_MODES.find(m => m.id === snap.flightMode)

  // Colors
  const lockColor = snap.geometricLock ? '#4A7A5A' : snap.lockPrecision < 0.01 ? '#3A7A8C' : snap.lockPrecision < 0.05 ? '#B87820' : '#A03A2A'
  const inertiaColor = snap.inertiaFactor < 0.1 ? '#4A7A5A' : snap.inertiaFactor < 0.5 ? '#3A7A8C' : snap.inertiaFactor < 0.8 ? '#B87820' : '#A03A2A'
  const latticeColor = snap.latticePercent >= 1 ? '#4A7A5A' : snap.latticePercent >= 0.5 ? '#3A7A8C' : '#B87820'
  const riskColor = snap.nephilimRisk === 'red' ? '#A03A2A' : snap.nephilimRisk === 'amber' ? '#B87820' : '#4A7A5A'
  const substrateColor = snap.substrateState === 'worldtube' ? '#B87820' : '#3A7A8C'
  const higgsColor = snap.higgsSaturated ? '#A03A2A' : snap.higgsEventCount > 0 ? '#B87820' : 'var(--text-dim)'
  const pathColor = snap.pathOfReturnPhase === 'adamas' ? '#3A7A8C'
                  : snap.pathOfReturnPhase === 'aeonic' ? '#4A7A5A' : '#B87820'
  const lost2Pct = Math.max(0, Math.min(1, snap.lost2Extracted / LOST_2_BINDING))
  const higgsPct = Math.min(1, snap.higgsSaturation / HIGGS_SATURATION_THRESHOLD)

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
        <span>PHASE_ENGINE</span>
        <span className="tag" style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ color: running ? '#4A7A5A' : '#A03A2A', fontSize: 7, letterSpacing: 1 }}>
            {running ? (currentMode?.name || 'RUNNING') : 'OFFLINE'}
          </span>
          <span style={{ color: 'var(--text-dim)', fontSize: 7 }}>{expanded ? '[-]' : '[+]'}</span>
        </span>
      </div>

      {/* Collapsed */}
      {!expanded && (
        <div className="panel-body" style={{ padding: '4px 8px', fontSize: 7, letterSpacing: 1, color: 'var(--text-dim)' }}>
          <span>FOLD: <span style={{ color: lockColor }}>{fmtF(snap.foldOperator)}</span></span>
          <span style={{ margin: '0 6px', color: 'var(--border-dim)' }}>|</span>
          <span>LOCK: <span style={{ color: lockColor }}>{snap.geometricLock ? 'YES' : 'NO'}</span></span>
          <span style={{ margin: '0 6px', color: 'var(--border-dim)' }}>|</span>
          <span>{'Λ'}₂₄: <span style={{ color: latticeColor }}>{fmtPct(snap.latticePercent)}</span></span>
          <span style={{ margin: '0 6px', color: 'var(--border-dim)' }}>|</span>
          <span>i⁴: <span style={{ color: '#3A7A8C' }}>{snap.i4CyclesCompleted}</span></span>
          <span style={{ margin: '0 6px', color: 'var(--border-dim)' }}>|</span>
          <span>SUB: <span style={{ color: substrateColor }}>{snap.substrateState === 'worldtube' ? 'WT' : 'LS'}</span></span>
          <span style={{ margin: '0 6px', color: 'var(--border-dim)' }}>|</span>
          <span>NEPH: <span style={{ color: riskColor, fontWeight: 700 }}>{snap.nephilimRisk.toUpperCase()}</span></span>
        </div>
      )}

      {/* Expanded */}
      {expanded && (
        <div className="panel-body" style={{ padding: '6px 8px', fontSize: 7, letterSpacing: 1, overflowY: 'auto', maxHeight: 520 }}>

          {/* Controls */}
          <div style={{ display: 'flex', gap: 3, marginBottom: 6 }}>
            <button className="cmd-btn" onClick={() => setRunning(!running)} style={{ flex: 1, padding: '3px 4px', fontSize: 7 }}>
              {running ? 'SHUTDOWN' : 'IGNITE'}
            </button>
            <button className="cmd-btn" onClick={() => setEngine(createEngine())} style={{ flex: 1, padding: '3px 4px', fontSize: 7 }}>
              RESET
            </button>
          </div>

          {/* Speed + Universal Tick */}
          <div style={{ color: 'var(--text-dim)', marginBottom: 6 }}>
            TICK RATE: <input
              type="range" min={1} max={50} value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              style={{ width: 60, verticalAlign: 'middle' }}
            /> <span style={{ color: 'var(--text-mid)' }}>{speed}/100ms</span>
            <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
            TICK: <span style={{ color: 'var(--text-mid)' }}>{snap.tick}</span>
            <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
            AGE: <span style={{ color: '#B87820' }}>{fmtAs(snap.universalTickAge)}</span>
          </div>

          {/* ── Fold Operator ── */}
          <div style={{ color: 'var(--primary)', fontSize: 8, marginBottom: 3 }}>FOLD OPERATOR (F = i/2)</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, marginBottom: 6 }}>
            <div style={{ background: 'rgba(200,134,10,0.05)', padding: '4px 6px', border: '1px solid var(--border-dim)' }}>
              <div style={{ fontSize: 6, color: 'var(--text-dim)', letterSpacing: 2 }}>F_CURRENT</div>
              <div style={{ fontSize: 14, color: lockColor, fontWeight: 700 }}>{fmtF(snap.foldOperator, 6)}</div>
            </div>
            <div style={{ background: 'rgba(200,134,10,0.05)', padding: '4px 6px', border: '1px solid var(--border-dim)' }}>
              <div style={{ fontSize: 6, color: 'var(--text-dim)', letterSpacing: 2 }}>GEO_LOCK</div>
              <div style={{ fontSize: 14, color: lockColor, fontWeight: 700 }}>{snap.geometricLock ? 'LOCKED' : fmtF(snap.lockPrecision, 6)}</div>
            </div>
            <div style={{ background: 'rgba(200,134,10,0.05)', padding: '4px 6px', border: '1px solid var(--border-dim)' }}>
              <div style={{ fontSize: 6, color: 'var(--text-dim)', letterSpacing: 2 }}>INERTIA</div>
              <div style={{ fontSize: 14, color: inertiaColor, fontWeight: 700 }}>{fmtPct(snap.inertiaFactor)}</div>
            </div>
          </div>

          {/* Lock progress bar */}
          <div style={{ marginBottom: 6, borderBottom: '1px solid var(--border-dim)', paddingBottom: 4 }}>
            <div style={{ display: 'flex', height: 6, border: '1px solid var(--border-dim)', overflow: 'hidden', marginBottom: 3 }}>
              <div style={{
                width: `${Math.max(2, (1 - snap.lockPrecision / 0.02) * 100)}%`,
                background: snap.geometricLock ? '#4A7A5A' : 'linear-gradient(90deg, #B87820, #3A7A8C)',
                transition: 'width 0.3s',
              }} />
            </div>
            <div style={{ fontSize: 6, color: 'var(--text-dim)', display: 'flex', justifyContent: 'space-between' }}>
              <span>F=0.50 (IDEAL)</span>
              <span>F=0.48 (LOCK {'→'} {GEOMETRIC_LOCK})</span>
            </div>
          </div>

          {/* ── Proof-0 observables (phase-engine.md §7.2 item 1) ── */}
          <div style={{ color: 'var(--primary)', fontSize: 8, marginBottom: 3 }}>PROOF-0 COMPLIANCE</div>
          <div style={{ marginBottom: 6, borderBottom: '1px solid var(--border-dim)', paddingBottom: 4 }}>

            {/* Phase-lock compliance badge */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
              <span style={{
                padding: '2px 6px',
                background: snap.phaseLock ? 'rgba(74,122,90,0.13)' : 'rgba(184,120,32,0.13)',
                border: `1px solid ${snap.phaseLock ? '#4A7A5A' : '#B87820'}`,
                color: snap.phaseLock ? '#4A7A5A' : '#B87820',
                fontWeight: 700, letterSpacing: 2,
              }}>
                PHASE_LOCK: {snap.phaseLock ? 'LOCKED' : 'UNLOCKED'}
              </span>
              <span style={{ fontSize: 6, color: 'var(--text-dim)' }}>
                (alias geometricLock in-sync)
              </span>
            </div>

            {/* Modality-gap correction readout */}
            <div style={{ color: 'var(--text-dim)', marginBottom: 4 }}>
              MODALITY_GAP (√32 − 5):&nbsp;
              <span style={{ color: '#3A7A8C', fontWeight: 700 }}>{fmtF(snap.modalityGapCorrection, 6)}</span>
              <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
              <span style={{ fontSize: 6 }}>scales fold drift — Proof-0 pt 1(b)</span>
            </div>

            {/* Lost-2 extracted gauge 0 → 2 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 6, color: 'var(--text-dim)' }}>
              <span>LOST-2_EXTRACTED</span>
              <span style={{ color: '#B87820' }}>{fmtF(snap.lost2Extracted, 4)} / {LOST_2_BINDING.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', height: 4, marginTop: 2, border: '1px solid var(--border-dim)', overflow: 'hidden' }}>
              <div style={{
                width: `${lost2Pct * 100}%`,
                background: lost2Pct >= 0.95 ? '#4A7A5A' : 'linear-gradient(90deg, #8C6A3A, #B87820)',
                transition: 'width 0.4s',
              }} />
            </div>
            <div style={{ fontSize: 6, color: 'var(--text-dim)', marginTop: 2 }}>
              saturates at Ta-Dah × lockFactor × modalityGap
            </div>

            {/* Nephilim failsafe badge (§7.4 item 8) */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 5 }}>
              <span style={{
                padding: '2px 6px',
                background: `${riskColor}22`,
                border: `1px solid ${riskColor}`,
                color: riskColor,
                fontWeight: 700, letterSpacing: 2,
              }}>
                NEPHILIM: {snap.nephilimRisk.toUpperCase()}
              </span>
              <span style={{ fontSize: 6, color: 'var(--text-dim)' }}>
                UNLOCK_TICKS: <span style={{ color: 'var(--text-mid)' }}>{snap.phaseUnlockTicks}</span>
                <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
                amber &gt; 100, red &gt; 1000
              </span>
            </div>
          </div>

          {/* ── i⁴ Revolution + Path of Return (§7.2 item 6, §7.4 item 2) ── */}
          <div style={{ color: 'var(--primary)', fontSize: 8, marginBottom: 3 }}>i⁴ REVOLUTION + PATH OF RETURN</div>
          <div style={{ marginBottom: 6, borderBottom: '1px solid var(--border-dim)', paddingBottom: 4 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 3, marginBottom: 4 }}>
              {[0, 1, 2, 3].map(q => (
                <div key={q} style={{
                  padding: '3px 4px', textAlign: 'center',
                  background: snap.iQuarter === q ? 'rgba(58,122,140,0.18)' : 'rgba(0,0,0,0.2)',
                  border: `1px solid ${snap.iQuarter === q ? '#3A7A8C' : 'var(--border-dim)'}`,
                }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: snap.iQuarter === q ? '#3A7A8C' : 'var(--text-dim)' }}>
                    i{['⁰','¹','²','³'][q]}
                  </div>
                  <div style={{ fontSize: 5, color: 'var(--text-dim)' }}>
                    {q === 0 ? '0°' : q === 1 ? '90°' : q === 2 ? '180°' : '270°'}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ color: 'var(--text-dim)', marginBottom: 3 }}>
              CYCLES: <span style={{ color: '#4A7A5A', fontWeight: 700 }}>{snap.i4CyclesCompleted}</span>
              <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
              BITS_DEPOSITED: <span style={{ color: '#B87820' }}>{snap.i4CyclesCompleted * 24}</span>
              <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
              QUARTER_DEG: <span style={{ color: 'var(--text-mid)' }}>{fmtF(snap.iQuarterDeg, 1)}°</span>
            </div>
            <div style={{ color: 'var(--text-dim)' }}>
              PATH: <span style={{ color: pathColor, fontWeight: 700 }}>{snap.pathOfReturnPhase.toUpperCase()}</span>
              <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
              ANGLE: <span style={{ color: pathColor }}>{fmtF(snap.pathAngle, 1)}°</span>
              <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
              <span style={{ fontSize: 6 }}>
                {PATH_ADAMAS_DEG}°·ADAMAS / {PATH_AEONIC_DEG}°·AEONIC / {PATH_PLEROMATIC_DEG}°·PLEROMATIC
              </span>
            </div>
          </div>

          {/* ── Substrate + Spin (§7.4 item 4, 6) ── */}
          <div style={{ color: 'var(--primary)', fontSize: 8, marginBottom: 3 }}>SUBSTRATE · SPIN · TILT</div>
          <div style={{ marginBottom: 6, borderBottom: '1px solid var(--border-dim)', paddingBottom: 4 }}>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 3 }}>
              <span style={{
                padding: '2px 6px',
                background: `${substrateColor}22`,
                border: `1px solid ${substrateColor}`,
                color: substrateColor, fontWeight: 700, letterSpacing: 2,
              }}>
                SUBSTRATE: {snap.substrateState === 'worldtube' ? 'WORLDTUBE (MASS)' : 'LIGHT-SHEET (MASSLESS)'}
              </span>
            </div>
            <div style={{ color: 'var(--text-dim)', marginBottom: 3 }}>
              v_g: <span style={{ color: substrateColor }}>{fmtF(snap.peaVelocity, 4)}c</span>
              <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
              PEA_THRESH: <span style={{ color: 'var(--text-mid)' }}>{fmtF(PEA_THRESHOLD, 4)}c</span>
              <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
              <span style={{ fontSize: 6 }}>sin(π/8)</span>
            </div>
            <div style={{ color: 'var(--text-dim)' }}>
              SPIN_PHASE: <span style={{ color: '#3A7A8C' }}>{fmtF(snap.spinPhase, 1)}°</span>
              <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
              720°_CLOSURE: <span style={{ color: '#3A7A8C' }}>{fmtPct(snap.spinPhase / 720)}</span>
              <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
              TILT_ENG: <span style={{ color: '#B87820' }}>{snap.extraTiltEngagements}</span>
            </div>
            <div style={{ fontSize: 6, color: 'var(--text-dim)', marginTop: 2 }}>
              spinPhase = velocityPhase/2 (spin-1/2) • tilt routes +{EXTRA_TILT - 360}° via imag on rollover
            </div>
          </div>

          {/* ── Triple Normalization residues (§7.2 item 5) ── */}
          <div style={{ color: 'var(--primary)', fontSize: 8, marginBottom: 3 }}>TRIPLE NORMALIZATION</div>
          <div style={{ marginBottom: 6, borderBottom: '1px solid var(--border-dim)', paddingBottom: 4 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
              <div style={{ background: 'rgba(58,122,140,0.06)', padding: '3px 5px', border: '1px solid var(--border-dim)' }}>
                <div style={{ fontSize: 6, color: 'var(--text-dim)', letterSpacing: 1 }}>HARMONIC</div>
                <div style={{ fontSize: 10, color: '#3A7A8C', fontWeight: 700 }}>{fmtPct(snap.harmonicResidue)}</div>
                <div style={{ fontSize: 5, color: 'var(--text-dim)' }}>GCD-3 · fold</div>
              </div>
              <div style={{ background: 'rgba(74,122,90,0.06)', padding: '3px 5px', border: '1px solid var(--border-dim)' }}>
                <div style={{ fontSize: 6, color: 'var(--text-dim)', letterSpacing: 1 }}>GEOMETRIC</div>
                <div style={{ fontSize: 10, color: '#4A7A5A', fontWeight: 700 }}>{fmtPct(snap.geometricResidue)}</div>
                <div style={{ fontSize: 5, color: 'var(--text-dim)' }}>GCD-120 · phase</div>
              </div>
              <div style={{ background: 'rgba(184,120,32,0.06)', padding: '3px 5px', border: '1px solid var(--border-dim)' }}>
                <div style={{ fontSize: 6, color: 'var(--text-dim)', letterSpacing: 1 }}>BINARY</div>
                <div style={{ fontSize: 10, color: '#B87820', fontWeight: 700 }}>{fmtPct(snap.binaryResidue)}</div>
                <div style={{ fontSize: 5, color: 'var(--text-dim)' }}>1001 · OffBit</div>
              </div>
            </div>
          </div>

          {/* ── Six Harmonic Keys (§7.4 item 1) ── */}
          <div style={{ color: 'var(--primary)', fontSize: 8, marginBottom: 3 }}>SIX HARMONIC KEYS</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 2, marginBottom: 6 }}>
            {HARMONIC_KEYS.map(key => (
              <button
                key={key}
                className={`cmd-btn ${snap.harmonicKey === key ? 'active' : ''}`}
                style={{ padding: '3px 1px', fontSize: 5, textAlign: 'center' }}
                onClick={() => setEngine(setHarmonicKey(engine, key as HarmonicKey))}
                title={`${key} Hz — ${HARMONIC_KEY_NAMES[key as HarmonicKey]}`}
              >
                <div style={{ fontSize: 7, fontWeight: 700 }}>{key}</div>
                <div style={{ fontSize: 4, color: 'var(--text-dim)', marginTop: 1 }}>
                  {HARMONIC_KEY_NAMES[key as HarmonicKey]}
                </div>
              </button>
            ))}
          </div>

          {/* ── Flight Modes ── */}
          <div style={{ color: 'var(--primary)', fontSize: 8, marginBottom: 3 }}>FLIGHT MODE</div>
          <div style={{ display: 'flex', gap: 3, marginBottom: 6 }}>
            {FLIGHT_MODES.map(mode => (
              <button
                key={mode.id}
                className={`cmd-btn ${snap.flightMode === mode.id ? 'active' : ''}`}
                style={{ flex: 1, padding: '4px 2px', fontSize: 6, textAlign: 'center' }}
                onClick={() => setEngine(setFlightMode(engine, mode.id))}
                title={mode.description}
              >
                <div style={{ fontSize: 8, fontWeight: 700, color: mode.color }}>{mode.frequency}Hz</div>
                <div style={{ fontSize: 5, marginTop: 1 }}>{mode.name}</div>
              </button>
            ))}
          </div>

          {/* ── 31/24 Anomaly ── */}
          <div style={{ color: 'var(--primary)', fontSize: 8, marginBottom: 3 }}>31/24 ANOMALY (DIFFERENCE 7)</div>
          <div style={{ marginBottom: 6, borderBottom: '1px solid var(--border-dim)', paddingBottom: 4 }}>
            <div style={{ color: 'var(--text-dim)' }}>
              VOLTAGE: <span style={{ color: '#B87820', fontWeight: 700 }}>{fmtF(snap.anomalyVoltage, 2)}</span>
              <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
              TOGGLE: <span style={{ color: '#3A7A8C' }}>{fmtF(snap.toggleFrequency)}Hz</span>
              <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
              PHASE: <span style={{ color: 'var(--text-mid)' }}>{fmtF(snap.togglePhase, 1)}°</span>
            </div>
            <div style={{ color: 'var(--text-dim)', marginTop: 2 }}>
              VELOCITY_PHASE: <span style={{ color: '#3A7A8C' }}>{fmtF(snap.velocityPhase, 1)}°</span>
              <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
              IMG_MASS: <span style={{ color: snap.imaginaryMass > 0.2 ? '#4A7A5A' : '#B87820' }}>{fmtF(snap.imaginaryMass, 4)}</span>
            </div>
          </div>

          {/* ── Higgs Saturation (§7.2 item 3, §5 item 5) ── */}
          <div style={{ color: 'var(--primary)', fontSize: 8, marginBottom: 3 }}>E7 HIGGS SATURATION (126-ROOT)</div>
          <div style={{ marginBottom: 6, borderBottom: '1px solid var(--border-dim)', paddingBottom: 4 }}>
            <div style={{ color: 'var(--text-dim)', marginBottom: 3 }}>
              SAT_PRODUCT: <span style={{ color: higgsColor, fontWeight: 700 }}>{snap.higgsSaturation.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
              THRESH: <span style={{ color: 'var(--text-mid)' }}>{HIGGS_SATURATION_THRESHOLD.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', height: 4, border: '1px solid var(--border-dim)', overflow: 'hidden', marginBottom: 3 }}>
              <div style={{
                width: `${higgsPct * 100}%`,
                background: snap.higgsSaturated ? '#A03A2A' : 'linear-gradient(90deg, #8C6A3A, #B87820)',
                transition: 'width 0.2s',
              }} />
            </div>
            <div style={{ color: 'var(--text-dim)' }}>
              EVENTS: <span style={{ color: '#B87820', fontWeight: 700 }}>{snap.higgsEventCount}</span>
              <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
              <span style={{ fontSize: 6 }}>5³ + 1 = 126 • Higgs manifestation boundary</span>
            </div>
          </div>

          {/* ── Leech Lattice ── */}
          <div style={{ color: 'var(--primary)', fontSize: 8, marginBottom: 3 }}>{'Λ'}₂₄ LEECH LATTICE</div>
          <div style={{ marginBottom: 6, borderBottom: '1px solid var(--border-dim)', paddingBottom: 4 }}>
            <div style={{ color: 'var(--text-dim)' }}>
              NODES: <span style={{ color: latticeColor, fontWeight: 700 }}>{snap.latticeNodes.toLocaleString()}</span>
              <span style={{ fontSize: 6, color: 'var(--text-dim)' }}> / {TA_DAH_LIMIT.toLocaleString()}</span>
              <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
              <span style={{ color: latticeColor }}>{fmtPct(snap.latticePercent)}</span>
            </div>
            {/* Lattice progress bar */}
            <div style={{ display: 'flex', height: 4, marginTop: 3, border: '1px solid var(--border-dim)', overflow: 'hidden' }}>
              <div style={{
                width: `${snap.latticePercent * 100}%`,
                background: snap.latticePercent >= 1 ? '#4A7A5A' : 'linear-gradient(90deg, #B87820, #3A7A8C)',
                transition: 'width 0.5s',
              }} />
            </div>
            <div style={{ color: 'var(--text-dim)', marginTop: 2, fontSize: 6 }}>
              REGIME: <span style={{ color: '#B87820' }}>{fmtF(snap.regimeMismatch, 2)}</span>
              <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
              CLUTCH: <span style={{ color: '#3A7A8C' }}>{'√'}180={fmtF(SQRT_180_CLUTCH, 3)} · coupling={fmtF(snap.clutchCoupling, 3)}</span>
            </div>
            <div style={{ color: 'var(--text-dim)', marginTop: 2, fontSize: 6 }}>
              OBSERVER: <span style={{ color: '#3A7A8C' }}>{OBSERVER_7_5D}D @ {fmtF(snap.observerFrameAngle, 2)}°</span>
              <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
              TILT: <span style={{ color: '#B87820' }}>{EXTRA_TILT}°</span>
              <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
              T·CRYSTAL: <span style={{ color: '#4A7A5A' }}>{fmtF(snap.timeCrystalPhase, 1)}°</span>
            </div>
          </div>

          {/* ── 3-4-5 Axis Weights (§7.4 item 10) ── */}
          <div style={{ color: 'var(--primary)', fontSize: 8, marginBottom: 3 }}>3-4-5 TRIANGLE GENESIS</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, marginBottom: 6, borderBottom: '1px solid var(--border-dim)', paddingBottom: 4 }}>
            <div style={{ background: 'rgba(184,120,32,0.06)', padding: '3px 5px', border: '1px solid var(--border-dim)' }}>
              <div style={{ fontSize: 6, color: 'var(--text-dim)', letterSpacing: 1 }}>3 · STRUCTURE</div>
              <div style={{ fontSize: 10, color: '#B87820', fontWeight: 700 }}>{fmtPct(snap.structureAxis)}</div>
              <div style={{ fontSize: 5, color: 'var(--text-dim)' }}>material scaffold</div>
            </div>
            <div style={{ background: 'rgba(74,122,90,0.06)', padding: '3px 5px', border: '1px solid var(--border-dim)' }}>
              <div style={{ fontSize: 6, color: 'var(--text-dim)', letterSpacing: 1 }}>4 · TIME</div>
              <div style={{ fontSize: 10, color: '#4A7A5A', fontWeight: 700 }}>{fmtPct(snap.timeAxis)}</div>
              <div style={{ fontSize: 5, color: 'var(--text-dim)' }}>temporal axis</div>
            </div>
            <div style={{ background: 'rgba(58,122,140,0.06)', padding: '3px 5px', border: '1px solid var(--border-dim)' }}>
              <div style={{ fontSize: 6, color: 'var(--text-dim)', letterSpacing: 1 }}>5 · OBSERVER</div>
              <div style={{ fontSize: 10, color: '#3A7A8C', fontWeight: 700 }}>{fmtPct(snap.observerAxis)}</div>
              <div style={{ fontSize: 5, color: 'var(--text-dim)' }}>conscious closure</div>
            </div>
          </div>

          {/* ── Null Ledger + Dark Matter (§5 item 6) ── */}
          <div style={{ color: 'var(--primary)', fontSize: 8, marginBottom: 3 }}>NULL LEDGER (4-AXIS)</div>
          <div style={{ color: 'var(--text-dim)' }}>
            REAL: <span style={{ color: '#3A7A8C' }}>{fmtF(snap.realLedger, 4)}</span>
            <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
            IMAG: <span style={{ color: '#B87820' }}>{fmtF(snap.imaginaryLedger, 4)}</span>
            <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
            OBS: <span style={{ color: Math.abs(snap.observerBalance) < 0.01 ? '#4A7A5A' : '#B87820' }}>
              {fmtF(snap.observerBalance, 6)}
            </span>
          </div>
          <div style={{ color: 'var(--text-dim)', marginTop: 2 }}>
            DM (2/7): <span style={{ color: '#8C6A3A', fontWeight: 700 }}>{fmtF(snap.darkMatterLedger, 4)}</span>
            <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
            <span style={{ fontSize: 6 }}>Ω_DM = {fmtF(DARK_MATTER_FRACTION, 4)} · Lost-2 topological debt</span>
          </div>
        </div>
      )}
    </div>
  )
}
