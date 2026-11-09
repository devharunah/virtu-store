import { SellerShopsList } from "@/components/shop/SellerShopsList";
import { ShopCard } from "@/components/shop/ShopCard";
import { TrademarkNotice } from "@/components/ui/TrademarkNotice";
import { DEMO_SHOPS } from "@/data/demo-shops";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Shops · VIRTU.STORE" };

export default function StoresPage() {
  return (
    <main className="flex min-h-dvh flex-col bg-[#f6f4ef] text-neutral-900">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 sm:px-8">
        <Link href="/" className="text-sm font-semibold tracking-wide">
          VIRTU.STORE
        </Link>
        <Link
          href="/sell"
          className="inline-flex h-10 items-center rounded-full bg-neutral-900 px-4 text-sm font-semibold text-white hover:bg-neutral-700"
        >
          Open your shop
        </Link>
      </header>

      <div className="mx-auto w-full max-w-5xl flex-1 space-y-10 px-4 pb-16 sm:px-8">
        <section className="space-y-2 pt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a4a0c]">
            Kampala phone shops, in 3D
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">Pick a shop and walk in</h1>
          <p className="max-w-xl text-neutral-600">
            Every shop here is a room you can walk around: its own colours, its own phones, its own
            prices. Sell phones? Open yours in a few clicks and share the link.
          </p>
        </section>

        <section aria-labelledby="featured" className="space-y-4">
          <h2 id="featured" className="text-lg font-semibold">
            Featured shops
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {DEMO_SHOPS.map((shop) => (
              <li key={shop.slug} className="contents">
                <ShopCard shop={shop} />
              </li>
            ))}
          </ul>
        </section>

        <SellerShopsList />

        <TrademarkNotice className="max-w-3xl" />
        <p className="text-xs text-neutral-500">
          Prices are indicative and set by each shop. Checkout is a demo: no real payment is taken.
        </p>
      </div>
    </main>
  );
}
