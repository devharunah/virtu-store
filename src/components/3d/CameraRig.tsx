"use client";

import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { HALF_D, HALF_W, ROOM, SPAWN } from "@/data/store-layout";

export const BASE_FOV = 55;
const MARGIN = 0.35;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Phase 1 free camera: orbit + pan + zoom, kept inside the room.
 * Phase 2 replaces this with the ecctrl follow camera.
 */
export function CameraRig() {
  const controls = useRef<OrbitControlsImpl>(null);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);

  // Keep a usable horizontal field of view on portrait phones (fixed vertical FOV makes it a slit).
  const getState = useThree((s) => s.get);
  useEffect(() => {
    const cam = getState().camera; // read imperatively: three.js objects are mutable by design
    if (!(cam instanceof THREE.PerspectiveCamera)) return;
    const aspect = size.width / size.height;
    const minHorizontal = THREE.MathUtils.degToRad(68);
    const needed = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(minHorizontal / 2) / aspect));
    cam.fov = THREE.MathUtils.clamp(Math.max(BASE_FOV, needed), BASE_FOV, 95);
    cam.updateProjectionMatrix();
  }, [getState, size]);

  useEffect(() => {
    camera.position.set(...SPAWN.position);
    controls.current?.target.set(...SPAWN.lookAt);
    controls.current?.update();
  }, [camera]);

  useFrame(() => {
    const c = controls.current;
    if (!c) return;
    const p = camera.position;
    p.set(
      clamp(p.x, -HALF_W + MARGIN, HALF_W - MARGIN),
      clamp(p.y, 0.4, ROOM.height - 0.25),
      clamp(p.z, -HALF_D + MARGIN, HALF_D + 1),
    );
    const t = c.target;
    t.set(clamp(t.x, -HALF_W + 1, HALF_W - 1), clamp(t.y, 0.3, 2.5), clamp(t.z, -HALF_D + 0.5, HALF_D - 0.5));
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      screenSpacePanning={false}
      minDistance={0.4}
      maxDistance={8}
      maxPolarAngle={Math.PI * 0.55}
    />
  );
}
