import { getProduct } from "@/data/products";
import { formatUGX } from "@/lib/format-ugx";
import { shopFromPrice } from "@/lib/shop-pricing";
import type { ShopConfig } from "@/lib/shop-schema";
import Link from "next/link";

/** A shop in the directory: its colours as a little shopfront, name, area, phones and price. */
export function ShopCard({ shop }: { shop: ShopConfig }) {
  const phones = shop.stock
    .map((s) => getProduct(s.productId)?.name)
    .filter((n): n is string => n !== undefined);
  return (
    <Link
      href={`/stores/${shop.slug}`}
      className="group flex flex-col overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      data-testid="shop-card"
    >
      <div
        className="relative h-28"
        style={{ backgroundColor: shop.theme.wall }}
        aria-hidden="true"
      >
        <div
          className="absolute inset-x-6 top-4 rounded-md px-3 py-1.5 text-center text-xs font-black uppercase tracking-wide text-white"
          style={{ backgroundColor: shop.theme.accent }}
        >
          {shop.name}
        </div>
        <div
          className="absolute inset-x-0 bottom-0 h-8"
          style={{ backgroundColor: shop.theme.floor }}
        />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <h2 className="font-semibold">{shop.name}</h2>
        <p className="text-sm text-neutral-500">{shop.location}</p>
        <p className="line-clamp-2 text-sm text-neutral-700">{phones.join(" · ")}</p>
        <p className="mt-auto pt-2 text-sm font-medium">
          from {formatUGX(shopFromPrice(shop))}{" "}
          <span className="text-neutral-400 group-hover:text-neutral-900">→ Walk in</span>
        </p>
      </div>
    </Link>
  );
}
