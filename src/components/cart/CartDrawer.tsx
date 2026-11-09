"use client";

import { TrademarkNotice } from "@/components/ui/TrademarkNotice";
import { formatUGX } from "@/lib/format-ugx";
import { DELIVERY_FEE, cartTotals } from "@/lib/pricing";
import { MAX_QTY, MIN_QTY, type PricedCartLine, useCart, useCartLines } from "@/store/cart-store";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import Link from "next/link";
import { type KeyboardEvent, useEffect, useId, useRef } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), select:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Slide-over cart. Mount it once per page; `useCart().openCart()` shows it. */
export default function CartDrawer() {
  const isOpen = useCart((s) => s.isOpen);
  const closeCart = useCart((s) => s.closeCart);
  const lines = useCartLines();
  const { subtotal, count } = cartTotals(lines);
  const titleId = useId();
  const panelRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Focus moves into the drawer on open and back to whatever opened it on close.
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // On the document, so Esc works even after a click on plain text inside the panel.
    const onEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") closeCart();
    };
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("keydown", onEscape);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [isOpen, closeCart]);

  const onKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key !== "Tab" || panelRef.current === null) return;
    // Keep Tab inside the dialog.
    const focusable = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (first === undefined || last === undefined) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    // Visibility flips at once on open (so focus can move in) and only after the slide on close.
    <div
      className={`fixed inset-0 z-50 ${
        isOpen ? "visible" : "pointer-events-none invisible transition-[visibility] duration-300"
      }`}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onClick={closeCart}
        className={`absolute inset-0 h-full w-full cursor-default bg-black/40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
      />
      {/* `open` rather than showModal(): it stays in the page so it can slide; this component
          handles the modal parts (focus, Tab trap, Esc, backdrop) itself. */}
      <dialog
        ref={panelRef}
        open
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={onKeyDown}
        className={`absolute inset-y-0 right-0 left-auto m-0 flex h-full max-h-none w-full max-w-md flex-col border-0 bg-[#f6f4ef] p-0 text-neutral-900 shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-center justify-between border-b border-black/10 px-4 py-3">
          <h2 id={titleId} className="text-lg font-semibold">
            Your bag{count > 0 ? ` (${count})` : ""}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={closeCart}
            aria-label="Close bag"
            className="inline-flex size-10 items-center justify-center rounded-full hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-neutral-900"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </header>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <ShoppingBag
              aria-hidden="true"
              className="size-10 text-neutral-400"
              strokeWidth={1.5}
            />
            <p className="text-lg font-medium">Your bag is empty</p>
            <p className="text-sm text-neutral-600">
              Pick up a phone in the showroom and add it here.
            </p>
            <button
              type="button"
              onClick={closeCart}
              className="inline-flex h-11 items-center rounded-full bg-neutral-900 px-5 font-medium text-white transition-colors hover:bg-neutral-700"
            >
              Keep browsing
            </button>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-black/10 overflow-y-auto px-4">
              {lines.map((line) => (
                <CartLineRow key={line.key} line={line} />
              ))}
            </ul>
            <footer className="space-y-3 border-t border-black/10 px-4 py-4">
              <div className="flex items-baseline justify-between">
                <span className="text-neutral-600">Subtotal</span>
                <span className="text-lg font-semibold" data-testid="cart-subtotal">
                  {formatUGX(subtotal)}
                </span>
              </div>
              <p className="text-sm text-neutral-600">
                Delivery from {formatUGX(DELIVERY_FEE)} by boda, calculated at checkout.
              </p>
              <TrademarkNotice className="mt-3" />
              <Link
                href="/checkout"
                onClick={closeCart}
                className="flex h-12 w-full items-center justify-center rounded-full bg-neutral-900 font-medium text-white transition-colors hover:bg-neutral-700"
              >
                Checkout
              </Link>
            </footer>
          </>
        )}
      </dialog>
    </div>
  );
}

function CartLineRow({ line }: { line: PricedCartLine }) {
  const setQty = useCart((s) => s.setQty);
  const changeVariant = useCart((s) => s.changeVariant);
  const removeItem = useCart((s) => s.removeItem);
  const selectId = useId();
  const { product, colour, variant } = line;

  return (
    <li className="flex gap-3 py-4" data-testid="cart-line">
      <span
        aria-hidden="true"
        className="mt-1 size-10 shrink-0 rounded-full ring-1 ring-black/10"
        style={{ backgroundColor: colour.hex }}
      />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-medium">{product.name}</p>
            <p className="text-sm text-neutral-600">
              {colour.label} · {variant.label}
            </p>
            {line.shop && <p className="text-xs text-neutral-500">from {line.shop.name}</p>}
          </div>
          <p className="shrink-0 font-semibold">{formatUGX(line.lineTotal)}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor={selectId} className="sr-only">
            Storage for {product.name}
          </label>
          <select
            id={selectId}
            value={line.variantId}
            onChange={(e) => changeVariant(line.key, e.target.value)}
            className="h-9 rounded-full border border-black/15 bg-white px-3 text-sm"
          >
            {product.variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label} · {formatUGX((line.shop?.basePrice ?? product.basePrice) + v.priceDelta)}
              </option>
            ))}
          </select>

          <fieldset className="flex h-9 items-center rounded-full border border-black/15 bg-white">
            <legend className="sr-only">Quantity of {product.name}</legend>
            <button
              type="button"
              onClick={() => setQty(line.key, line.qty - 1)}
              disabled={line.qty <= MIN_QTY}
              aria-label={`Decrease quantity of ${product.name}`}
              className="inline-flex size-9 items-center justify-center rounded-full disabled:opacity-30"
            >
              <Minus aria-hidden="true" className="size-4" />
            </button>
            <output aria-live="polite" className="w-6 text-center text-sm tabular-nums">
              {line.qty}
            </output>
            <button
              type="button"
              onClick={() => setQty(line.key, line.qty + 1)}
              disabled={line.qty >= MAX_QTY}
              aria-label={`Increase quantity of ${product.name}`}
              className="inline-flex size-9 items-center justify-center rounded-full disabled:opacity-30"
            >
              <Plus aria-hidden="true" className="size-4" />
            </button>
          </fieldset>

          <button
            type="button"
            onClick={() => removeItem(line.key)}
            aria-label={`Remove ${product.name} from bag`}
            className="ml-auto inline-flex size-9 items-center justify-center rounded-full text-neutral-500 hover:bg-black/5 hover:text-neutral-900"
          >
            <Trash2 aria-hidden="true" className="size-4" />
          </button>
        </div>
      </div>
    </li>
  );
}
