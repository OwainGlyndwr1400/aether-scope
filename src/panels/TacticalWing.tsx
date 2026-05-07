import { useStore } from '../store/useStore'
import { SACRED_FREQUENCIES, MASS_GAP, LION_CONSTANT, GEOMETRIC_LOCK } from '../engine/RHCConstants'
import { UreVMPanel } from './UreVMPanel'
import { UBBMPanel } from './UBBMPanel'
import { RHUMPanel } from './RHUMPanel'
import { TriskelionPanel } from './TriskelionPanel'
import { PhaseEnginePanel } from './PhaseEnginePanel'
import { CentralResonatorPanel } from './CentralResonatorPanel'
import { GrimoirePanel } from './GrimoirePanel'
import type { Blip } from '../types'

export function TacticalWing() {
  return (
    <div className="left-wing">
      <SystemStatus />
      <RHCController />
      <UreVMPanel />
      <UBBMPanel />
      <RHUMPanel />
      <TriskelionPanel />
      <PhaseEnginePanel />
      <CentralResonatorPanel />
      <GrimoirePanel />
      <DataManifest />
    </div>
  )
}

function SystemStatus() {
  const blips = useStore((s) => s.blips)
  const physicsLoad = useStore((s) => s.physicsLoad)
  const kelgLock = useStore((s) => s.kelgLock)

  const anomalyCount = blips.filter((b) => b.type !== 'NWTN').length

  return (
    <div className="panel" style={{ flex: '0 0 auto' }}>
      <div className="corner-tl" /><div className="corner-tr" />
      <div className="corner-bl" /><div className="corner-br" />
      <div className="panel-scan" />
      <div className="panel-header">
        <span>SYSTEM_STATUS</span>
        <span className="tag">
          <span className={`status-dot ${anomalyCount > 0 ? 'amber' : 'green'}`} />
          {anomalyCount > 0 ? 'ACTIVE' : 'NOMINAL'}
        </span>
      </div>
      <div className="panel-body">
        <div className="data-row">
          <span className="label">CPU_THREAD</span>
          <span className="value optimal">OPTIMAL</span>
        </div>
        <div className="data-row">
          <span className="label">PHYSICS</span>
          <span className={`value ${physicsLoad > 80 ? 'warning' : 'optimal'}`}>
            {physicsLoad.toFixed(1)}%
          </span>
        </div>
        <div className="data-row">
          <span className="label">ENTROPY</span>
          <span className={`value ${kelgLock ? 'optimal' : ''}`}>
            {kelgLock ? 'FROZEN' : 'NOMINAL'}
          </span>
        </div>
        <div className="data-row">
          <span className="label">MASS_GAP</span>
          <span className="value">{MASS_GAP.toFixed(3)}</span>
        </div>
        <div className="data-row">
          <span className="label">LION_CONST</span>
          <span className="value">{LION_CONSTANT}</span>
        </div>
        <div className="data-row">
          <span className="label">GEO_LOCK</span>
          <span className="value optimal">{GEOMETRIC_LOCK}</span>
        </div>
        <div className="data-row">
          <span className="label">BLIP_COUNT</span>
          <span className="value">{blips.length}</span>
        </div>
        <div className="data-row">
          <span className="label">ANOMALIES</span>
          <span className={`value ${anomalyCount > 0 ? 'warning' : ''}`}>{anomalyCount}</span>
        </div>
      </div>
    </div>
  )
}

function RHCController() {
  const foldAngle = useStore((s) => s.foldAngle)
  const setFoldAngle = useStore((s) => s.setFoldAngle)
  const kelgLock = useStore((s) => s.kelgLock)
  const toggleKelgLock = useStore((s) => s.toggleKelgLock)
  const teleforceActive = useStore((s) => s.teleforceActive)
  const setTeleforceActive = useStore((s) => s.setTeleforceActive)

  return (
    <div className="panel" style={{ flex: '0 0 auto' }}>
      <div className="corner-tl" /><div className="corner-tr" />
      <div className="corner-bl" /><div className="corner-br" />
      <div className="panel-scan" />
      <div className="panel-header">
        <span>RHC_CONTROLLER</span>
        <span className="tag">FOLD: {foldAngle}°</span>
      </div>
      <div className="panel-body">
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, letterSpacing: 1, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 2 }}>
            <span>FOLD_ANGLE</span>
            <span style={{ color: 'var(--text-bright)' }}>{foldAngle}°</span>
          </div>
          <input
            type="range"
            className="rhc-slider"
            min={0}
            max={90}
            value={foldAngle}
            onChange={(e) => setFoldAngle(Number(e.target.value))}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: 'var(--text-dim)', letterSpacing: 1 }}>
            <span>MATERIAL</span>
            <span>AETHER</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
          <button
            className={`cmd-btn ${kelgLock ? 'active' : ''}`}
            onClick={toggleKelgLock}
          >
            {kelgLock ? '◆' : '◇'} KELG_LOCK {kelgLock ? '// 465Hz' : ''}
          </button>

          <button
            className={`cmd-btn ${teleforceActive ? 'active' : ''}`}
            onClick={() => setTeleforceActive(!teleforceActive)}
          >
            {teleforceActive ? '⚡' : '○'} TELEFORCE
          </button>
        </div>
      </div>
    </div>
  )
}

