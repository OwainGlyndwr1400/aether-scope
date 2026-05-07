import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { useStore } from '../store/useStore'
import type { GlobeLockTarget } from '../types'

// ═══════════════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════════════
const GLOBE_RADIUS = 5
const ATMOSPHERE_RADIUS = 5.2
const STAR_RADIUS = 40
const STAR_COUNT = 2000
const DEG2RAD = Math.PI / 180
const USER_LAT = 51.5
const USER_LON = -3.2

// ═══════════════════════════════════════════════════════
//  LAT/LON → 3D COORDINATE (exported for GlobeHUD use)
// ═══════════════════════════════════════════════════════
export function latLonToVec3(lat: number, lon: number, radius: number = GLOBE_RADIUS): THREE.Vector3 {
  const phi = lat * DEG2RAD
  const theta = lon * DEG2RAD
  return new THREE.Vector3(
    radius * Math.cos(phi) * Math.cos(theta),
    radius * Math.sin(phi),
    -radius * Math.cos(phi) * Math.sin(theta)
  )
}

// ═══════════════════════════════════════════════════════
//  LOCK HELPER — toggle lock on a globe target
// ═══════════════════════════════════════════════════════
function toggleGlobeLock(target: GlobeLockTarget) {
  const store = useStore.getState()
  const current = store.lockedGlobeTarget
  if (current && current.kind === target.kind && current.id === target.id) {
    store.setLockedGlobeTarget(null)
    store.addLog({ type: 'SYS', source: 'GLOBE', message: `Target unlocked: ${target.name}` })
  } else {
    store.setLockedGlobeTarget(target)
    store.addLog({ type: 'DATA', source: 'GLOBE', message: `TARGET LOCK: ${target.name} [${target.kind.toUpperCase()}] — ${target.lat.toFixed(2)}°, ${target.lon.toFixed(2)}°` })
  }
}

