import { useStore } from '../store/useStore'

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

function download(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function exportJSON() {
  const s = useStore.getState()
  const payload = {
    exportTime: new Date().toISOString(),
    version: 'AETHER_SCOPE v4.0 (AWEN_PRIME)',
    feedMode: s.feedMode,
    foldAngle: s.foldAngle,
    kelgLock: s.kelgLock,
    teleforceActive: s.teleforceActive,
    spaceWeather: s.spaceWeather,
    earthquakes: s.earthquakes,
    blips: s.blips.map((b) => ({
      id: b.id,
      name: b.name,
      type: b.type,
      bearing: +b.bearing.toFixed(2),
      range: +b.range.toFixed(2),
      signal: +b.signal.toFixed(3),
      coherence: +b.coherence.toFixed(4),
      entropy: +b.entropy.toFixed(4),
      quaternionW: +b.quaternionW.toFixed(5),
      gForce: +b.gForce.toFixed(3),
      isEntangled: b.isEntangled,
      age: +b.age.toFixed(1),
    })),
    logs: s.logs.slice(-50),
  }
  download(JSON.stringify(payload, null, 2), `aether_scope_${timestamp()}.json`, 'application/json')
}

export function exportCSV() {
  const s = useStore.getState()
  const headers = ['ID', 'Name', 'Type', 'Bearing', 'Range', 'Signal', 'Coherence', 'Entropy', 'QuaternionW', 'GForce', 'Entangled', 'Age']
  const rows = s.blips.map((b) =>
    [b.id, b.name, b.type, b.bearing.toFixed(2), b.range.toFixed(2), b.signal.toFixed(3), b.coherence.toFixed(4), b.entropy.toFixed(4), b.quaternionW.toFixed(5), b.gForce.toFixed(3), b.isEntangled, b.age.toFixed(1)].join(',')
  )
  const csv = [headers.join(','), ...rows].join('\n')
  download(csv, `aether_scope_${timestamp()}.csv`, 'text/csv')
}
