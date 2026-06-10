'use client';

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { MAX_DEPTH, useStore } from '@/lib/store';
import { surfaceY } from '@/lib/funnelProfile';

const DIVE_DURATION = 1.15;
const CLOSE_DURATION = 0.9;
const PHI_PER_DEPTH = 0.34; // helix rotation per unit depth — shared by pose + infinity wrap

const _target = new THREE.Vector3();
// must be a camera: Object3D.lookAt points +Z at the target, cameras look down -Z
const _obj = new THREE.PerspectiveCamera();
const _divePos = new THREE.Vector3();
const _diveNormal = new THREE.Vector3();

/**
 * Camera pose at a given depth + drag orbit: a helix riding DOWN the outside
 * of the trumpet flare — starts high beside the narrow tube, slides outward
 * and down with the widening curve, always hovering above the surface and
 * looking in toward the tube.
 */
function helixPose(depth: number, orbit: number, time: number, out: THREE.Camera) {
  // the camera path SATURATES: it eases to its final pose and never resets —
  // scrolling past the end keeps pouring (texture flow) and slowly orbiting
  const t = 1 - Math.exp(-Math.max(depth, 0) / (MAX_DEPTH * 0.85));
  // WIDE establishing framing like the original: far out and high above the
  // flare, whole structure in frame — tower center, terraces to every edge
  const camR = 18.0 + 8.0 * t;
  // steep ~35-40° downward view onto the structure, like the original —
  // high above the flare, looking well down at the tower base
  const y = surfaceY(camR) + THREE.MathUtils.lerp(17.5, 12.5, t);
  const phi = depth * PHI_PER_DEPTH + orbit + time * 0.02; // slow idle drift keeps the scene alive
  out.position.set(Math.sin(phi) * camR, y, Math.cos(phi) * camR);
  _target.set(
    Math.sin(phi + 0.5) * 1.5,
    THREE.MathUtils.lerp(0.0, -5.5, t),
    Math.cos(phi + 0.5) * 1.5,
  );
  out.up.set(0, 1, 0);
  out.lookAt(_target);
}

const easeInOut = (x: number) => x * x * (3 - 2 * x);

export default function CameraRig() {
  const camera = useThree((s) => s.camera);

  // virtual scroll (wheel) + grab-the-vortex drag (pointer): the page never scrolls
  useEffect(() => {
    const addDepth = (d: number) => {
      const st = useStore.getState();
      if (st.phase !== 'idle') return;
      // unbounded: past the end of the camera path, scrolling keeps POURING
      // (texture flow) — the camera itself never resets
      useStore.setState({ targetDepth: st.targetDepth + d });
    };
    const onWheel = (e: WheelEvent) => addDepth(e.deltaY * 0.012);

    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let dragDist = 0;
    let releaseTimer: ReturnType<typeof setTimeout> | undefined;

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      if ((e.target as HTMLElement).closest('.overlay, .sound')) return;
      dragging = true;
      dragDist = 0;
      lastX = e.clientX;
      lastY = e.clientY;
      clearTimeout(releaseTimer);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      dragDist += Math.abs(dx) + Math.abs(dy);
      if (dragDist > 8 && !useStore.getState().suppressClick) {
        useStore.setState({ suppressClick: true });
      }
      const st = useStore.getState();
      if (st.phase !== 'idle') return;
      useStore.setState({ orbitTarget: st.orbitTarget + dx * 0.006 });
      addDepth(-dy * 0.018); // drag down pulls you back up, like grabbing the vortex
    };
    const onPointerUp = () => {
      dragging = false;
      // keep clicks suppressed briefly — the click event fires after pointerup
      releaseTimer = setTimeout(() => useStore.setState({ suppressClick: false }), 150);
    };

    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      clearTimeout(releaseTimer);
    };
  }, []);

  const prevPhase = useRef('idle');
  const animT = useRef(0);
  const startPos = useRef(new THREE.Vector3());
  const startQuat = useRef(new THREE.Quaternion());
  const endPos = useRef(new THREE.Vector3());
  const endQuat = useRef(new THREE.Quaternion());

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 1 / 30);
    const st = useStore.getState();
    const time = state.clock.elapsedTime;

    // phase transition: capture interpolation endpoints
    if (st.phase !== prevPhase.current) {
      animT.current = 0;
      startPos.current.copy(camera.position);
      startQuat.current.copy(camera.quaternion);
      if (st.phase === 'diving' && st.diveTarget) {
        _divePos.fromArray(st.diveTarget.position);
        _diveNormal.fromArray(st.diveTarget.normal);
        const dist = st.diveTarget.height * 1.9 + 1.3;
        endPos.current.copy(_divePos).addScaledVector(_diveNormal, dist);
        _obj.position.copy(endPos.current);
        _obj.up.set(0, 1, 0);
        _obj.lookAt(_divePos);
        endQuat.current.copy(_obj.quaternion);
      }
      prevPhase.current = st.phase;
    }

    if (st.phase === 'idle') {
      const depth = THREE.MathUtils.damp(st.depth, st.targetDepth, 3.5, dt);
      const orbit = THREE.MathUtils.damp(st.orbit, st.orbitTarget, 4, dt);
      // warp + audio respond to scroll/descent ONLY — rotating is clean & silent
      const motion = Math.abs(depth - st.depth) * 0.22;
      const velocity = THREE.MathUtils.damp(st.velocity, Math.min(motion / Math.max(dt, 1e-4), 1.4), 3, dt);
      const boost = THREE.MathUtils.damp(st.boost, 0, 6, dt);

      useStore.setState({ depth, orbit, velocity, boost });

      helixPose(depth, orbit, time, _obj);
      // subtle pointer parallax
      _obj.position.x += state.pointer.x * 0.35;
      _obj.position.y += state.pointer.y * 0.3;
      camera.position.copy(_obj.position);
      camera.quaternion.copy(_obj.quaternion);
      camera.rotateZ(Math.sin(time * 0.1 + depth * 0.2) * 0.025); // woozy roll
    } else if (st.phase === 'diving') {
      animT.current += dt / DIVE_DURATION;
      const t = Math.min(animT.current, 1);
      const e = easeInOut(t);
      camera.position.lerpVectors(startPos.current, endPos.current, e);
      camera.quaternion.slerpQuaternions(startQuat.current, endQuat.current, e);
      useStore.setState({ boost: Math.sin(Math.PI * t), velocity: 0 });
      if (t >= 1) useStore.setState({ phase: 'open', boost: 0 });
    } else if (st.phase === 'open') {
      // hold with a slow breathing drift behind the modal
      camera.position.x = endPos.current.x + Math.sin(time * 0.4) * 0.05;
      camera.position.y = endPos.current.y + Math.cos(time * 0.3) * 0.05;
    } else if (st.phase === 'closing') {
      animT.current += dt / CLOSE_DURATION;
      const t = Math.min(animT.current, 1);
      const e = easeInOut(t);
      helixPose(st.preDiveDepth, st.orbit, time, _obj);
      camera.position.lerpVectors(startPos.current, _obj.position, e);
      camera.quaternion.slerpQuaternions(startQuat.current, _obj.quaternion, e);
      useStore.setState({ boost: 0.4 * Math.sin(Math.PI * t) });
      if (t >= 1) {
        useStore.setState({
          phase: 'idle',
          boost: 0,
          depth: st.preDiveDepth,
          targetDepth: st.preDiveDepth,
          selectedTileId: null,
          diveTarget: null,
        });
      }
    }
  });

  return null;
}
