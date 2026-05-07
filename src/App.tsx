import { useState, useEffect, useRef, useMemo } from 'react'
import { useStore } from './store/useStore'
import { RadarCore } from './scene/RadarCore'
import { TacticalWing } from './panels/TacticalWing'
import { LumosTerminal } from './panels/LumosTerminal'
import { CymaticStrip } from './panels/CymaticStrip'
import { SettingsModal } from './panels/SettingsModal'
import { FooterBar } from './panels/FooterBar'
import { useSimulation, loadNASAData } from './engine/useSimulation'
import { exportJSON, exportCSV } from './services/exportService'
import {
  startAmbient, toggleMute, isMuted, playModeSwitch,
  playLockTone, startTeleforceSound, stopTeleforceSound, playAlert
} from './services/audioService'
import type { FeedMode } from './types'

// ═══════════════════════════════════════════════════════
//  PANEL ROUTING — ?panel=X shows that panel fullscreen
//  Used for multi-device: each device opens a panel URL
// ═══════════════════════════════════════════════════════
type PanelMode = 'full' | 'radar' | 'globe' | 'terminal' | 'oscilloscope' | 'tactical' | 'hub'

function getPanelMode(): PanelMode {
  const params = new URLSearchParams(window.location.search)
  const panel = params.get('panel')
  if (panel && ['radar', 'globe', 'terminal', 'oscilloscope', 'tactical', 'hub'].includes(panel)) {
    return panel as PanelMode
  }
  return 'full'
}

// ═══════════════════════════════════════════════════════
//  DEVICE HUB — shows available panels + network info
// ═══════════════════════════════════════════════════════
function DeviceHub() {
  const panels = [
    { id: 'full', name: 'COMMAND CENTER', desc: 'Full interface — all panels', icon: '[]' },
    { id: 'radar', name: 'RADAR CORE', desc: 'Radar dish + blip tracking', icon: '(())' },
    { id: 'globe', name: 'GLOBE VIEW', desc: 'Holographic Earth + geospatial data', icon: '<O>' },
    { id: 'terminal', name: 'LUMOS TERMINAL', desc: 'AI chat + system logs', icon: '>_' },
    { id: 'oscilloscope', name: 'OSCILLOSCOPE', desc: 'RAW/RHF waveforms + Null Ledger', icon: '~^~' },
    { id: 'tactical', name: 'TACTICAL WING', desc: 'System status + RHC controls + manifest', icon: '|-|' },
  ]

  const baseUrl = window.location.origin

  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#050810',
      color: '#8899aa',
      fontFamily: 'var(--font-mono, "Courier New", monospace)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 24, padding: 40,
    }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 12 }}>
          <span style={{
            fontFamily: 'var(--font-sigil)',
            color: 'var(--ink-tertiary)',
            fontSize: 18,
            letterSpacing: '0.1em',
          }}>/|\</span>
          <div style={{
            fontFamily: 'var(--font-display)',
            color: 'var(--ink-primary)',
            fontSize: 22,
            letterSpacing: '0.2em',
            fontWeight: 700,
          }}>
            AETHER_SCOPE
            <span style={{
              color: 'var(--ink-tertiary)',
              fontSize: 11,
              letterSpacing: '0.15em',
              marginLeft: 10,
              fontFamily: 'var(--font-mono)',
              fontWeight: 400,
            }}>v4.0</span>
          </div>
        </div>
        <div style={{
          color: 'var(--ink-tertiary)',
          fontSize: 10,
          letterSpacing: '0.12em',
          marginTop: 6,
          fontFamily: 'var(--font-display-cond)',
          textTransform: 'uppercase',
        }}>
          Awen Grid // Multi-Device Panel Server
        </div>
        <div style={{
          color: 'var(--accent-ink)',
          fontSize: 10,
          marginTop: 12,
          letterSpacing: '0.08em',
          fontFamily: 'var(--font-mono)',
        }}>
          NETWORK · {baseUrl}
        </div>
        <div style={{
          color: 'var(--ink-tertiary)',
          fontSize: 9,
          marginTop: 4,
          fontFamily: 'var(--font-display-cond)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}>
          Open any panel URL on any device on your network
        </div>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: 12, width: '100%', maxWidth: 900,
      }}>
        {panels.map((p) => (
          <a
            key={p.id}
            href={p.id === 'full' ? '/' : `?panel=${p.id}`}
            style={{
              display: 'block', textDecoration: 'none', color: 'inherit',
              border: '1px solid var(--ink-muted)',
              background: 'var(--bg-surface)',
              padding: '14px 16px',
              transition: 'border-color 160ms cubic-bezier(0.4, 0.0, 0.6, 1.0), background 160ms cubic-bezier(0.4, 0.0, 0.6, 1.0)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent-border)'
              e.currentTarget.style.background = 'var(--bg-elevated)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--ink-muted)'
              e.currentTarget.style.background = 'var(--bg-surface)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{
                color: 'var(--accent-ink)',
                fontSize: 11,
                letterSpacing: '0.15em',
                fontFamily: 'var(--font-display-cond)',
                fontWeight: 600,
                textTransform: 'uppercase',
              }}>{p.name}</div>
              <div style={{ color: 'var(--ink-tertiary)', fontSize: 14, fontFamily: 'var(--font-mono)' }}>{p.icon}</div>
            </div>
            <div style={{
              color: 'var(--ink-secondary)',
              fontSize: 9,
              marginTop: 6,
              fontFamily: 'var(--font-display-cond)',
              letterSpacing: '0.08em',
            }}>{p.desc}</div>
            <div style={{
              color: 'var(--ink-tertiary)',
              fontSize: 8,
              marginTop: 8,
              letterSpacing: '0.1em',
              borderTop: '1px solid var(--ink-muted)',
              paddingTop: 6,
              fontFamily: 'var(--font-mono)',
            }}>
              {p.id === 'full' ? baseUrl : `${baseUrl}?panel=${p.id}`}
            </div>
          </a>
        ))}
      </div>

      <div style={{
        color: 'var(--ink-muted)',
        fontSize: 9,
        letterSpacing: '0.2em',
        marginTop: 20,
        fontFamily: 'var(--font-sigil)',
        fontStyle: 'italic',
      }}>
        OP · ERYDIR  |  MODE · LUMOS  |  Y LLEW SYN GWYLIO
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
//  STATE SYNC — host pushes, panels pull
//  Keeps all devices showing the same live data
// ═══════════════════════════════════════════════════════
const SYNC_INTERVAL = 2000 // 2 seconds

