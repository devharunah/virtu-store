import { TrademarkNotice } from "@/components/ui/TrademarkNotice";
import { products } from "@/data/products";
import { formatUGX } from "@/lib/format-ugx";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  const from = Math.min(...products.map((p) => p.basePrice));

  return (
    <main className="flex min-h-dvh flex-col bg-[#f6f4ef] text-neutral-900">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-8 px-4 py-12 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a4a0c]">
          Kampala · virtual showroom
        </p>
        <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
          Walk in. Pick it up.
          <br />
          Take it home.
        </h1>
        <p className="max-w-xl text-lg text-neutral-600">
          VIRTU.STORE is a 3D phone shop you can walk around in. Pick up the iPhone 17 Pro Max,
          iPhone 17 or a Samsung Galaxy, spin it in 360°, choose storage and colour, and order for
          delivery. {products.length} phones from {formatUGX(from)}.
        </p>
        <div>
          <Link
            href="/store"
            className="inline-flex h-12 items-center rounded-full bg-neutral-900 px-6 font-medium text-white transition-colors hover:bg-neutral-700"
          >
            Enter the store
          </Link>
        </div>
        <Image
          src="/og/lineup-back.png"
          alt="Five VIRTU.STORE phones seen from the back, each with a different camera design."
          width={1600}
          height={700}
          priority
          className="w-full rounded-2xl border border-black/10"
        />
        <TrademarkNotice className="max-w-3xl" />
      </div>
    </main>
  );
}
