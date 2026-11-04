"use client";

import { useCart, useCartCount } from "@/store/cart-store";
import { ShoppingBag } from "lucide-react";

interface CartButtonProps {
  className?: string;
}

/** Floating bag button with a count badge. Toggles the cart drawer. */
export default function CartButton({ className = "" }: CartButtonProps) {
  const count = useCartCount();
  const toggleCart = useCart((s) => s.toggleCart);
  const isOpen = useCart((s) => s.isOpen);

  return (
    <button
      type="button"
      onClick={toggleCart}
      aria-label={
        count === 0 ? "Open bag, empty" : `Open bag, ${count} item${count === 1 ? "" : "s"}`
      }
      aria-haspopup="dialog"
      aria-expanded={isOpen}
      data-testid="cart-button"
      className={`pointer-events-auto relative inline-flex h-11 items-center gap-2 rounded-full bg-white/80 px-4 text-sm font-medium text-neutral-900 shadow-sm ring-1 ring-black/5 backdrop-blur transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 ${className}`}
    >
      <ShoppingBag aria-hidden="true" className="size-5" strokeWidth={1.75} />
      <span>Bag</span>
      {count > 0 && (
        <span
          aria-hidden="true"
          className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-[#8a4a0c] px-1.5 text-[11px] font-semibold leading-5 text-white"
        >
          {count}
        </span>
      )}
    </button>
  );
}
