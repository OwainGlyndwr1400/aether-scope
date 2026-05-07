import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store/useStore'
import type { Blip } from '../types'
import { ANOMALY_COLORS, PHI } from '../engine/RHCConstants'
import { sweepState } from './RadarScene'

interface BlipMeshProps {
  blip: Blip
  radarRadius: number
  foldAngle: number
}

// Reusable vector to avoid allocations in useFrame
const _pos = new THREE.Vector3()

// ── Trail renderer ──
// Renders a fading line from the blip's position history
function BlipTrail({ blipId, radarRadius, type }: { blipId: string; radarRadius: number; type: string }) {
  const trailRef = useRef<THREE.Line>(null!)
  const MAX_TRAIL = 50

  // Pre-allocate geometry buffers
  const { geometry, posAttr, colorAttr } = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const positions = new Float32Array(MAX_TRAIL * 3)
    const colors = new Float32Array(MAX_TRAIL * 4) // RGBA
    const pAttr = new THREE.BufferAttribute(positions, 3)
    const cAttr = new THREE.BufferAttribute(colors, 4)
    pAttr.setUsage(THREE.DynamicDrawUsage)
    cAttr.setUsage(THREE.DynamicDrawUsage)
    geo.setAttribute('position', pAttr)
    geo.setAttribute('color', cAttr)
    geo.setDrawRange(0, 0)
    return { geometry: geo, posAttr: pAttr, colorAttr: cAttr }
  }, [])

  const trailColor = useMemo(() => new THREE.Color(ANOMALY_COLORS[type as keyof typeof ANOMALY_COLORS] || '#C8860A'), [type])

  useFrame(() => {
    const blips = useStore.getState().blips
    const live = blips.find((b) => b.id === blipId)
    if (!live || live.trail.length < 2) {
      geometry.setDrawRange(0, 0)
      return
    }

    const scale = radarRadius / 100
    const trail = live.trail
    const count = Math.min(trail.length, MAX_TRAIL)

    for (let i = 0; i < count; i++) {
      const t = trail[i]
      posAttr.array[i * 3] = t[0] * scale
      posAttr.array[i * 3 + 1] = 0.02
      posAttr.array[i * 3 + 2] = t[2] * scale

      // Fade: oldest = transparent, newest = bright
      const alpha = (i / count) * 0.7
      colorAttr.array[i * 4] = trailColor.r
      colorAttr.array[i * 4 + 1] = trailColor.g
      colorAttr.array[i * 4 + 2] = trailColor.b
      colorAttr.array[i * 4 + 3] = alpha
    }

    posAttr.needsUpdate = true
    colorAttr.needsUpdate = true
    geometry.setDrawRange(0, count)
  })

  return (
    <line ref={trailRef} geometry={geometry}>
      <lineBasicMaterial
        vertexColors
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        linewidth={1}
      />
    </line>
  )
}

