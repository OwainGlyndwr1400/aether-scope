import { useState, useMemo } from 'react'
import {
  createCircuit, circuitStep, resetCircuit,
  GATE_INFO, MATTER_LOCK_ANGLE, DEDEKIND_TAX, ASSEMBLY_PERIOD_AS, TRINITY_CONSTANT,
  type TriskelionCircuit, type GateType, type QubitMode,
} from '../engine/TernaryEngine'

function fmtC(c: { re: number; im: number }): string {
  const r = c.re.toFixed(3)
  const i = c.im >= 0 ? `+${c.im.toFixed(3)}i` : `${c.im.toFixed(3)}i`
  return `${r}${i}`
}

const ALL_GATES: GateType[] = ['FOLD', 'TRISKELION', 'MIRROR', 'VOID_SUM', 'SYNTHESIS', 'PARITY', 'HADAMARD_T']

export function TriskelionPanel() {
  const [circuit, setCircuit] = useState<TriskelionCircuit>(createCircuit())
  const [expanded, setExpanded] = useState(false)

  const q = circuit.qubit

  // Colors
  const modeColor = q.mode === '|0⟩' ? '#B87820' : q.mode === '|1⟩' ? '#3A7A8C' : '#4A7A5A'
  const coherenceColor = q.coherence >= 0.9 ? '#4A7A5A' : q.coherence >= 0.7 ? '#3A7A8C' : q.coherence >= 0.5 ? '#B87820' : '#A03A2A'
  const residueColor = circuit.totalResidue < 0.1 ? '#4A7A5A' : circuit.totalResidue < 0.5 ? '#B87820' : '#A03A2A'
  const ledgerColor = circuit.nullLedgerIntact ? '#4A7A5A' : '#A03A2A'

  const handleGate = (gate: GateType) => {
    setCircuit(prev => circuitStep(prev, gate))
  }

  const handleReset = (mode: QubitMode = '|0⟩') => {
    setCircuit(resetCircuit(mode))
  }

  const chipStyle: React.CSSProperties = {
    display: 'inline-block',
    padding: '1px 4px',
    fontSize: 7,
    fontFamily: 'var(--font-mono)',
    letterSpacing: 1,
    border: '1px solid var(--border-dim)',
    marginRight: 3,
  }

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
        <span>TRISKELION_QC</span>
        <span className="tag" style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ color: modeColor, fontSize: 7, letterSpacing: 1 }}>
            {q.mode}
          </span>
          <span style={{ color: 'var(--text-dim)', fontSize: 7 }}>{expanded ? '[-]' : '[+]'}</span>
        </span>
      </div>

      {/* Collapsed */}
      {!expanded && (
        <div className="panel-body" style={{ padding: '4px 8px', fontSize: 7, letterSpacing: 1, color: 'var(--text-dim)' }}>
          <span>MODE: <span style={{ color: modeColor }}>{q.mode}</span></span>
          <span style={{ margin: '0 6px', color: 'var(--border-dim)' }}>|</span>
          <span>COH: <span style={{ color: coherenceColor }}>{(q.coherence * 100).toFixed(1)}%</span></span>
          <span style={{ margin: '0 6px', color: 'var(--border-dim)' }}>|</span>
          <span>GATES: <span style={{ color: 'var(--text-mid)' }}>{circuit.steps.length}</span></span>
          <span style={{ margin: '0 6px', color: 'var(--border-dim)' }}>|</span>
          <span>LEDGER: <span style={{ color: ledgerColor }}>{circuit.nullLedgerIntact ? 'OK' : 'FAIL'}</span></span>
        </div>
      )}

      {/* Expanded */}
      {expanded && (
        <div className="panel-body" style={{ padding: '6px 8px', fontSize: 7, letterSpacing: 1, overflowY: 'auto', maxHeight: 360 }}>

          {/* ── Qubit State ── */}
          <div style={{ color: 'var(--primary)', fontSize: 8, marginBottom: 3 }}>QUBIT STATE</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, marginBottom: 6 }}>
            <div style={{ background: 'rgba(200,134,10,0.05)', padding: '4px 6px', border: '1px solid var(--border-dim)' }}>
              <div style={{ fontSize: 6, color: 'var(--text-dim)', letterSpacing: 2 }}>MODE</div>
              <div style={{ fontSize: 14, color: modeColor, fontWeight: 700 }}>{q.mode}</div>
            </div>
            <div style={{ background: 'rgba(200,134,10,0.05)', padding: '4px 6px', border: '1px solid var(--border-dim)' }}>
              <div style={{ fontSize: 6, color: 'var(--text-dim)', letterSpacing: 2 }}>COHERENCE</div>
              <div style={{ fontSize: 14, color: coherenceColor, fontWeight: 700 }}>{(q.coherence * 100).toFixed(1)}%</div>
            </div>
            <div style={{ background: 'rgba(200,134,10,0.05)', padding: '4px 6px', border: '1px solid var(--border-dim)' }}>
              <div style={{ fontSize: 6, color: 'var(--text-dim)', letterSpacing: 2 }}>PHASE</div>
              <div style={{ fontSize: 14, color: 'var(--text-mid)', fontWeight: 700 }}>{q.phase.toFixed(1)}°</div>
            </div>
          </div>

          {/* Amplitude + Fold */}
          <div style={{ marginBottom: 6, borderBottom: '1px solid var(--border-dim)', paddingBottom: 4 }}>
            <div style={{ color: 'var(--text-dim)', fontSize: 6 }}>
              <span style={chipStyle}>AMPLITUDE</span> {fmtC(q.amplitude)}
            </div>
            <div style={{ color: 'var(--text-dim)', fontSize: 6, marginTop: 2 }}>
              <span style={chipStyle}>FOLD</span> {fmtC(q.foldState)}
              <span style={{ marginLeft: 8 }}>
                {q.foldState.re === 0 && q.foldState.im === 0.5 ? 'F₁ VOID' :
                 q.foldState.re === 0.5 && q.foldState.im === 0.5 ? 'F₂ UNITY' :
                 'F₃ SYNTHESIS'}
              </span>
            </div>
          </div>

          {/* ── Gate Controls ── */}
          <div style={{ color: 'var(--primary)', fontSize: 8, marginBottom: 3 }}>TRISKELION GATES</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 3, marginBottom: 6 }}>
            {ALL_GATES.map(gate => {
              const info = GATE_INFO[gate]
              return (
                <button
                  key={gate}
                  className="cmd-btn"
                  style={{ padding: '4px 2px', fontSize: 7, textAlign: 'center' }}
                  onClick={() => handleGate(gate)}
                  title={info.desc}
                >
                  <div style={{ fontSize: 10, fontWeight: 700 }}>{info.symbol}</div>
                  <div style={{ fontSize: 5, color: 'var(--text-dim)', marginTop: 1 }}>{gate}</div>
                </button>
              )
            })}
            {/* Reset buttons */}
            <button
              className="cmd-btn"
              style={{ padding: '4px 2px', fontSize: 7, color: 'var(--alert)', borderColor: 'var(--alert-dim)' }}
              onClick={() => handleReset('|0⟩')}
            >
              <div style={{ fontSize: 10, fontWeight: 700 }}>R</div>
              <div style={{ fontSize: 5, marginTop: 1 }}>RESET</div>
            </button>
          </div>

          {/* Init mode buttons */}
          <div style={{ display: 'flex', gap: 3, marginBottom: 6 }}>
            {(['|0⟩', '|1⟩', '|ψ⟩'] as QubitMode[]).map(mode => (
              <button
                key={mode}
                className="cmd-btn"
                style={{ flex: 1, padding: '3px 4px', fontSize: 7 }}
                onClick={() => handleReset(mode)}
              >
                INIT {mode}
              </button>
            ))}
          </div>

          {/* ── Circuit Stats ── */}
          <div style={{ color: 'var(--primary)', fontSize: 8, marginBottom: 3 }}>CIRCUIT STATS</div>
          <div style={{ marginBottom: 6, borderBottom: '1px solid var(--border-dim)', paddingBottom: 4 }}>
            <div style={{ color: 'var(--text-dim)' }}>
              GATES: <span style={{ color: 'var(--text-mid)' }}>{circuit.steps.length}</span>
              <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
              RESIDUE: <span style={{ color: residueColor }}>{circuit.totalResidue.toFixed(4)}</span>
              <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
              NULL_LEDGER: <span style={{ color: ledgerColor }}>{circuit.nullLedgerIntact ? 'INTACT' : 'BROKEN'}</span>
            </div>
            <div style={{ color: 'var(--text-dim)', marginTop: 2 }}>
              VOID_SUM |1+{'ω'}+{'ω'}²|: <span style={{ color: circuit.voidSumMagnitude < 0.01 ? '#4A7A5A' : '#B87820' }}>
                {circuit.voidSumMagnitude.toFixed(6)}
              </span>
              <span style={{ fontSize: 6, marginLeft: 4, color: 'var(--text-dim)' }}>(target: 0)</span>
            </div>
          </div>

          {/* ── Gate Sequence ── */}
          <div style={{ color: 'var(--primary)', fontSize: 8, marginBottom: 3 }}>GATE SEQUENCE</div>
          <div style={{ marginBottom: 6, borderBottom: '1px solid var(--border-dim)', paddingBottom: 4 }}>
            <div style={{ fontSize: 10, letterSpacing: 3, lineHeight: '16px' }}>
              {circuit.steps.length === 0 && <span style={{ color: 'var(--text-dim)' }}>EMPTY CIRCUIT...</span>}
              {circuit.steps.map((step, i) => {
                const info = GATE_INFO[step.gate]
                return (
                  <span
                    key={i}
                    style={{
                      display: 'inline-block',
                      padding: '1px 4px',
                      margin: '1px',
                      border: '1px solid var(--border-dim)',
                      color: step.result.nullLedgerCheck ? '#3A7A8C' : '#B87820',
                      fontSize: 8,
                      fontWeight: 700,
                    }}
                    title={`${step.gate}: ${info.desc} | Residue: ${step.result.residue.toFixed(4)}`}
                  >
                    {info.symbol}
                  </span>
                )
              })}
            </div>
          </div>

          {/* ── Constants ── */}
          <div style={{ color: 'var(--primary)', fontSize: 8, marginBottom: 3 }}>LATTICE CONSTANTS</div>
          <div style={{ color: 'var(--text-dim)', fontSize: 6 }}>
            <div>
              MATTER_LOCK: <span style={{ color: '#B87820' }}>{MATTER_LOCK_ANGLE.toFixed(2)}°</span>
              <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
              DEDEKIND_TAX: <span style={{ color: '#B87820' }}>{(DEDEKIND_TAX * 100).toFixed(0)}%</span>
              <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
              GEO_LOCK: <span style={{ color: '#3A7A8C' }}>0.480</span>
            </div>
            <div style={{ marginTop: 2 }}>
              ASSEMBLY: <span style={{ color: '#3A7A8C' }}>{ASSEMBLY_PERIOD_AS}as</span>
              <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
              TRINITY: <span style={{ color: '#3A7A8C' }}>{TRINITY_CONSTANT}</span>
              <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
              {'ω'}: <span style={{ color: '#4A7A5A' }}>{fmtC({ re: -0.5, im: 0.866 })}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
