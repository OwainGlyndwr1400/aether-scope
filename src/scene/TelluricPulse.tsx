import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface TelluricPulseProps {
  radius: number
}

// Expanding ring pulse — the "heartbeat" of the radar
export function TelluricPulse({ radius }: TelluricPulseProps) {
  const ring1Ref = useRef<THREE.Mesh>(null!)
  const ring2Ref = useRef<THREE.Mesh>(null!)
  const ring3Ref = useRef<THREE.Mesh>(null!)

  useFrame((state) => {
    const t = state.clock.elapsedTime

    // Three staggered expanding rings
    const rings = [ring1Ref, ring2Ref, ring3Ref]
    rings.forEach((ref, i) => {
      if (!ref.current) return
      const phase = (t * 0.4 + i * 1.2) % 3.6
      const scale = (phase / 3.6) * radius
      const opacity = Math.max(0, 1 - phase / 3.6) * 0.3

      ref.current.scale.setScalar(scale < 0.1 ? 0.1 : scale)
      const mat = ref.current.material as THREE.MeshBasicMaterial
      mat.opacity = opacity
    })
  })

  return (
    <>
      {[ring1Ref, ring2Ref, ring3Ref].map((ref, i) => (
        <mesh key={i} ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
          <ringGeometry args={[0.98, 1.0, 64]} />
          <meshBasicMaterial
            color="#C8860A"
            transparent
            opacity={0}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </>
  )
}
