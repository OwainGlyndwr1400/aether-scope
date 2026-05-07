const { app, BrowserWindow } = require('electron')
const path = require('path')
const http = require('http')
const https = require('https')
const fs = require('fs')

// ═══════════════════════════════════════════════
//  PORT WALK — Phase 0 stabilize fix
//  Windows holds TCP sockets in TIME_WAIT ~120s
//  after .exe close. Instead of retrying the same
//  port (which falls through to loadFile() and
//  silently kills OpenSky proxy, state sync, and
//  LAN access), walk forward through 3500-3520
//  until we find one free to bind.
// ═══════════════════════════════════════════════
const PORT_START = 3500
const PORT_MAX = 3520
let BOUND_PORT = null  // set after successful bind; consumed by createWindow

// ═══════════════════════════════════════════════
//  SHARED STATE — relayed from host to panels
//  Host (main window) POSTs state here.
//  Panels GET state from here.
// ═══════════════════════════════════════════════
let sharedState = null
let stateTimestamp = 0

// ═══════════════════════════════════════════════
//  MIME TYPES
// ═══════════════════════════════════════════════
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
}

// ═══════════════════════════════════════════════
//  OPENSKY PROXY — forwards /api/opensky/* to
//  opensky-network.org to avoid CORS issues
// ═══════════════════════════════════════════════
function proxyOpenSky(req, res) {
  const targetPath = req.url.replace(/^\/api\/opensky/, '/api')
  const options = {
    hostname: 'opensky-network.org',
    path: targetPath,
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'AETHER_SCOPE/4.0',
    },
  }

  const proxyReq = https.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, {
      ...proxyRes.headers,
      'Access-Control-Allow-Origin': '*',
    })
    proxyRes.pipe(res)
  })

  proxyReq.on('error', (err) => {
    console.error('[PROXY] OpenSky error:', err.message)
    res.writeHead(502, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Proxy error', message: err.message }))
  })

  proxyReq.end()
}

// ═══════════════════════════════════════════════
//  STATE SYNC API
//  POST /api/state — host pushes state
//  GET  /api/state — panels pull state
// ═══════════════════════════════════════════════
function handleStateAPI(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.method === 'POST') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try {
        sharedState = JSON.parse(body)
        stateTimestamp = Date.now()
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end('{"ok":true}')
      } catch {
        res.writeHead(400)
        res.end('{"error":"Invalid JSON"}')
      }
    })
    return
  }

  if (req.method === 'GET') {
    if (!sharedState) {
      res.writeHead(204)
      res.end()
      return
    }
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ state: sharedState, timestamp: stateTimestamp }))
    return
  }

  res.writeHead(405)
  res.end()
}

// ═══════════════════════════════════════════════
//  HTTP SERVER — serves dist/, proxies OpenSky,
//  relays state between host and panels
// ═══════════════════════════════════════════════
function createServer(distDir) {
  return http.createServer((req, res) => {
    // State sync API
    if (req.url && req.url.startsWith('/api/state')) {
      return handleStateAPI(req, res)
    }

    // Proxy OpenSky API requests
    if (req.url && req.url.startsWith('/api/opensky')) {
      return proxyOpenSky(req, res)
    }

    // Static file serving
    let urlPath = (req.url || '/').split('?')[0]
    if (urlPath === '/') urlPath = '/index.html'

    // Prevent directory traversal
    const filePath = path.join(distDir, path.normalize(urlPath))
    if (!filePath.startsWith(distDir)) {
      res.writeHead(403)
      res.end('Forbidden')
      return
    }

    const ext = path.extname(filePath).toLowerCase()

    fs.readFile(filePath, (err, data) => {
      if (err) {
        // SPA fallback
        fs.readFile(path.join(distDir, 'index.html'), (err2, fallback) => {
          if (err2) {
            res.writeHead(404)
            res.end('Not found')
            return
          }
          res.writeHead(200, { 'Content-Type': 'text/html' })
          res.end(fallback)
        })
        return
      }
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' })
      res.end(data)
    })
  })
}