// ═══════════════════════════════════════════════════════
//  IMPROVED CONTINENT OUTLINES — ~3x more waypoints
//  Format: [lat, lon] pairs forming closed polylines
// ═══════════════════════════════════════════════════════
const CONTINENTS: number[][][] = [
  // ── NORTH AMERICA ──
  [
    [60,-140],[62,-150],[64,-165],[66,-168],[70,-165],[72,-160],[72,-150],[72,-140],
    [72,-130],[72,-120],[70,-115],[70,-100],[68,-95],[65,-88],[62,-82],[60,-78],
    [56,-70],[52,-60],[48,-58],[46,-60],[44,-63],[43,-66],[42,-70],[41,-72],
    [40,-74],[38,-75],[35,-76],[32,-80],[30,-82],[28,-82],[26,-80],[25,-80],
    [24,-82],[22,-84],[20,-87],[18,-88],[18,-91],[20,-97],[22,-100],[25,-100],
    [28,-96],[30,-95],[30,-100],[28,-105],[26,-110],[28,-112],[30,-115],
    [32,-117],[34,-118],[36,-121],[38,-123],[40,-124],[42,-124],[44,-124],
    [46,-124],[48,-125],[50,-127],[52,-128],[54,-130],[56,-133],[58,-136],
    [60,-140],
  ],
  // ── CENTRAL AMERICA & CARIBBEAN (bridge) ──
  [
    [18,-88],[16,-86],[14,-84],[12,-82],[10,-80],[9,-79],[8,-78],[8,-77],
    [9,-76],[10,-75],[10,-73],[9,-70],[10,-68],[12,-68],[14,-70],[16,-86],[18,-88],
  ],
  // ── SOUTH AMERICA ──
  [
    [12,-72],[10,-75],[8,-77],[6,-77],[4,-77],[2,-78],[0,-80],[-2,-80],
    [-4,-78],[-6,-77],[-8,-75],[-10,-76],[-12,-77],[-14,-76],[-16,-73],
    [-18,-70],[-20,-65],[-22,-62],[-24,-58],[-26,-54],[-28,-50],[-30,-48],
    [-32,-50],[-34,-52],[-36,-55],[-38,-58],[-40,-62],[-42,-63],[-44,-65],
    [-46,-68],[-48,-70],[-50,-72],[-52,-70],[-54,-68],[-55,-66],[-55,-64],
    [-52,-60],[-48,-58],[-44,-56],[-40,-52],[-36,-48],[-34,-44],[-30,-42],
    [-26,-38],[-22,-36],[-18,-34],[-14,-36],[-10,-36],[-8,-34],[-6,-35],
    [-4,-36],[-2,-38],[0,-42],[0,-48],[2,-50],[4,-52],[5,-55],[6,-58],
    [7,-60],[8,-62],[9,-65],[10,-68],[11,-70],[12,-72],
  ],
  // ── EUROPE ──
  [
    [36,-10],[37,-8],[38,-6],[37,-2],[38,0],[39,2],[40,3],[42,3],
    [43,4],[44,5],[44,8],[46,6],[47,5],[48,2],[49,0],[50,-2],[50,-5],
    [51,-5],[52,-5],[53,-4],[54,-1],[55,0],[55,8],[54,10],[55,12],
    [56,10],[57,12],[58,12],[59,10],[60,12],[61,10],[63,10],[64,12],
    [66,14],[68,16],[70,20],[70,24],[70,28],[68,30],[66,28],[64,26],
    [62,24],[60,22],[58,22],[56,20],[54,18],[52,20],[50,18],[48,16],
    [47,14],[46,14],[44,14],[42,16],[42,18],[40,20],[40,24],[38,24],
    [36,24],[35,22],[38,18],[40,16],[40,14],[38,10],[37,6],[36,2],
    [36,-2],[36,-6],[36,-10],
  ],
  // ── AFRICA ──
  [
    [37,10],[35,0],[35,-5],[35,-10],[33,-8],[31,-10],[30,-10],[28,-12],
    [26,-14],[24,-16],[22,-17],[20,-17],[18,-16],[16,-16],[14,-17],
    [12,-16],[10,-14],[8,-12],[6,-10],[5,-8],[4,-5],[4,-2],[4,2],
    [4,6],[4,8],[2,10],[0,10],[-2,10],[-4,12],[-6,12],[-8,14],
    [-10,14],[-12,16],[-14,18],[-16,20],[-18,22],[-20,24],[-22,25],
    [-24,26],[-26,28],[-28,28],[-30,28],[-32,28],[-34,26],[-34,22],
    [-34,18],[-32,16],[-30,16],[-28,14],[-26,14],[-24,14],[-22,14],
    [-20,12],[-18,12],[-16,12],[-14,12],[-12,14],[-10,14],[-8,14],
    [-6,14],[-4,10],[-2,10],[0,10],[0,12],[2,14],[2,18],[4,20],
    [4,26],[4,30],[6,32],[8,34],[10,38],[12,44],[14,48],[16,50],
    [18,50],[20,48],[22,44],[24,40],[26,38],[28,36],[30,34],[32,32],
    [34,28],[35,24],[36,18],[37,14],[37,10],
  ],
  // ── ASIA ──
  [
    [70,30],[72,40],[74,50],[76,60],[76,70],[76,80],[76,100],[76,110],
    [74,120],[72,130],[72,140],[70,150],[68,162],[66,170],[64,172],
    [62,165],[60,160],[58,155],[56,145],[54,138],[52,135],[50,132],
    [48,135],[46,138],[44,135],[42,132],[40,130],[38,128],[36,128],
    [34,126],[32,122],[30,120],[28,120],[26,120],[24,118],[22,114],
    [20,110],[18,108],[16,108],[14,108],[12,108],[10,106],[8,106],
    [6,104],[4,104],[2,104],[0,104],[-2,106],[-4,108],[-6,108],
    [-8,110],[-8,115],[-6,116],[-4,115],[-2,112],[0,110],[2,108],
    [4,106],[6,106],[6,110],[8,112],[10,114],[12,118],[14,120],
    [16,120],[18,118],[20,114],[20,110],[22,108],[24,108],[26,104],
    [28,98],[28,90],[26,88],[24,88],[22,88],[20,86],[18,80],[20,75],
    [22,70],[24,68],[26,66],[28,62],[30,58],[32,52],[34,48],[36,44],
    [38,40],[40,38],[42,36],[44,38],[46,40],[48,42],[50,44],
    [52,48],[54,52],[56,56],[58,58],[60,56],[62,48],[64,42],
    [66,38],[68,34],[70,30],
  ],
  // ── AUSTRALIA ──
  [
    [-14,128],[-12,132],[-12,136],[-14,136],[-14,140],[-18,142],
    [-20,146],[-24,150],[-28,153],[-30,153],[-32,152],[-34,151],
    [-36,150],[-38,148],[-38,146],[-36,140],[-36,138],[-36,136],
    [-34,134],[-34,132],[-32,128],[-30,126],[-28,122],[-26,118],
    [-24,114],[-22,114],[-20,116],[-18,120],[-16,124],[-14,128],
  ],
  // ── TASMANIA ──
  [[-42,146],[-44,146],[-44,148],[-42,148],[-42,146]],
  // ── NEW ZEALAND (North Island) ──
  [[-35,174],[-37,175],[-38,176],[-40,176],[-42,175],[-41,174],[-39,174],[-37,174],[-35,174]],
  // ── NEW ZEALAND (South Island) ──
  [[-42,172],[-44,169],[-46,167],[-46,170],[-44,172],[-42,172]],
  // ── UK — GREAT BRITAIN ──
  [
    [50,-5],[50,-4],[50,-2],[51,0],[51,1],[52,2],[53,1],[53,0],
    [54,-1],[54,-3],[55,-3],[55,-2],[56,-3],[57,-4],[57,-6],
    [58,-5],[58,-3],[57,0],[57,-2],[58,-5],[58,-6],[57,-6],
    [56,-6],[55,-5],[54,-5],[53,-4],[52,-5],[51,-5],[50,-5],
  ],
  // ── IRELAND ──
  [
    [52,-10],[52.5,-10],[53,-10],[53.5,-9.5],[54,-8],[54.5,-7.5],
    [55,-7.5],[55,-6.5],[54,-6],[53.5,-6],[53,-6],[52.5,-7],
    [52,-8],[51.5,-9.5],[52,-10],
  ],
  // ── JAPAN ──
  [
    [31,131],[33,132],[35,135],[37,137],[39,140],[41,140],[43,141],
    [44,142],[45,142],[44,144],[43,145],[42,143],[40,140],[38,139],
    [36,137],[34,134],[32,131],[31,131],
  ],
  // ── INDONESIA (Sumatra/Java simplified) ──
  [
    [6,95],[4,98],[2,100],[0,104],[-2,106],[-4,106],[-6,106],
    [-6,108],[-8,112],[-8,114],[-7,116],[-8,118],[-8,115],
    [-6,112],[-4,108],[-2,106],[0,104],[2,102],[4,100],[6,95],
  ],
  // ── MADAGASCAR ──
  [
    [-12,49],[-14,48],[-16,46],[-18,44],[-20,44],[-22,44],
    [-24,46],[-26,46],[-24,48],[-22,48],[-20,48],[-18,50],
    [-16,50],[-14,50],[-12,49],
  ],
  // ── GREENLAND ──
  [
    [76,-18],[78,-20],[80,-22],[82,-28],[83,-36],[82,-44],[80,-52],
    [78,-56],[76,-62],[74,-58],[72,-55],[70,-52],[68,-50],[66,-46],
    [64,-44],[62,-44],[60,-44],[60,-48],[62,-50],[64,-52],[68,-54],
    [70,-52],[72,-50],[74,-48],[76,-42],[76,-36],[76,-28],[76,-22],[76,-18],
  ],
  // ── ICELAND ──
  [[64,-22],[65,-24],[66,-22],[66,-18],[65,-14],[64,-14],[63,-16],[64,-20],[64,-22]],
  // ── SRI LANKA ──
  [[10,80],[8,80],[7,80],[6,81],[7,82],[8,82],[10,80]],
  // ── SCANDINAVIA (Norway/Sweden/Finland - separate for detail) ──
  [
    [56,12],[58,12],[60,10],[62,6],[64,10],[66,14],[68,16],
    [70,20],[70,26],[68,28],[66,26],[64,24],[62,22],
    [60,20],[58,18],[56,16],[56,12],
  ],
  // ── ANTARCTICA (main body — rough circle with indentations) ──
  [
    [-70,170],[-68,180],[-67,-170],[-66,-160],[-66,-150],[-68,-140],
    [-70,-130],[-72,-120],[-74,-110],[-74,-100],[-72,-90],[-70,-80],
    [-68,-70],[-66,-62],[-65,-60],[-64,-58],[-63,-56],
    [-65,-50],[-67,-45],[-70,-40],[-72,-30],[-74,-20],[-74,-10],
    [-72,0],[-70,10],[-68,20],[-68,30],[-70,40],[-72,50],
    [-70,60],[-68,70],[-66,80],[-66,90],[-68,100],[-70,110],
    [-72,120],[-72,130],[-70,140],[-68,150],[-68,160],[-70,170],
  ],
  // ── ANTARCTIC PENINSULA (extends toward South America) ──
  [
    [-63,-56],[-62,-58],[-63,-60],[-64,-62],[-65,-64],[-66,-64],
    [-68,-66],[-70,-68],[-72,-70],[-74,-72],[-74,-70],[-72,-68],
    [-70,-65],[-68,-62],[-66,-60],[-65,-60],[-64,-58],[-63,-56],
  ],
]

