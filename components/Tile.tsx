'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { getTileTransform, liquidFlow } from '@/lib/funnelProfile';
import { duotoneFragment, duotoneVertex } from '@/shaders/duotone';
import { useStore } from '@/lib/store';
import { tileMeshes } from '@/lib/tileRegistry';
import type { TileData } from '@/lib/tilesData';

const _worldPos = new THREE.Vector3();
const _worldQuat = new THREE.Quaternion();
const _worldNormal = new THREE.Vector3();

const BLUE = new THREE.Color('#1a0dd9');
const CREAM = new THREE.Color('#efe7d2');

// design treatments matching the original's tile mix
const VARIANTS = [
  { brightness: 1.2, frame: 2, alpha: 0.8 }, // dashed technical frame, translucent
  { brightness: 1.85, frame: 0, alpha: 1 }, // hot screen — blows out and blooms
  { brightness: 1.0, frame: 1, alpha: 1 }, // dark slab with a thin solid frame
];

export default function Tile({ data }: { data: TileData }) {
  const texture = useTexture(data.img);
  texture.colorSpace = THREE.SRGBColorSpace;

  const transform = useMemo(
    () => getTileTransform(data.bandIndex, data.angleDeg),
    [data.bandIndex, data.angleDeg],
  );

  // deterministic per-tile hash → bob phase + casual hover tilt
  const hash = useMemo(() => [...data.id].reduce((a, c) => a + c.charCodeAt(0), 0), [data.id]);
  const quaternion = useMemo(() => {
    const tilt = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(((hash % 7) / 7 - 0.5) * 0.18, 0, ((hash % 11) / 11 - 0.5) * 0.18),
    );
    return transform.quaternion.clone().multiply(tilt);
  }, [transform, hash]);

  const variant = VARIANTS[data.variant] ?? VARIANTS[2];
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: duotoneVertex,
        fragmentShader: duotoneFragment,
        transparent: variant.alpha < 1,
        uniforms: {
          uMap: { value: texture },
          uHover: { value: 0 },
          uBlue: { value: BLUE },
          uCream: { value: CREAM },
          uBrightness: { value: variant.brightness },
          uFrame: { value: variant.frame },
          uAlpha: { value: variant.alpha },
        },
      }),
    [texture, variant],
  );

  const hoverTarget = useRef(0);
  const meshRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    const mesh = meshRef.current;
    if (mesh) tileMeshes.set(data.id, mesh);
    return () => {
      if (tileMeshes.get(data.id) === mesh) tileMeshes.delete(data.id);
    };
  }, [data.id]);

  useFrame((state, dt) => {
    const u = material.uniforms.uHover;
    u.value = THREE.MathUtils.damp(u.value, hoverTarget.current, 8, dt);
    if (meshRef.current) {
      const s = 1 + u.value * 0.05;
      meshRef.current.scale.setScalar(s);
      // bob with the traveling liquid — same wobble + absorption swell as the
      // ring shader — while hovering clearly above it with a gentle float
      const time = state.clock.elapsedTime;
      const flow = liquidFlow(useStore.getState().depth, time);
      const lift = 0.5 + Math.sin(time * 0.85 + hash) * 0.08;
      meshRef.current.position.copy(
        getTileTransform(data.bandIndex, data.angleDeg, flow, time, lift).position,
      );
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={transform.position}
      quaternion={quaternion}
      onClick={(e) => {
        e.stopPropagation();
        const st = useStore.getState();
        if (st.suppressClick || !meshRef.current) return; // it was a drag, not a click
        // capture the tile's CURRENT world pose — its ring rotates continuously
        meshRef.current.getWorldPosition(_worldPos);
        meshRef.current.getWorldQuaternion(_worldQuat);
        _worldNormal.set(0, 0, 1).applyQuaternion(_worldQuat);
        st.openTile(data.id, {
          position: _worldPos.toArray(),
          normal: _worldNormal.toArray() as [number, number, number],
          height: transform.height,
        });
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        hoverTarget.current = 1;
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        hoverTarget.current = 0;
        document.body.style.cursor = 'auto';
      }}
    >
      <planeGeometry args={[transform.width, transform.height]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}
