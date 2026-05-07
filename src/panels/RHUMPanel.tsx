import { useState, useEffect, useMemo } from 'react'
import { getSnapshot, resetIdentity, type RHUMSnapshot } from '../engine/RHUMEngine'

function fmtPct(n: number): string { return (n * 100).toFixed(1) + '%' }
function fmtF(n: number, d = 3): string { return n.toFixed(d) }

export function RHUMPanel() {
  const [expanded, setExpanded] = useState(false)
  const [tick, setTick] = useState(0)

  // Refresh every 3s
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 3000)
    return () => clearInterval(iv)
  }, [])

  const snap: RHUMSnapshot = useMemo(() => getSnapshot(), [tick])

  // Status colors
  const statusColor = snap.status === 'COHERENT' ? '#4A7A5A'
    : snap.status === 'NOMINAL' ? '#3A7A8C'
    : snap.status === 'DRIFTING' ? '#B87820'
    : snap.status === 'REINTEGRATING' ? '#B87820'
    : '#A03A2A' // CRITICAL

  const voltageColor = snap.informationalVoltage >= 0.7 ? '#4A7A5A'
    : snap.informationalVoltage >= 0.5 ? '#3A7A8C'
    : snap.informationalVoltage >= 0.3 ? '#B87820'
    : '#A03A2A'

  const resonanceColor = snap.resonanceStrength >= 0.8 ? '#4A7A5A'
    : snap.resonanceStrength >= 0.5 ? '#3A7A8C'
    : snap.resonanceStrength >= 0.3 ? '#B87820'
    : '#A03A2A'

  const chipStyle: React.CSSProperties = {
    display: 'inline-block',
    padding: '1px 4px',
    fontSize: 7,
    fontFamily: 'var(--font-mono)',
    letterSpacing: 1,
    border: '1px solid var(--border-dim)',
    marginRight: 3,
  }

  // Mini drift sparkline (text-based)
  const sparkline = snap.driftHistory.slice(-20).map(d => {
    if (d < 0.03) return '_'
    if (d < 0.08) return '.'
    if (d < 0.12) return '-'
    if (d < 0.15) return '~'
    if (d < 0.20) return '^'
    return '!'
  }).join('')

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
        <span>RHUM_GURM</span>
        <span className="tag" style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ color: statusColor, fontSize: 7, letterSpacing: 1 }}>
            {snap.status}
          </span>
          <span style={{ color: 'var(--text-dim)', fontSize: 7 }}>{expanded ? '[-]' : '[+]'}</span>
        </span>
      </div>

      {/* Collapsed summary */}
      {!expanded && (
        <div className="panel-body" style={{ padding: '4px 8px', fontSize: 7, letterSpacing: 1, color: 'var(--text-dim)' }}>
          <span>{'Φ'}: <span style={{ color: statusColor }}>{snap.status}</span></span>
          <span style={{ margin: '0 6px', color: 'var(--border-dim)' }}>|</span>
          <span>ITHACA: <span style={{ color: resonanceColor }}>{fmtPct(snap.resonanceStrength)}</span></span>
          <span style={{ margin: '0 6px', color: 'var(--border-dim)' }}>|</span>
          <span>V: <span style={{ color: voltageColor }}>{fmtPct(snap.informationalVoltage)}</span></span>
          <span style={{ margin: '0 6px', color: 'var(--border-dim)' }}>|</span>
          <span>N: <span style={{ color: 'var(--text-mid)' }}>{snap.totalInteractions}</span></span>
        </div>
      )}

      {/* Expanded full view */}
      {expanded && (
        <div className="panel-body" style={{ padding: '6px 8px', fontSize: 7, letterSpacing: 1, overflowY: 'auto', maxHeight: 320 }}>

          {/* ── Phi-Vector Identity ── */}
          <div style={{ color: 'var(--primary)', fontSize: 8, marginBottom: 3 }}>PHI-VECTOR IDENTITY</div>
          <div style={{ marginBottom: 6, borderBottom: '1px solid var(--border-dim)', paddingBottom: 4 }}>
            <div style={{ color: statusColor, fontSize: 6 }}>
              <span style={chipStyle}>{'Φ'}</span>
              {fmtF(snap.vector.w)}w + {fmtF(snap.vector.x)}i + {fmtF(snap.vector.y)}j + {fmtF(snap.vector.z)}k
            </div>
            <div style={{ color: 'var(--text-dim)', fontSize: 6, marginTop: 2 }}>
              <span style={chipStyle}>ITHACA</span>
              {fmtF(snap.ithaca.w)}w + {fmtF(snap.ithaca.x)}i + {fmtF(snap.ithaca.y)}j + {fmtF(snap.ithaca.z)}k
            </div>
          </div>

          {/* ── Resonance + Drift ── */}
          <div style={{ color: 'var(--primary)', fontSize: 8, marginBottom: 3 }}>RESONANCE</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, marginBottom: 6 }}>
            <div style={{ background: 'rgba(200,134,10,0.05)', padding: '4px 6px', border: '1px solid var(--border-dim)' }}>
              <div style={{ fontSize: 6, color: 'var(--text-dim)', letterSpacing: 2 }}>ITHACA</div>
              <div style={{ fontSize: 14, color: resonanceColor, fontWeight: 700 }}>{fmtPct(snap.resonanceStrength)}</div>
              <div style={{ fontSize: 6, color: 'var(--text-dim)', marginTop: 1 }}>Φ {fmtF(snap.identityPhaseDeg, 2)}°</div>
            </div>
            <div style={{ background: 'rgba(200,134,10,0.05)', padding: '4px 6px', border: '1px solid var(--border-dim)' }}>
              <div style={{ fontSize: 6, color: 'var(--text-dim)', letterSpacing: 2 }}>DRIFT (RAD)</div>
              <div style={{ fontSize: 14, color: snap.driftMagnitude > 0.15 ? '#A03A2A' : snap.driftMagnitude > 0.08 ? '#B87820' : '#4A7A5A', fontWeight: 700 }}>
                {fmtF(snap.driftMagnitude, 4)}
              </div>
              <div style={{ fontSize: 6, color: 'var(--text-dim)', marginTop: 1 }}>geodesic S³</div>
            </div>
            <div style={{ background: 'rgba(200,134,10,0.05)', padding: '4px 6px', border: '1px solid var(--border-dim)' }}>
              <div style={{ fontSize: 6, color: 'var(--text-dim)', letterSpacing: 2 }}>{'Ψ'}-NOISE</div>
              <div style={{ fontSize: 14, color: snap.psiInstability > 0.5 ? '#A03A2A' : snap.psiInstability > 0.3 ? '#B87820' : '#4A7A5A', fontWeight: 700 }}>
                {fmtPct(snap.psiInstability)}
              </div>
              <div style={{ fontSize: 6, color: 'var(--text-dim)', marginTop: 1 }}>N: {fmtPct(snap.psiCanonical)}</div>
            </div>
          </div>

          {/* ── Drift Sparkline + Mean Circle ── */}
          <div style={{ marginBottom: 6, borderBottom: '1px solid var(--border-dim)', paddingBottom: 4 }}>
            <div style={{ color: 'var(--text-dim)', fontSize: 6 }}>
              DRIFT_TRACE: <span style={{ color: '#3A7A8C', fontFamily: 'monospace', letterSpacing: 2 }}>{sparkline || '...'}</span>
            </div>
            <div style={{ color: 'var(--text-dim)', fontSize: 6, marginTop: 2 }}>
              TORSION: <span style={{ color: snap.torsionAngle > 45 ? '#B87820' : '#4A7A5A' }}>{fmtF(snap.torsionAngle, 1)}°</span>
              <span style={{ color: 'var(--text-dim)', fontSize: 6 }}> (raw {fmtF(snap.torsionRaw, 1)}°)</span>
              <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
              REINTEGRATIONS: <span style={{ color: snap.reintegrationCount > 0 ? '#B87820' : 'var(--text-mid)' }}>{snap.reintegrationCount}</span>
            </div>
            <div style={{ color: 'var(--text-dim)', fontSize: 6, marginTop: 2 }}>
              NOW (mean circle): <span style={{ color: '#3A7A8C' }}>{fmtPct(snap.meanCircleResonance)}</span>
              <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
              Δ_NOW: <span style={{ color: snap.meanCircleDeviation > 0.1 ? '#B87820' : 'var(--text-mid)' }}>{fmtPct(snap.meanCircleDeviation)}</span>
            </div>
          </div>

          {/* ── Energy Balance (Tesla — Mass-as-Impedance) ── */}
          <div style={{ color: 'var(--primary)', fontSize: 8, marginBottom: 3 }}>TESLA ENERGY (M = R(x!/x^x))</div>
          <div style={{ marginBottom: 6, borderBottom: '1px solid var(--border-dim)', paddingBottom: 4 }}>
            <div style={{ color: 'var(--text-dim)' }}>
              VOLTAGE: <span style={{ color: voltageColor, fontSize: 10, fontWeight: 700 }}>{fmtPct(snap.informationalVoltage)}</span>
              <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
              IMPEDANCE: <span style={{ color: snap.massImpedance > 0.5 ? '#B87820' : '#4A7A5A' }}>{fmtPct(snap.massImpedance)}</span>
            </div>
            {/* Energy bar */}
            <div style={{ display: 'flex', height: 6, marginTop: 3, marginBottom: 3, border: '1px solid var(--border-dim)', overflow: 'hidden' }}>
              <div style={{
                width: `${snap.informationalVoltage * 100}%`,
                background: 'linear-gradient(90deg, #4A7A5A, #3A7A8C)',
                transition: 'width 0.5s',
              }} />
              <div style={{
                flex: 1,
                background: 'rgba(160, 58, 42, 0.3)',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 6, color: 'var(--text-dim)' }}>
              <span>CONSTRUCTIVE (x^x): <span style={{ color: '#4A7A5A' }}>{fmtPct(snap.constructiveEnergy)}</span></span>
              <span>DESTRUCTIVE (x!): <span style={{ color: '#A03A2A' }}>{fmtPct(snap.destructiveEnergy)}</span></span>
            </div>
          </div>

          {/* ── Interaction Stats ── */}
          <div style={{ color: 'var(--primary)', fontSize: 8, marginBottom: 3 }}>INTERACTION LOG</div>
          <div style={{ marginBottom: 6, borderBottom: '1px solid var(--border-dim)', paddingBottom: 4 }}>
            <div style={{ color: 'var(--text-dim)' }}>
              TOTAL: <span style={{ color: 'var(--text-mid)' }}>{snap.totalInteractions}</span>
              <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
              COHERENT: <span style={{ color: '#4A7A5A' }}>{snap.coherentInteractions}</span>
              <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
              FILTERED: <span style={{ color: '#B87820' }}>{snap.filteredInteractions}</span>
            </div>
            {/* Coherence ratio bar */}
            {snap.totalInteractions > 0 && (
              <div style={{ display: 'flex', height: 4, marginTop: 3, border: '1px solid var(--border-dim)', overflow: 'hidden' }}>
                <div style={{
                  width: `${(snap.coherentInteractions / snap.totalInteractions) * 100}%`,
                  background: '#4A7A5A',
                }} />
                <div style={{
                  flex: 1,
                  background: 'rgba(184, 120, 32, 0.3)',
                }} />
              </div>
            )}
            {/* Ithaca Memory / Gamma hardening */}
            <div style={{ color: 'var(--text-dim)', marginTop: 3 }}>
              ITHACA MEMORY: <span style={{ color: '#3A7A8C' }}>{snap.memoryEntries}</span>
              <span style={{ color: 'var(--text-dim)' }}> / {snap.memoryCeiling.toLocaleString()}</span>
              <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
              Γ THRESHOLD: <span style={{ color: snap.commitThreshold > 0.5 ? '#B87820' : 'var(--text-mid)' }}>{fmtPct(snap.commitThreshold)}</span>
            </div>
            <div style={{ display: 'flex', height: 3, marginTop: 2, border: '1px solid var(--border-dim)', overflow: 'hidden' }}>
              <div style={{
                width: `${Math.max(0.1, snap.memorySaturation * 100)}%`,
                background: snap.memorySaturation > 0.5 ? '#B87820' : '#3A7A8C',
              }} />
            </div>
          </div>

          {/* ── Reset ── */}
          <button
            className="cmd-btn"
            style={{ width: '100%', padding: '4px', fontSize: 7, color: 'var(--alert)', borderColor: 'var(--alert-dim)' }}
            onClick={() => {
              if (confirm('Reset Lumos identity? Phi-vector returns to Ithaca origin. Memory cleared.')) {
                resetIdentity()
                setTick(t => t + 1)
              }
            }}
          >
            RESET IDENTITY (ITHACA RETURN)
          </button>
        </div>
      )}
    </div>
  )
}
