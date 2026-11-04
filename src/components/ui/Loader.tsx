"use client";

import { useProgress } from "@react-three/drei";
import { useEffect, useState } from "react";

/** Full-screen loading overlay driven by drei's global asset-loading progress. */
export function Loader() {
  const { active, progress } = useProgress();
  const done = !active && progress >= 100;
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setHidden(true), 600); // let the fade finish
    return () => clearTimeout(t);
  }, [done]);

  if (hidden) return null;

  return (
    <output
      className={`absolute inset-0 z-20 grid place-items-center bg-[#f6f4ef] transition-opacity duration-500 ${done ? "opacity-0" : "opacity-100"}`}
      aria-live="polite"
    >
      <div className="w-64 text-center">
        <p className="text-sm font-semibold tracking-[0.16em] text-neutral-900">VIRTU.STORE</p>
        <div className="mt-4 h-1 overflow-hidden rounded-full bg-neutral-200">
          <div
            className="h-full rounded-full bg-[#d9822b] transition-[width] duration-300"
            style={{ width: `${Math.round(progress)}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-neutral-500">
          Opening the showroom… {Math.round(progress)}%
        </p>
      </div>
    </output>
  );
}