// Keys to sync (everything except functions and logs for bandwidth)
const SYNC_KEYS = [
  'feedMode', 'foldAngle', 'kelgLock', 'teleforceActive', 'timeScale',
  'blips', 'lockedBlipId', 'spaceWeather', 'earthquakes',
  'issPosition', 'weather', 'aircraft', 'lockedGlobeTarget',
  'physicsLoad', 'vmLedger',
] as const

function useStateSync(panelMode: PanelMode) {
  const isHost = panelMode === 'full'
  const isPanel = panelMode !== 'full' && panelMode !== 'hub'

  useEffect(() => {
    if (!isHost && !isPanel) return

    const interval = setInterval(async () => {
      try {
        if (isHost) {
          // HOST: push state to server
          const store = useStore.getState()
          const snapshot: Record<string, any> = {}
          for (const key of SYNC_KEYS) {
            snapshot[key] = (store as any)[key]
          }
          // Also sync last 30 logs so panels get the terminal feed
          snapshot.logs = store.logs.slice(-30)
          await fetch('/api/state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(snapshot),
          }).catch(() => {})
        } else if (isPanel) {
          // PANEL: pull state from server
          const res = await fetch('/api/state')
          if (res.status === 204) return // no state yet
          if (!res.ok) return
          const { state } = await res.json()
          if (!state) return

          const store = useStore.getState()
          const updates: Record<string, any> = {}
          for (const key of SYNC_KEYS) {
            if (state[key] !== undefined) {
              updates[key] = state[key]
            }
          }
          // Merge logs from host
          if (state.logs && Array.isArray(state.logs)) {
            updates.logs = state.logs
          }
          useStore.setState(updates)
        }
      } catch {}
    }, SYNC_INTERVAL)

    return () => clearInterval(interval)
  }, [isHost, isPanel])
}

