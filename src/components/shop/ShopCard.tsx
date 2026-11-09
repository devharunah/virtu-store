import { formatUGX } from "@/lib/format-ugx";
import type { ShopListing } from "@/lib/shop-storage";
import Link from "next/link";
import { ShopFront } from "./ShopFront";

/** A shop in the directory: its banner (or its colours as a little shopfront), name, area, phones and price. */
export function ShopCard({ shop }: { shop: ShopListing }) {
  return (
    <Link
      href={`/stores/${shop.slug}`}
      className="group flex flex-col overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      data-testid="shop-card"
    >
      <ShopFront shop={shop} />
      <div className="flex flex-1 flex-col gap-1 p-4">
        <h2 className="font-semibold">{shop.name}</h2>
        <p className="text-sm text-neutral-500">{shop.location}</p>
        <p className="line-clamp-2 text-sm text-neutral-700">{shop.phones.join(" · ")}</p>
        <p className="mt-auto pt-2 text-sm font-medium">
          from {formatUGX(shop.fromPrice)}{" "}
          <span className="text-neutral-400 group-hover:text-neutral-900">→ Walk in</span>
        </p>
      </div>
    </Link>
  );
}
