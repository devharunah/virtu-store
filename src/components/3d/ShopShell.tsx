"use client";

import { FLOOR_BOX, WALLS } from "@/data/store-layout";
import type { ShopTheme } from "@/lib/shop-schema";
import { useGLTF, useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { ShopSign } from "./ShopSign";

export const SHOP_MODELS = {
  shell: "/models/shop/shop_shell.glb",
  glass: "/models/shop/shop_glass.glb",
  fan: "/models/shop/shop_fan.glb",
} as const;
const LIGHTMAP = "/models/shop/lightmap.webp";

const TEXTURES = {
  floorNormal: "/textures/shop-floor/normal.webp",
  floorArm: "/textures/shop-floor/arm.webp",
  corridorColor: "/textures/corridor/color.webp",
  corridorNormal: "/textures/corridor/normal.webp",
  corridorArm: "/textures/corridor/arm.webp",
  wallNormal: "/textures/wall/normal.webp",
} as const;

type Maps = Record<keyof typeof TEXTURES, THREE.Texture> & { lightmap: THREE.Texture };

/** glTF UVs: tiling maps repeat on UV0 (already in tile units), the lightmap uses UV1. */
function prepare(tex: THREE.Texture, opts: { srgb?: boolean; channel?: number }) {
  const t = tex.clone();
  t.flipY = false;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.channel = opts.channel ?? 0;
  t.anisotropy = 4;
  if (opts.srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

/**
 * Dress the materials of the baked shell by name. Everything gets the baked lightmap (soft
 * light and shadows from Blender's Cycles); floors and walls get their tile/paint detail; glass
 * turns transparent; lights stay bright. three.js objects are mutable by design.
 */
function dress(root: THREE.Object3D, maps: Maps) {
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const list: THREE.Material[] = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const m of list) {
      if (!(m instanceof THREE.MeshStandardMaterial)) continue;
      if (m.name === "Glass") {
        m.transparent = true;
        m.opacity = 0.16;
        m.roughness = 0.04;
        m.metalness = 0;
        m.depthWrite = false;
        m.envMapIntensity = 1.4;
        continue;
      }
      if (m.name === "LED" || m.name === "Tube") {
        m.toneMapped = false;
        continue;
      }
      m.lightMap = maps.lightmap;
      m.lightMapIntensity = 1.0;
      m.envMapIntensity = 0.18;
      if (m.name === "TileFloor") {
        m.normalMap = maps.floorNormal;
        m.normalScale.set(1, 1);
        m.aoMap = maps.floorArm;
        m.aoMapIntensity = 1;
        m.color.set("#d8d1c3"); // glazed cream tile; pure white reads as overexposed
        m.roughnessMap = maps.floorArm;
        m.envMapIntensity = 0.3; // glossy ceramic catches the lights
      } else if (m.name === "CorridorFloor") {
        m.map = maps.corridorColor;
        m.normalMap = maps.corridorNormal;
        m.aoMap = maps.corridorArm;
        m.roughnessMap = maps.corridorArm;
      } else if (m.name.startsWith("Paint") || m.name === "CorridorWall") {
        m.normalMap = maps.wallNormal;
        m.normalScale.set(0.35, 0.35);
      }
      m.needsUpdate = true;
    }
  });
}

/** The materials a seller's theme repaints, and which theme colour each takes. */
const THEMED: Record<string, keyof ShopTheme> = {
  PaintWall: "wall",
  PaintAccent: "accent",
  TileFloor: "floor",
};

/**
 * Gives this shell its own copies of the themed materials. `scene.clone` shares materials with
 * the cached GLTF, so without this one shop's paint would leak into the next shop opened.
 */
function ownThemedMaterials(root: THREE.Object3D) {
  const copies = new Map<string, THREE.MeshStandardMaterial>();
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const own = (m: THREE.Material) => {
      if (!(m instanceof THREE.MeshStandardMaterial) || !(m.name in THEMED)) return m;
      const copy = copies.get(m.name) ?? m.clone();
      copies.set(m.name, copy);
      return copy;
    };
    obj.material = Array.isArray(obj.material) ? obj.material.map(own) : own(obj.material);
  });
  return copies;
}

function Shell({ theme }: { theme: ShopTheme }) {
  const { scene } = useGLTF(SHOP_MODELS.shell);
  const glass = useGLTF(SHOP_MODELS.glass).scene;
  const raw = useTexture({ ...TEXTURES, lightmap: LIGHTMAP });

  const maps = useMemo<Maps>(
    () => ({
      floorNormal: prepare(raw.floorNormal, {}),
      floorArm: prepare(raw.floorArm, {}),
      corridorColor: prepare(raw.corridorColor, { srgb: true }),
      corridorNormal: prepare(raw.corridorNormal, {}),
      corridorArm: prepare(raw.corridorArm, {}),
      wallNormal: prepare(raw.wallNormal, {}),
      lightmap: prepare(raw.lightmap, { srgb: true, channel: 1 }),
    }),
    [raw],
  );
  const { shell, themed } = useMemo(() => {
    const s = scene.clone(true);
    dress(s, maps);
    return { shell: s, themed: ownThemedMaterials(s) };
  }, [scene, maps]);

  // Repaint in place when the theme changes (the dashboard preview does this live).
  useEffect(() => {
    for (const [name, material] of themed) {
      const key = THEMED[name];
      if (key) material.color.set(theme[key]);
    }
  }, [themed, theme]);
  const glassPanes = useMemo(() => {
    const g = glass.clone(true);
    dress(g, maps);
    return g;
  }, [glass, maps]);

  return (
    <>
      <primitive object={shell} />
      <primitive object={glassPanes} />
    </>
  );
}

/** The ceiling fan: the "FanBlades" node turns, as on every hot Kampala afternoon. */
function Fan() {
  const { scene } = useGLTF(SHOP_MODELS.fan);
  const fan = useMemo(() => scene.clone(true), [scene]);
  const blades = useRef<THREE.Object3D | null>(null);
  useFrame((_, dt) => {
    blades.current ??= fan.getObjectByName("FanBlades") ?? null;
    if (blades.current) blades.current.rotation.y -= dt * 4.5;
  });
  return <primitive object={fan} />;
}

function ShopColliders() {
  return (
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider args={FLOOR_BOX.halfExtents} position={FLOOR_BOX.center} />
      {WALLS.map((w) => (
        <CuboidCollider key={w.center.join(",")} args={w.halfExtents} position={w.center} />
      ))}
    </RigidBody>
  );
}

/** `sign`: the seller's shop name for the signboard, or null to keep the baked VIRTU board. */
export function ShopShell({ theme, sign }: { theme: ShopTheme; sign: string | null }) {
  return (
    <group>
      <Shell theme={theme} />
      {sign !== null && <ShopSign name={sign} accent={theme.accent} />}
      <Fan />
      <ShopColliders />
    </group>
  );
}

for (const url of Object.values(SHOP_MODELS)) useGLTF.preload(url);
useTexture.preload([...Object.values(TEXTURES), LIGHTMAP]);
