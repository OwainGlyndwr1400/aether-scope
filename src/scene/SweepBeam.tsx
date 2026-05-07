import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { sweepState } from './RadarScene'
import { playSweepTick } from '../services/audioService'

const sweepVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const sweepFragment = /* glsl */ `
  uniform float uTime;
  uniform float uRadius;
  varying vec2 vUv;

  void main() {
    // Sweep is a cone/wedge shape — fade from bright at center to dim at edge
    float dist = vUv.x; // 0 = center, 1 = outer edge
    float lateral = abs(vUv.y - 0.5) * 2.0; // 0 = center of beam, 1 = edge

    // Core beam intensity
    float beam = (1.0 - lateral * lateral) * (1.0 - dist * 0.6);

    // Trailing fade — brighter near leading edge
    float trail = exp(-lateral * 3.0) * (1.0 - dist * 0.4);

    float intensity = beam * 0.25 + trail * 0.18;

    // Color: instrument amber core, fading to deep amber shadow
    vec3 color = mix(vec3(0.784, 0.525, 0.039), vec3(0.35, 0.22, 0.04), dist);

    gl_FragColor = vec4(color, intensity * 0.45);
  }
`

interface SweepBeamProps {
  radius: number
}

export function SweepBeam({ radius }: SweepBeamProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const matRef = useRef<THREE.ShaderMaterial>(null!)

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uRadius: { value: radius },
    }),
    []
  )

  // Create wedge geometry — a flat fan shape
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const segments = 32
    const halfAngle = Math.PI / 10 // 18-degree half-angle = 36-degree wedge
    const positions: number[] = []
    const uvs: number[] = []
    const indices: number[] = []

    // Center vertex
    positions.push(0, 0.01, 0)
    uvs.push(0, 0.5)

    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      const angle = -halfAngle + t * halfAngle * 2
      const x = Math.sin(angle) * radius
      const z = -Math.cos(angle) * radius
      positions.push(x, 0.01, z)
      uvs.push(1, t)
    }

    for (let i = 0; i < segments; i++) {
      indices.push(0, i + 1, i + 2)
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geo.setIndex(indices)
    return geo
  }, [radius])

  useFrame((_, delta) => {
    if (groupRef.current) {
      // 2π / 12s ≈ 0.5236 rad/s — 12-second sweep period per Awen Grid spec
      groupRef.current.rotation.y += delta * 0.5236
      // Export current sweep angle (0-360) for blip ping detection
      const prevAngle = sweepState.angle
      sweepState.angle = ((groupRef.current.rotation.y * 180 / Math.PI) % 360 + 360) % 360
      // Tick sound when sweep crosses 0° (north)
      if (prevAngle > 350 && sweepState.angle < 10) {
        playSweepTick()
      }
    }
    if (matRef.current) {
      matRef.current.uniforms.uTime.value += delta
    }
  })

  return (
    <group ref={groupRef}>
      <mesh geometry={geometry}>
        <shaderMaterial
          ref={matRef}
          vertexShader={sweepVertex}
          fragmentShader={sweepFragment}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Sweep line — the bright leading edge */}
      <mesh rotation={[0, 0, 0]}>
        <planeGeometry args={[0.018, radius]} />
        <meshBasicMaterial
          color="#C8860A"
          transparent
          opacity={0.55}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
}