// ═══════════════════════════════════════════════════════
//  GRID LINES (lat/lon every 30°)
// ═══════════════════════════════════════════════════════
function buildGridGeometry(): THREE.BufferGeometry {
  const points: number[] = []
  const segments = 96

  // Latitude lines
  for (let lat = -60; lat <= 60; lat += 30) {
    for (let i = 0; i <= segments; i++) {
      const lon = (i / segments) * 360 - 180
      const v = latLonToVec3(lat, lon, GLOBE_RADIUS + 0.01)
      points.push(v.x, v.y, v.z)
    }
  }
  // Longitude lines
  for (let lon = -180; lon < 180; lon += 30) {
    for (let i = 0; i <= segments; i++) {
      const lat = (i / segments) * 180 - 90
      const v = latLonToVec3(lat, lon, GLOBE_RADIUS + 0.01)
      points.push(v.x, v.y, v.z)
    }
  }
  // Equator (thicker, separate)
  for (let i = 0; i <= segments; i++) {
    const lon = (i / segments) * 360 - 180
    const v = latLonToVec3(0, lon, GLOBE_RADIUS + 0.015)
    points.push(v.x, v.y, v.z)
  }
  // Tropics + Arctic/Antarctic circles
  for (const lat of [23.4, -23.4, 66.5, -66.5]) {
    for (let i = 0; i <= segments; i++) {
      const lon = (i / segments) * 360 - 180
      const v = latLonToVec3(lat, lon, GLOBE_RADIUS + 0.012)
      points.push(v.x, v.y, v.z)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
  return geo
}

// ═══════════════════════════════════════════════════════
//  CONTINENT LINE GEOMETRY
// ═══════════════════════════════════════════════════════
function buildContinentGeometry(): THREE.BufferGeometry {
  const points: number[] = []
  for (const path of CONTINENTS) {
    for (let i = 0; i < path.length - 1; i++) {
      const [lat1, lon1] = path[i]
      const [lat2, lon2] = path[i + 1]
      const steps = 6 // more interpolation for smoother curves
      for (let s = 0; s <= steps; s++) {
        const t = s / steps
        const lat = lat1 + (lat2 - lat1) * t
        const lon = lon1 + (lon2 - lon1) * t
        const v = latLonToVec3(lat, lon, GLOBE_RADIUS + 0.02)
        points.push(v.x, v.y, v.z)
        if (s > 0 && s < steps) points.push(v.x, v.y, v.z)
      }
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
  return geo
}

// ═══════════════════════════════════════════════════════
//  STARFIELD — static points on a large sphere
// ═══════════════════════════════════════════════════════
function buildStarGeometry(): THREE.BufferGeometry {
  const positions = new Float32Array(STAR_COUNT * 3)
  const sizes = new Float32Array(STAR_COUNT)
  for (let i = 0; i < STAR_COUNT; i++) {
    // Uniform distribution on sphere surface
    const u = Math.random()
    const v = Math.random()
    const theta = 2 * Math.PI * u
    const phi = Math.acos(2 * v - 1)
    positions[i * 3] = STAR_RADIUS * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = STAR_RADIUS * Math.sin(phi) * Math.sin(theta)
    positions[i * 3 + 2] = STAR_RADIUS * Math.cos(phi)
    sizes[i] = 0.3 + Math.random() * 1.2
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1))
  return geo
}

const starVertexShader = `
  attribute float size;
  varying float vAlpha;
  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (200.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
    vAlpha = 0.4 + 0.6 * (size / 1.5);
  }
`
const starFragmentShader = `
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float alpha = smoothstep(0.5, 0.1, d) * vAlpha;
    gl_FragColor = vec4(0.8, 0.85, 1.0, alpha);
  }
`

// ═══════════════════════════════════════════════════════
//  SHADERS — Enhanced atmosphere + globe surface
// ═══════════════════════════════════════════════════════
const atmosphereVertexShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const atmosphereFragmentShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  uniform float uTime;
  void main() {
    vec3 viewDir = normalize(-vPosition);
    float rim = 1.0 - dot(viewDir, vNormal);
    float inner = pow(rim, 2.0);
    float outer = pow(rim, 4.0);
    float pulse = 0.8 + 0.2 * sin(uTime * 0.4);
    vec3 innerColor = vec3(0.0, 0.7, 1.0);
    vec3 outerColor = vec3(0.0, 1.0, 0.8);
    vec3 color = mix(innerColor, outerColor, outer);
    float alpha = inner * 0.5 * pulse;
    gl_FragColor = vec4(color, alpha);
  }
`
const globeVertexShader = `
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec2 vUv;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const globeFragmentShader = `
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec2 vUv;
  uniform float uTime;
  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float rim = 1.0 - max(dot(viewDir, vNormal), 0.0);
    rim = pow(rim, 2.0);
    // Deep ocean base
    vec3 base = vec3(0.008, 0.016, 0.035);
    // Brighter rim glow
    vec3 rimColor = vec3(0.0, 0.4, 0.7);
    vec3 color = base + rimColor * rim * 0.5;
    // Horizontal scanlines
    float scanline = sin(vWorldPos.y * 40.0 + uTime * 0.3) * 0.5 + 0.5;
    color += vec3(0.0, 0.06, 0.1) * scanline * 0.15;
    // Subtle hex/grid micro-pattern
    float micro = sin(vUv.x * 200.0) * sin(vUv.y * 200.0) * 0.02;
    color += vec3(0.0, micro, micro);
    gl_FragColor = vec4(color, 1.0);
  }
`

// ═══════════════════════════════════════════════════════
//  POINTER STYLES — cursor changes
// ═══════════════════════════════════════════════════════
function usePointerCursor() {
  return {
    onPointerOver: () => { document.body.style.cursor = 'pointer' },
    onPointerOut: () => { document.body.style.cursor = 'default' },
  }
}

// ═══════════════════════════════════════════════════════
//  LOCK RING — spinning targeting reticle on locked marker
// ═══════════════════════════════════════════════════════
function LockReticle({ position }: { position: THREE.Vector3 }) {
  const outerRef = useRef<THREE.Mesh>(null!)
  const innerRef = useRef<THREE.Mesh>(null!)

  const normal = position.clone().normalize()
  const isOrigin = normal.length() < 0.01

  const quaternion = useMemo(() => {
    if (isOrigin) return new THREE.Quaternion()
    const q = new THREE.Quaternion()
    q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal)
    return q
  }, [normal, isOrigin])

  useFrame((_, delta) => {
    if (outerRef.current) outerRef.current.rotation.z += delta * 1.5
    if (innerRef.current) innerRef.current.rotation.z -= delta * 2.5
  })

  return (
    <group position={position} quaternion={quaternion}>
      <mesh ref={outerRef}>
        <ringGeometry args={[0.3, 0.34, 4]} />
        <meshBasicMaterial color="#3A7A8C" transparent opacity={0.9} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={innerRef}>
        <ringGeometry args={[0.22, 0.25, 6]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.7} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

// ═══════════════════════════════════════════════════════
//  MARKER LABEL — small HTML tag floating above markers
// ═══════════════════════════════════════════════════════
function MarkerLabel({ text, color = '#3A7A8C', offset = [0, 0.3, 0] }: {
  text: string; color?: string; offset?: [number, number, number]
}) {
  return (
    <Html
      position={offset}
      center
      style={{
        color,
        fontSize: 8,
        fontFamily: '"Courier New", monospace',
        letterSpacing: 1,
        textShadow: `0 0 6px ${color}44`,
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        userSelect: 'none',
      }}
      zIndexRange={[0, 0]}
    >
      {text}
    </Html>
  )
}

// ═══════════════════════════════════════════════════════
//  TELEFORCE BEAM — from ISS to locked target
// ═══════════════════════════════════════════════════════
function GlobeTeleforce() {
  const lockedTarget = useStore((s) => s.lockedGlobeTarget)
  const issPosition = useStore((s) => s.issPosition)
  const teleforceActive = useStore((s) => s.teleforceActive)
  const beamRef = useRef<THREE.Line | null>(null)
  const timeRef = useRef(0)

  const beamObj = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(6), 3))
    const mat = new THREE.LineBasicMaterial({ color: '#3A7A8C', transparent: true, opacity: 0.8 })
    const line = new THREE.Line(geo, mat)
    beamRef.current = line
    return line
  }, [])

  const glowRef = useRef<THREE.Mesh>(null!)

  useFrame((_, delta) => {
    timeRef.current += delta
    if (!lockedTarget || !issPosition || !teleforceActive || !beamRef.current) {
      if (beamRef.current) beamRef.current.visible = false
      if (glowRef.current) glowRef.current.visible = false
      return
    }

    const issPos = latLonToVec3(issPosition.latitude, issPosition.longitude, GLOBE_RADIUS + 0.15)
    const targetPos = latLonToVec3(lockedTarget.lat, lockedTarget.lon, GLOBE_RADIUS + 0.05)

    const positions = beamRef.current.geometry.attributes.position as THREE.BufferAttribute
    positions.setXYZ(0, issPos.x, issPos.y, issPos.z)
    positions.setXYZ(1, targetPos.x, targetPos.y, targetPos.z)
    positions.needsUpdate = true
    beamRef.current.visible = true

    const pulse = 0.5 + 0.5 * Math.sin(timeRef.current * 8)
    ;(beamRef.current.material as THREE.LineBasicMaterial).opacity = 0.4 + pulse * 0.6

    if (glowRef.current) {
      const midPoint = new THREE.Vector3().lerpVectors(issPos, targetPos, 0.5)
      const distance = issPos.distanceTo(targetPos)
      glowRef.current.position.copy(midPoint)
      glowRef.current.lookAt(targetPos)
      glowRef.current.scale.set(0.04 + pulse * 0.03, 0.04 + pulse * 0.03, distance)
      glowRef.current.visible = true
      ;(glowRef.current.material as THREE.MeshBasicMaterial).opacity = 0.2 + pulse * 0.2
    }
  })

  return (
    <>
      <primitive object={beamObj} />
      <mesh ref={glowRef} visible={false}>
        <cylinderGeometry args={[1, 1, 1, 8, 1, true]} />
        <meshBasicMaterial color="#3A7A8C" transparent opacity={0.2} side={THREE.DoubleSide} />
      </mesh>
    </>
  )
}

