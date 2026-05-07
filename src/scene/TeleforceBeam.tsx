import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store/useStore'

interface TeleforceBeamProps {
  radarRadius: number
}

export function TeleforceBeam({ radarRadius }: TeleforceBeamProps) {
  const coreRef = useRef<THREE.Mesh>(null!)
  const outerRef = useRef<THREE.Mesh>(null!)
  const impactRef = useRef<THREE.Mesh>(null!)
  const sparksRef = useRef<THREE.Points>(null!)
  const chargeRef = useRef(0)

  // Spark particles
  const sparkGeo = useMemo(() => {
    const count = 40
    const positions = new Float32Array(count * 3)
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geo
  }, [])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const s = useStore.getState()
    const active = s.teleforceActive && s.lockedBlipId

    // Charge up/down
    if (active) {
      chargeRef.current = Math.min(1, chargeRef.current + 0.03)
    } else {
      chargeRef.current = Math.max(0, chargeRef.current - 0.06)
    }

    const charge = chargeRef.current

    // Hide everything when inactive
    if (charge < 0.01) {
      if (coreRef.current) coreRef.current.visible = false
      if (outerRef.current) outerRef.current.visible = false
      if (impactRef.current) impactRef.current.visible = false
      if (sparksRef.current) sparksRef.current.visible = false
      return
    }

    // Find locked target
    const locked = s.blips.find((b) => b.id === s.lockedBlipId)
    if (!locked) {
      if (coreRef.current) coreRef.current.visible = false
      if (outerRef.current) outerRef.current.visible = false
      if (impactRef.current) impactRef.current.visible = false
      if (sparksRef.current) sparksRef.current.visible = false
      return
    }

    const scale = radarRadius / 100
    const tx = locked.x * scale
    const tz = locked.z * scale
    const dist = Math.sqrt(tx * tx + tz * tz)

    if (dist < 0.01) return // Avoid NaN from zero-length beam

    const midX = tx / 2
    const midZ = tz / 2
    const angle = Math.atan2(tx, tz)

    // ── Core beam (thin bright cylinder) ──
    if (coreRef.current) {
      coreRef.current.visible = true
      coreRef.current.position.set(midX, 0.06, midZ)
      coreRef.current.rotation.set(0, 0, 0)
      coreRef.current.lookAt(tx, 0.06, tz)
      coreRef.current.rotateX(Math.PI / 2)
      coreRef.current.scale.set(
        0.015 + Math.sin(t * 20) * 0.005 * charge,
        dist,
        0.015 + Math.cos(t * 15) * 0.005 * charge
      )
      const coreMat = coreRef.current.material as THREE.MeshBasicMaterial
      coreMat.opacity = charge * 0.9
    }

    // ── Outer glow (wider, dimmer cylinder) ──
    if (outerRef.current) {
      outerRef.current.visible = true
      outerRef.current.position.set(midX, 0.06, midZ)
      outerRef.current.rotation.set(0, 0, 0)
      outerRef.current.lookAt(tx, 0.06, tz)
      outerRef.current.rotateX(Math.PI / 2)
      const pulse = 0.06 + Math.sin(t * 8) * 0.02 * charge
      outerRef.current.scale.set(pulse, dist, pulse)
      const outerMat = outerRef.current.material as THREE.MeshBasicMaterial
      outerMat.opacity = charge * 0.3
    }

    // ── Impact ring at target ──
    if (impactRef.current) {
      impactRef.current.visible = true
      impactRef.current.position.set(tx, 0.07, tz)
      impactRef.current.rotation.x = -Math.PI / 2
      const impactPulse = 0.15 + Math.sin(t * 12) * 0.05
      impactRef.current.scale.setScalar(impactPulse * charge)
      const impactMat = impactRef.current.material as THREE.MeshBasicMaterial
      impactMat.opacity = charge * 0.8
    }

    // ── Spark particles along beam ──
    if (sparksRef.current) {
      sparksRef.current.visible = true
      const posArr = sparkGeo.attributes.position.array as Float32Array
      for (let i = 0; i < 40; i++) {
        const along = Math.random()
        const jitter = (Math.random() - 0.5) * 0.08 * charge
        posArr[i * 3] = tx * along + jitter
        posArr[i * 3 + 1] = 0.06 + Math.random() * 0.15 * charge
        posArr[i * 3 + 2] = tz * along + jitter
      }
      sparkGeo.attributes.position.needsUpdate = true
    }
  })

  return (
    <>
      {/* Core beam — instrument amber (Tesla teleforce directed energy) */}
      <mesh ref={coreRef} visible={false}>
        <cylinderGeometry args={[1, 1, 1, 6]} />
        <meshBasicMaterial
          color="#E8B060"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Outer glow — desat aetheric violet halo */}
      <mesh ref={outerRef} visible={false}>
        <cylinderGeometry args={[1, 1, 1, 8]} />
        <meshBasicMaterial
          color="#6A4A7A"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Impact ring at target — warm bone */}
      <mesh ref={impactRef} visible={false}>
        <ringGeometry args={[0.8, 1, 16]} />
        <meshBasicMaterial
          color="#E8E4D8"
          transparent
          opacity={0}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Sparks */}
      <points ref={sparksRef} geometry={sparkGeo} visible={false}>
        <pointsMaterial
          color="#8A6A9A"
          size={0.03}
          transparent
          opacity={0.65}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          sizeAttenuation
        />
      </points>
    </>
  )
}
