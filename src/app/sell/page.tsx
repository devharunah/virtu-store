import { SellDashboard } from "@/components/sell/SellDashboard";
import { TrademarkNotice } from "@/components/ui/TrademarkNotice";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Open your shop · VIRTU.STORE" };

export default function SellPage() {
  return (
    <main className="flex min-h-dvh flex-col bg-[#f6f4ef] text-neutral-900">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-8">
        <Link href="/" className="text-sm font-semibold tracking-wide">
          VIRTU.STORE
        </Link>
        <Link href="/stores" className="text-sm text-neutral-600 hover:text-neutral-900">
          Browse shops
        </Link>
      </header>
      <div className="mx-auto w-full max-w-6xl flex-1 space-y-10 px-4 pb-16 sm:px-8">
        <SellDashboard />
        <TrademarkNotice className="max-w-3xl" />
      </div>
    </main>
  );
}
