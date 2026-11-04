"use client";

import { Instance, Instances, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { useMemo, useRef } from "react";
import type * as THREE from "three";
import { getProduct, products } from "@/data/products";
import { FIXTURES, SIGN, WALL_BAY_INNER_WIDTH, WALL_BAY_SHELVES, type Fixture } from "@/data/store-layout";
import { PhoneModel } from "./PhoneModel";
import { Room } from "./Room";

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const clone = useMemo(() => scene.clone(true), [scene]);
  return <primitive object={clone} />;
}

function SpinningGroup({ spin, children }: { spin?: boolean; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (spin && ref.current) ref.current.rotation.y += dt * 0.35;
  });
  return <group ref={ref}>{children}</group>;
}

function FixturePhones({ fixture }: { fixture: Fixture }) {
  const phones = fixture.phones ?? [];
  const spacing = fixture.spacing ?? 0.4;
  const scale = fixture.phoneScale ?? 1.4;
  return (
    <>
      {phones.map((slot, i) => {
        const product = getProduct(slot.productId);
        if (!product) return null;
        const x = (i - (phones.length - 1) / 2) * spacing;
        // Alternate front/back so visitors see screens and camera designs
        const facing = fixture.spinPhones ? Math.PI * 0.85 : i % 2 ? Math.PI * 0.88 : 0.2;
        return (
          <group key={`${slot.productId}-${i}`} position={[x, fixture.surfaceY ?? 0, 0]}>
            <SpinningGroup spin={fixture.spinPhones}>
              <PhoneModel
                url={product.modelUrl}
                colour={product.colours[slot.colourIndex]?.hex}
                rotation-y={facing}
                scale={scale}
              />
            </SpinningGroup>
          </group>
        );
      })}
    </>
  );
}

function FixtureView({ fixture }: { fixture: Fixture }) {
  const { halfExtents, center } = fixture.collider;
  return (
    <group position={fixture.position} rotation-y={fixture.rotationY ?? 0}>
      <Model url={fixture.model} />
      <FixturePhones fixture={fixture} />
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={halfExtents} position={center} />
      </RigidBody>
    </group>
  );
}

/** Retail boxes stacked on the wall bays: one draw call for all of them. */
function StockBoxes() {
  const bays = FIXTURES.filter((f) => f.id.startsWith("wall-bay"));
  const boxes = useMemo(() => {
    const out: { pos: [number, number, number]; colour: string }[] = [];
    const perShelf = 11;
    const step = WALL_BAY_INNER_WIDTH / perShelf;
    bays.forEach((bay, b) => {
      WALL_BAY_SHELVES.forEach((y, s) => {
        for (let i = 0; i < perShelf; i++) {
          const p = products[(i + s + b * 2) % products.length];
          const colour = p.colours[(i + s) % p.colours.length].hex;
          out.push({
            pos: [bay.position[0] - WALL_BAY_INNER_WIDTH / 2 + step * (i + 0.5), y + 0.12, bay.position[2] + 0.16],
            colour,
          });
        }
      });
    });
    return out;
  }, [bays]);

  return (
    <Instances limit={boxes.length}>
      <boxGeometry args={[0.13, 0.24, 0.07]} />
      <meshStandardMaterial roughness={0.45} />
      {boxes.map((b, i) => (
        <Instance key={i} position={b.pos} color={b.colour} />
      ))}
    </Instances>
  );
}

export function StoreScene() {
  return (
    <group>
      <Room />
      {FIXTURES.map((f) => (
        <FixtureView key={f.id} fixture={f} />
      ))}
      <StockBoxes />
      <group position={SIGN.position}>
        <Model url={SIGN.model} />
      </group>
    </group>
  );
}

// Warm the cache for every model the showroom needs.
[...new Set([...FIXTURES.map((f) => f.model), SIGN.model, ...products.map((p) => p.modelUrl)])].forEach((u) =>
  useGLTF.preload(u),
);
