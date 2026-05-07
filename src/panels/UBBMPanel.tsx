import { useState, useEffect, useMemo } from 'react'
import { useStore } from '../store/useStore'
import {
  compressBlipTelemetry, compressBlock, fmnProtocol,
  type UBBMCompressedBlock, type FMNResult,
} from '../engine/UBBMEngine'

function fmtPct(n: number): string { return (n * 100).toFixed(1) + '%' }
function fmtF(n: number, d = 3): string { return n.toFixed(d) }

export function UBBMPanel() {
  const blips = useStore((s) => s.blips)
  const lockedBlipId = useStore((s) => s.lockedBlipId)
  const spaceWeather = useStore((s) => s.spaceWeather)
  const [expanded, setExpanded] = useState(false)
  const [autoCompress, setAutoCompress] = useState(true)
  const [tick, setTick] = useState(0)

  // Auto-refresh compression every 2s
  useEffect(() => {
    if (!autoCompress) return
    const iv = setInterval(() => setTick(t => t + 1), 2000)
    return () => clearInterval(iv)
  }, [autoCompress])

  // Compress locked blip or aggregate all blips
  const { block, fmn, source } = useMemo(() => {
    const locked = lockedBlipId ? blips.find(b => b.id === lockedBlipId) : null

    let block: UBBMCompressedBlock
    let source: string

    if (locked) {
      block = compressBlipTelemetry(locked)
      source = `BLIP: ${locked.name}`
    } else if (blips.length > 0) {
      // Compress aggregate telemetry from all blips
      const allValues = blips.flatMap(b => [
        b.signal, b.coherence, b.entropy, b.quaternionW,
        b.gForce, b.range, b.bearing,
      ])
      block = compressBlock(allValues)
      source = `AGGREGATE: ${blips.length} blips`
    } else {
      block = compressBlock([])
      source = 'NO DATA'
    }

    // Run FMN on first quaternion if available
    const fmn: FMNResult | null = block.quaternions.length > 0
      ? fmnProtocol(block.quaternions[0])
      : null

    return { block, fmn, source }
  }, [blips, lockedBlipId, tick])

  // Colors — Awen Grid status palette
  const compressionColor = block.compressionRatio >= 0.85 ? '#4A7A5A'
    : block.compressionRatio >= 0.5 ? '#3A7A8C'
    : block.compressionRatio >= 0.2 ? '#B87820'
    : '#A03A2A'

  const stitchColor = block.avgDimensionalStitch >= 4 ? '#4A7A5A'
    : block.avgDimensionalStitch >= 3 ? '#3A7A8C'
    : block.avgDimensionalStitch >= 2 ? '#B87820'
    : '#A03A2A'

  const lost2Color = block.lost2.deviationFromIdeal < 0.05 ? '#4A7A5A'
    : block.lost2.deviationFromIdeal < 0.1 ? '#3A7A8C'
    : '#B87820'

  const massGapColor = '#C8860A'

  // Proof-0 compliance band (§7.2 item 1 — Master Protocol 85% target)
  const proofZeroColor = block.proofZeroBand === 'GREEN' ? '#4A7A5A'
    : block.proofZeroBand === 'AMBER' ? '#B87820'
    : '#A03A2A'

  // Null Ledger — total-drift colour against canonical Σ → 0
  const ledgerTotalAbs = Math.abs(block.nullLedger.total)
  const ledgerColor = ledgerTotalAbs < 0.2 ? '#4A7A5A'
    : ledgerTotalAbs < 0.6 ? '#B87820'
    : '#A03A2A'

  // Observer alignment (1 = at O, 0 = at canonical max distance)
  const observerColor = block.observerAlignment >= 0.7 ? '#4A7A5A'
    : block.observerAlignment >= 0.4 ? '#B87820'
    : '#A03A2A'

  // Resolution saturation — amber past 70% of 144,000 ceiling
  const resolutionColor = block.resolutionSaturation < 0.7 ? '#4A7A5A'
    : block.resolutionSaturation < 1.0 ? '#B87820'
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
        <span>UBBM_COMPRESS</span>
        <span className="tag" style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ color: compressionColor, fontSize: 7, letterSpacing: 1 }}>
            {fmtPct(block.compressionRatio)}
          </span>
          <span style={{ color: 'var(--text-dim)', fontSize: 7 }}>{expanded ? '[-]' : '[+]'}</span>
        </span>
      </div>

      {/* Collapsed summary */}
      {!expanded && (
        <div className="panel-body" style={{ padding: '4px 8px', fontSize: 7, letterSpacing: 1, color: 'var(--text-dim)' }}>
          <span>PROOF-0: <span style={{ color: proofZeroColor }}>{block.proofZeroBand}</span></span>
          <span style={{ margin: '0 6px', color: 'var(--border-dim)' }}>|</span>
          <span>RATIO: <span style={{ color: compressionColor }}>{fmtPct(block.compressionRatio)}</span></span>
          <span style={{ margin: '0 6px', color: 'var(--border-dim)' }}>|</span>
          <span>STITCH: <span style={{ color: stitchColor }}>{fmtF(block.avgDimensionalStitch, 1)}D</span></span>
          <span style={{ margin: '0 6px', color: 'var(--border-dim)' }}>|</span>
          <span>OBS: <span style={{ color: observerColor }}>{fmtPct(block.observerAlignment)}</span></span>
          <span style={{ margin: '0 6px', color: 'var(--border-dim)' }}>|</span>
          <span>GAP: <span style={{ color: massGapColor }}>{fmtF(block.massGap, 3)}</span></span>
        </div>
      )}

      {/* Expanded full view */}
      {expanded && (
        <div className="panel-body" style={{ padding: '6px 8px', fontSize: 7, letterSpacing: 1, overflowY: 'auto', maxHeight: 320 }}>

          {/* Source + auto toggle */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, borderBottom: '1px solid var(--border-dim)', paddingBottom: 4 }}>
            <span style={{ color: 'var(--text-dim)' }}>SRC: <span style={{ color: 'var(--text-mid)' }}>{source}</span></span>
            <button
              className="cmd-btn"
              style={{ padding: '2px 6px', fontSize: 7 }}
              onClick={() => setAutoCompress(!autoCompress)}
            >
              {autoCompress ? 'LIVE' : 'PAUSED'}
            </button>
          </div>

          {/* ── Proof-0 Compliance (Master Protocol) ── */}
          <div style={{ color: 'var(--primary)', fontSize: 8, marginBottom: 3 }}>
            PROOF-0 COMPLIANCE <span style={{ fontSize: 6, color: 'var(--text-dim)' }}>(Master Protocol: 85% target)</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, marginBottom: 6 }}>
            <div style={{ background: 'rgba(200,134,10,0.05)', padding: '4px 6px', border: '1px solid var(--border-dim)' }}>
              <div style={{ fontSize: 6, color: 'var(--text-dim)', letterSpacing: 2 }}>BAND</div>
              <div style={{ fontSize: 14, color: proofZeroColor, fontWeight: 700 }}>{block.proofZeroBand}</div>
            </div>
            <div style={{ background: 'rgba(200,134,10,0.05)', padding: '4px 6px', border: '1px solid var(--border-dim)' }}>
              <div style={{ fontSize: 6, color: 'var(--text-dim)', letterSpacing: 2 }}>COMPLIANCE</div>
              <div style={{ fontSize: 14, color: proofZeroColor, fontWeight: 700 }}>{fmtPct(block.proofZeroCompliance)}</div>
            </div>
            <div style={{ background: 'rgba(200,134,10,0.05)', padding: '4px 6px', border: '1px solid var(--border-dim)' }}>
              <div style={{ fontSize: 6, color: 'var(--text-dim)', letterSpacing: 2 }}>|Δ| FROM 85%</div>
              <div style={{ fontSize: 10, color: 'var(--text-mid)', fontWeight: 700 }}>
                {fmtPct(Math.abs(block.compressionRatio - 0.85))}
              </div>
            </div>
          </div>

          {/* ── Compression Stats ── */}
          <div style={{ color: 'var(--primary)', fontSize: 8, marginBottom: 3 }}>COMPRESSION</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, marginBottom: 6 }}>
            <div style={{ background: 'rgba(200,134,10,0.05)', padding: '4px 6px', border: '1px solid var(--border-dim)' }}>
              <div style={{ fontSize: 6, color: 'var(--text-dim)', letterSpacing: 2 }}>RATIO</div>
              <div style={{ fontSize: 14, color: compressionColor, fontWeight: 700 }}>{fmtPct(block.compressionRatio)}</div>
            </div>
            <div style={{ background: 'rgba(200,134,10,0.05)', padding: '4px 6px', border: '1px solid var(--border-dim)' }}>
              <div style={{ fontSize: 6, color: 'var(--text-dim)', letterSpacing: 2 }}>IN / OUT</div>
              <div style={{ fontSize: 10, color: 'var(--text-mid)', fontWeight: 700 }}>
                {block.inputBytes}B {'→'} {block.compressedBytes}B
              </div>
            </div>
            <div style={{ background: 'rgba(200,134,10,0.05)', padding: '4px 6px', border: '1px solid var(--border-dim)' }}>
              <div style={{ fontSize: 6, color: 'var(--text-dim)', letterSpacing: 2 }}>VECTORS</div>
              <div style={{ fontSize: 14, color: 'var(--text-mid)', fontWeight: 700 }}>{block.tripleNorms.length}</div>
            </div>
          </div>

          {/* ── Lattice Telemetry (§7.2 items 4, 5) ── */}
          <div style={{ color: 'var(--text-dim)', fontSize: 6, marginBottom: 6, display: 'flex', gap: 8 }}>
            <span>RES·SAT: <span style={{ color: resolutionColor }}>{fmtPct(Math.min(1, block.resolutionSaturation))}</span> / 144k</span>
            <span style={{ color: 'var(--border-dim)' }}>|</span>
            <span>T·CONSTR: <span style={{ color: '#C8860A' }}>{block.constructionTimeAs.toFixed(0)}as</span></span>
            <span style={{ color: 'var(--border-dim)' }}>|</span>
            <span>G·WEIGHT: <span style={{ color: '#C8860A' }}>{fmtF(block.godelStats.weight, 1)}b</span></span>
            <span style={{ color: 'var(--border-dim)' }}>|</span>
            <span>i⁴: <span style={{ color: '#3A7A8C' }}>{fmtF(block.godelStats.i4Cycles, 2)}</span></span>
          </div>

          {/* ── Triple Normalization ── */}
          <div style={{ color: 'var(--primary)', fontSize: 8, marginBottom: 3 }}>TRIPLE NORMALIZATION</div>
          <div style={{ marginBottom: 6, borderBottom: '1px solid var(--border-dim)', paddingBottom: 4 }}>
            {/* Harmonic */}
            <div style={{ color: 'var(--text-dim)', marginBottom: 2 }}>
              <span style={chipStyle}>HARMONIC GCD(3)</span>
              {block.tripleNorms.slice(0, 6).map((tn, i) => (
                <span key={i} style={{ color: tn.harmonicGCD === 3 ? '#4A7A5A' : '#B87820', marginRight: 4 }}>
                  {tn.harmonicInterval}
                </span>
              ))}
              {block.tripleNorms.length > 6 && <span style={{ color: 'var(--text-dim)' }}>+{block.tripleNorms.length - 6}</span>}
            </div>

            {/* Geometric */}
            <div style={{ color: 'var(--text-dim)', marginBottom: 2 }}>
              <span style={chipStyle}>GEOMETRIC GCD(360)</span>
              {block.tripleNorms.slice(0, 6).map((tn, i) => (
                <span key={i} style={{ color: '#3A7A8C', marginRight: 4 }}>
                  {tn.angularAlignment}°
                </span>
              ))}
            </div>

            {/* Binary Fold */}
            <div style={{ color: 'var(--text-dim)' }}>
              <span style={chipStyle}>BINARY 1001</span>
              <span style={{ color: stitchColor }}>
                FOLD: {fmtPct(block.avgFoldPrevalence)}
              </span>
              <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
              <span style={{ color: stitchColor }}>
                STITCH: {fmtF(block.avgDimensionalStitch, 1)}D
              </span>
            </div>
          </div>

          {/* ── Lost-2 Binding Energy ── */}
          <div style={{ color: 'var(--primary)', fontSize: 8, marginBottom: 3 }}>LOST-2 BINDING ENERGY</div>
          <div style={{ marginBottom: 6, borderBottom: '1px solid var(--border-dim)', paddingBottom: 4 }}>
            <div style={{ color: 'var(--text-dim)' }}>
              LINEAR: <span style={{ color: 'var(--text-mid)' }}>{fmtF(block.lost2.linearPath)}</span>
              <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
              GEOMETRIC: <span style={{ color: 'var(--text-mid)' }}>{fmtF(block.lost2.geometricPath)}</span>
              <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
              BINDING: <span style={{ color: lost2Color }}>{fmtF(block.lost2.bindingEnergy)}</span>
            </div>
            <div style={{ color: 'var(--text-dim)', marginTop: 2 }}>
              RATIO: <span style={{ color: lost2Color }}>{fmtF(block.lost2.bindingRatio, 4)}</span>
              <span style={{ fontSize: 6, marginLeft: 4, color: 'var(--text-dim)' }}>(ideal: 0.2857 = 2/7 dark matter fraction)</span>
            </div>
            <div style={{ color: 'var(--text-dim)', marginTop: 2 }}>
              DEVIATION: <span style={{ color: lost2Color }}>{fmtF(block.lost2.deviationFromIdeal, 4)}</span>
              <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
              MASS GAP: <span style={{ color: massGapColor }}>{fmtF(block.massGap, 6)}</span>
              <span style={{ fontSize: 6, marginLeft: 4, color: 'var(--text-dim)' }}>({'√'}32 - 5)</span>
            </div>
          </div>

          {/* ── Glyph Stream ── */}
          <div style={{ color: 'var(--primary)', fontSize: 8, marginBottom: 3 }}>GLYPH STREAM</div>
          <div style={{ marginBottom: 6, borderBottom: '1px solid var(--border-dim)', paddingBottom: 4 }}>
            <div style={{ fontSize: 10, letterSpacing: 3, lineHeight: '14px' }}>
              {block.glyphs.map((g, i) => (
                <span key={i} style={{
                  color: g.harmonicClass === 0 ? '#B87820' : g.harmonicClass === 1 ? '#3A7A8C' : '#4A7A5A',
                  opacity: g.foldState ? 1 : 0.5,
                }}>
                  {g.symbol}
                </span>
              ))}
              {block.glyphs.length === 0 && <span style={{ color: 'var(--text-dim)' }}>AWAITING DATA...</span>}
            </div>
            <div style={{ fontSize: 6, color: 'var(--text-dim)', marginTop: 2 }}>
              {'◈'}=VOID(mod3=0) {'△'}=STRUCTURE(mod3=1) {'○'}=FLOW(mod3=2) | BRIGHT=FOLDED
            </div>
          </div>

          {/* ── FMN Protocol ── */}
          {fmn && (
            <>
              <div style={{ color: 'var(--primary)', fontSize: 8, marginBottom: 3 }}>FMN PROTOCOL</div>
              <div style={{ marginBottom: 6, borderBottom: '1px solid var(--border-dim)', paddingBottom: 4 }}>
                <div style={{ color: 'var(--text-dim)', fontSize: 6 }}>
                  <span style={chipStyle}>FOLD</span>
                  {fmtF(fmn.fold.w)}w {fmtF(fmn.fold.x)}i {fmtF(fmn.fold.y)}j {fmtF(fmn.fold.z)}k
                </div>
                <div style={{ color: 'var(--text-dim)', fontSize: 6 }}>
                  <span style={chipStyle}>MIRROR</span>
                  {fmtF(fmn.mirror.w)}w {fmtF(fmn.mirror.x)}i {fmtF(fmn.mirror.y)}j {fmtF(fmn.mirror.z)}k
                </div>
                <div style={{ color: '#3A7A8C', fontSize: 6 }}>
                  <span style={chipStyle}>NORM</span>
                  {fmtF(fmn.normalized.w)}w {fmtF(fmn.normalized.x)}i {fmtF(fmn.normalized.y)}j {fmtF(fmn.normalized.z)}k
                </div>
                <div style={{ color: 'var(--text-dim)', fontSize: 6, marginTop: 2 }}>
                  MASS GAP {'Δ'}: <span style={{ color: massGapColor }}>{fmtF(fmn.massGapDelta, 4)}</span>
                  <span style={{ fontSize: 6, marginLeft: 4 }}>(distance from {'√'}32-5 impedance)</span>
                </div>
              </div>
            </>
          )}

          {/* ── Observer Coordinate (§7.2 item 8) ── */}
          <div style={{ color: 'var(--primary)', fontSize: 8, marginBottom: 3 }}>
            OBSERVER COORD <span style={{ fontSize: 6, color: 'var(--text-dim)' }}>(O = 2.5r + 1.5i · 30.96°)</span>
          </div>
          <div style={{ marginBottom: 6, borderBottom: '1px solid var(--border-dim)', paddingBottom: 4 }}>
            <div style={{ color: 'var(--text-dim)', fontSize: 7 }}>
              CENTROID: <span style={{ color: 'var(--text-mid)' }}>
                ({fmtF(block.observerCoord.r, 3)}r, {fmtF(block.observerCoord.i, 3)}i)
              </span>
              <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
              DIST: <span style={{ color: observerColor }}>{fmtF(block.observerDistance, 3)}</span>
              <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
              ALIGN: <span style={{ color: observerColor }}>{fmtPct(block.observerAlignment)}</span>
            </div>
            <div style={{ color: 'var(--text-dim)', fontSize: 6, marginTop: 2 }}>
              CH·A(3): <span style={{ color: 'var(--text-mid)' }}>{fmtF(block.channelA, 2)}</span>
              <span style={{ margin: '0 3px', color: 'var(--border-dim)' }}>|</span>
              CH·B(4): <span style={{ color: 'var(--text-mid)' }}>{fmtF(block.channelB, 2)}</span>
              <span style={{ margin: '0 3px', color: 'var(--border-dim)' }}>|</span>
              CH·C(5): <span style={{ color: 'var(--text-mid)' }}>{fmtF(block.channelC, 2)}</span>
              <span style={{ margin: '0 3px', color: 'var(--border-dim)' }}>|</span>
              Δ: <span style={{ color: block.channelDelta < 0.1 ? '#4A7A5A' : '#B87820' }}>
                {fmtPct(block.channelDelta)}
              </span>
            </div>
          </div>

          {/* ── Binary Diagonal + 42 Signature (§7.2 items 9, 10) ── */}
          <div style={{ color: 'var(--primary)', fontSize: 8, marginBottom: 3 }}>
            BIN·DIAG <span style={{ fontSize: 6, color: 'var(--text-dim)' }}>(θ = arctan(ones/zeros) · 42 = 101010₂)</span>
          </div>
          <div style={{ color: 'var(--text-dim)', fontSize: 7, marginBottom: 6, borderBottom: '1px solid var(--border-dim)', paddingBottom: 4 }}>
            θ·AVG: <span style={{ color: '#3A7A8C' }}>{fmtF(block.avgBinaryDiagonalAngle, 1)}°</span>
            <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
            42·COUNT: <span style={{ color: block.total42Count > 0 ? '#B87820' : 'var(--text-mid)' }}>
              {block.total42Count}
            </span>
            <span style={{ margin: '0 4px', color: 'var(--border-dim)' }}>|</span>
            FOLD·PREV: <span style={{ color: stitchColor }}>{fmtPct(block.avgFoldPrevalence)}</span>
          </div>

          {/* ── Null Ledger — 4-Axis Gauge (§7.1 row 4 Extended Identity) ── */}
          <div style={{ color: 'var(--primary)', fontSize: 8, marginBottom: 3 }}>
            NULL LEDGER <span style={{ fontSize: 6, color: 'var(--text-dim)' }}>(0 = (1+i)/2 + (1-i)/2 − 1 · 0 = 0_C + 0_V)</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 4, marginBottom: 3 }}>
            <div style={{ background: 'rgba(200,134,10,0.05)', padding: '3px 5px', border: '1px solid var(--border-dim)' }}>
              <div style={{ fontSize: 6, color: 'var(--text-dim)', letterSpacing: 1 }}>REAL·½</div>
              <div style={{ fontSize: 10, color: 'var(--text-mid)', fontWeight: 700 }}>{fmtF(block.nullLedger.realHalf, 3)}</div>
            </div>
            <div style={{ background: 'rgba(200,134,10,0.05)', padding: '3px 5px', border: '1px solid var(--border-dim)' }}>
              <div style={{ fontSize: 6, color: 'var(--text-dim)', letterSpacing: 1 }}>IMAG·½</div>
              <div style={{ fontSize: 10, color: 'var(--text-mid)', fontWeight: 700 }}>{fmtF(block.nullLedger.imagHalf, 3)}</div>
            </div>
            <div style={{ background: 'rgba(200,134,10,0.05)', padding: '3px 5px', border: '1px solid var(--border-dim)' }}>
              <div style={{ fontSize: 6, color: 'var(--text-dim)', letterSpacing: 1 }}>OBS·OFF</div>
              <div style={{ fontSize: 10, color: 'var(--text-mid)', fontWeight: 700 }}>{fmtF(block.nullLedger.observerOffset, 3)}</div>
            </div>
            <div style={{ background: 'rgba(200,134,10,0.05)', padding: '3px 5px', border: '1px solid var(--border-dim)' }}>
              <div style={{ fontSize: 6, color: 'var(--text-dim)', letterSpacing: 1 }}>0_V RES</div>
              <div style={{ fontSize: 10, color: 'var(--text-mid)', fontWeight: 700 }}>{fmtF(block.nullLedger.bifurcationResidual, 3)}</div>
            </div>
          </div>
          <div style={{ color: 'var(--text-dim)', fontSize: 7 }}>
            Σ·TOTAL: <span style={{ color: ledgerColor, fontWeight: 700 }}>{fmtF(block.nullLedger.total, 4)}</span>
            <span style={{ fontSize: 6, marginLeft: 4, color: 'var(--text-dim)' }}>(target: 0 — Extended Null Ledger Identity)</span>
          </div>
        </div>
      )}
    </div>
  )
}
