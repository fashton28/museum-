'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  applyRingUVs,
  edgeVs,
  liquidFlow,
  REPS_PER_R,
  ringTaper,
  rings,
  wobblePhases,
  type RingDef,
} from '@/lib/funnelProfile';
import { createFunnelTexture } from '@/lib/textTexture';
import { TILES } from '@/lib/tilesData';
import { tileMeshes } from '@/lib/tileRegistry';
import { useStore } from '@/lib/store';
import Tile from './Tile';

const _v = new THREE.Vector3();
const _n = new THREE.Vector3();
const _q = new THREE.Quaternion();

/**
 * One independently spinning ring of the liquid, carrying its tiles.
 *
 * The ring's MeshBasicMaterial is patched (onBeforeCompile) with:
 *  - vertex: the traveling liquid wobble — MUST mirror wobbleAt/wobblePhases
 *    in lib/funnelProfile.ts, tapered to zero at the ring's profile ends so
 *    independently rotating rings keep meeting on clean shared circles.
 *  - fragment: radius-adaptive texture repetition — reps = round(r·REPS_PER_R)
 *    keeps text at a true 1:1 aspect at every radius (no compression).
 */
function RingGroup({ ring, index, texture }: { ring: RingDef; index: number; texture: THREE.CanvasTexture }) {
  const groupRef = useRef<THREE.Group>(null);
  const speedScale = useRef(1);
  const phaseUniform = useRef({ value: new THREE.Vector3() });
  const timeUniform = useRef({ value: 0 });

  const geometry = useMemo(() => {
    const maxR = Math.max(...ring.points.map((p) => p.x));
    const segments = Math.round(THREE.MathUtils.clamp(maxR * 11, 64, 320));
    const geo = new THREE.LatheGeometry(ring.points, segments);
    applyRingUVs(geo, ring);
    return geo;
  }, [ring]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  // barely-there per-ring brightness variation — enough to feel alive, subtle
  // enough that the trumpet reads as ONE continuous liquid sheet, not stacked discs
  const tint = useMemo(() => {
    const b = 0.975 + ((index * 37) % 5) * 0.0125;
    return new THREE.Color(b, b, b);
  }, [index]);

  const material = useMemo(() => {
    const mat = new THREE.MeshBasicMaterial({ map: texture, color: tint, side: THREE.DoubleSide });
    const [v0, v1] = ringTaper(ring);
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uPhase = phaseUniform.current;
      shader.uniforms.uTime = timeUniform.current;
      shader.uniforms.uTaper = { value: new THREE.Vector2(v0, v1) };
      shader.uniforms.uRepsPerR = { value: REPS_PER_R };
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
uniform vec3 uPhase;
uniform vec2 uTaper;
uniform float uTime;
varying float vRr;`,
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
vRr = length(transformed.xz);
if (vRr > 0.05) {
  float th = atan(transformed.z, transformed.x);
  float f = clamp((uv.y - uTaper.x) / max(uTaper.y - uTaper.x, 1e-5), 0.0, 1.0);
  float taper = sin(3.14159265 * f);
  float w = (sin(2.0 * th + uPhase.x) * 0.6 + sin(3.0 * th + uPhase.y) * 0.3 + sin(5.0 * th + uPhase.z) * 0.15) * taper;
  // fine abduction ripple: small fast crests traveling UP the surface (toward
  // +uv.y = the tube tip). Axisymmetric (no th term) so it is identical for
  // adjacent rings on their shared circle no matter how they rotate — it runs
  // UNTAPERED, continuous over the whole trumpet. Sync: RIPPLE in funnelProfile.ts
  w += sin(uv.y * 80.0 - uTime * 0.92) * 0.5;
  // THE ABSORPTION: a broad SLOW heave forever drawing the liquid up toward the
  // tip, with a slight radial pinch where each crest passes — like suction.
  // Also axisymmetric + untapered. Sync: SWELL in funnelProfile.ts
  float swell = sin(uv.y * 22.0 - uTime * 0.34);
  w += swell * 1.4;
  float rs = 1.0 + (0.018 * sin(3.0 * th + uPhase.y) + 0.01 * sin(2.0 * th + uPhase.x)) * taper - swell * 0.02;
  transformed.x *= rs;
  transformed.z *= rs;
  transformed.y += w * 0.062 * vRr;
}`,
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
uniform float uRepsPerR;
uniform float uTime;
varying float vRr;`,
        )
        .replace(
          '#include <map_fragment>',
          `// radius-adaptive repetitions with a crossfade between integer levels,
// so the transition reads as a liquid shimmer instead of cut glyphs
float rr = max(vRr * uRepsPerR, 1.0);
float repsA = max(floor(rr), 1.0);
float blendT = smoothstep(0.35, 0.65, fract(rr));
vec4 cA = texture2D(map, vec2(vMapUv.x * repsA, vMapUv.y));
vec4 cB = texture2D(map, vec2(vMapUv.x * (repsA + 1.0), vMapUv.y));
vec4 sampledDiffuseColor = mix(cA, cB, blendT);
// the absorption light: bands forever climbing the funnel, pulling HARDER near
// the tip (vMapUv.y → 1 at the tube top), plus a glow riding the slow geometric
// swell crest so the heave reads as mass being drawn up. Sync: SWELL in funnelProfile.ts
// (continuous across rings — vMapUv.y is the global profile coordinate)
float pull = 0.12 + 0.25 * vMapUv.y * vMapUv.y;
sampledDiffuseColor.rgb *= 1.0 + pull * sin(vMapUv.y * 48.0 - uTime * 0.55)
                               + 0.16 * sin(vMapUv.y * 22.0 - uTime * 0.34);
diffuseColor *= sampledDiffuseColor;`,
        );
    };
    mat.customProgramCacheKey = () => 'liquid-ring';
    return mat;
  }, [texture, tint, ring]);
  useEffect(() => () => material.dispose(), [material]);

  const tiles = useMemo(
    () => TILES.filter((t) => ring.bandIndices.includes(t.bandIndex)),
    [ring],
  );

  useFrame((state, dt) => {
    if (!groupRef.current) return;
    // rings drift to a near-stop while a tile is open
    const target = useStore.getState().phase === 'idle' ? 1 : 0.1;
    speedScale.current = THREE.MathUtils.damp(speedScale.current, target, 2.5, dt);
    groupRef.current.rotation.y += ring.spin * speedScale.current * dt;
    // the liquid churns with scroll — wave phases stream with depth
    const flow = liquidFlow(useStore.getState().depth, state.clock.elapsedTime);
    phaseUniform.current.value.fromArray(wobblePhases(index, flow));
    timeUniform.current.value = state.clock.elapsedTime;
  });

  return (
    <group ref={groupRef}>
      <mesh geometry={geometry} material={material} raycast={() => null} />
      {tiles.map((t) => (
        <Tile key={t.id} data={t} />
      ))}
    </group>
  );
}

/** Dev-only: exposes tile screen positions + store on window for automated testing. */
function DebugTileScreens() {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__store = useStore;
  }, []);
  useFrame(() => {
    (window as unknown as Record<string, unknown>).__tiles = TILES.map((t) => {
      const mesh = tileMeshes.get(t.id);
      if (!mesh) return { id: t.id, x: 0, y: 0, inFront: false, facing: false };
      mesh.getWorldPosition(_v);
      // tiles on the trumpet's far side face away — invisible and unclickable
      _n.set(0, 0, 1).applyQuaternion(mesh.getWorldQuaternion(_q));
      const facing = _n.dot(_v.clone().sub(camera.position).normalize()) < -0.25;
      // true in-front test: view-space z must be negative (projection alone lies for behind-camera points)
      const viewZ = _v.clone().applyMatrix4(camera.matrixWorldInverse).z;
      _v.project(camera);
      return {
        id: t.id,
        x: (_v.x * 0.5 + 0.5) * size.width,
        y: (-_v.y * 0.5 + 0.5) * size.height,
        inFront: viewZ < -0.5 && Math.abs(_v.x) < 1 && Math.abs(_v.y) < 1,
        facing,
      };
    });
  });
  return null;
}

export default function Funnel() {
  // regenerate once webfonts are ready so the canvas texture uses the real fonts
  const [fontsLoaded, setFontsLoaded] = useState(false);
  useEffect(() => {
    let mounted = true;
    document.fonts?.ready.then(() => mounted && setFontsLoaded(true));
    return () => {
      mounted = false;
    };
  }, []);

  const texture = useMemo(() => createFunnelTexture(edgeVs), [fontsLoaded]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => texture.dispose(), [texture]);

  // text is ROCK SOLID per ring: each ring owns its slice of the atlas, no
  // streaming (streaming text tore at the seams of counter-rotating rings).
  // The "liquid rising" lives in the geometry instead — see the uTime ripple
  // in the ring vertex shader.

  return (
    <>
      {rings.map((ring, i) => (
        <RingGroup key={i} ring={ring} index={i} texture={texture} />
      ))}
      {process.env.NODE_ENV === 'development' && <DebugTileScreens />}
    </>
  );
}
