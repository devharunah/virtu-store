import ExperienceLoader from "@/components/3d/ExperienceLoader";
import CartButton from "@/components/cart/CartButton";
import CartDrawer from "@/components/cart/CartDrawer";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Showroom · VIRTU.STORE" };

export default function StorePage() {
  return (
    <main className="relative h-dvh w-full bg-[#efece6]">
      <ExperienceLoader />
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-4">
        <Link
          href="/"
          className="pointer-events-auto text-sm font-semibold tracking-wide text-neutral-900"
        >
          VIRTU.STORE
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden rounded-full bg-white/80 px-3 py-1 text-xs text-neutral-600 backdrop-blur sm:inline">
            <span className="pointer-coarse:hidden">
              Click the floor or WASD to walk · drag to look · E to inspect
            </span>
            <span className="hidden pointer-coarse:inline">
              Tap the floor to walk · drag to look
            </span>
          </span>
          <CartButton />
        </div>
      </div>
      <CartDrawer />
    </main>
  );
}
