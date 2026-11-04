"use client";

import { getProduct } from "@/data/products";
import { formatUGX } from "@/lib/format-ugx";
import { unitPrice } from "@/lib/pricing";
import { useCart } from "@/store/cart-store";
import { selectionFor, useUiStore } from "@/store/ui-store";
import { Check, ShoppingBag, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const InspectViewer = dynamic(() => import("./InspectViewer"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-neutral-200" />,
});

/** The inspection sheet: 3D viewer plus details, colour and storage choice, live price. */
export function ProductPanel() {
  const inspectingId = useUiStore((s) => s.inspectingId);
  const selections = useUiStore((s) => s.selections);
  const closeInspect = useUiStore((s) => s.closeInspect);
  const selectColour = useUiStore((s) => s.selectColour);
  const selectVariant = useUiStore((s) => s.selectVariant);
  const closeButton = useRef<HTMLButtonElement>(null);
  const addItem = useCart((s) => s.addItem);
  const openCart = useCart((s) => s.openCart);
  const [added, setAdded] = useState<string | null>(null);

  const product = inspectingId ? getProduct(inspectingId) : undefined;

  useEffect(() => {
    if (product) closeButton.current?.focus();
  }, [product]);

  if (!product) return null;

  const sel = selectionFor(selections, product);
  const colour = product.colours.find((c) => c.id === sel.colourId);
  const price = unitPrice(product, sel.variantId) ?? product.basePrice;
  const addedKey = `${product.id}:${sel.colourId}:${sel.variantId}`;

  const addToBag = () => {
    addItem({ productId: product.id, colourId: sel.colourId, variantId: sel.variantId });
    setAdded(addedKey);
  };
  const viewBag = () => {
    closeInspect();
    openCart();
  };

  return (
    <div className="absolute inset-0 z-30 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        className="absolute inset-0 cursor-default"
        onClick={closeInspect}
      />
      <dialog
        aria-modal="true"
        aria-labelledby="inspect-title"
        open
        className="relative m-0 flex max-h-[100dvh] w-full max-w-4xl p-0 text-neutral-900 flex-col overflow-hidden rounded-t-3xl bg-[#f6f4ef] shadow-2xl sm:max-h-[90dvh] sm:flex-row sm:rounded-3xl"
      >
        <div className="relative h-[46dvh] shrink-0 sm:h-auto sm:min-h-[520px] sm:flex-1">
          <InspectViewer url={product.modelUrl} colour={colour?.hex} />
          <p className="pointer-events-none absolute bottom-3 left-0 right-0 text-center text-xs text-neutral-500">
            Drag to rotate · scroll or pinch to zoom
          </p>
        </div>

        <div className="flex flex-col gap-5 overflow-y-auto p-5 sm:w-[360px] sm:p-7">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8a4a0c]">
                {product.brand} · {product.tier}
              </p>
              <h2 id="inspect-title" className="text-2xl font-bold tracking-tight">
                {product.name}
              </h2>
            </div>
            <button
              ref={closeButton}
              type="button"
              onClick={closeInspect}
              aria-label="Close and keep browsing"
              className="rounded-full p-2 text-neutral-600 hover:bg-black/5"
            >
              <X className="size-5" />
            </button>
          </div>

          <p className="text-3xl font-semibold" data-testid="inspect-price">
            {formatUGX(price)}
          </p>

          <fieldset>
            <legend className="mb-2 text-sm font-medium">
              Colour: <span className="text-neutral-600">{colour?.label}</span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {product.colours.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  aria-label={c.label}
                  aria-pressed={c.id === sel.colourId}
                  onClick={() => selectColour(product, c.id)}
                  className="size-9 rounded-full border border-black/15 ring-offset-2 ring-offset-[#f6f4ef] aria-pressed:ring-2 aria-pressed:ring-neutral-900"
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-sm font-medium">Storage</legend>
            <div className="flex flex-wrap gap-2">
              {product.variants.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  aria-pressed={v.id === sel.variantId}
                  onClick={() => selectVariant(product, v.id)}
                  className="rounded-full border border-black/15 px-4 py-2 text-sm aria-pressed:border-neutral-900 aria-pressed:bg-neutral-900 aria-pressed:text-white"
                >
                  {v.label}
                  {v.priceDelta > 0 && (
                    <span className="ml-1 opacity-60">+{formatUGX(v.priceDelta)}</span>
                  )}
                </button>
              ))}
            </div>
          </fieldset>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-2xl bg-white/70 p-4 text-sm">
            {(
              [
                ["Screen", product.specs.screen],
                ["Battery", product.specs.battery],
                ["Camera", product.specs.camera],
                ["RAM", product.specs.ram],
              ] as const
            ).map(([k, v]) => (
              <div key={k}>
                <dt className="text-neutral-500">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-auto flex flex-col gap-2">
            <button
              type="button"
              onClick={addToBag}
              className="inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-neutral-900 px-5 text-[15px] font-semibold text-white transition-colors hover:bg-neutral-700"
            >
              {added === addedKey ? (
                <>
                  <Check className="size-5" aria-hidden="true" /> Added: add another
                </>
              ) : (
                <>
                  <ShoppingBag className="size-5" aria-hidden="true" /> Add to bag ·{" "}
                  {formatUGX(price)}
                </>
              )}
            </button>
            {added === addedKey && (
              <button
                type="button"
                onClick={viewBag}
                className="h-11 rounded-full border border-neutral-900 font-medium hover:bg-black/5"
              >
                View bag and check out
              </button>
            )}
            <p className="text-center text-xs text-neutral-500">
              Delivered by boda in Kampala · pay with MoMo, Airtel Money or cash
            </p>
          </div>
        </div>
      </dialog>
    </div>
  );
}
