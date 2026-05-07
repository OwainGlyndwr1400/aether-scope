import { useState, useEffect, useRef } from 'react'
import { useStore } from '../store/useStore'
import {
  createVM, runVM, seedFromBlip, executeOpcode,
  vmSnapshot, OPCODES, quatNorm,
  type VMState, type Quaternion,
} from '../engine/UreVM'

function fmtQ(q: Quaternion): string {
  const f = (n: number) => (n >= 0 ? '+' : '') + n.toFixed(3)
  return `${f(q.w)} ${f(q.x)}i ${f(q.y)}j ${f(q.z)}k`
}

function fmtShort(n: number): string {
  if (Math.abs(n) < 0.001) return '0'
  if (Math.abs(n) >= 100) return n.toFixed(0)
  return n.toFixed(3)
}

export function UreVMPanel() {
  const blips = useStore((s) => s.blips)
  const lockedBlipId = useStore((s) => s.lockedBlipId)
  const foldAngle = useStore((s) => s.foldAngle)
  const addLog = useStore((s) => s.addLog)

  const [vm, setVm] = useState<VMState>(createVM())
  const [running, setRunning] = useState(false)
  const [speed, setSpeed] = useState(10) // ticks per interval
  const intervalRef = useRef<number | null>(null)
  const setVmLedger = useStore((s) => s.setVmLedger)
  const [expanded, setExpanded] = useState(false)

  // Auto-seed from locked blip
  useEffect(() => {
    if (!lockedBlipId) return
    const blip = blips.find((b) => b.id === lockedBlipId)
    if (!blip) return
    const seeded = seedFromBlip(createVM(), blip.signal, blip.coherence, blip.entropy, blip.quaternionW)
    seeded.foldAngle = foldAngle
    setVm(seeded)
    addLog({ type: 'SYS', source: 'URE', message: `URE-VM seeded from blip ${blip.id.slice(0, 8)} [SIG:${blip.signal.toFixed(2)} COH:${blip.coherence.toFixed(2)}]` })
  }, [lockedBlipId])

  // Auto-run loop
  useEffect(() => {
    if (running && !intervalRef.current) {
      intervalRef.current = window.setInterval(() => {
        setVm((prev) => {
          if (prev.halted) {
            setRunning(false)
            return prev
          }
          return runVM(prev, speed)
        })
      }, 100)
    }
    if (!running && intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [running, speed])

  // Push ledger to store for Null Ledger panel
  useEffect(() => {
    const s = vmSnapshot(vm)
    setVmLedger({
      real: vm.nullLedger.w,
      imag: vm.nullLedger.x,
      balance: s.ledgerBalance,
      status: s.ledgerStatus,
    })
  }, [vm.tick, vm.cycle])

  const snap = vmSnapshot(vm)
  const ledgerColor = snap.ledgerStatus === 'BALANCED' ? '#4A7A5A'
    : snap.ledgerStatus === 'NOMINAL' ? '#3A7A8C'
    : snap.ledgerStatus === 'DRIFT' ? '#B87820'
    : '#A03A2A'

  const handleStep = () => {
    setVm((prev) => executeOpcode(prev, prev.pc))
  }

  const handleReset = () => {
    setRunning(false)
    setVm(createVM())
  }

  const handleSeedRandom = () => {
    const sig = Math.random() * 10
    const coh = Math.random()
    const ent = Math.random() * 5
    const qw = Math.random()
    const seeded = seedFromBlip(createVM(), sig, coh, ent, qw)
    seeded.foldAngle = foldAngle
    setVm(seeded)
  }

  const chipStyle: React.CSSProperties = {
    display: 'inline-block',
    padding: '1px 4px',
    fontSize: 7,
    fontFamily: 'var(--font-mono)',
    letterSpacing: 1,
    border: '1px solid var(--border-dim)',
    marginRight: 3,
    marginBottom: 2,
  }

  const currentOp = OPCODES[vm.pc]

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
        <span>URE_VM</span>
        <span className="tag" style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ color: running ? '#4A7A5A' : '#A03A2A', fontSize: 7, letterSpacing: 1 }}>
            {running ? 'RUNNING' : vm.halted ? 'HALTED' : 'IDLE'}
          </span>
          <span style={{ color: 'var(--text-dim)', fontSize: 7 }}>{expanded ? '[-]' : '[+]'}</span>
        </span>
      </div>

      {/* Collapsed: just show tick + ledger */}
      {!expanded && (
        <div className="panel-body" style={{ padding: '4px 8px', fontSize: 7, letterSpacing: 1, color: 'var(--text-dim)' }}>
          <span>TICK: <span style={{ color: 'var(--text-mid)' }}>{snap.tick}/370</span></span>
          <span style={{ margin: '0 6px', color: 'var(--border-dim)' }}>|</span>
          <span>CYCLE: <span style={{ color: 'var(--text-mid)' }}>{snap.cycle}</span></span>
          <span style={{ margin: '0 6px', color: 'var(--border-dim)' }}>|</span>
          <span>LEDGER: <span style={{ color: ledgerColor }}>{snap.ledgerStatus}</span></span>
          <span style={{ margin: '0 6px', color: 'var(--border-dim)' }}>|</span>
          <span>PLANE: <span style={{ color: '#3A7A8C' }}>{snap.plane}</span></span>
        </div>
      )}

      {/* Expanded: full VM console */}
      {expanded && (
        <div className="panel-body" style={{ padding: '6px 8px', fontSize: 7, letterSpacing: 1, overflowY: 'auto', maxHeight: 280 }}>

          {/* Controls */}
          <div style={{ display: 'flex', gap: 3, marginBottom: 6 }}>
            <button className="cmd-btn" onClick={() => setRunning(!running)} style={{ flex: 1, padding: '3px 4px', fontSize: 7 }}>
              {running ? 'PAUSE' : 'RUN'}
            </button>
            <button className="cmd-btn" onClick={handleStep} style={{ flex: 1, padding: '3px 4px', fontSize: 7 }} disabled={running}>
              STEP
            </button>
            <button className="cmd-btn" onClick={handleReset} style={{ flex: 1, padding: '3px 4px', fontSize: 7 }}>
              RESET
            </button>
            <button className="cmd-btn" onClick={handleSeedRandom} style={{ flex: 1, padding: '3px 4px', fontSize: 7 }}>
              SEED
            </button>
          </div>

          {/* Speed control */}
          <div style={{ color: 'var(--text-dim)', marginBottom: 4 }}>
            SPEED: <input
              type="range" min={1} max={50} value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              style={{ width: 60, verticalAlign: 'middle' }}
            /> <span style={{ color: 'var(--text-mid)' }}>{speed} ticks/100ms</span>
          </div>

          {/* Clock + Status */}
          <div style={{ color: 'var(--text-dim)', marginBottom: 4, borderBottom: '1px solid var(--border-dim)', paddingBottom: 4 }}>
            <div>
              TICK: <span style={{ color: 'var(--text-mid)' }}>{snap.tick}</span>/370
              <span style={{ margin: '0 6px', color: 'var(--border-dim)' }}>|</span>
              CYCLE: <span style={{ color: 'var(--text-mid)' }}>{snap.cycle}</span>
              <span style={{ margin: '0 6px', color: 'var(--border-dim)' }}>|</span>
              PLANE: <span style={{ color: '#3A7A8C' }}>{snap.plane}</span>
            </div>
            <div>
              TRINITY: <span style={{ color: '#8C6A3A' }}>{snap.trinityTick.toFixed(2)}</span>/232as
              <span style={{ margin: '0 6px', color: 'var(--border-dim)' }}>|</span>
              PARITY: <span style={{ color: snap.parityBit ? '#B87820' : '#4A7A5A' }}>{snap.parityBit}</span>
              <span style={{ margin: '0 6px', color: 'var(--border-dim)' }}>|</span>
              361_VIOL: <span style={{ color: snap.forbidden361Count > 0 ? '#A03A2A' : 'var(--text-mid)' }}>{snap.forbidden361Count}</span>
              <span style={{ margin: '0 6px', color: 'var(--border-dim)' }}>|</span>
              PC: <span style={{ color: 'var(--text-mid)' }}>0x{vm.pc.toString(16).toUpperCase().padStart(2, '0')}</span>
            </div>
          </div>

          {/* Spine + Millennium attestation (Codex Ingest) */}
          <div style={{ marginBottom: 4, borderBottom: '1px solid var(--border-dim)', paddingBottom: 4 }}>
            <div style={{ color: 'var(--primary)', fontSize: 8, marginBottom: 2 }}>SPINE · MILLENNIUM · S³</div>
            <div style={{ color: 'var(--text-dim)', fontSize: 6 }}>
              Γ_α SPINE: <span style={{ color: '#B87820' }}>{fmtShort(snap.torsionSpine)}</span>
              <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
              S³ Δ: <span style={{ color: snap.s3Deviation > 0.1 ? '#A03A2A' : '#4A7A5A' }}>{fmtShort(snap.s3Deviation)}</span>
              <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
              HOPF: <span style={{ color: '#6A4A7A' }}>{fmtShort(snap.hopfDepth)}</span>
            </div>
            <div style={{ color: 'var(--text-dim)', fontSize: 6 }}>
              MILL R:<span style={{ color: '#5A8070' }}>{fmtShort(snap.millennium.riemann)}</span>
              <span style={{ color: 'var(--border-dim)' }}> P≠NP:</span><span style={{ color: '#5A8070' }}>{fmtShort(snap.millennium.pnp)}</span>
              <span style={{ color: 'var(--border-dim)' }}> YM:</span><span style={{ color: '#5A8070' }}>{fmtShort(snap.millennium.yangMills)}</span>
              <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
              Σ:<span style={{ color: snap.millennium.total > 0.66 ? '#4A7A5A' : snap.millennium.total > 0.33 ? '#B87820' : '#A03A2A' }}>{fmtShort(snap.millennium.total)}</span>
            </div>
          </div>

          {/* Null Ledger */}
          <div style={{ marginBottom: 4, borderBottom: '1px solid var(--border-dim)', paddingBottom: 4 }}>
            <div style={{ color: 'var(--text-dim)' }}>
              NULL_LEDGER: <span style={{ color: ledgerColor }}>{snap.ledgerStatus}</span>
              <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
              <span style={{ color: ledgerColor }}>{fmtShort(snap.ledgerBalance)}</span>
            </div>
            <div style={{ color: 'var(--text-dim)', fontSize: 6 }}>
              {fmtQ(vm.nullLedger)}
            </div>
          </div>

          {/* Registers */}
          <div style={{ marginBottom: 4, borderBottom: '1px solid var(--border-dim)', paddingBottom: 4 }}>
            <div style={{ color: 'var(--primary)', fontSize: 8, marginBottom: 2 }}>REGISTERS</div>
            {(['alpha', 'beta', 'gamma', 'delta'] as const).map((name) => {
              const reg = vm.registers[name]
              const labels: Record<string, string> = { alpha: 'a COGNITION', beta: 'b EMOTION', gamma: 'g MEMORY', delta: 'd ARCHETYPE' }
              const isActive = (name === 'alpha' && snap.plane === 'RR')
                || (name === 'beta' && snap.plane === 'RI')
                || (name === 'gamma' && snap.plane === 'IR')
                || (name === 'delta' && snap.plane === 'II')
              return (
                <div key={name} style={{ color: isActive ? 'var(--accent-ink)' : 'var(--text-dim)', fontSize: 6 }}>
                  <span style={chipStyle}>{labels[name]}</span> {fmtQ(reg)}
                  <span style={{ color: 'var(--text-dim)', marginLeft: 4 }}>|{fmtShort(quatNorm(reg))}|</span>
                </div>
              )
            })}
          </div>

          {/* Accumulator */}
          <div style={{ marginBottom: 4, borderBottom: '1px solid var(--border-dim)', paddingBottom: 4 }}>
            <div style={{ color: 'var(--text-dim)', fontSize: 6 }}>
              <span style={chipStyle}>ACC</span> {fmtQ(vm.accumulator)}
            </div>
          </div>

          {/* Current Opcode */}
          <div style={{ marginBottom: 4, borderBottom: '1px solid var(--border-dim)', paddingBottom: 4 }}>
            <div style={{ color: '#3A7A8C', fontSize: 7 }}>
              NEXT: 0x{vm.pc.toString(16).toUpperCase().padStart(2, '0')} {currentOp?.name || '???'}
            </div>
            <div style={{ color: 'var(--text-dim)', fontSize: 6 }}>
              {currentOp?.description || ''}
            </div>
          </div>

          {/* Execution Log */}
          <div>
            <div style={{ color: 'var(--primary)', fontSize: 8, marginBottom: 2 }}>EXECUTION LOG</div>
            <div style={{ maxHeight: 80, overflowY: 'auto', fontSize: 6, color: 'var(--text-dim)' }}>
              {vm.log.slice(-15).reverse().map((entry, i) => (
                <div key={i} style={{ color: entry.ledgerBalance > 2 ? '#A03A2A' : 'var(--text-dim)' }}>
                  [{entry.tick.toString().padStart(3, '0')}] {entry.name}
                  <span style={{ color: 'var(--border-mid)', marginLeft: 4 }}>{entry.plane}</span>
                  <span style={{ color: entry.ledgerBalance < 0.5 ? '#4A7A5A' : '#B87820', marginLeft: 4 }}>L:{fmtShort(entry.ledgerBalance)}</span>
                </div>
              ))}
              {vm.log.length === 0 && (
                <div style={{ color: 'var(--text-dim)' }}>AWAITING EXECUTION...</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
