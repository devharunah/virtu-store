import ExperienceLoader from "@/components/3d/ExperienceLoader";
import CartButton from "@/components/cart/CartButton";
import CartDrawer from "@/components/cart/CartDrawer";
import { VIRTU_SHOP } from "@/data/demo-shops";
import type { ShopConfig } from "@/lib/shop-schema";
import Link from "next/link";
import { ShareShopButton } from "./ShareShopButton";

/**
 * A walk-in shop: the 3D scene with the header overlay and the bag. `/store` renders the
 * VIRTU.STORE showroom with it; `/stores/[slug]` renders any seller's shop.
 */
export function Showroom({ shop }: { shop: ShopConfig }) {
  const isVirtu = shop.slug === VIRTU_SHOP.slug;
  return (
    <main className="relative h-dvh w-full bg-[#efece6]">
      <ExperienceLoader shop={shop} />
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between gap-3 p-4">
        <div className="pointer-events-auto flex min-w-0 items-center gap-2">
          <Link
            href={isVirtu ? "/" : "/stores"}
            className="shrink-0 text-sm font-semibold tracking-wide text-neutral-900"
          >
            {isVirtu ? "VIRTU.STORE" : "← Shops"}
          </Link>
          {!isVirtu && (
            <span
              className="truncate rounded-full px-3 py-1 text-sm font-semibold text-white"
              style={{ backgroundColor: shop.theme.accent }}
              data-testid="shop-name"
            >
              {shop.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden rounded-full bg-white/80 px-3 py-1 text-xs text-neutral-600 backdrop-blur lg:inline">
            <span className="pointer-coarse:hidden">
              Click the floor or WASD to walk · drag to look · E to inspect
            </span>
            <span className="hidden pointer-coarse:inline">
              Tap the floor to walk · drag to look
            </span>
          </span>
          {!isVirtu && <ShareShopButton name={shop.name} />}
          <CartButton />
        </div>
      </div>
      <CartDrawer />
    </main>
  );
}
