"use client";

import { firebaseConfigured } from "@/lib/firebase";
import type { ShopConfig } from "@/lib/shop-schema";
import { getShop } from "@/lib/shops-repo";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Showroom } from "./Showroom";

type Load =
  | { status: "loading" }
  | { status: "ready"; shop: ShopConfig }
  | { status: "missing" }
  | { status: "error"; message: string };

/** A seller's shop, read from Firestore in the browser. */
export function RemoteShop({ slug }: { slug: string }) {
  const [load, setLoad] = useState<Load>(
    firebaseConfigured ? { status: "loading" } : { status: "missing" },
  );

  useEffect(() => {
    if (!firebaseConfigured) return undefined;
    let cancelled = false;
    getShop(slug)
      .then((shop) => {
        if (!cancelled) setLoad(shop ? { status: "ready", shop } : { status: "missing" });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoad({
            status: "error",
            message: error instanceof Error ? error.message : "Couldn't open this shop",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (load.status === "ready") document.title = `${load.shop.name} · VIRTU.STORE`;
  }, [load]);

  if (load.status === "ready") return <Showroom shop={load.shop} />;
  return (
    <main className="grid h-dvh place-items-center bg-[#efece6] p-6 text-center">
      <div className="max-w-sm space-y-4">
        {load.status === "loading" ? (
          <p className="text-sm text-neutral-500">Opening the shop…</p>
        ) : (
          <>
            <h1 className="text-2xl font-bold tracking-tight">
              {load.status === "missing" ? "No shop here yet" : "Couldn't open this shop"}
            </h1>
            <p className="text-neutral-600">
              {load.status === "missing"
                ? `There's no shop at /stores/${slug}. It may have a different link.`
                : load.message}
            </p>
            <Link
              href="/stores"
              className="inline-flex h-11 items-center rounded-full bg-neutral-900 px-5 font-semibold text-white"
            >
              Browse shops
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
