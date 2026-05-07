import { useRef, useEffect, useCallback } from 'react'
import { useStore } from '../store/useStore'
import { analyseBlip } from '../engine/RHCAnalysis'
import type { RHCAnalysis, RHCMetric } from '../engine/RHCAnalysis'
import { ANOMALY_COLORS } from '../engine/RHCConstants'

/**
 * TARGET ANALYSIS PANEL
 * ═══════════════════════════════════════════════════════════════
 * Floating HUD overlay that appears on the radar when a blip is locked.
 * Shows full RHC harmonic analysis: bar chart metrics, overall resonance
 * gauge, null ledger status, and harmonic classification.
 */

export function TargetAnalysis() {
  const lockedBlipId = useStore((s) => s.lockedBlipId)
  const lockedBlip = useStore((s) =>
    s.lockedBlipId ? s.blips.find(b => b.id === s.lockedBlipId) : null
  )
  const foldAngle = useStore((s) => s.foldAngle)
  const analysisRef = useRef<RHCAnalysis | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef(0)
  const mountedRef = useRef(false)

  // Re-analyse whenever the locked blip changes
  useEffect(() => {
    if (!lockedBlip) {
      analysisRef.current = null
      return
    }

    // Update analysis at 10 Hz
    const interval = setInterval(() => {
      const s = useStore.getState()
      const blip = s.blips.find(b => b.id === s.lockedBlipId)
      if (blip) {
        analysisRef.current = analyseBlip(blip, s.foldAngle)
      }
    }, 100)

    // Initial analysis
    analysisRef.current = analyseBlip(lockedBlip, foldAngle)

    return () => clearInterval(interval)
  }, [lockedBlipId])

  // Render loop for the gauge canvas
  const draw = useCallback(() => {
    if (!mountedRef.current) return

    const canvas = canvasRef.current
    if (!canvas || !analysisRef.current) {
      frameRef.current = requestAnimationFrame(draw)
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const a = analysisRef.current
    const w = canvas.width
    const h = canvas.height

    ctx.clearRect(0, 0, w, h)

    // ─── Resonance Arc Gauge ───
    const cx = w / 2
    const cy = h * 0.55
    const radius = Math.min(w, h) * 0.38
    const startAngle = Math.PI * 0.8
    const endAngle = Math.PI * 2.2
    const range = endAngle - startAngle

    // Background arc
    ctx.strokeStyle = '#1A1814'
    ctx.lineWidth = 6
    ctx.beginPath()
    ctx.arc(cx, cy, radius, startAngle, endAngle)
    ctx.stroke()

    // Resonance arc — Awen Grid status palette
    const resonance = a.overallResonance / 100
    const arcEnd = startAngle + range * resonance
    const arcColor = resonance > 0.65 ? '#4A7A5A' : resonance > 0.35 ? '#B87820' : '#A03A2A'

    ctx.strokeStyle = arcColor
    ctx.lineWidth = 6
    ctx.shadowColor = arcColor
    ctx.shadowBlur = 3
    ctx.beginPath()
    ctx.arc(cx, cy, radius, startAngle, arcEnd)
    ctx.stroke()
    ctx.shadowBlur = 0

    // Tick marks around arc
    ctx.strokeStyle = '#26221E'
    ctx.lineWidth = 1
    for (let i = 0; i <= 10; i++) {
      const tickAngle = startAngle + (range * i) / 10
      const inner = radius - 10
      const outer = radius + 4
      ctx.beginPath()
      ctx.moveTo(cx + Math.cos(tickAngle) * inner, cy + Math.sin(tickAngle) * inner)
      ctx.lineTo(cx + Math.cos(tickAngle) * outer, cy + Math.sin(tickAngle) * outer)
      ctx.stroke()
    }

    // Center text — resonance percentage
    ctx.font = '600 22px "IBM Plex Sans", sans-serif'
    ctx.fillStyle = arcColor
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`${a.overallResonance.toFixed(1)}`, cx, cy - 4)

    // Label
    ctx.font = '7px "JetBrains Mono", monospace'
    ctx.fillStyle = '#5C5850'
    ctx.fillText('RESONANCE', cx, cy + 14)

    // Classification below gauge
    ctx.font = '600 9px "IBM Plex Sans", sans-serif'
    ctx.fillStyle = arcColor
    ctx.fillText(a.harmonicSignature, cx, cy + 26)

    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'

    frameRef.current = requestAnimationFrame(draw)
  }, [])

  // Gauge canvas lifecycle
  useEffect(() => {
    mountedRef.current = true
    const canvas = canvasRef.current
    if (canvas) {
      canvas.width = 160
      canvas.height = 120
    }
    frameRef.current = requestAnimationFrame(draw)
    return () => {
      mountedRef.current = false
      cancelAnimationFrame(frameRef.current)
    }
  }, [draw])

  if (!lockedBlip || !lockedBlipId) return null

  const analysis = analysisRef.current
  const typeColor = ANOMALY_COLORS[lockedBlip.type] || '#C8860A'

  return (
    <div style={{
      position: 'absolute',
      top: 8,
      right: 8,
      width: 240,
      maxHeight: 'calc(100% - 16px)',
      background: 'rgba(12, 14, 18, 0.92)',
      border: '1px solid #26221E',
      borderTop: `1px solid ${typeColor}`,
      overflow: 'hidden',
      zIndex: 10,
      display: 'flex',
      flexDirection: 'column',
      backdropFilter: 'blur(4px)',
    }}>
      {/* Corner decorations */}
      <div className="corner-tl" /><div className="corner-tr" />
      <div className="corner-bl" /><div className="corner-br" />

      {/* ═══ HEADER ═══ */}
      <div style={{
        padding: '6px 10px 5px',
        borderBottom: '1px solid #1A1814',
        background: `linear-gradient(180deg, ${typeColor}10 0%, transparent 100%)`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 2,
            color: typeColor,
            textTransform: 'uppercase',
          }}>
            ◆ {lockedBlip.name}
          </div>
          <div style={{ fontSize: 7, color: '#5C5850', letterSpacing: 1 }}>
            RHC HARMONIC ANALYSIS
          </div>
        </div>
        <div style={{
          fontSize: 9,
          fontWeight: 700,
          color: typeColor,
          padding: '1px 6px',
          border: `1px solid ${typeColor}44`,
          letterSpacing: 2,
        }}>
          {lockedBlip.type}
        </div>
      </div>

      {/* ═══ SCROLLABLE CONTENT ═══ */}
      <div style={{
        overflowY: 'auto',
        flex: 1,
        padding: '4px 0',
      }}>

        {/* ─── Raw telemetry row ─── */}
        <div style={{
          display: 'flex',
          gap: 2,
          padding: '4px 8px',
          fontSize: 8,
          letterSpacing: 1,
        }}>
          <TelemetryChip label="SIG" value={lockedBlip.signal.toFixed(1)} color="#3A7A8C" />
          <TelemetryChip label="COH" value={(lockedBlip.coherence * 100).toFixed(0)} color="#4A7A5A" unit="%" />
          <TelemetryChip label="ENT" value={(lockedBlip.entropy * 100).toFixed(0)} color="#8A4A6A" unit="%" />
          <TelemetryChip label="RNG" value={lockedBlip.range.toFixed(0)} color="#6E6A60" />
        </div>

        <div style={{
          display: 'flex',
          gap: 2,
          padding: '2px 8px 4px',
          fontSize: 8,
          letterSpacing: 1,
        }}>
          <TelemetryChip label="BRG" value={`${lockedBlip.bearing.toFixed(0)}°`} color="#6E6A60" />
          <TelemetryChip label="qW" value={lockedBlip.quaternionW.toFixed(3)} color="#7A5A8A" />
          <TelemetryChip label="G" value={lockedBlip.gForce.toFixed(2)} color="#B87820" />
          <TelemetryChip label="AGE" value={`${lockedBlip.age.toFixed(0)}s`} color="#5C5850" />
        </div>

        {/* ─── Gauge ─── */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '0 8px' }}>
          <canvas ref={canvasRef} style={{ width: 160, height: 120 }} />
        </div>

        {/* ─── Null Ledger Status ─── */}
        {analysis && (
          <div style={{
            margin: '0 8px 6px',
            padding: '3px 8px',
            background: '#060709',
            border: `1px solid ${
              analysis.nullLedgerStatus === 'BALANCED' ? '#4A7A5A44' :
              analysis.nullLedgerStatus === 'CRITICAL' ? '#A03A2A44' : '#B8782044'
            }`,
            fontSize: 8,
            letterSpacing: 1,
            display: 'flex',
            justifyContent: 'space-between',
          }}>
            <span style={{ color: '#5C5850' }}>NULL LEDGER</span>
            <span style={{
              color: analysis.nullLedgerStatus === 'BALANCED' ? '#4A7A5A' :
                     analysis.nullLedgerStatus === 'CRITICAL' ? '#A03A2A' : '#B87820',
              fontWeight: 700,
            }}>
              {analysis.nullLedgerStatus.replace('_', ' ')}
            </span>
          </div>
        )}

        {/* ─── Metric bars ─── */}
        {analysis && analysis.metrics.map((m) => (
          <MetricBar key={m.key} metric={m} />
        ))}

        {/* ─── Entanglement indicator ─── */}
        {lockedBlip.isEntangled && (
          <div style={{
            margin: '6px 8px 4px',
            padding: '3px 8px',
            background: '#7A5A8A10',
            border: '1px solid #7A5A8A44',
            fontSize: 8,
            letterSpacing: 2,
            color: '#7A5A8A',
            textAlign: 'center',
            animation: 'pulse-caution 3s ease-in-out infinite',
          }}>
            ◈ QUANTUM ENTANGLED ◈
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Small telemetry chip ───
function TelemetryChip({ label, value, color, unit = '' }: {
  label: string; value: string; color: string; unit?: string
}) {
  return (
    <div style={{
      flex: 1,
      background: '#060709',
      border: '1px solid #1A1814',
      padding: '2px 4px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 7, color: '#5C5850', letterSpacing: 1 }}>{label}</div>
      <div style={{ fontSize: 10, color, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
        {value}{unit}
      </div>
    </div>
  )
}

// ─── Single metric bar ───
function MetricBar({ metric }: { metric: RHCMetric }) {
  const barWidth = Math.max(0, Math.min(100, metric.normalised))

  return (
    <div style={{ padding: '2px 8px', marginBottom: 1 }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: 7,
        letterSpacing: 1,
        marginBottom: 1,
      }}>
        <span style={{ color: metric.color }}>{metric.shortLabel}</span>
        <span style={{ color: '#5C5850' }} title={metric.equation}>{metric.equation}</span>
        <span style={{ color: metric.color, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
          {metric.normalised.toFixed(1)}
        </span>
      </div>
      <div style={{
        height: 3,
        background: '#13161C',
        borderRadius: 1,
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${barWidth}%`,
          height: '100%',
          background: `linear-gradient(90deg, ${metric.color}44, ${metric.color})`,
          borderRadius: 1,
          transition: 'width 0.15s ease',
        }} />
      </div>
    </div>
  )
}
