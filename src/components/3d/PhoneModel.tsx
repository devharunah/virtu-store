"use client";

import { useGLTF } from "@react-three/drei";
import type { ThreeElements } from "@react-three/fiber";
import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";

type Props = ThreeElements["group"] & { url: string; colour?: string | undefined };

/**
 * Loads a phone GLB (meshopt-compressed; drei decodes it) and recolours the
 * material named "Body". Each instance clones its own Body material, so the
 * same model can appear several times in different colours.
 */
export function PhoneModel({ url, colour, ...groupProps }: Props) {
  const { scene } = useGLTF(url);
  const clone = useMemo(() => scene.clone(true), [scene]);

  useLayoutEffect(() => {
    if (!colour) return;
    clone.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const mats: THREE.Material[] = Array.isArray(obj.material) ? obj.material : [obj.material];
      const next = mats.map((m) => {
        if (m.name !== "Body" || !(m instanceof THREE.MeshStandardMaterial)) return m;
        const mine = m.userData["virtuOwned"] ? m : m.clone();
        mine.userData["virtuOwned"] = true;
        mine.color.set(colour);
        return mine;
      });
      obj.material = Array.isArray(obj.material) ? next : next[0];
    });
  }, [clone, colour]);

  return (
    <group {...groupProps}>
      <primitive object={clone} />
    </group>
  );
}
