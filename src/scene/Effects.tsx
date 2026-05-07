import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  EffectComposer,
  Bloom,
  Vignette,
  ChromaticAberration,
  Noise,
  Scanline,
} from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import * as THREE from 'three'

export function Effects() {
  return (
    <EffectComposer>
      {/* BLOOM — makes emissive elements glow like actual light sources */}
      <Bloom
        intensity={1.2}
        luminanceThreshold={0.2}
        luminanceSmoothing={0.9}
        mipmapBlur
        radius={0.8}
      />

      {/* SCANLINES — subtle horizontal lines for CRT monitor feel */}
      <Scanline
        blendFunction={BlendFunction.OVERLAY}
        density={1.8}
        opacity={0.06}
      />

      {/* CHROMATIC ABERRATION — subtle color fringing at edges */}
      <ChromaticAberration
        blendFunction={BlendFunction.NORMAL}
        offset={new THREE.Vector2(0.0005, 0.0005)}
        radialModulation
        modulationOffset={0.5}
      />

      {/* FILM GRAIN — very subtle noise for texture */}
      <Noise
        blendFunction={BlendFunction.SOFT_LIGHT}
        opacity={0.15}
      />

      {/* VIGNETTE — darkens edges, focuses attention on center */}
      <Vignette
        offset={0.3}
        darkness={0.7}
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  )
}
