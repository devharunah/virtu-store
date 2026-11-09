"use client";

import { VIRTU_SHOP } from "@/data/demo-shops";
import { products } from "@/data/products";
import { type Fixture, PEGBOARD, SHELF_STOCK } from "@/data/store-layout";
import { slotLocalX } from "@/lib/display-slots";
import { resolveShopProduct } from "@/lib/shop-products";
import type { ShopConfig } from "@/lib/shop-schema";
import { useUiStore } from "@/store/ui-store";
import type { Product } from "@/types/product";
import { Instance, Instances, useGLTF } from "@react-three/drei";
import { type ThreeEvent, useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { PhoneModel } from "./PhoneModel";
import { ShopShell } from "./ShopShell";

/** Approximate phone size in metres, for laying phones flat under the counter glass. */
const PHONE_LENGTH = 0.163;
const PHONE_THICKNESS = 0.009;

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

type Pose = { rotation: [number, number, number]; position: [number, number, number] };

/**
 * How a phone sits in its slot. Flat phones lie under the glass, alternating screen-up (to show
 * the wallpaper) and back-up (to show the camera and logo); upright phones stand on stands.
 */
function poseFor(fixture: Fixture, index: number, scale: number): Pose {
  if (fixture.pose !== "flat") {
    return {
      rotation: [0, fixture.spinPhones ? Math.PI * 0.85 : 0.2, 0],
      position: [0, 0, 0],
    };
  }
  const lift = (PHONE_THICKNESS / 2) * scale;
  const half = (PHONE_LENGTH / 2) * scale;
  return index % 2 === 0
    ? { rotation: [-Math.PI / 2, 0, 0], position: [0, lift, half] } // screen up
    : { rotation: [Math.PI / 2, 0, 0], position: [0, lift, -half] }; // back up
}

/** One phone on display: grows a little when the visitor is next to it, and opens on click/tap. */
function DisplayPhone({
  slotId,
  product,
  colourIndex,
  pose,
  scale,
  spin,
}: {
  slotId: string;
  product: Product;
  colourIndex: number;
  pose: Pose;
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
        <group position={pose.position} rotation={pose.rotation}>
          <PhoneModel
            url={product.modelUrl}
            colour={colour?.hex}
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
      </group>
    </SpinningGroup>
  );
}

function FixturePhones({ fixture, shop }: { fixture: Fixture; shop: ShopConfig }) {
  const phones = fixture.phones ?? [];
  const spacing = fixture.spacing ?? 0.4;
  const scale = fixture.phoneScale ?? 1.4;
  return (
    <>
      {phones.map((slot, i) => {
        const product = resolveShopProduct(shop, slot.productId);
        if (!product) return null;
        const slotId = `${fixture.id}:${i}`;
        const x = slot.x ?? slotLocalX(i, phones.length, spacing);
        return (
          <group key={slotId} position={[x, fixture.surfaceY ?? 0, 0]}>
            <DisplayPhone
              slotId={slotId}
              product={product}
              colourIndex={slot.colourIndex}
              pose={poseFor(fixture, i, scale)}
              scale={scale}
              spin={fixture.spinPhones ?? false}
            />
          </group>
        );
      })}
    </>
  );
}

function FixtureView({ fixture, shop }: { fixture: Fixture; shop: ShopConfig }) {
  return (
    <group position={fixture.position} rotation-y={fixture.rotationY ?? 0}>
      {fixture.model && <Model url={fixture.model} />}
      <FixturePhones fixture={fixture} shop={shop} />
      {fixture.collider && (
        <RigidBody type="fixed" colliders={false}>
          <CuboidCollider args={fixture.collider.halfExtents} position={fixture.collider.center} />
        </RigidBody>
      )}
    </group>
  );
}

/** Boxed phones stacked on the back-wall shelves: one draw call for all of them. */
function ShelfStock() {
  const boxes = useMemo(() => {
    const out: { pos: [number, number, number]; colour: string }[] = [];
    const { levels, width, z, perShelf } = SHELF_STOCK;
    const step = width / perShelf;
    levels.forEach((y, s) => {
      for (let i = 0; i < perShelf; i++) {
        if ((i + s * 3) % 7 === 6) continue; // gaps where stock has sold
        const p = products[(i + s) % products.length];
        const colour = p?.colours[(i * 3 + s) % p.colours.length]?.hex;
        if (!colour) continue;
        out.push({ pos: [-width / 2 + step * (i + 0.5), y + 0.025 + 0.11, z], colour });
      }
    });
    return out;
  }, []);

  return (
    <Instances limit={boxes.length}>
      <boxGeometry args={[0.1, 0.22, 0.06]} />
      <meshStandardMaterial roughness={0.45} />
      {boxes.map((b) => (
        <Instance key={b.pos.join(",")} position={b.pos} color={b.colour} />
      ))}
    </Instances>
  );
}

/** Chargers, earphones and covers in blister packs hanging on the pegboard. */
function PegboardPacks() {
  const packs = useMemo(() => {
    const palette = ["#1C1D20", "#F2F2EE", "#2E6FD8", "#E23D3D", "#1C1D20", "#F2C230", "#9AA3AD"];
    const out: { pos: [number, number, number]; colour: string }[] = [];
    const cols = 9;
    const rows = 4;
    const stepZ = (PEGBOARD.width - 0.3) / (cols - 1);
    const stepY = (PEGBOARD.top - PEGBOARD.bottom - 0.4) / (rows - 1);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        out.push({
          pos: [
            PEGBOARD.x - 0.02,
            PEGBOARD.bottom + 0.2 + r * stepY,
            PEGBOARD.z - PEGBOARD.width / 2 + 0.15 + c * stepZ,
          ],
          colour: palette[(r * cols + c * 5) % palette.length] ?? "#1C1D20",
        });
      }
    }
    return out;
  }, []);

  return (
    <Instances limit={packs.length}>
      <boxGeometry args={[0.03, 0.17, 0.11]} />
      <meshStandardMaterial roughness={0.35} />
      {packs.map((p) => (
        <Instance key={p.pos.join(",")} position={p.pos} color={p.colour} />
      ))}
    </Instances>
  );
}

export function StoreScene({ shop, fixtures }: { shop: ShopConfig; fixtures: Fixture[] }) {
  return (
    <group>
      <ShopShell
        theme={shop.theme}
        sign={shop.slug === VIRTU_SHOP.slug ? null : shop.name}
        banner={shop.bannerUrl}
      />
      {fixtures.map((f) => (
        <FixtureView key={f.id} fixture={f} shop={shop} />
      ))}
      <ShelfStock />
      <PegboardPacks />
    </group>
  );
}

// Warm the cache for every catalogue phone model. The generic model for seller-added phones
// (24 KB) loads only in shops that have one.
for (const url of new Set(products.map((p) => p.modelUrl))) {
  useGLTF.preload(url);
}
