"use client";

import { clampCamera } from "@/lib/camera-bounds";
import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { type ComponentRef, useEffect, useRef } from "react";
import * as THREE from "three";
import { playerState } from "./player-state";

export const BASE_FOV = 55;
const LOOK_HEIGHT = 0.45; // above the capsule centre: roughly the character's shoulders
const START_OFFSET = new THREE.Vector3(0, 1.1, 2.0); // behind (+Z) and above, at spawn

/** Keep a usable horizontal field of view on portrait phones (a fixed vertical FOV becomes a slit). */
function useResponsiveFov() {
  const size = useThree((s) => s.size);
  const getState = useThree((s) => s.get);
  useEffect(() => {
    const cam = getState().camera;
    if (!(cam instanceof THREE.PerspectiveCamera)) return;
    const aspect = size.width / size.height;
    const minHorizontal = THREE.MathUtils.degToRad(68);
    const needed = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(minHorizontal / 2) / aspect));
    cam.fov = THREE.MathUtils.clamp(Math.max(BASE_FOV, needed), BASE_FOV, 95);
    cam.updateProjectionMatrix();
  }, [getState, size]);
}

/**
 * Third-person camera. OrbitControls gives drag-to-look and pinch/scroll zoom; every frame the
 * orbit target follows the player and the camera moves by the same amount, so the view keeps
 * its angle while the visitor walks. The camera stays inside the shop or the arcade corridor.
 */
export function FollowCamera() {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const camera = useThree((s) => s.camera);
  const last = useRef<THREE.Vector3 | null>(null);
  const target = useRef(new THREE.Vector3());
  const delta = useRef(new THREE.Vector3());
  useResponsiveFov();

  useFrame(() => {
    const c = controls.current;
    if (!c || !playerState.ready) return;
    const t = target.current.copy(playerState.position);
    t.y += LOOK_HEIGHT;

    if (!last.current) {
      last.current = t.clone();
      camera.position.copy(t).add(START_OFFSET);
    }
    delta.current.subVectors(t, last.current);
    camera.position.add(delta.current);
    c.target.copy(t);
    last.current.copy(t);

    const p = camera.position;
    p.set(...clampCamera(p.x, p.y, p.z));
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      enableDamping
      dampingFactor={0.1}
      minDistance={1.4}
      maxDistance={4.5}
      minPolarAngle={0.35}
      maxPolarAngle={Math.PI * 0.49}
    />
  );
}
