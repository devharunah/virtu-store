"use client";

import { getProduct } from "@/data/products";
import { formatUGX } from "@/lib/format-ugx";
import type { StockDraft } from "@/lib/shop-draft";
import { MAX_PHOTOS } from "@/lib/shop-schema";
import { ImageUpload } from "./ImageUpload";

/**
 * Which phones the shop sells and at what base price. Ticked phones go on the counters in this
 * order; the first one turns on the lit stand.
 */
export function StockPicker({
  stock,
  onChange,
  folder,
}: {
  stock: StockDraft[];
  onChange: (stock: StockDraft[]) => void;
  /** Cloudinary folder for this seller's photo uploads. */
  folder: string;
}) {
  const update = (productId: string, patch: Partial<StockDraft>) =>
    onChange(stock.map((s) => (s.productId === productId ? { ...s, ...patch } : s)));

  const feature = (productId: string) => {
    const row = stock.find((s) => s.productId === productId);
    if (row) onChange([row, ...stock.filter((s) => s.productId !== productId)]);
  };

  const firstOn = stock.find((s) => s.on)?.productId;

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold">Your phones and prices</legend>
      <p className="text-xs text-neutral-500">
        Price for the smallest storage, in UGX. Bigger storage adds the usual step on top.
      </p>
      <ul className="divide-y divide-black/10 rounded-2xl border border-black/10 bg-white">
        {stock.map((row) => {
          const product = getProduct(row.productId);
          if (!product) return null;
          const inputId = `price-${row.productId}`;
          return (
            <li key={row.productId} className="flex flex-wrap items-center gap-3 p-3">
              <label className="flex min-w-0 flex-1 items-center gap-3">
                <input
                  type="checkbox"
                  checked={row.on}
                  aria-label={`Sell the ${product.name}`}
                  onChange={(e) => update(row.productId, { on: e.target.checked })}
                  className="size-5 accent-neutral-900"
                />
                <span className="min-w-0">
                  <span className="block truncate font-medium">{product.name}</span>
                  <span className="block text-xs text-neutral-500">
                    Catalogue {formatUGX(product.basePrice)}
                  </span>
                </span>
              </label>
              <label htmlFor={inputId} className="sr-only">
                Price for {product.name}
              </label>
              <input
                id={inputId}
                inputMode="numeric"
                value={row.price}
                disabled={!row.on}
                onChange={(e) => update(row.productId, { price: e.target.value })}
                className="h-10 w-32 rounded-xl border border-black/15 px-3 text-right tabular-nums disabled:opacity-40"
              />
              {row.on &&
                (row.productId === firstOn ? (
                  <span className="text-xs font-medium text-[#8a4a0c]">On the stand</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => feature(row.productId)}
                    className="text-xs text-neutral-600 underline underline-offset-2"
                  >
                    Feature
                  </button>
                ))}
              {row.on && (
                <div className="w-full">
                  <ImageUpload
                    label={`Real photos of your ${product.name}`}
                    hint="Optional. Shoppers can switch from the 3D model to your photos."
                    urls={row.photos}
                    onChange={(photos) => update(row.productId, { photos })}
                    max={MAX_PHOTOS}
                    folder={folder}
                    thumbClass="aspect-square w-16"
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
