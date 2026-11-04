"use client";

import { useTexture } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { useMemo } from "react";
import * as THREE from "three";
import { HALF_D, HALF_W, ROOM } from "@/data/store-layout";

// Real-world size one texture repeat covers (from Poly Haven's asset info)
const FLOOR_TILE_METRES = 1.5; // marble_01
const WALL_TILE_METRES = 3; // beige_wall_001
const WALL_T = 0.2; // collider thickness

type PBRMaps = { map: THREE.Texture; normalMap: THREE.Texture; arm: THREE.Texture };

function usePBR(folder: string): PBRMaps {
  return useTexture({
    map: `/textures/${folder}/color.webp`,
    normalMap: `/textures/${folder}/normal.webp`,
    arm: `/textures/${folder}/arm.webp`,
  });
}

/** Clone a texture set with a repeat that matches a surface of w x h metres. */
function tiled(maps: PBRMaps, w: number, h: number, tileMetres = WALL_TILE_METRES) {
  const out = {} as PBRMaps;
  for (const key of Object.keys(maps) as (keyof PBRMaps)[]) {
    const tex = maps[key].clone();
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(w / tileMetres, h / tileMetres);
    tex.anisotropy = 4;
    if (key === "map") tex.colorSpace = THREE.SRGBColorSpace; // colour data; normal/ARM stay linear
    tex.needsUpdate = true;
    out[key] = tex;
  }
  return out;
}

function PBRMaterial({ maps, color = "#ffffff", roughness = 1, painted = false }: {
  maps: PBRMaps; color?: string; roughness?: number;
  /** painted: flat paint colour + plaster bump only (the photo colour map reads too dark indoors) */
  painted?: boolean;
}) {
  return (
    <meshStandardMaterial
      map={painted ? null : maps.map}
      normalMap={maps.normalMap}
      normalScale={painted ? new THREE.Vector2(0.5, 0.5) : undefined}
      aoMap={maps.arm}
      aoMapIntensity={painted ? 0.4 : 1}
      roughnessMap={maps.arm}
      metalnessMap={maps.arm}
      roughness={roughness}
      color={color}
    />
  );
}

function Wall({ w, h, position, rotationY = 0, maps, color = "#efe7da" }: {
  w: number; h: number; position: [number, number, number]; rotationY?: number; maps: PBRMaps; color?: string;
}) {
  const m = useMemo(() => tiled(maps, w, h), [maps, w, h]);
  return (
    <mesh position={position} rotation-y={rotationY}>
      <planeGeometry args={[w, h]} />
      <PBRMaterial maps={m} color={color} painted />
    </mesh>
  );
}

