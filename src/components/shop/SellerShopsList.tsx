"use client";

import { getDemoShop } from "@/data/demo-shops";
import { firebaseConfigured } from "@/lib/firebase";
import type { ShopConfig } from "@/lib/shop-schema";
import { listShops } from "@/lib/shops-repo";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ShopCard } from "./ShopCard";

type Load = { status: "loading" } | { status: "ready"; shops: ShopConfig[] } | { status: "error" };

/** Shops opened by sellers (Firestore). Hidden entirely when Firebase isn't configured. */
export function SellerShopsList() {
  const [load, setLoad] = useState<Load>({ status: "loading" });

  useEffect(() => {
    if (!firebaseConfigured) return undefined;
    let cancelled = false;
    listShops()
      .then((shops) => {
        // A seller can't take a demo shop's slug in the directory.
        if (!cancelled)
          setLoad({ status: "ready", shops: shops.filter((s) => !getDemoShop(s.slug)) });
      })
      .catch(() => {
        if (!cancelled) setLoad({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!firebaseConfigured) return null;

  return (
    <section aria-labelledby="sellers" className="space-y-4">
      <h2 id="sellers" className="text-lg font-semibold">
        Shops opened by sellers
      </h2>
      {load.status === "loading" && <p className="text-sm text-neutral-500">Loading shops…</p>}
      {load.status === "error" && (
        <p className="text-sm text-neutral-500">
          Couldn&rsquo;t load sellers&rsquo; shops right now.
        </p>
      )}
      {load.status === "ready" && load.shops.length === 0 && (
        <p className="text-sm text-neutral-600">
          No sellers yet.{" "}
          <Link href="/sell" className="font-medium underline">
            Be the first to open a shop
          </Link>
          .
        </p>
      )}
      {load.status === "ready" && load.shops.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {load.shops.map((shop) => (
            <li key={shop.slug} className="contents">
              <ShopCard shop={shop} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