function DataManifest() {
  const blips = useStore((s) => s.blips)
  const lockedBlipId = useStore((s) => s.lockedBlipId)
  const setLockedBlipId = useStore((s) => s.setLockedBlipId)

  const nwtn = blips.filter((b) => b.type === 'NWTN').length
  const levy = blips.filter((b) => b.type === 'LEVY').length
  const cloak = blips.filter((b) => b.type === 'CLOAK').length
  const total = blips.length || 1

  return (
    <div className="panel" style={{ flex: 1, minHeight: 0 }}>
      <div className="corner-tl" /><div className="corner-tr" />
      <div className="corner-bl" /><div className="corner-br" />
      <div className="panel-scan" />
      <div className="panel-header">
        <span>DATA_MANIFEST</span>
        <span className="tag">{blips.length} OBJ</span>
      </div>
      <div className="panel-body">
        {/* Distribution bar */}
        <div style={{ marginBottom: 8 }}>
          <div className="dist-bar">
            <div className="seg-nwtn" style={{ width: `${(nwtn / total) * 100}%` }} />
            <div className="seg-levy" style={{ width: `${(levy / total) * 100}%` }} />
            <div className="seg-cloak" style={{ width: `${(cloak / total) * 100}%` }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, letterSpacing: 1.5, marginTop: 6, padding: '4px 0' }}>
            <span style={{ color: '#B87820' }}>NWTN: <span style={{ fontWeight: 700 }}>{nwtn || '—'}</span></span>
            <span style={{ color: '#3A7A8C' }}>LEVY: <span style={{ fontWeight: 700 }}>{levy || '—'}</span></span>
            <span style={{ color: '#E8E4D8' }}>CLOAK: <span style={{ fontWeight: 700 }}>{cloak || '—'}</span></span>
          </div>
        </div>

        {/* Blip table */}
        <div style={{ fontSize: 9 }}>
          <div className="data-row" style={{ borderBottom: '1px solid var(--border-mid)', paddingBottom: 4, marginBottom: 4 }}>
            <span style={{ width: 80, color: 'var(--text-dim)', letterSpacing: 1 }}>ID</span>
            <span style={{ width: 45, color: 'var(--text-dim)', letterSpacing: 1 }}>TYPE</span>
            <span style={{ width: 45, color: 'var(--text-dim)', letterSpacing: 1, textAlign: 'right' }}>RNG</span>
            <span style={{ width: 45, color: 'var(--text-dim)', letterSpacing: 1, textAlign: 'right' }}>COH</span>
          </div>
          {blips.slice(0, 15).map((blip) => {
            const isLocked = blip.id === lockedBlipId
            const typeColor = blip.type === 'NWTN' ? '#B87820' : blip.type === 'LEVY' ? '#3A7A8C' : '#E8E4D8'
            return (
              <div
                key={blip.id}
                className="data-row"
                style={{
                  cursor: 'pointer',
                  background: isLocked ? 'rgba(200, 134, 10, 0.08)' : undefined,
                  borderLeft: isLocked ? '2px solid var(--accent-ink)' : '2px solid transparent',
                  paddingLeft: 4,
                }}
                onClick={() => setLockedBlipId(isLocked ? null : blip.id)}
              >
                <span style={{ width: 80, color: 'var(--text-mid)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {blip.name}
                </span>
                <span style={{ width: 45, color: typeColor, fontWeight: 600 }}>{blip.type}</span>
                <span style={{ width: 45, textAlign: 'right', color: 'var(--text-bright)' }}>{blip.range.toFixed(1)}</span>
                <span style={{ width: 45, textAlign: 'right', color: blip.coherence > 0.7 ? 'var(--primary)' : 'var(--text-mid)' }}>
                  {blip.coherence.toFixed(2)}
                </span>
              </div>
            )
          })}
          {blips.length === 0 && (
            <div style={{ color: 'var(--text-dim)', padding: '12px 0', textAlign: 'center', letterSpacing: 2, fontSize: 9 }}>
              AWAITING TELEMETRY...
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