export function App() {
  const panelMode = useMemo(() => getPanelMode(), [])
  useStateSync(panelMode)
  // Only run simulation/data fetching on host — panels get state via sync
  const isPanel = panelMode !== 'full' && panelMode !== 'hub'
  useSimulation(!isPanel)
  const feedMode = useStore((s) => s.feedMode)
  const setFeedMode = useStore((s) => s.setFeedMode)
  const setBlips = useStore((s) => s.setBlips)
  const clearLogs = useStore((s) => s.clearLogs)
  const addLog = useStore((s) => s.addLog)
  const [showSettings, setShowSettings] = useState(false)
  const [audioMuted, setAudioMuted] = useState(true)
  const audioStarted = useRef(false)

  // Watch for teleforce toggle — play/stop sound
  const teleforceActive = useStore((s) => s.teleforceActive)
  const prevTeleforce = useRef(false)
  useEffect(() => {
    if (audioStarted.current) {
      if (teleforceActive && !prevTeleforce.current) startTeleforceSound()
      if (!teleforceActive && prevTeleforce.current) stopTeleforceSound()
    }
    prevTeleforce.current = teleforceActive
  }, [teleforceActive])

  // Watch for lock changes — play lock tone
  const lockedBlipId = useStore((s) => s.lockedBlipId)
  const prevLocked = useRef<string | null>(null)
  useEffect(() => {
    if (audioStarted.current && lockedBlipId && lockedBlipId !== prevLocked.current) {
      playLockTone()
    }
    prevLocked.current = lockedBlipId
  }, [lockedBlipId])

  const handleAudioToggle = () => {
    if (!audioStarted.current) {
      startAmbient()
      audioStarted.current = true
      setAudioMuted(false)
      addLog({ type: 'SYS', source: 'SYS', message: 'Audio engine online. Ambient drone active.' })
    } else {
      const nowMuted = toggleMute()
      setAudioMuted(nowMuted)
    }
  }

  const handleModeSwitch = (mode: FeedMode) => {
    if (mode === feedMode) return
    if (audioStarted.current) playModeSwitch()
    setBlips([])
    clearLogs()
    setFeedMode(mode)
    addLog({ type: 'SYS', source: 'SYS', message: `Mode switched to ${mode.replace('_', ' ')}. Scope cleared.` })
    if (mode === 'LIVE_FEED') {
      loadNASAData()
    } else if (mode === 'GLOBE') {
      addLog({ type: 'SYS', source: 'SYS', message: 'Globe view engaged. Geospatial overlay active.' })
      addLog({ type: 'DATA', source: 'GEO', message: 'Plotting: earthquakes (USGS), ISS track, aircraft (OpenSky).' })
    } else {
      addLog({ type: 'SYS', source: 'SYS', message: 'Simulation engine engaged. Spawning targets...' })
    }
  }

  // Auto-set globe mode when panel=globe
  useEffect(() => {
    if (panelMode === 'globe' && feedMode !== 'GLOBE') {
      setFeedMode('GLOBE')
    }
  }, [panelMode])

  // ═══ PANEL MODE: Show single panel fullscreen ═══
  if (panelMode === 'hub') {
    return <DeviceHub />
  }

  if (panelMode !== 'full') {
    const panelStyle: React.CSSProperties = {
      width: '100vw', height: '100vh', background: '#050810', overflow: 'hidden',
    }

    return (
      <div style={panelStyle}>
        {panelMode === 'radar' && <RadarCore />}
        {panelMode === 'globe' && <RadarCore />}
        {panelMode === 'terminal' && <LumosTerminal />}
        {panelMode === 'oscilloscope' && <CymaticStrip />}
        {panelMode === 'tactical' && <TacticalWing />}
      </div>
    )
  }

  // ═══ FULL MODE: Normal command center layout ═══
  return (
    <div className="scope-grid">
      {/* ═══ HEADER BAR ═══ */}
      <header className="header-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span className="awen-sigil" aria-hidden="true">/|\</span>
            <div className="title">
              AETHER_SCOPE<span className="version">v4.0</span>
            </div>
          </div>
          <div className="operator-tag">
            OP: <span className="name">ERYDIR</span>
            <span style={{ margin: '0 8px', color: 'var(--ink-tertiary)' }}>|</span>
            MODE: <span className="name">LUMOS</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="mode-controls">
            {(['SIMULATION', 'LIVE_FEED', 'GLOBE'] as FeedMode[]).map((mode) => (
              <button
                key={mode}
                className={`mode-btn ${feedMode === mode ? 'active' : ''}`}
                onClick={() => handleModeSwitch(mode)}
              >
                {mode.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Export buttons */}
          <button
            className="mode-btn"
            onClick={() => { exportJSON(); addLog({ type: 'SYS', source: 'SYS', message: 'Exported scope state to JSON.' }) }}
            title="Export readings as JSON"
          >
            JSON
          </button>
          <button
            className="mode-btn"
            onClick={() => { exportCSV(); addLog({ type: 'SYS', source: 'SYS', message: 'Exported blip data to CSV.' }) }}
            title="Export blip data as CSV"
          >
            CSV
          </button>

          {/* CLR button */}
          <button
            className="mode-btn"
            onClick={() => {
              setBlips([])
              clearLogs()
              addLog({ type: 'SYS', source: 'SYS', message: 'Scope cleared. Awaiting telemetry...' })
            }}
            title="Clear all data"
          >
            CLR
          </button>

          {/* Audio toggle */}
          <button
            className={`mode-btn ${!audioMuted ? 'active' : ''}`}
            onClick={handleAudioToggle}
            title={audioMuted ? 'Enable audio' : 'Mute audio'}
            style={{ fontSize: 13, padding: '2px 10px' }}
          >
            {audioMuted ? 'MUTE' : 'SND'}
          </button>

          {/* Settings gear */}
          <button
            className="mode-btn"
            onClick={() => setShowSettings(true)}
            style={{ fontSize: 14, padding: '2px 10px' }}
            title="Settings"
          >
            ⚙
          </button>

          {/* Hub link */}
          <a
            href="?panel=hub"
            className="mode-btn"
            style={{ fontSize: 8, padding: '2px 10px', textDecoration: 'none', color: 'inherit' }}
            title="Multi-device panel hub"
          >
            DEVICES
          </a>
        </div>
      </header>

      {/* ═══ LEFT — TACTICAL WING ═══ */}
      <TacticalWing />

      {/* ═══ CENTER — RADAR CORE (Three.js) ═══ */}
      <RadarCore />

      {/* ═══ RIGHT — LUMOS TERMINAL ═══ */}
      <LumosTerminal />

      {/* ═══ BOTTOM — CYMATIC / NULL LEDGER ═══ */}
      <CymaticStrip />

      {/* ═══ FOOTER — Live telemetry status bar ═══ */}
      <FooterBar />

      {/* ═══ SETTINGS MODAL ═══ */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  )
}