/** Shop front at +Z: solid kerb + glass panes either side of an open doorway, header above. */
function ShopFront({ maps }: { maps: PBRMaps }) {
  const { door, height, kerb } = ROOM;
  const sideW = (ROOM.width - door.width) / 2;
  const sideX = door.width / 2 + sideW / 2;
  const headerH = height - door.height;
  const glassH = door.height - kerb;
  const z = HALF_D;

  return (
    <group>
      {[-1, 1].map((s) => (
        <group key={s}>
          <Wall w={sideW} h={kerb} position={[s * sideX, kerb / 2, z]} rotationY={Math.PI} maps={maps} color="#2b3a55" />
          <mesh position={[s * sideX, kerb + glassH / 2, z]}>
            <planeGeometry args={[sideW, glassH]} />
            <meshStandardMaterial color="#cfe3ea" transparent opacity={0.18} roughness={0.05} metalness={0.2} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
          {/* mullions */}
          {[0, 1].map((k) => (
            <mesh key={k} position={[s * (door.width / 2 + 0.03 + k * (sideW - 0.06)), kerb + glassH / 2, z]}>
              <boxGeometry args={[0.06, glassH, 0.08]} />
              <meshStandardMaterial color="#1e1f22" roughness={0.4} metalness={0.6} />
            </mesh>
          ))}
        </group>
      ))}
      <Wall w={ROOM.width} h={headerH} position={[0, door.height + headerH / 2, z]} rotationY={Math.PI} maps={maps} />
      {/* door frame */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (door.width / 2), door.height / 2, z]}>
          <boxGeometry args={[0.08, door.height, 0.12]} />
          <meshStandardMaterial color="#1e1f22" roughness={0.4} metalness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

function CeilingLights() {
  const panels: [number, number][] = [];
  for (const x of [-3.5, 0, 3.5]) for (const z of [-2.8, 0.4, 3.2]) panels.push([x, z]);
  return (
    <group>
      {panels.map(([x, z]) => (
        <mesh key={`${x}:${z}`} position={[x, ROOM.height - 0.01, z]} rotation-x={Math.PI / 2}>
          <planeGeometry args={[1.8, 0.35]} />
          <meshBasicMaterial color="#fff6e6" toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/** Invisible walls; the open doorway stays walkable but is closed one metre outside so nobody walks off. */
function RoomColliders() {
  const { width, height, door } = ROOM;
  const sideW = (width - door.width) / 2;
  const h = height / 2;
  return (
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider args={[HALF_W, 0.1, HALF_D + 1.2]} position={[0, -0.1, 1]} />
      <CuboidCollider args={[HALF_W, h, WALL_T / 2]} position={[0, h, -HALF_D - WALL_T / 2]} />
      <CuboidCollider args={[WALL_T / 2, h, HALF_D]} position={[-HALF_W - WALL_T / 2, h, 0]} />
      <CuboidCollider args={[WALL_T / 2, h, HALF_D]} position={[HALF_W + WALL_T / 2, h, 0]} />
      {[-1, 1].map((s) => (
        <CuboidCollider key={s} args={[sideW / 2, h, WALL_T / 2]} position={[s * (door.width / 2 + sideW / 2), h, HALF_D + WALL_T / 2]} />
      ))}
      {/* porch stop, just outside the door */}
      <CuboidCollider args={[door.width / 2 + 0.5, h, 0.1]} position={[0, h, HALF_D + 1.1]} />
    </RigidBody>
  );
}

export function Room() {
  const floor = usePBR("floor");
  const wall = usePBR("wall");
  const floorMaps = useMemo(() => tiled(floor, ROOM.width, ROOM.depth, FLOOR_TILE_METRES), [floor]);
  const h = ROOM.height;

  return (
    <group>
      {/* floor */}
      <mesh rotation-x={-Math.PI / 2}>
        <planeGeometry args={[ROOM.width, ROOM.depth]} />
        <PBRMaterial maps={floorMaps} roughness={0.75} />
      </mesh>
      {/* pavement outside the shop front */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.01, HALF_D + 6]}>
        <planeGeometry args={[40, 12]} />
        <meshStandardMaterial color="#9a958c" roughness={1} />
      </mesh>
      {/* ceiling */}
      <mesh rotation-x={Math.PI / 2} position={[0, h, 0]}>
        <planeGeometry args={[ROOM.width, ROOM.depth]} />
        <meshStandardMaterial color="#ffffff" emissive="#f4efe6" emissiveIntensity={0.55} roughness={1} />
      </mesh>
      <CeilingLights />

      {/* back wall: deep navy accent behind the sign; side walls: warm plaster */}
      <Wall w={ROOM.width} h={h} position={[0, h / 2, -HALF_D]} maps={wall} color="#2f3f5c" />
      <Wall w={ROOM.depth} h={h} position={[-HALF_W, h / 2, 0]} rotationY={Math.PI / 2} maps={wall} />
      <Wall w={ROOM.depth} h={h} position={[HALF_W, h / 2, 0]} rotationY={-Math.PI / 2} maps={wall} />
      <ShopFront maps={wall} />

      <RoomColliders />
    </group>
  );
}

useTexture.preload(["floor", "wall"].flatMap((f) => ["color", "normal", "arm"].map((m) => `/textures/${f}/${m}.webp`)));
