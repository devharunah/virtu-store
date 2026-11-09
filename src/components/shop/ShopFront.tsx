"use client";

import { cldUrl } from "@/lib/image-url";
import type { ShopConfig } from "@/lib/shop-schema";
import Image from "next/image";
import { useState } from "react";

/**
 * The top of a directory card: the seller's banner, or the shop's colours as a little shopfront
 * when there is no banner or it fails to load. Cloudinary already resizes and compresses the
 * banner, so Next's optimiser is skipped.
 */
export function ShopFront({ shop }: { shop: ShopConfig }) {
  const [broken, setBroken] = useState(false);

  if (shop.bannerUrl !== undefined && !broken) {
    return (
      <div className="relative h-28 bg-neutral-200">
        <Image
          src={cldUrl(shop.bannerUrl, "w_720,h_240,c_fill,g_auto,f_auto,q_auto")}
          alt={`${shop.name} banner`}
          fill
          unoptimized
          onError={() => setBroken(true)}
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div className="relative h-28" style={{ backgroundColor: shop.theme.wall }} aria-hidden="true">
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
  );
}
