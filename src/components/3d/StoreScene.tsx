"use client";

import { getProduct, products } from "@/data/products";
import {
  FIXTURES,
  type Fixture,
  SIGN,
  WALL_BAY_INNER_WIDTH,
  WALL_BAY_SHELVES,
} from "@/data/store-layout";
import { slotLocalX } from "@/lib/display-slots";
import { useUiStore } from "@/store/ui-store";
import type { Product } from "@/types/product";
import { Instance, Instances, useGLTF } from "@react-three/drei";
import { type ThreeEvent, useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { useMemo, useRef } from "react";
import * as THREE from "three";
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

/** One phone on display: grows a little when the visitor is next to it, and opens on click/tap. */
function DisplayPhone({
  slotId,
  product,
  colourIndex,
  facing,
  scale,
  spin,
}: {
  slotId: string;
  product: Product;
  colourIndex: number;
  facing: number;
  scale: number;
  spin: boolean;
}) {
  const near = useUiStore((s) => s.nearSlotId === slotId);
  const openInspect = useUiStore((s) => s.openInspect);
  const grow = useRef<THREE.Group>(null);
  const colour = product.colours[colourIndex];

  useFrame((_, dt) => {
    const g = grow.current;
    if (!g) return;
    const goal = near ? 1.12 : 1;
    g.scale.setScalar(THREE.MathUtils.damp(g.scale.x, goal, 10, dt));
  });

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 6) return; // that was a camera drag, not a click
    e.stopPropagation();
    openInspect(product.id, colour?.id);
  };

  return (
    <SpinningGroup spin={spin}>
      <group ref={grow}>
        <PhoneModel
          url={product.modelUrl}
          colour={colour?.hex}
          rotation-y={facing}
          scale={scale}
          onClick={onClick}
          onPointerOver={() => {
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            document.body.style.cursor = "";
          }}
        />
      </group>
    </SpinningGroup>
  );
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
        // Alternate front/back so visitors see screens and camera designs
        const facing = fixture.spinPhones ? Math.PI * 0.85 : i % 2 ? Math.PI * 0.88 : 0.2;
        const slotId = `${fixture.id}:${i}`;
        return (
          <group
            key={slotId}
            position={[slotLocalX(i, phones.length, spacing), fixture.surfaceY ?? 0, 0]}
          >
            <DisplayPhone
              slotId={slotId}
              product={product}
              colourIndex={slot.colourIndex}
              facing={facing}
              scale={scale}
              spin={fixture.spinPhones ?? false}
            />
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
          const colour = p?.colours[(i + s) % p.colours.length]?.hex;
          if (!colour) continue;
          out.push({
            pos: [
              bay.position[0] - WALL_BAY_INNER_WIDTH / 2 + step * (i + 0.5),
              y + 0.12,
              bay.position[2] + 0.16,
            ],
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
      {boxes.map((b) => (
        <Instance key={b.pos.join(",")} position={b.pos} color={b.colour} />
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
for (const url of new Set([
  ...FIXTURES.map((f) => f.model),
  SIGN.model,
  ...products.map((p) => p.modelUrl),
])) {
  useGLTF.preload(url);
}
