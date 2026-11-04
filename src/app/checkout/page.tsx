import CartButton from "@/components/cart/CartButton";
import CartDrawer from "@/components/cart/CartDrawer";
import CheckoutFlow from "@/components/checkout/CheckoutFlow";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Checkout · VIRTU.STORE" };

export default function CheckoutPage() {
  return (
    <main className="flex min-h-dvh flex-col bg-[#f6f4ef] text-neutral-900">
      <div
        role="note"
        className="bg-[#8a4a0c] px-4 py-3 text-center text-sm font-semibold text-white sm:text-base"
      >
        Demo store: no real payment is taken
      </div>
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 sm:px-8">
        <Link href="/" className="text-sm font-semibold tracking-wide">
          VIRTU.STORE
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/store" className="text-sm text-neutral-600 hover:text-neutral-900">
            Back to the showroom
          </Link>
          <CartButton />
        </div>
      </header>
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 sm:px-8">
        <CheckoutFlow />
      </div>
      <CartDrawer />
    </main>
  );
}