// ═══════════════════════════════════════════════════════
//  EARTHQUAKE MARKERS — clickable with labels
// ═══════════════════════════════════════════════════════
function EarthquakeMarkers() {
  const earthquakes = useStore((s) => s.earthquakes)
  const lockedTarget = useStore((s) => s.lockedGlobeTarget)
  const pointer = usePointerCursor()

  const markers = useMemo(() => {
    return earthquakes.map((eq) => {
      const pos = latLonToVec3(eq.lat, eq.lon, GLOBE_RADIUS + 0.03)
      const scale = Math.max(0.05, (eq.mag / 9) * 0.2)
      const color = eq.mag >= 6 ? '#A03A2A' : eq.mag >= 4.5 ? '#B87820' : '#C8A848'
      return { ...eq, pos, scale, color }
    })
  }, [earthquakes])

  return (
    <group>
      {markers.map((m) => {
        const isLocked = lockedTarget?.kind === 'earthquake' && lockedTarget.id === m.id
        return (
          <group key={m.id} position={m.pos}>
            {/* Invisible click target */}
            <mesh
              {...pointer}
              onClick={(e) => {
                e.stopPropagation()
                toggleGlobeLock({ kind: 'earthquake', id: m.id, name: `M${m.mag.toFixed(1)} — ${m.place}`, lat: m.lat, lon: m.lon })
              }}
            >
              <sphereGeometry args={[0.25, 8, 8]} />
              <meshBasicMaterial transparent opacity={0} />
            </mesh>
            {/* Core dot — bigger */}
            <mesh>
              <sphereGeometry args={[m.scale, 12, 12]} />
              <meshBasicMaterial color={m.color} />
            </mesh>
            {/* Pulsing ring */}
            <EqRing color={m.color} scale={m.scale} position={m.pos} />
            {/* Label */}
            <MarkerLabel text={`M${m.mag.toFixed(1)}`} color={m.color} />
            {/* Lock reticle */}
            {isLocked && <LockReticle position={new THREE.Vector3(0, 0, 0)} />}
          </group>
        )
      })}
    </group>
  )
}

