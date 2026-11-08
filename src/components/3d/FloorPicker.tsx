"use client";

import { CORRIDOR, FLOOR_BOX, HALF_D, HALF_W } from "@/data/store-layout";
import { clampToFloor } from "@/lib/steer";
import { useUiStore } from "@/store/ui-store";
import { type ThreeEvent, useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type * as THREE from "three";
import { clearMoveTarget, moveTarget, setMoveTarget } from "./move-target";
import { CAPSULE, PLAYER_GROUP } from "./player-state";

/** Keep targets this far from walls so the capsule can actually reach them. */
const MARGIN = CAPSULE.radius + 0.1;

const SHOP_FLOOR = { minX: -HALF_W, maxX: HALF_W, minZ: -HALF_D, maxZ: HALF_D };
const CORRIDOR_FLOOR = {
  minX: -CORRIDOR.halfLength,
  maxX: CORRIDOR.halfLength,
  minZ: CORRIDOR.z0,
  maxZ: CORRIDOR.z1,
};

const isPlayer = (o: THREE.Object3D) => {
  for (let n: THREE.Object3D | null = o; n; n = n.parent) if (n.name === PLAYER_GROUP) return true;
  return false;
};

/**
 * The first real surface under the pointer: meshes only (the ?debug collider wireframes are
 * lines), skipping the visitor's own body so you can click the floor just behind them.
 */
const firstSolidHit = (hits: THREE.Intersection[]) =>
  hits.find((h) => (h.object as THREE.Mesh).isMesh && !isPlayer(h.object))?.object;

const [cx, , cz] = FLOOR_BOX.center;
const [hx, , hz] = FLOOR_BOX.halfExtents;

/**
 * Click or tap the floor and the visitor walks there (ecctrl v2 has no point-to-move, so
 * <Player> steers toward `moveTarget`). An invisible plane covers the shop and the corridor;
 * a click only counts when the floor is the first thing under the pointer, so clicking a
 * counter, a wall or a phone never sends the visitor through it.
 */
export function FloorPicker() {
  const plane = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);

  // Opening a phone pauses the frame loop, so drop the walk target here rather than in <Player>.
  useEffect(
    () =>
      useUiStore.subscribe((s, prev) => {
        if (s.inspectingId && !prev.inspectingId) clearMoveTarget("ui");
      }),
    [],
  );

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 6) return; // that was a camera drag, not a click
    if (firstSolidHit(e.intersections) !== plane.current) return; // something stands in front
    e.stopPropagation();
    const region = e.point.z < HALF_D ? SHOP_FLOOR : CORRIDOR_FLOOR;
    setMoveTarget(clampToFloor({ x: e.point.x, z: e.point.z }, region, MARGIN));
  };

  // A soft ring pulses where the visitor is heading.
  useFrame(({ clock }) => {
    const r = ring.current;
    if (!r) return;
    const p = moveTarget.point;
    r.visible = p !== null;
    if (!p) return;
    r.position.set(p.x, 0.012, p.z);
    const s = 1 + 0.15 * Math.sin(clock.elapsedTime * 6);
    r.scale.set(s, s, s);
  });

  return (
    <>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: a three.js mesh, not a DOM element; keyboard users walk with WASD/arrows */}
      <mesh
        onClick={onClick}
        ref={plane}
        position={[cx, 0.002, cz]}
        rotation-x={-Math.PI / 2}
        name="floor-picker"
      >
        <planeGeometry args={[hx * 2, hz * 2]} />
        <meshBasicMaterial colorWrite={false} depthWrite={false} />
      </mesh>
      <mesh ref={ring} rotation-x={-Math.PI / 2} visible={false} raycast={() => null}>
        <ringGeometry args={[0.16, 0.22, 32]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.85} toneMapped={false} />
      </mesh>
    </>
  );
}
