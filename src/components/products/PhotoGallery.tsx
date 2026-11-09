"use client";

import { cldUrl } from "@/lib/image-url";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";

/**
 * The seller's real photos of a phone: swipe (scroll-snap), arrow buttons, arrow keys or the
 * dots. Cloudinary sizes each photo, so Next's optimiser is skipped.
 */
export function PhotoGallery({ photos, name }: { photos: string[]; name: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  // Follow swipes: the photo nearest the left edge is the current one.
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const onScroll = () => setIndex(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const go = (next: number) => {
    const el = track.current;
    const clamped = Math.min(photos.length - 1, Math.max(0, next));
    setIndex(clamped);
    el?.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" });
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight") go(index + 1);
    else if (e.key === "ArrowLeft") go(index - 1);
    else return;
    e.preventDefault();
  };

  return (
    <section
      aria-roledescription="carousel"
      aria-label={`Photos of the ${name}`}
      className="relative h-full w-full bg-neutral-900"
    >
      <div
        ref={track}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: the track scrolls, so it takes focus for the arrow keys
        tabIndex={0}
        onKeyDown={onKey}
        className="flex h-full w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain outline-none [scrollbar-width:none] focus-visible:ring-2 focus-visible:ring-white/70"
        data-testid="photo-track"
      >
        {photos.map((url, i) => (
          <figure
            key={url}
            aria-label={`Photo ${i + 1} of ${photos.length}`}
            className="relative m-0 h-full w-full shrink-0 snap-center"
          >
            <Image
              src={cldUrl(url, "w_1200,c_limit,f_auto,q_auto")}
              alt={`${name}, photo ${i + 1}`}
              fill
              unoptimized
              className="object-contain"
              {...(i === 0 ? { priority: true } : { loading: "lazy" as const })}
            />
          </figure>
        ))}
      </div>

      {photos.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(index - 1)}
            disabled={index === 0}
            aria-label="Previous photo"
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/85 p-2 text-neutral-900 shadow disabled:opacity-0"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            disabled={index === photos.length - 1}
            aria-label="Next photo"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/85 p-2 text-neutral-900 shadow disabled:opacity-0"
          >
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
          <div className="absolute inset-x-0 bottom-9 flex justify-center gap-1.5">
            {photos.map((url, i) => (
              <button
                key={url}
                type="button"
                onClick={() => go(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === index}
                className="size-2 rounded-full bg-white/50 aria-[current=true]:bg-white"
              />
            ))}
          </div>
        </>
      )}
      <p className="sr-only" aria-live="polite">
        Photo {index + 1} of {photos.length}
      </p>
    </section>
  );
}
