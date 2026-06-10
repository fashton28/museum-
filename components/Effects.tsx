'use client';

import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { LiquidWarpEffect } from '@/shaders/LiquidWarpEffect';
import { GrainEffect } from '@/shaders/GrainEffect';
import { SpotlightEffect } from '@/shaders/SpotlightEffect';
import { useStore } from '@/lib/store';

/**
 * Chain order matters:
 * 1. LiquidWarp (mainUv) smears the scene image — everything downstream inherits it
 * 2. Bloom halos the cream text + bright tiles
 * 3. Vignette darkens the image edges
 * 4. Grain sits on top of everything, like emulsion on the lens
 */
export default function Effects() {
  const warp = useMemo(() => new LiquidWarpEffect(), []);
  const grain = useMemo(() => new GrainEffect(), []);
  const spotlight = useMemo(() => new SpotlightEffect(), []);
  const reducedMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  useFrame((state, dt) => {
    // cursor spotlight trails the pointer with a soft lag (works under reduced motion too)
    const mouse = spotlight.uniforms.get('uMouse')!.value as THREE.Vector2;
    const k = 1 - Math.exp(-8 * Math.min(dt, 1 / 30));
    mouse.x += (state.pointer.x * 0.5 + 0.5 - mouse.x) * k;
    mouse.y += (state.pointer.y * 0.5 + 0.5 - mouse.y) * k;

    if (reducedMotion) return; // static grain, no warp
    const st = useStore.getState();
    warp.uniforms.get('uTime')!.value += dt;
    warp.uniforms.get('uVelocity')!.value = st.velocity;
    warp.uniforms.get('uBoost')!.value = st.boost;
    grain.uniforms.get('uTime')!.value += dt;
  });

  return (
    <EffectComposer multisampling={0}>
      <primitive object={warp} />
      <primitive object={spotlight} />
      <Bloom luminanceThreshold={0.52} intensity={1.15} mipmapBlur radius={0.8} />
      <Vignette eskil={false} offset={0.25} darkness={0.7} />
      <primitive object={grain} />
    </EffectComposer>
  );
}
