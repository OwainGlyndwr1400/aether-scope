import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const RING_COUNT = 6
const RADIAL_LINES = 12

// Custom shader for the holographic radar surface
const gridVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`

const gridFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uRadius;
  uniform float uFoldAngle;
  varying vec2 vUv;
  varying vec3 vWorldPos;

  float grid(vec2 p, float spacing) {
    vec2 g = abs(fract(p / spacing - 0.5) - 0.5) / fwidth(p / spacing);
    return 1.0 - min(min(g.x, g.y), 1.0);
  }

  void main() {
    vec2 centered = vWorldPos.xz;
    float dist = length(centered);
    float normDist = dist / uRadius;

    // Base grid
    float g = grid(centered, 1.0) * 0.12;

    // Concentric rings
    float rings = 0.0;
    for (int i = 1; i <= 6; i++) {
      float r = float(i) / 6.0 * uRadius;
      float ring = 1.0 - smoothstep(0.0, 0.03, abs(dist - r));
      rings += ring * 0.25;
    }

    // Radial lines
    float angle = atan(centered.y, centered.x);
    float radials = 0.0;
    for (int i = 0; i < 12; i++) {
      float a = float(i) / 12.0 * 6.28318;
      float diff = abs(mod(angle - a + 3.14159, 6.28318) - 3.14159);
      radials += (1.0 - smoothstep(0.0, 0.015, diff)) * 0.15;
    }

    // Edge glow
    float edgeGlow = smoothstep(uRadius - 0.3, uRadius, dist) * 0.3;

    // Combine
    float alpha = (g + rings + radials) * (1.0 - smoothstep(uRadius - 0.1, uRadius + 0.05, dist));

    // Fold angle affects visibility — higher fold = more "aetheric" (desat violet shift)
    float foldMix = uFoldAngle / 90.0;
    vec3 materialColor = vec3(0.42, 0.33, 0.20); // warm bronze grid (muted amber)
    vec3 aethericColor = vec3(0.28, 0.22, 0.32); // desat aetheric violet
    vec3 color = mix(materialColor, aethericColor, foldMix * 0.5);

    // Subtle breathing animation
    float breath = sin(uTime * 0.5) * 0.05 + 0.95;
    alpha *= breath;

    // Circular fade at edge
    alpha *= (1.0 - smoothstep(uRadius * 0.85, uRadius, dist));
    alpha += edgeGlow * (1.0 - smoothstep(uRadius, uRadius + 0.1, dist));

    gl_FragColor = vec4(color, alpha * 0.8);
  }
`

interface RadarGridProps {
  radius: number
  foldAngle: number
}

export function RadarGrid({ radius, foldAngle }: RadarGridProps) {
  const matRef = useRef<THREE.ShaderMaterial>(null!)

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uRadius: { value: radius },
      uFoldAngle: { value: foldAngle },
    }),
    []
  )

  useFrame((_, delta) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value += delta
      matRef.current.uniforms.uFoldAngle.value = foldAngle
    }
  })

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[radius * 2.2, radius * 2.2, 1, 1]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={gridVertexShader}
        fragmentShader={gridFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}
