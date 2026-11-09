import { RemoteShop } from "@/components/shop/RemoteShop";
import { Showroom } from "@/components/shop/Showroom";
import { DEMO_SHOPS, getDemoShop } from "@/data/demo-shops";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Shop · VIRTU.STORE" };

/** The demo shops are prerendered; sellers' shops (Firestore) resolve in the browser. */
export function generateStaticParams() {
  return DEMO_SHOPS.map((s) => ({ slug: s.slug }));
}

async function ShopRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const demo = getDemoShop(slug);
  return demo ? <Showroom shop={demo} /> : <RemoteShop slug={slug} />;
}

export default function ShopPage({ params }: PageProps<"/stores/[slug]">) {
  return (
    <Suspense fallback={<ShopLoading />}>
      <ShopRoute params={params} />
    </Suspense>
  );
}

function ShopLoading() {
  return (
    <main className="grid h-dvh place-items-center bg-[#efece6] text-sm text-neutral-500">
      Opening the shop…
    </main>
  );
}
