"use client";

import { useShop } from "@/components/shop/ShopContext";
import { resolveShopProduct } from "@/lib/shop-products";
import { useUiStore } from "@/store/ui-store";
import { Joystick, VirtualButton } from "ecctrl/input";

/**
 * On-screen controls for touch devices only (hidden for mouse users via `pointer-coarse`):
 * ecctrl's joystick bottom-left, jump bottom-right, and an Inspect button next to a phone.
 */
export function TouchControls() {
  const nearProductId = useUiStore((s) => s.nearProductId);
  const inspecting = useUiStore((s) => s.inspectingId !== null);
  const nearColourId = useUiStore((s) => s.nearColourId);
  const openInspect = useUiStore((s) => s.openInspect);
  const shop = useShop();
  const near = nearProductId ? resolveShopProduct(shop, nearProductId) : undefined;

  if (inspecting) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 hidden pointer-coarse:block">
      {/* ecctrl renders these as position:fixed without offsets, so pin them explicitly. */}
      <div className="pointer-events-auto">
        <Joystick
          joystickMaxRadius={48}
          joystickWrapperStyle={{ position: "fixed", left: 8, bottom: 16, top: "auto" }}
        />
      </div>
      <div className="pointer-events-auto absolute right-6 bottom-28 flex flex-col items-end gap-3">
        {near && (
          <button
            type="button"
            onClick={() => openInspect(near.id, nearColourId ?? undefined)}
            className="rounded-full bg-neutral-900 px-5 py-3 text-sm font-semibold text-white shadow-lg"
          >
            Inspect {near.name}
          </button>
        )}
        <VirtualButton
          id="jump"
          label="Jump"
          buttonWrapperStyle={{
            position: "fixed",
            right: 24,
            bottom: 40,
            top: "auto",
            left: "auto",
          }}
        />
      </div>
    </div>
  );
}
