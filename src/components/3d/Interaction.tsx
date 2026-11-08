"use client";

import { getProduct } from "@/data/products";
import { INTERACT_RADIUS } from "@/data/store-layout";
import type { DisplaySlot } from "@/lib/display-slots";
import { nearestSlot } from "@/lib/display-slots";
import { formatUGX } from "@/lib/format-ugx";
import { shopBasePrice } from "@/lib/shop-pricing";
import type { ShopConfig } from "@/lib/shop-schema";
import { useUiStore } from "@/store/ui-store";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { playerState } from "./player-state";

/**
 * Finds the phone the visitor is standing next to and floats a prompt above it, with this
 * shop's price. Writes to the UI store only when the nearest phone changes, not every frame.
 */
export function Interaction({ slots, shop }: { slots: DisplaySlot[]; shop: ShopConfig }) {
  const nearSlotId = useUiStore((s) => s.nearSlotId);
  const inspecting = useUiStore((s) => s.inspectingId !== null);
  const openInspect = useUiStore((s) => s.openInspect);

  useFrame(() => {
    if (!playerState.ready) return;
    const hit = nearestSlot(playerState.position, slots, INTERACT_RADIUS);
    const colourId = hit ? getProduct(hit.productId)?.colours[hit.colourIndex]?.id : undefined;
    useUiStore.getState().setNear(hit?.id ?? null, hit?.productId ?? null, colourId ?? null);
  });

  const slot = slots.find((s) => s.id === nearSlotId);
  const product = slot ? getProduct(slot.productId) : undefined;
  if (!slot || !product || inspecting) return null;

  const colour = product.colours[slot.colourIndex];
  const price = shopBasePrice(shop, product.id) ?? product.basePrice;
  return (
    <Html
      position={[slot.position[0], slot.position[1] + 0.45, slot.position[2]]}
      center
      distanceFactor={4}
      zIndexRange={[10, 0]}
    >
      <button
        type="button"
        onClick={() => openInspect(product.id, colour?.id)}
        className="whitespace-nowrap rounded-full bg-neutral-900/90 px-4 py-2 text-left text-white shadow-lg backdrop-blur"
      >
        <span className="block text-sm font-semibold">
          {product.brand} {product.name}
        </span>
        <span className="block text-xs text-white/75">
          from {formatUGX(price)} ·{" "}
          <kbd className="rounded bg-white/20 px-1 font-sans pointer-coarse:hidden">E</kbd>
          <span className="pointer-coarse:hidden"> to inspect</span>
          <span className="hidden pointer-coarse:inline">Tap to inspect</span>
        </span>
      </button>
    </Html>
  );
}
