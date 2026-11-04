"use client";

import dynamic from "next/dynamic";

// WebGL exists only in the browser. `ssr: false` must live in a Client Component
// (Next 16 rejects it in Server Components), so the store page renders this wrapper.
const Experience = dynamic(() => import("./Experience"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center text-sm text-neutral-500">Loading showroom…</div>
  ),
});

export default function ExperienceLoader() {
  return <Experience />;
}
