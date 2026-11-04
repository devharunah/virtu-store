import ExperienceLoader from "@/components/3d/ExperienceLoader";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Showroom · VIRTU.STORE" };

export default function StorePage() {
  return (
    <main className="relative h-dvh w-full bg-[#efece6]">
      <ExperienceLoader />
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-4">
        <Link
          href="/"
          className="pointer-events-auto text-sm font-semibold tracking-wide text-neutral-900"
        >
          VIRTU.STORE
        </Link>
        <span className="rounded-full bg-white/80 px-3 py-1 text-xs text-neutral-600 backdrop-blur">
          <span className="pointer-coarse:hidden">
            WASD to walk · Shift to run · drag to look · E to inspect
          </span>
          <span className="hidden pointer-coarse:inline">Joystick to walk · drag to look</span>
        </span>
      </div>
    </main>
  );
}
