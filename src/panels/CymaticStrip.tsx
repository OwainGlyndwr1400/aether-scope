import { useRef, useEffect, useCallback, useState } from 'react'
import { useStore } from '../store/useStore'
import { quickMetrics } from '../engine/RHCAnalysis'

// ═══════════════════════════════════════════════════════════════
// CYMATIC STRIP — Bottom panels: Oscilloscope + Null Ledger
// ═══════════════════════════════════════════════════════════════

const BUFFER_SIZE = 300          // samples in ring buffer
const SAMPLE_INTERVAL = 50       // ms between samples (20 Hz)
const GRID_DIVISIONS_X = 10
const GRID_DIVISIONS_Y = 8

// ─── RAW mode channels — Awen Grid palette ───
const RAW_CHANNELS = [
  { key: 'signal',    label: 'SIG',  color: '#3A7A8C', glow: '#3A7A8C88' },
  { key: 'coherence', label: 'COH',  color: '#5A8070', glow: '#5A807088' },
  { key: 'entropy',   label: 'ENT',  color: '#8A4A6A', glow: '#8A4A6A88' },
] as const

// ─── RHF mode channels (from RHCAnalysis.quickMetrics) — Awen Grid palette ───
const RHF_CHANNELS = [
  { key: 'phi',       label: 'PHI',  color: '#8C6A3A', glow: '#8C6A3A88' },
  { key: 'fold',      label: 'FOLD', color: '#3A6080', glow: '#3A608088' },
  { key: 'lion',      label: 'LION', color: '#C8860A', glow: '#C8860A88' },
  { key: 'nullLedger',label: 'Σ=0',  color: '#4A7A5A', glow: '#4A7A5A88' },
  { key: 'massGap',   label: 'Δ',    color: '#A03A2A', glow: '#A03A2A88' },
  { key: 'schumann',  label: 'SCH',  color: '#5A8070', glow: '#5A807088' },
] as const

type ScopeMode = 'RAW' | 'RHF'

interface RingBuffer {
  // Raw channels
  signal: Float32Array
  coherence: Float32Array
  entropy: Float32Array
  // RHF channels
  phi: Float32Array
  fold: Float32Array
  lion: Float32Array
  nullLedger: Float32Array
  massGap: Float32Array
  schumann: Float32Array
  ptr: number
}

function createBuffer(): RingBuffer {
  return {
    signal: new Float32Array(BUFFER_SIZE),
    coherence: new Float32Array(BUFFER_SIZE),
    entropy: new Float32Array(BUFFER_SIZE),
    phi: new Float32Array(BUFFER_SIZE),
    fold: new Float32Array(BUFFER_SIZE),
    lion: new Float32Array(BUFFER_SIZE),
    nullLedger: new Float32Array(BUFFER_SIZE),
    massGap: new Float32Array(BUFFER_SIZE),
    schumann: new Float32Array(BUFFER_SIZE),
    ptr: 0,
  }
}

