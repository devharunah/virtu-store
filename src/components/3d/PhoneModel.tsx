"use client";

import { useGLTF } from "@react-three/drei";
import type { ThreeElements } from "@react-three/fiber";
import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { screenTexture } from "./screen-texture";

type Props = ThreeElements["group"] & { url: string; colour?: string | undefined };

/** Clone a shared GLB material once per phone instance, so edits never leak to other phones. */
function own<T extends THREE.Material>(m: T): T {
  if (m.userData["virtuOwned"]) return m;
  const mine = m.clone() as T;
  mine.userData["virtuOwned"] = true;
  return mine;
}

/**
 * Loads a phone GLB (meshopt-compressed; drei decodes it), recolours the material named
 * "Body" and lights the "Screen" with a wallpaper in the same colour. Each instance owns its
 * materials, so the same model can appear several times in different colours.
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
        if (!(m instanceof THREE.MeshStandardMaterial)) return m;
        if (m.name === "Body") {
          const mine = own(m);
          mine.color.set(colour);
          return mine;
        }
        if (m.name === "Screen") {
          const wallpaper = screenTexture(colour);
          if (!wallpaper) return m;
          const mine = own(m);
          mine.color.set("#ffffff");
          mine.map = wallpaper;
          mine.emissive.set("#ffffff");
          mine.emissiveMap = wallpaper;
          mine.emissiveIntensity = 0.35;
          mine.needsUpdate = true;
          return mine;
        }
        return m;
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