export function BlipMesh({ blip, radarRadius, foldAngle }: BlipMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const ringRef = useRef<THREE.Mesh>(null!)
  const glowRef = useRef<THREE.PointLight>(null!)
  const lineRef = useRef<THREE.Mesh>(null!)
  const hitRef = useRef<THREE.Mesh>(null!)
  const pingFlash = useRef(0) // 0-1 intensity from sweep ping

  const color = useMemo(() => new THREE.Color(ANOMALY_COLORS[blip.type]), [blip.type])
  const baseColor = useMemo(() => new THREE.Color(ANOMALY_COLORS[blip.type]), [blip.type])
  const flashColor = useMemo(() => new THREE.Color('#E8E4D8'), []) // warm bone — spec §2.7

  // Size based on type
  const size = blip.type === 'CLOAK' ? 0.12 : blip.type === 'LEVY' ? 0.09 : 0.06

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    if (!meshRef.current) return

    // Read LIVE blip data from the store every frame
    const currentBlips = useStore.getState().blips
    const live = currentBlips.find((b) => b.id === blip.id)
    if (!live) return

    const currentFold = useStore.getState().foldAngle

    // Map blip x/z directly to radar space
    const scale = radarRadius / 100
    const sx = live.x * scale
    const sz = live.z * scale

    // Y lift for anomalies based on fold angle
    const foldFactor = currentFold / 90
    const yBase = 0.05
    const yLift = live.type !== 'NWTN' ? live.coherence * foldFactor * 0.8 : 0
    const sy = yBase + yLift

    _pos.set(sx, sy, sz)
    meshRef.current.position.copy(_pos)

    // ── Sweep ping detection ──
    const blipBearing = ((Math.atan2(sx, -sz) * 180 / Math.PI) + 360) % 360
    const sweepAngle = sweepState.angle
    let angleDiff = Math.abs(blipBearing - sweepAngle)
    if (angleDiff > 180) angleDiff = 360 - angleDiff

    if (angleDiff < 20) {
      pingFlash.current = Math.min(1, pingFlash.current + delta * 8)
    } else {
      pingFlash.current = Math.max(0, pingFlash.current - delta * 1.5)
    }

    // Scale boost from ping
    const pingScale = 1 + pingFlash.current * 0.6
    const pulse = 1 + Math.sin(t * 3 + live.signal) * 0.15
    meshRef.current.scale.setScalar(pulse * pingScale)

    // Color flash — lerp toward white on ping
    const mat = meshRef.current.material as THREE.MeshStandardMaterial
    if (mat && mat.emissive) {
      color.copy(baseColor).lerp(flashColor, pingFlash.current * 0.7)
      mat.emissive.copy(color)
      mat.emissiveIntensity = (live.type === 'CLOAK' ? 2 : live.type === 'LEVY' ? 1.5 : 0.8) + pingFlash.current * 3
    }

    // CLOAK blips have a spinning ring
    if (ringRef.current && live.type === 'CLOAK') {
      ringRef.current.position.copy(_pos)
      ringRef.current.rotation.x = t * 2
      ringRef.current.rotation.z = t * 1.5
    }

    // Glow — brighter on ping
    if (glowRef.current) {
      glowRef.current.position.set(sx, sy + 0.1, sz)
      const baseGlow = live.signal * 0.15 * (0.8 + Math.sin(t * 4) * 0.2)
      glowRef.current.intensity = baseGlow + pingFlash.current * 1.5
      glowRef.current.distance = 2 + pingFlash.current * 3
    }

    // Move hitbox with blip
    if (hitRef.current) {
      hitRef.current.position.copy(_pos)
    }

    // Vertical connecting line
    if (lineRef.current) {
      if (sy > 0.1) {
        lineRef.current.visible = true
        lineRef.current.position.set(sx, sy / 2, sz)
        lineRef.current.scale.set(1, sy, 1)
      } else {
        lineRef.current.visible = false
      }
    }
  })

  const handleClick = (e: any) => {
    e.stopPropagation()
    const store = useStore.getState()
    const isAlreadyLocked = store.lockedBlipId === blip.id
    store.setLockedBlipId(isAlreadyLocked ? null : blip.id)
    if (!isAlreadyLocked) {
      store.addLog({ type: 'DATA', source: 'RADAR', message: `TARGET LOCK: ${blip.name} [${blip.type}] — BRG ${blip.bearing.toFixed(1)}° RNG ${blip.range.toFixed(1)}` })
    }
  }

  return (
    <group onClick={handleClick}>
      {/* Invisible hitbox — easier to click small blips */}
      <mesh ref={hitRef} visible={false}>
        <sphereGeometry args={[0.4, 8, 8]} />
        <meshBasicMaterial />
      </mesh>

      {/* Glowing trail line */}
      <BlipTrail blipId={blip.id} radarRadius={radarRadius} type={blip.type} />

      {/* Core blip shape */}
      {blip.type === 'LEVY' ? (
        <mesh ref={meshRef}>
          <octahedronGeometry args={[size, 0]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={1.5}
            transparent
            opacity={0.9}
            toneMapped={false}
          />
        </mesh>
      ) : blip.type === 'CLOAK' ? (
        <>
          <mesh ref={meshRef}>
            <sphereGeometry args={[size, 12, 12]} />
            <meshStandardMaterial
              color="#E8E4D8"
              emissive="#C8B094"
              emissiveIntensity={1.4}
              transparent
              opacity={0.9}
              toneMapped={false}
            />
          </mesh>
          <mesh ref={ringRef}>
            <torusGeometry args={[size * 2, 0.005, 8, 32]} />
            <meshBasicMaterial
              color="#C8860A"
              transparent
              opacity={0.5}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </>
      ) : (
        <mesh ref={meshRef}>
          <sphereGeometry args={[size, 8, 8]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.8}
            transparent
            opacity={0.85}
          />
        </mesh>
      )}

      {/* Point light glow */}
      <pointLight
        ref={glowRef}
        color={color}
        intensity={0.2}
        distance={2}
        decay={2}
      />

      {/* Vertical line connecting blip to grid surface */}
      <mesh ref={lineRef} visible={false}>
        <cylinderGeometry args={[0.002, 0.002, 1, 4]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} />
      </mesh>

      {/* Lock indicator — amber bracket per spec §4.2 */}
      {blip.isLocked && (
        <mesh>
          <ringGeometry args={[0.08, 0.1, 4]} />
          <meshBasicMaterial
            color="#C8860A"
            transparent
            opacity={0.7}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}
    </group>
  )
}