export function CymaticStrip() {
  return (
    <div className="bottom-strip">
      {/* Oscilloscope — real-time waveforms */}
      <div className="panel" style={{ flex: 1 }}>
        <OscilloscopePanel />
      </div>

      {/* Null Ledger — energy duality graph */}
      <div className="panel" style={{ flex: 1 }}>
        <div className="panel-header">
          <span>NULL_LEDGER // PARITY</span>
          <span className="tag">Σ(R+I)=0</span>
        </div>
        <div style={{ height: 'calc(100% - 32px)', padding: '8px 12px' }}>
          <NullLedgerGraph />
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// OSCILLOSCOPE PANEL — RAW + RHF dual mode
// ═══════════════════════════════════════════════════════════════

function OscilloscopePanel() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bufferRef = useRef<RingBuffer>(createBuffer())
  const frameRef = useRef(0)
  const sampleTimerRef = useRef(0)
  const mountedRef = useRef(false)
  const modeRef = useRef<ScopeMode>('RAW')
  const [mode, setMode] = useState<ScopeMode>('RAW')

  // Track visibility per channel (mutable ref for perf)
  const visibleRef = useRef<Record<string, boolean>>({
    signal: true, coherence: true, entropy: true,
    phi: true, fold: true, lion: true, nullLedger: true, massGap: true, schumann: true,
  })

  // Keep modeRef in sync
  useEffect(() => { modeRef.current = mode }, [mode])

  // Sample data from store at fixed intervals
  const sample = useCallback(() => {
    const s = useStore.getState()
    const buf = bufferRef.current
    const idx = buf.ptr % BUFFER_SIZE

    const locked = s.lockedBlipId
      ? s.blips.find((b) => b.id === s.lockedBlipId)
      : null

    if (locked) {
      // Raw readings from locked target
      buf.signal[idx] = locked.signal
      buf.coherence[idx] = locked.coherence * 100  // scale to 0-100
      buf.entropy[idx] = locked.entropy * 100       // scale to 0-100

      // RHF metrics from locked target
      const rhf = quickMetrics(locked, s.foldAngle)
      buf.phi[idx] = rhf.phi
      buf.fold[idx] = rhf.fold
      buf.lion[idx] = rhf.lion
      buf.nullLedger[idx] = rhf.nullLedger
      buf.massGap[idx] = rhf.massGap
      buf.schumann[idx] = rhf.schumann
    } else {
      // Global composite
      const visible = s.blips.filter((b) => b.range < 100)
      if (visible.length > 0) {
        buf.signal[idx] = visible.reduce((a, b) => a + b.signal, 0) / visible.length
        buf.coherence[idx] = (visible.reduce((a, b) => a + b.coherence, 0) / visible.length) * 100
        buf.entropy[idx] = Math.max(...visible.map((b) => b.entropy)) * 100

        // Average RHF metrics across visible blips
        const rhfs = visible.map(b => quickMetrics(b, s.foldAngle))
        buf.phi[idx] = rhfs.reduce((a, r) => a + r.phi, 0) / rhfs.length
        buf.fold[idx] = rhfs.reduce((a, r) => a + r.fold, 0) / rhfs.length
        buf.lion[idx] = rhfs.reduce((a, r) => a + r.lion, 0) / rhfs.length
        buf.nullLedger[idx] = rhfs.reduce((a, r) => a + r.nullLedger, 0) / rhfs.length
        buf.massGap[idx] = rhfs.reduce((a, r) => a + r.massGap, 0) / rhfs.length
        buf.schumann[idx] = rhfs.reduce((a, r) => a + r.schumann, 0) / rhfs.length
      } else {
        // Flatline with subtle noise
        const t = Date.now() * 0.001
        buf.signal[idx] = Math.sin(t * 0.5) * 2 + Math.random() * 1
        buf.coherence[idx] = 50 + Math.sin(t * 0.3) * 3
        buf.entropy[idx] = Math.random() * 5
        buf.phi[idx] = 50 + Math.sin(t * 0.7) * 5
        buf.fold[idx] = 50 + Math.sin(t * 0.4) * 3
        buf.lion[idx] = Math.random() * 5
        buf.nullLedger[idx] = 50 + Math.sin(t * 0.6) * 8
        buf.massGap[idx] = 50 + Math.sin(t * 0.3) * 4
        buf.schumann[idx] = 50 + Math.sin(t * 0.9) * 6
      }
    }

    buf.ptr++
  }, [])

  // Render loop
  const draw = useCallback(() => {
    if (!mountedRef.current) return

    const canvas = canvasRef.current
    if (!canvas) {
      frameRef.current = requestAnimationFrame(draw)
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = canvas.width
    const h = canvas.height
    const buf = bufferRef.current
    const ptr = buf.ptr
    const s = useStore.getState()
    const currentMode = modeRef.current
    const channels = currentMode === 'RAW' ? RAW_CHANNELS : RHF_CHANNELS

    // ─── Background ───
    ctx.fillStyle = '#060709'
    ctx.fillRect(0, 0, w, h)

    // ─── Grid ───
    drawGrid(ctx, w, h)

    // ─── Scope area ───
    const margin = { top: 4, bottom: 16, left: 4, right: 4 }
    const scopeW = w - margin.left - margin.right
    const scopeH = h - margin.top - margin.bottom

    // ─── Draw waveforms ───
    for (const ch of channels) {
      if (!visibleRef.current[ch.key]) continue

      const data = buf[ch.key as keyof RingBuffer] as Float32Array
      const normalize = (v: number) => Math.max(0, Math.min(1, v / 100))

      ctx.strokeStyle = ch.color
      ctx.lineWidth = 1.2
      ctx.shadowColor = ch.glow
      ctx.shadowBlur = 2
      ctx.beginPath()

      for (let i = 0; i < BUFFER_SIZE; i++) {
        const ringIdx = (ptr - BUFFER_SIZE + i + BUFFER_SIZE * 2) % BUFFER_SIZE
        const x = margin.left + (i / (BUFFER_SIZE - 1)) * scopeW
        const val = normalize(data[ringIdx])
        const y = margin.top + scopeH * (1 - val)

        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
      ctx.shadowBlur = 0
    }

    // ─── Trigger line ───
    ctx.strokeStyle = '#2E2C2866'
    ctx.lineWidth = 0.5
    ctx.setLineDash([4, 4])
    const trigY = margin.top + scopeH * 0.5
    ctx.beginPath()
    ctx.moveTo(margin.left, trigY)
    ctx.lineTo(w - margin.right, trigY)
    ctx.stroke()
    ctx.setLineDash([])

    // ─── Channel legend (bottom) ───
    const legendY = h - 4
    let legendX = 6
    ctx.font = '8px "JetBrains Mono", monospace'
    for (const ch of channels) {
      const active = visibleRef.current[ch.key]
      ctx.fillStyle = active ? ch.color : '#2E2C28'

      const currentIdx = (ptr - 1 + BUFFER_SIZE) % BUFFER_SIZE
      const val = (buf[ch.key as keyof RingBuffer] as Float32Array)[currentIdx]

      const text = `${ch.label}:${val.toFixed(1)}`
      ctx.fillText(text, legendX, legendY)
      legendX += ctx.measureText(text).width + 8
    }

    // ─── Target indicator (top right) ───
    const locked = s.lockedBlipId
      ? s.blips.find((b) => b.id === s.lockedBlipId)
      : null

    ctx.font = '8px "JetBrains Mono", monospace'
    if (locked) {
      ctx.fillStyle = '#C8860A'
      const targetText = `◆ ${locked.name}`
      ctx.fillText(targetText, w - ctx.measureText(targetText).width - 6, 12)
      ctx.fillStyle = locked.type === 'NWTN' ? '#B87820' : locked.type === 'LEVY' ? '#3A7A8C' : '#E8E4D8'
      ctx.fillText(locked.type, w - ctx.measureText(locked.type).width - 6, 22)
    } else {
      ctx.fillStyle = '#5C5850'
      const compText = 'COMPOSITE'
      ctx.fillText(compText, w - ctx.measureText(compText).width - 6, 12)
    }

    // ─── Mode badge (top left, inside canvas) ───
    ctx.font = '7px "JetBrains Mono", monospace'
    ctx.fillStyle = currentMode === 'RHF' ? '#7A5A8A' : '#5C5850'
    ctx.fillText(currentMode === 'RHF' ? '◈ RHF ANALYSIS' : '◇ RAW TELEMETRY', 6, 10)

    // ─── Sweep marker ───
    const sweepX = margin.left + ((ptr % BUFFER_SIZE) / BUFFER_SIZE) * scopeW
    ctx.strokeStyle = '#C8860A22'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(sweepX, margin.top)
    ctx.lineTo(sweepX, margin.top + scopeH)
    ctx.stroke()

    // ─── Scale ticks ───
    ctx.font = '7px "JetBrains Mono", monospace'
    ctx.fillStyle = '#5C5850'
    ctx.textAlign = 'right'
    for (let i = 0; i <= 4; i++) {
      const val = (i / 4) * 100
      const y = margin.top + scopeH * (1 - i / 4)
      ctx.fillText(`${val.toFixed(0)}`, w - 2, y + 3)
    }
    ctx.textAlign = 'left'

    frameRef.current = requestAnimationFrame(draw)
  }, [])

  function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.strokeStyle = '#1A1814'
    ctx.lineWidth = 0.5

    for (let i = 1; i < GRID_DIVISIONS_X; i++) {
      const x = (i / GRID_DIVISIONS_X) * w
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke()
    }
    for (let i = 1; i < GRID_DIVISIONS_Y; i++) {
      const y = (i / GRID_DIVISIONS_Y) * h
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
    }

    ctx.strokeStyle = '#26221E'
    ctx.lineWidth = 0.8
    ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke()

    ctx.fillStyle = '#2E2C28'
    for (let ix = 1; ix < GRID_DIVISIONS_X; ix++) {
      for (let iy = 1; iy < GRID_DIVISIONS_Y; iy++) {
        ctx.fillRect((ix / GRID_DIVISIONS_X) * w - 0.5, (iy / GRID_DIVISIONS_Y) * h - 0.5, 1, 1)
      }
    }
  }

  // Setup & teardown
  useEffect(() => {
    mountedRef.current = true
    const canvas = canvasRef.current
    if (canvas) {
      const resize = () => {
        const rect = canvas.parentElement?.getBoundingClientRect()
        if (rect) {
          const scale = window.devicePixelRatio > 1 ? 1.5 : 1
          canvas.width = rect.width * scale
          canvas.height = rect.height * scale
          canvas.style.width = `${rect.width}px`
          canvas.style.height = `${rect.height}px`
        }
      }
      resize()
      window.addEventListener('resize', resize)
      sampleTimerRef.current = window.setInterval(sample, SAMPLE_INTERVAL)
      frameRef.current = requestAnimationFrame(draw)

      return () => {
        mountedRef.current = false
        window.removeEventListener('resize', resize)
        clearInterval(sampleTimerRef.current)
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [sample, draw])

  // Click handler — toggle channels or mode
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const clickY = e.clientY - rect.top
    const clickX = e.clientX - rect.left

    // Top-left click toggles RAW/RHF mode
    if (clickY < 16 && clickX < 120) {
      setMode(prev => prev === 'RAW' ? 'RHF' : 'RAW')
      return
    }

    // Bottom legend click zones — toggle individual channels
    if (clickY > rect.height - 20) {
      const channels = modeRef.current === 'RAW' ? RAW_CHANNELS : RHF_CHANNELS
      const zone = Math.floor((clickX / rect.width) * channels.length)
      if (zone >= 0 && zone < channels.length) {
        const key = channels[zone].key
        visibleRef.current[key] = !visibleRef.current[key]
      }
    }
  }, [])

  const lockedBlip = useStore((s) => s.lockedBlipId ? s.blips.find(b => b.id === s.lockedBlipId) : null)

  return (
    <>
      <div className="panel-header">
        <span>CYMATIC_SCOPE // {mode === 'RAW' ? 'OSCILLOSCOPE' : 'RHF ANALYSIS'}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            className="mode-btn"
            onClick={() => setMode(prev => prev === 'RAW' ? 'RHF' : 'RAW')}
            style={{
              padding: '1px 6px', fontSize: 8, letterSpacing: 1,
              borderColor: mode === 'RHF' ? '#7A5A8A' : 'var(--border-mid)',
              color: mode === 'RHF' ? '#7A5A8A' : 'var(--text-dim)',
            }}
          >
            {mode === 'RAW' ? 'RAW' : 'RHF'}
          </button>
          <span className="tag" style={{
            color: lockedBlip ? 'var(--accent-ink)' : 'var(--ink-tertiary)',
          }}>
            {lockedBlip ? `◆ ${lockedBlip.name}` : 'GLOBAL'}
          </span>
        </span>
      </div>
      <div style={{ height: 'calc(100% - 32px)', position: 'relative' }}>
        <canvas
          ref={canvasRef}
          onClick={handleClick}
          style={{ width: '100%', height: '100%', display: 'block', cursor: 'crosshair' }}
        />
      </div>
    </>
  )
}


// ═══════════════════════════════════════════════════════════════
// NULL LEDGER — R + I ≈ 0 parity graph
// ═══════════════════════════════════════════════════════════════

function NullLedgerGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dataRef = useRef({ real: new Float32Array(200), imag: new Float32Array(200), ptr: 0 })
  const frameRef = useRef(0)
  const mountedRef = useRef(false)

  const draw = useCallback(() => {
    if (!mountedRef.current) return

    const canvas = canvasRef.current
    if (!canvas) { frameRef.current = requestAnimationFrame(draw); return }
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { real, imag } = dataRef.current
    const ptr = dataRef.current.ptr

    // Read from URE-VM null ledger via store (falls back to gentle oscillation when VM idle)
    const vmLedger = useStore.getState().vmLedger
    const t = Date.now() * 0.001
    let r: number, im: number
    if (vmLedger.status !== 'IDLE') {
      // Live URE-VM data — scale for visualisation
      r = vmLedger.real * 30 + Math.random() * 2
      im = vmLedger.imag * 30 + Math.random() * 2
    } else {
      // Idle fallback — gentle breathing oscillation
      r = Math.sin(t * 0.3) * 8 + Math.random() * 2
      im = -r + Math.sin(t * 0.5) * 4 + Math.random() * 1
    }
    real[ptr % 200] = r
    imag[ptr % 200] = im
    dataRef.current.ptr = ptr + 1

    const w = canvas.width
    const h = canvas.height
    ctx.fillStyle = '#060709'
    ctx.fillRect(0, 0, w, h)

    const cy = h / 2
    ctx.strokeStyle = '#26221E'
    ctx.lineWidth = 0.5
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke()

    const drawLine = (data: Float32Array, color: string, glow: string) => {
      ctx.strokeStyle = color
      ctx.lineWidth = 1.2
      ctx.shadowColor = glow
      ctx.shadowBlur = 2
      ctx.beginPath()
      for (let i = 0; i < 200; i++) {
        const idx = ((ptr - 200 + i + 200) % 200)
        const x = (i / 199) * w
        const y = cy - data[idx] * (h / 120)
        if (i === 0) { ctx.moveTo(x, y) } else { ctx.lineTo(x, y) }
      }
      ctx.stroke()
      ctx.shadowBlur = 0
    }

    drawLine(real, '#4A7A5A', '#4A7A5A88')
    drawLine(imag, '#7A5A8A', '#7A5A8A88')

    // Labels
    ctx.font = '9px "JetBrains Mono"'
    ctx.fillStyle = '#4A7A5A'; ctx.fillText('REAL (R)', 4, 12)
    ctx.fillStyle = '#7A5A8A'; ctx.fillText('IMAG (P)', 4, 24)

    // Sum + status
    const sum = real[(ptr - 1 + 200) % 200] + imag[(ptr - 1 + 200) % 200]
    const balanced = Math.abs(sum) < 10
    ctx.fillStyle = balanced ? '#4A7A5A' : '#A03A2A'
    ctx.fillText(`\u03A3: ${sum.toFixed(1)}`, w - 60, 12)

    // VM status indicator — Awen Grid status palette
    const statusColor = vmLedger.status === 'BALANCED' ? '#4A7A5A'
      : vmLedger.status === 'NOMINAL' ? '#3A7A8C'
      : vmLedger.status === 'DRIFT' ? '#B87820'
      : vmLedger.status === 'CRITICAL' ? '#A03A2A'
      : '#5C5850'
    ctx.fillStyle = statusColor
    ctx.fillText(vmLedger.status, w - 60, 24)

    frameRef.current = requestAnimationFrame(draw)
  }, [])

  useEffect(() => {
    mountedRef.current = true
    const canvas = canvasRef.current
    if (canvas) {
      const rect = canvas.parentElement?.getBoundingClientRect()
      if (rect) { canvas.width = rect.width; canvas.height = rect.height }
    }
    frameRef.current = requestAnimationFrame(draw)
    return () => { mountedRef.current = false; cancelAnimationFrame(frameRef.current) }
  }, [draw])

  return (
    <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
  )
}
