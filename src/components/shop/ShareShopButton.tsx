"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";

/** Shares the shop's link: the phone's share sheet where there is one, else copy to clipboard. */
export function ShareShopButton({ name }: { name: string }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = window.location.href.split("?")[0] ?? window.location.href;
    const data = { title: `${name} on VIRTU.STORE`, text: `Walk into ${name} in 3D`, url };
    try {
      if (typeof navigator.share === "function" && navigator.canShare?.(data)) {
        await navigator.share(data);
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // The visitor closed the share sheet, or the clipboard is blocked: nothing to do.
    }
  };

  return (
    <button
      type="button"
      onClick={share}
      className="pointer-events-auto inline-flex h-10 items-center gap-2 rounded-full bg-white/90 px-4 text-sm font-medium text-neutral-900 shadow-sm backdrop-blur hover:bg-white"
    >
      {copied ? (
        <Check aria-hidden="true" className="size-4" />
      ) : (
        <Share2 aria-hidden="true" className="size-4" />
      )}
      {copied ? "Link copied" : "Share"}
    </button>
  );
}
