import { useState, useRef, useEffect, useCallback } from 'react'
import { useStore } from '../store/useStore'
import { queryLumos, clearConversation } from '../services/aiService'
import { loadNASAData } from '../engine/useSimulation'
import { parseJSONFile, parseJSONLFile, saveChunks, getChunkCount, clearArchive, aiEnhanceChunks, aiEnhanceArchive } from '../services/knowledgeDB'
import { speakIfEnabled, speak, stopSpeech, isTTSEnabled, setTTSEnabled, getTTSVoiceName } from '../services/ttsService'

export function LumosTerminal() {
  const logs = useStore((s) => s.logs)
  const addLog = useStore((s) => s.addLog)
  const activeModel = useStore((s) => s.activeModel)
  const [input, setInput] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [ttsOn, setTtsOn] = useState(isTTSEnabled())
  const logEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const historyRef = useRef<string[]>([])
  const historyIdx = useRef(-1)
  const streamLogId = useRef<string | null>(null)
  const aiUploadMode = useRef(false)

  // Auto-scroll to bottom
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs.length])

  // Update streaming log entry in-place
  const updateStreamLog = useCallback((text: string, done: boolean = false) => {
    const store = useStore.getState()
    const logs = store.logs
    // Find the streaming log entry
    for (let i = logs.length - 1; i >= 0; i--) {
      if (logs[i].source === 'LUMOS' && logs[i].type === 'AI') {
        logs[i].message = done ? text : text + ' ▌'
        // Force re-render by setting logs
        store.logs = [...logs]
        break
      }
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isThinking) return

    const cmd = input.trim()
    addLog({ type: 'CMD', source: 'OPERATOR', message: cmd })

    // Save to command history
    historyRef.current.unshift(cmd)
    if (historyRef.current.length > 50) historyRef.current.pop()
    historyIdx.current = -1
    setInput('')

    // ── Built-in commands ──
    const upper = cmd.toUpperCase()

    if (upper === 'HELP' || upper === '/HELP') {
      addLog({ type: 'SYS', source: 'SYS', message: '═══ LUMOS COMMAND REFERENCE ═══' })
      addLog({ type: 'SYS', source: 'SYS', message: 'SYSTEM_RESET     — Zero-point flush and recalibrate' })
      addLog({ type: 'SYS', source: 'SYS', message: 'TELEFORCE_PING   — Fire Tesla death ray at locked target' })
      addLog({ type: 'SYS', source: 'SYS', message: 'EYE_OF_HORUS     — Reset timeline to 1.0x' })
      addLog({ type: 'SYS', source: 'SYS', message: 'LION_PULSE       — Scalar memory purge' })
      addLog({ type: 'SYS', source: 'SYS', message: '/SET_SPEED <n>   — Set physics time dilation' })
      addLog({ type: 'SYS', source: 'SYS', message: '/REFRESH         — Force NASA NEO data refresh' })
      addLog({ type: 'SYS', source: 'SYS', message: '/STATUS          — Full scope status report' })
      addLog({ type: 'SYS', source: 'SYS', message: '/CLEAR           — Clear terminal log' })
      addLog({ type: 'SYS', source: 'SYS', message: '/HISTORY         — Clear AI conversation memory' })
      addLog({ type: 'SYS', source: 'SYS', message: '/UPLOAD          — Upload JSON (memory) / JSONL (knowledge)' })
      addLog({ type: 'SYS', source: 'SYS', message: '/UPLOAD AI       — Upload + AI-enhance via local LLM' })
      addLog({ type: 'SYS', source: 'SYS', message: '/ENHANCE         — AI-process existing archive chunks' })
      addLog({ type: 'SYS', source: 'SYS', message: '/ARCHIVE         — Show neural archive stats' })
      addLog({ type: 'SYS', source: 'SYS', message: '/PURGE           — Clear entire neural archive' })
      addLog({ type: 'SYS', source: 'SYS', message: `Any other input → AI query via ${activeModel}` })
      return
    }

    if (upper === 'SYSTEM_RESET') {
      addLog({ type: 'SYS', source: 'SYS', message: 'Executing zero-point flush...' })
      addLog({ type: 'SYS', source: 'SYS', message: 'Reference state recalibrated.' })
      return
    }

    if (upper === 'TELEFORCE_PING') {
      addLog({ type: 'ALERT', source: 'RADAR', message: 'TELEFORCE: Global shockwave dispatched.' })
      useStore.getState().setTeleforceActive(true)
      setTimeout(() => useStore.getState().setTeleforceActive(false), 3000)
      return
    }

    if (upper === 'EYE_OF_HORUS') {
      addLog({ type: 'SYS', source: 'SYS', message: 'Timeline stabilized. Speed: 1.0x' })
      useStore.getState().setTimeScale(1.0)
      return
    }

    if (upper === 'LION_PULSE') {
      addLog({ type: 'ALERT', source: 'SYS', message: 'LION_PULSE: Scalar memory purge initiated.' })
      return
    }

    if (upper.startsWith('/SET_SPEED')) {
      const val = parseFloat(upper.split(' ')[1])
      if (!isNaN(val)) {
        useStore.getState().setTimeScale(val)
        addLog({ type: 'SYS', source: 'SYS', message: `Physics dilation set to ${val}x` })
      } else {
        addLog({ type: 'SYS', source: 'SYS', message: 'Usage: /SET_SPEED <number>' })
      }
      return
    }

    if (upper === '/REFRESH') {
      addLog({ type: 'SYS', source: 'NASA', message: 'Manual refresh initiated...' })
      loadNASAData()
      return
    }

    if (upper === '/CLEAR') {
      useStore.getState().clearLogs()
      return
    }

    if (upper === '/HISTORY') {
      clearConversation()
      addLog({ type: 'SYS', source: 'LUMOS', message: 'Conversation memory cleared. Fresh harmonic state.' })
      return
    }

    if (upper === '/UPLOAD AI' || upper === '/UPLOAD_AI') {
      aiUploadMode.current = true
      addLog({ type: 'SYS', source: 'LUMOS', message: 'AI-ENHANCED UPLOAD: Select files. Each chunk will be processed through your local LLM for summary, key points, and anchor extraction.' })
      fileInputRef.current?.click()
      return
    }

    if (upper === '/UPLOAD') {
      aiUploadMode.current = false
      fileInputRef.current?.click()
      return
    }

    if (upper === '/ENHANCE') {
      setIsThinking(true)
      addLog({ type: 'SYS', source: 'LUMOS', message: 'AI ENHANCEMENT: Processing existing archive through local LLM...' })
      try {
        const count = await aiEnhanceArchive((done, total, src) => {
          if (done < total) {
            addLog({ type: 'SYS', source: 'LUMOS', message: `Enhancing [${done + 1}/${total}]: ${src}...` })
          }
        })
        addLog({ type: 'DATA', source: 'LUMOS', message: count > 0
          ? `AI enhancement complete: ${count} chunks enriched with summaries & anchors.`
          : 'All chunks already enhanced. Nothing to process.'
        })
      } catch (err: any) {
        addLog({ type: 'ALERT', source: 'LUMOS', message: `Enhancement failed: ${err.message}. Is LM Studio running?` })
      }
      setIsThinking(false)
      return
    }

    if (upper === '/ARCHIVE') {
      try {
        const { getAllChunks } = await import('../services/knowledgeDB')
        const chunks = await getAllChunks()
        if (chunks.length === 0) {
          addLog({ type: 'SYS', source: 'LUMOS', message: 'Neural Archive empty. Use /UPLOAD to ingest JSON/JSONL files.' })
          return
        }
        const memChunks = chunks.filter(c => c.category === 'memory')
        const knowChunks = chunks.filter(c => c.category === 'knowledge')
        const enhanced = chunks.filter(c => c.summary).length
        const totalTokens = chunks.reduce((sum, c) => sum + c.tokenEstimate, 0)
        const sources = [...new Set(chunks.map(c => c.source))]

        addLog({ type: 'DATA', source: 'LUMOS', message: '═══ NEURAL ARCHIVE STATUS ═══' })
        addLog({ type: 'DATA', source: 'LUMOS', message: `Total: ${chunks.length} chunks (~${totalTokens} tokens)` })
        addLog({ type: 'DATA', source: 'LUMOS', message: `Memory (conversations): ${memChunks.length} chunks from ${[...new Set(memChunks.map(c => c.source))].length} source(s)` })
        addLog({ type: 'DATA', source: 'LUMOS', message: `Knowledge (research): ${knowChunks.length} chunks from ${[...new Set(knowChunks.map(c => c.source))].length} source(s)` })
        addLog({ type: 'DATA', source: 'LUMOS', message: `AI-enhanced: ${enhanced}/${chunks.length} (${enhanced > 0 ? 'summaries + anchors active' : 'run /ENHANCE to process'})` })
        addLog({ type: 'SYS', source: 'LUMOS', message: `Sources: ${sources.slice(0, 8).join(', ')}${sources.length > 8 ? ` +${sources.length - 8} more` : ''}` })
        addLog({ type: 'SYS', source: 'LUMOS', message: `Retrieval: max 15 chunks/query, family cap 4, 60/40 knowledge/memory budget` })
      } catch (err: any) {
        addLog({ type: 'ALERT', source: 'LUMOS', message: `Archive error: ${err.message}` })
      }
      return
    }

    if (upper === '/PURGE') {
      try {
        await clearArchive()
        addLog({ type: 'SYS', source: 'LUMOS', message: 'Neural archive purged. All knowledge chunks cleared.' })
      } catch {
        addLog({ type: 'ALERT', source: 'LUMOS', message: 'Failed to purge archive.' })
      }
      return
    }

    if (upper === '/STATUS') {
      const s = useStore.getState()
      const nwtn = s.blips.filter(b => b.type === 'NWTN').length
      const levy = s.blips.filter(b => b.type === 'LEVY').length
      const cloak = s.blips.filter(b => b.type === 'CLOAK').length
      addLog({ type: 'DATA', source: 'SYS', message: `═══ SCOPE STATUS ═══` })
      addLog({ type: 'DATA', source: 'SYS', message: `Mode: ${s.feedMode} | Model: ${s.activeModel} | Fold: ${s.foldAngle}°` })
      addLog({ type: 'DATA', source: 'SYS', message: `Contacts: ${s.blips.length} (NWTN:${nwtn} LEVY:${levy} CLOAK:${cloak})` })
      addLog({ type: 'DATA', source: 'SYS', message: `KELG: ${s.kelgLock ? 'LOCKED' : 'OFF'} | Teleforce: ${s.teleforceActive ? 'ARMED' : 'OFF'}` })
      if (s.spaceWeather.timestamp) {
        addLog({ type: 'DATA', source: 'NOAA', message: `Space Wx: Kp=${s.spaceWeather.kpIndex} Wind=${s.spaceWeather.solarWind}km/s Bz=${s.spaceWeather.bz}nT` })
      }
      if (s.lockedBlipId) {
        const locked = s.blips.find(b => b.id === s.lockedBlipId)
        if (locked) addLog({ type: 'DATA', source: 'RADAR', message: `Locked: ${locked.name} [${locked.type}] BRG:${locked.bearing.toFixed(1)}° RNG:${locked.range.toFixed(1)}` })
      }
      try {
        const archiveCount = await getChunkCount()
        addLog({ type: 'DATA', source: 'LUMOS', message: `Neural Archive: ${archiveCount} chunks | Model: ${s.activeModel}` })
      } catch {}
      return
    }

    // ── AI Query ──
    setIsThinking(true)
    addLog({ type: 'SYS', source: 'LUMOS', message: `Routing through ${activeModel} harmonic filter...` })

    try {
      if (activeModel === 'LOCAL') {
        // Streaming mode for local models
        addLog({ type: 'AI', source: 'LUMOS', message: '▌' })

        const response = await queryLumos(cmd, (streamText) => {
          updateStreamLog(streamText)
        })

        // Final update without cursor
        updateStreamLog(response, true)
        setIsThinking(false)
        speakIfEnabled(response)
      } else {
        // Non-streaming for API models (Gemini/OpenAI)
        const response = await queryLumos(cmd)

        // Type out character by character
        addLog({ type: 'AI', source: 'LUMOS', message: '▌' })
        let idx = 0
        const interval = setInterval(() => {
          idx += 3
          const partial = response.substring(0, idx)
          const done = idx >= response.length

          updateStreamLog(partial, done)

          if (done) {
            clearInterval(interval)
            setIsThinking(false)
            speakIfEnabled(response)
          }
        }, 15)
      }
    } catch (err: any) {
      setIsThinking(false)
      addLog({ type: 'ALERT', source: 'LUMOS', message: `AI ERROR: ${err.message}` })
      if (err.message.includes('API key') || err.message.includes('key')) {
        addLog({ type: 'SYS', source: 'SYS', message: 'Open Settings (gear icon) to configure your API key.' })
      } else if (err.message.includes('LM Studio')) {
        addLog({ type: 'SYS', source: 'SYS', message: 'Start LM Studio and load a model, then try again.' })
      }
    }
  }

  // ── File upload handler ──
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    for (const file of Array.from(files)) {
      try {
        const text = await file.text()
        const ext = file.name.toLowerCase()

        let chunks
        if (ext.endsWith('.jsonl')) {
          chunks = parseJSONLFile(text, file.name)
        } else if (ext.endsWith('.json')) {
          chunks = parseJSONFile(text, file.name)
        } else {
          addLog({ type: 'ALERT', source: 'LUMOS', message: `Unsupported format: ${file.name}. Use .json or .jsonl` })
          continue
        }

        const totalTokens = chunks.reduce((sum, c) => sum + c.tokenEstimate, 0)
        const category = chunks[0]?.category || 'unknown'
        const categoryLabel = category === 'memory' ? 'MEMORY (Conversation History)' : 'KNOWLEDGE (Dream Pings / Research)'

        addLog({ type: 'DATA', source: 'LUMOS', message: `PARSED: ${file.name} → ${chunks.length} chunks (~${totalTokens} tokens) as ${categoryLabel}` })

        // AI enhancement if requested
        let finalChunks = chunks
        if (aiUploadMode.current) {
          addLog({ type: 'SYS', source: 'LUMOS', message: `AI CHUNKING: Processing ${chunks.length} chunks through local LLM...` })
          try {
            finalChunks = await aiEnhanceChunks(chunks, (done, total, src) => {
              if (done % 5 === 0 || done === total) {
                addLog({ type: 'SYS', source: 'LUMOS', message: `  [${done}/${total}] ${done < total ? src : 'Complete.'}` })
              }
            })
            const enhanced = finalChunks.filter(c => c.summary).length
            addLog({ type: 'DATA', source: 'LUMOS', message: `AI enhanced ${enhanced}/${finalChunks.length} chunks with summaries, anchors & compressed forms.` })
          } catch (err: any) {
            addLog({ type: 'ALERT', source: 'LUMOS', message: `AI enhancement failed: ${err.message}. Saving raw chunks.` })
          }
        }

        const saved = await saveChunks(finalChunks)
        addLog({ type: 'DATA', source: 'LUMOS', message: `ARCHIVED: ${saved} chunks stored.` })
        addLog({ type: 'SYS', source: 'LUMOS', message: category === 'memory'
          ? 'Operator memory integrated. I remember our conversations.'
          : 'Deep knowledge archived. Akashic retrieval active.'
        })
      } catch (err: any) {
        addLog({ type: 'ALERT', source: 'LUMOS', message: `INGEST ERROR: ${file.name} — ${err.message}` })
      }
    }

    // Reset file input
    e.target.value = ''
  }

  // Command history with up/down arrows
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (historyRef.current.length > 0) {
        historyIdx.current = Math.min(historyIdx.current + 1, historyRef.current.length - 1)
        setInput(historyRef.current[historyIdx.current])
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIdx.current > 0) {
        historyIdx.current--
        setInput(historyRef.current[historyIdx.current])
      } else {
        historyIdx.current = -1
        setInput('')
      }
    }
  }

  const formatTime = (ts: number) => {
    const d = new Date(ts)
    return d.toLocaleTimeString('en-GB', { hour12: false }) + '.' + String(d.getMilliseconds()).padStart(3, '0')
  }

  const typeColor: Record<string, string> = {
    SYS: 'var(--text-dim)',
    DATA: 'var(--primary)',
    ALERT: 'var(--alert)',
    CMD: 'var(--secondary)',
    AI: 'var(--accent-violet)',
  }

  // Awen Grid palette — each source a distinct hue at instrument saturation.
  // Deliberately muted; see aesthetic spec §2.7 (blip palette) and §2.3 (accent family).
  const sourceStyle: Record<string, string> = {
    LUMOS:    '#6A4A7A', // desat violet — AI voice
    RADAR:    '#3A7A8C', // desat teal — levy/anomaly return
    SYS:      '#5C5850', // ink-tertiary — system
    OPERATOR: '#C8860A', // instrument amber — operator input
    NASA:     '#4A7A5A', // nominal green — space data
    NOAA:     '#3A6080', // slate blue — atmospheric
    USGS:     '#A03A2A', // alert clay — seismic
    ISS:      '#7A5A8A', // warm violet — orbital
    WX:       '#5A8070', // muted teal-green — weather
    SKY:      '#8A8070', // warm stone — flight
  }

  return (
    <div className="right-wing panel" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="corner-tl" /><div className="corner-tr" />
      <div className="corner-bl" /><div className="corner-br" />
      <div className="panel-scan" />
      <div className="panel-header">
        <span>LUMOS_TERMINAL v4.0</span>
        <span className="tag" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          // {activeModel}{isThinking ? ' ◈ THINKING' : ''}
          <button
            style={{
              background: 'none', border: '1px solid var(--ink-muted)',
              color: ttsOn ? 'var(--status-nominal)' : 'var(--ink-tertiary)',
              fontSize: 8, padding: '1px 5px', cursor: 'pointer',
              letterSpacing: 1, fontFamily: 'inherit',
            }}
            onClick={() => {
              const next = !ttsOn
              setTtsOn(next)
              setTTSEnabled(next)
              if (!next) stopSpeech()
              addLog({ type: 'SYS', source: 'SYS', message: next ? `TTS ON — ${getTTSVoiceName()}` : 'TTS OFF' })
            }}
            title={ttsOn ? 'Voice active — click to mute' : 'Enable voice output'}
          >
            {ttsOn ? 'VOX' : 'VOX'}
          </button>
        </span>
      </div>

      {/* Hidden file input for /UPLOAD */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.jsonl"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileUpload}
      />

      {/* Log area */}
      <div className="panel-body terminal-log" style={{ flex: 1 }}>
        {logs.map((log) => (
          <div key={log.id} className={`entry ${log.type.toLowerCase()}`}>
            <span className="timestamp">{formatTime(log.timestamp)}</span>
            <span style={{
              color: sourceStyle[log.source] || 'var(--text-dim)',
              fontSize: 8,
              letterSpacing: 1,
              marginRight: 6,
              fontWeight: 600,
            }}>
              [{log.source}]
            </span>
            <span style={{
              color: typeColor[log.type] || 'var(--text-mid)',
              whiteSpace: log.type === 'AI' ? 'pre-wrap' : undefined,
            }}>
              {log.message}
            </span>
            {log.type === 'AI' && log.message.length > 2 && (
              <span
                style={{
                  marginLeft: 6, cursor: 'pointer', opacity: 0.4,
                  fontSize: 9, userSelect: 'none',
                }}
                title="Speak this response"
                onClick={() => { stopSpeech(); speak(log.message) }}
              >
                [VOX]
              </span>
            )}
          </div>
        ))}
        <div ref={logEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="terminal-input-row">
        <span className="prompt">LUMOS &gt;</span>
        <input
          ref={inputRef}
          className="terminal-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isThinking ? 'Processing...' : 'COMMAND QUERY...'}
          spellCheck={false}
          autoComplete="off"
          disabled={isThinking}
        />
      </form>
    </div>
  )
}
