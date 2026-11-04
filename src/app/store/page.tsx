import type { Metadata } from "next";
import Link from "next/link";
import ExperienceLoader from "@/components/3d/ExperienceLoader";

export const metadata: Metadata = { title: "Showroom · VIRTU.STORE" };

export default function StorePage() {
  return (
    <main className="relative h-dvh w-full bg-[#efece6]">
      <ExperienceLoader />
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-4">
        <Link href="/" className="pointer-events-auto text-sm font-semibold tracking-wide text-neutral-900">
          VIRTU.STORE
        </Link>
        <span className="rounded-full bg-white/80 px-3 py-1 text-xs text-neutral-600 backdrop-blur">
          Phase 0 preview · drag to orbit
        </span>
      </div>
    </main>
  );
}