function EqRing({ color, scale, position }: { color: string; scale: number; position: THREE.Vector3 }) {
  const ref = useRef<THREE.Mesh>(null!)
  const matRef = useRef<THREE.MeshBasicMaterial>(null!)
  const phaseRef = useRef(Math.random() * Math.PI * 2)

  useFrame((_, delta) => {
    if (!ref.current || !matRef.current) return
    phaseRef.current += delta * 2
    const t = (Math.sin(phaseRef.current) + 1) * 0.5
    ref.current.scale.setScalar(1 + t * 3)
    matRef.current.opacity = 0.6 * (1 - t)
  })

  const normal = position.clone().normalize()
  const quaternion = useMemo(() => {
    const q = new THREE.Quaternion()
    q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal)
    return q
  }, [normal])

  return (
    <mesh ref={ref} quaternion={quaternion}>
      <ringGeometry args={[scale * 1.5, scale * 2.2, 32]} />
      <meshBasicMaterial ref={matRef} color={color} transparent side={THREE.DoubleSide} />
    </mesh>
  )
}

// ═══════════════════════════════════════════════════════
//  ISS MARKER — clickable with label
// ═══════════════════════════════════════════════════════
function ISSMarker() {
  const issPosition = useStore((s) => s.issPosition)
  const lockedTarget = useStore((s) => s.lockedGlobeTarget)
  const ref = useRef<THREE.Group>(null!)
  const trailLine = useRef<THREE.Line | null>(null)
  const trailPositions = useRef<number[]>([])
  const maxTrail = 120
  const pointer = usePointerCursor()

  const trailObj = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(maxTrail * 3), 3))
    geo.setDrawRange(0, 0)
    const mat = new THREE.LineBasicMaterial({ color: '#3A7A8C', transparent: true, opacity: 0.5 })
    const line = new THREE.Line(geo, mat)
    trailLine.current = line
    return line
  }, [])

  useFrame(() => {
    if (!issPosition || !ref.current) return
    const pos = latLonToVec3(issPosition.latitude, issPosition.longitude, GLOBE_RADIUS + 0.15)
    ref.current.position.copy(pos)

    trailPositions.current.push(pos.x, pos.y, pos.z)
    if (trailPositions.current.length > maxTrail * 3) {
      trailPositions.current = trailPositions.current.slice(-maxTrail * 3)
    }
    if (trailLine.current && trailPositions.current.length >= 6) {
      const geo = trailLine.current.geometry
      geo.setAttribute('position', new THREE.Float32BufferAttribute(trailPositions.current, 3))
      geo.setDrawRange(0, trailPositions.current.length / 3)
    }
  })

  if (!issPosition) return null

  const isLocked = lockedTarget?.kind === 'iss'

  return (
    <>
      <group ref={ref}>
        {/* Click target */}
        <mesh
          {...pointer}
          onClick={(e) => {
            e.stopPropagation()
            toggleGlobeLock({
              kind: 'iss', id: 'iss-25544',
              name: `ISS — ALT ${issPosition.altitude}km VEL ${issPosition.velocity}km/h`,
              lat: issPosition.latitude, lon: issPosition.longitude,
            })
          }}
        >
          <sphereGeometry args={[0.3, 8, 8]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
        {/* ISS core — brighter, bigger */}
        <mesh>
          <sphereGeometry args={[0.1, 12, 12]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        {/* Glow halo — bigger */}
        <mesh>
          <sphereGeometry args={[0.2, 12, 12]} />
          <meshBasicMaterial color="#3A7A8C" transparent opacity={isLocked ? 0.6 : 0.3} />
        </mesh>
        {/* Label */}
        <MarkerLabel text="ISS" color="#3A7A8C" offset={[0, 0.35, 0]} />
        {isLocked && <LockReticle position={new THREE.Vector3(0, 0, 0)} />}
      </group>
      <primitive object={trailObj} />
    </>
  )
}

// ═══════════════════════════════════════════════════════
//  AIRCRAFT MARKERS — clickable with callsign labels
// ═══════════════════════════════════════════════════════
function AircraftMarkers() {
  const aircraft = useStore((s) => s.aircraft)
  const lockedTarget = useStore((s) => s.lockedGlobeTarget)
  const pointer = usePointerCursor()

  const markers = useMemo(() => {
    return aircraft.map((ac) => {
      const pos = latLonToVec3(ac.latitude, ac.longitude, GLOBE_RADIUS + 0.05 + (ac.altitude / 15000) * 0.2)
      return { ...ac, pos }
    })
  }, [aircraft])

  return (
    <group>
      {markers.map((m, i) => {
        const isLocked = lockedTarget?.kind === 'aircraft' && lockedTarget.id === m.icao24
        const label = m.callsign || m.icao24.slice(0, 6).toUpperCase()
        return (
          <group key={m.icao24 || i} position={m.pos}>
            {/* Click target */}
            <mesh
              {...pointer}
              onClick={(e) => {
                e.stopPropagation()
                toggleGlobeLock({
                  kind: 'aircraft', id: m.icao24,
                  name: `${m.callsign || m.icao24} — ${m.country} ALT ${Math.round(m.altitude)}m HDG ${Math.round(m.heading)}°`,
                  lat: m.latitude, lon: m.longitude,
                })
              }}
            >
              <sphereGeometry args={[0.25, 6, 6]} />
              <meshBasicMaterial transparent opacity={0} />
            </mesh>
            {/* Aircraft dot — bigger */}
            <mesh>
              <sphereGeometry args={[0.06, 8, 8]} />
              <meshBasicMaterial color={isLocked ? '#ffffff' : '#5A8070'} />
            </mesh>
            <AircraftHeading heading={m.heading} position={m.pos} />
            {/* Label */}
            <MarkerLabel text={label} color="#5A8070" offset={[0, 0.25, 0]} />
            {isLocked && <LockReticle position={new THREE.Vector3(0, 0, 0)} />}
          </group>
        )
      })}
    </group>
  )
}

function AircraftHeading({ heading, position }: { heading: number; position: THREE.Vector3 }) {
  const lineObj = useMemo(() => {
    const normal = position.clone().normalize()
    const up = new THREE.Vector3(0, 1, 0)
    const east = new THREE.Vector3().crossVectors(up, normal).normalize()
    const north = new THREE.Vector3().crossVectors(normal, east).normalize()
    const headingRad = heading * DEG2RAD
    const dir = new THREE.Vector3()
      .addScaledVector(north, Math.cos(headingRad))
      .addScaledVector(east, Math.sin(headingRad))
      .normalize()

    const points = new Float32Array([0, 0, 0, dir.x * 0.2, dir.y * 0.2, dir.z * 0.2])
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
    return new THREE.Line(geo, new THREE.LineBasicMaterial({ color: '#5A8070', transparent: true, opacity: 0.7 }))
  }, [heading, position])

  return <primitive object={lineObj} />
}

// ═══════════════════════════════════════════════════════
//  USER LOCATION MARKER — clickable with label
// ═══════════════════════════════════════════════════════
function UserMarker() {
  const lockedTarget = useStore((s) => s.lockedGlobeTarget)
  const ringRef = useRef<THREE.Mesh>(null!)
  const pointer = usePointerCursor()

  useFrame((_, delta) => {
    if (ringRef.current) ringRef.current.rotation.z += delta * 0.5
  })

  const pos = useMemo(() => latLonToVec3(USER_LAT, USER_LON, GLOBE_RADIUS + 0.03), [])
  const normal = useMemo(() => pos.clone().normalize(), [pos])
  const quaternion = useMemo(() => {
    const q = new THREE.Quaternion()
    q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal)
    return q
  }, [normal])

  const isLocked = lockedTarget?.kind === 'user'

  return (
    <group position={pos} quaternion={quaternion}>
      {/* Click target */}
      <mesh
        {...pointer}
        onClick={(e) => {
          e.stopPropagation()
          toggleGlobeLock({ kind: 'user', id: 'user-cymru', name: 'ERYDIR — Cymru (South Wales)', lat: USER_LAT, lon: USER_LON })
        }}
      >
        <sphereGeometry args={[0.25, 6, 6]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      {/* Diamond — bigger */}
      <mesh>
        <octahedronGeometry args={[0.08, 0]} />
        <meshBasicMaterial color="#C8A848" />
      </mesh>
      {/* Rotating ring */}
      <mesh ref={ringRef}>
        <ringGeometry args={[0.14, 0.17, 4]} />
        <meshBasicMaterial color="#C8A848" transparent opacity={0.7} side={THREE.DoubleSide} />
      </mesh>
      {/* Label */}
      <MarkerLabel text="ERYDIR" color="#C8A848" offset={[0, 0.35, 0]} />
      {isLocked && <LockReticle position={new THREE.Vector3(0, 0, 0)} />}
    </group>
  )
}

// ═══════════════════════════════════════════════════════
//  AUTO-ROTATE TO LOCKED TARGET
// ═══════════════════════════════════════════════════════
function AutoRotateToTarget({ globeRef }: { globeRef: React.RefObject<THREE.Group> }) {
  const lockedTarget = useStore((s) => s.lockedGlobeTarget)
  const prevTargetRef = useRef<string | null>(null)

  useFrame(() => {
    if (!globeRef.current || !lockedTarget) return

    const targetKey = `${lockedTarget.kind}-${lockedTarget.id}`
    if (targetKey === prevTargetRef.current) return

    const targetLon = lockedTarget.lon * DEG2RAD
    const desiredY = -targetLon
    const currentY = globeRef.current.rotation.y
    const diff = desiredY - currentY
    const normalized = ((diff + Math.PI) % (Math.PI * 2)) - Math.PI

    if (Math.abs(normalized) > 0.01) {
      globeRef.current.rotation.y += normalized * 0.05
    } else {
      globeRef.current.rotation.y = desiredY
      prevTargetRef.current = targetKey
    }
  })

  return null
}

// ═══════════════════════════════════════════════════════
//  MAIN GLOBE SCENE
// ═══════════════════════════════════════════════════════
export function GlobeScene() {
  const globeRef = useRef<THREE.Group>(null!)
  const atmosphereRef = useRef<THREE.ShaderMaterial>(null!)
  const globeMatRef = useRef<THREE.ShaderMaterial>(null!)
  const timeRef = useRef(0)
  const lockedTarget = useStore((s) => s.lockedGlobeTarget)

  const gridGeo = useMemo(() => buildGridGeometry(), [])
  const continentGeo = useMemo(() => buildContinentGeometry(), [])
  const starGeo = useMemo(() => buildStarGeometry(), [])

  useFrame((_, delta) => {
    timeRef.current += delta
    if (globeRef.current && !lockedTarget) {
      globeRef.current.rotation.y += delta * 0.02
    }
    if (atmosphereRef.current) {
      atmosphereRef.current.uniforms.uTime.value = timeRef.current
    }
    if (globeMatRef.current) {
      globeMatRef.current.uniforms.uTime.value = timeRef.current
    }
  })

  return (
    <>
      {/* ═══ STARFIELD (outside globe rotation group) ═══ */}
      <points geometry={starGeo}>
        <shaderMaterial
          vertexShader={starVertexShader}
          fragmentShader={starFragmentShader}
          transparent
          depthWrite={false}
        />
      </points>

      <group ref={globeRef}>
        <ambientLight intensity={0.5} color="#ffffff" />
        <pointLight position={[10, 8, 5]} intensity={1} color="#3A7A8C" distance={50} />

        {/* Globe sphere */}
        <mesh>
          <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
          <shaderMaterial
            ref={globeMatRef}
            vertexShader={globeVertexShader}
            fragmentShader={globeFragmentShader}
            uniforms={{ uTime: { value: 0 } }}
            polygonOffset
            polygonOffsetFactor={1}
            polygonOffsetUnits={1}
          />
        </mesh>

        {/* Atmosphere glow — bigger, more visible */}
        <mesh>
          <sphereGeometry args={[ATMOSPHERE_RADIUS, 64, 64]} />
          <shaderMaterial
            ref={atmosphereRef}
            vertexShader={atmosphereVertexShader}
            fragmentShader={atmosphereFragmentShader}
            uniforms={{ uTime: { value: 0 } }}
            transparent
            side={THREE.BackSide}
            depthWrite={false}
          />
        </mesh>

        {/* Grid lines — brighter */}
        <lineSegments geometry={gridGeo}>
          <lineBasicMaterial color="#0d5580" transparent opacity={0.4} depthWrite={false} />
        </lineSegments>

        {/* Continent outlines — brighter, more visible */}
        <lineSegments geometry={continentGeo}>
          <lineBasicMaterial color="#00ddff" transparent opacity={0.65} depthWrite={false} />
        </lineSegments>

        {/* === INTERACTIVE DATA LAYERS === */}
        <EarthquakeMarkers />
        <ISSMarker />
        <AircraftMarkers />
        <UserMarker />
        <GlobeTeleforce />
        <AutoRotateToTarget globeRef={globeRef} />
      </group>
    </>
  )
}
