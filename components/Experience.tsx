'use client';

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import Funnel from './Funnel';
import CameraRig from './CameraRig';
import Effects from './Effects';

const DPR_MAX =
  typeof navigator !== 'undefined' && (navigator.hardwareConcurrency ?? 8) <= 4 ? 1.5 : 2;

export default function Experience() {
  return (
    <Canvas
      flat
      dpr={[1, DPR_MAX]}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      camera={{ fov: 62, near: 0.1, far: 140, position: [0, 10, 8.5] }}
    >
      <color attach="background" args={['#1a0dd9']} />
      <fog attach="fog" args={['#1208a8', 26, 115]} />
      <Suspense fallback={null}>
        <Funnel />
      </Suspense>
      <CameraRig />
      <Effects />
    </Canvas>
  );
}