// ═══════════════════════════════════════════════
//  START SERVER — port-walk on EADDRINUSE
//  First free port in [PORT_START, PORT_MAX] wins.
//  Returns { ok, port } so the caller can decide
//  whether to loadURL() the live server or fall
//  back to loadFile() with a loud warning.
// ═══════════════════════════════════════════════
function startPanelServer(distDir) {
  return new Promise((resolve) => {
    const server = createServer(distDir)
    let currentPort = PORT_START

    function tryListen() {
      server.listen(currentPort, '0.0.0.0')
    }

    server.on('listening', () => {
      BOUND_PORT = currentPort
      const nets = require('os').networkInterfaces()
      let lanIP = 'localhost'
      for (const iface of Object.values(nets)) {
        for (const addr of iface) {
          if (addr.family === 'IPv4' && !addr.internal) {
            lanIP = addr.address
            break
          }
        }
      }
      const walked = currentPort - PORT_START
      const walkNote = walked > 0 ? ` (walked +${walked} from ${PORT_START})` : ''
      console.log(`[AETHER_SCOPE] Panel server running at http://${lanIP}:${currentPort}${walkNote}`)
      console.log(`[AETHER_SCOPE] Hub: http://${lanIP}:${currentPort}?panel=hub`)
      console.log(`[AETHER_SCOPE] State sync: POST/GET /api/state`)
      resolve({ ok: true, port: currentPort, lanIP })
    })

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE' && currentPort < PORT_MAX) {
        console.log(`[AETHER_SCOPE] Port ${currentPort} busy (TIME_WAIT), walking to ${currentPort + 1}...`)
        currentPort++
        setImmediate(tryListen)
      } else if (err.code === 'EADDRINUSE') {
        console.error(`[AETHER_SCOPE] FATAL: all ports ${PORT_START}-${PORT_MAX} in use. Panel server cannot bind.`)
        resolve({ ok: false, port: null, lanIP: null })
      } else {
        console.error('[AETHER_SCOPE] Server error:', err)
        resolve({ ok: false, port: null, lanIP: null })
      }
    })

    tryListen()
  })
}

// ═══════════════════════════════════════════════
//  ELECTRON WINDOW
// ═══════════════════════════════════════════════
async function createWindow() {
  const win = new BrowserWindow({
    width: 1920,
    height: 1080,
    title: 'AETHER_SCOPE v4.0',
    icon: path.join(__dirname, '..', 'public', 'favicon.ico'),
    backgroundColor: '#0a0a0f',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
    win.webContents.openDevTools()
  } else {
    const distDir = path.join(__dirname, '..', 'dist')

    if (!fs.existsSync(path.join(distDir, 'index.html'))) {
      console.error('[AETHER_SCOPE] dist/index.html not found! Run "npm run build" first.')
      app.quit()
      return
    }

    // Wait for server to be ready before loading
    const result = await startPanelServer(distDir)

    if (result.ok) {
      win.loadURL(`http://localhost:${result.port}`)
    } else {
      // Degraded mode — ALL server-dependent features are dead here:
      // OpenSky proxy, /api/state sync, LAN hub. Log loudly so the
      // operator knows why the app feels broken.
      console.error('[AETHER_SCOPE] ═══════════════════════════════════════')
      console.error('[AETHER_SCOPE] DEGRADED MODE: file:// fallback active')
      console.error('[AETHER_SCOPE] OpenSky proxy:  OFFLINE')
      console.error('[AETHER_SCOPE] State sync:     OFFLINE')
      console.error('[AETHER_SCOPE] LAN panels:     OFFLINE')
      console.error('[AETHER_SCOPE] Aircraft feed will show stale/no data.')
      console.error('[AETHER_SCOPE] Close the app, wait 60s for TIME_WAIT to clear, relaunch.')
      console.error('[AETHER_SCOPE] ═══════════════════════════════════════')
      win.loadFile(path.join(distDir, 'index.html'))
    }
  }

  win.setMenuBarVisibility(false)
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
