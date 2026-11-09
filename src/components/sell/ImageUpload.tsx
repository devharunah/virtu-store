"use client";

import { UploadError, cloudinaryConfigured, uploadImage } from "@/lib/cloudinary";
import { ImageInputError, shrinkImage } from "@/lib/image-resize";
import { cldUrl } from "@/lib/image-url";
import { ImagePlus, LoaderCircle, X } from "lucide-react";
import Image from "next/image";
import { useId, useState } from "react";

interface Props {
  /** Visible label for the picker. */
  label: string;
  hint?: string;
  urls: string[];
  onChange: (urls: string[]) => void;
  /** Most images this field holds (1 for a banner). */
  max: number;
  /** Cloudinary sub-folder, e.g. "shops/kikuubo/banner". */
  folder: string;
  /** Thumbnail aspect, as a Tailwind class. */
  thumbClass?: string;
}

function message(error: unknown): string {
  if (error instanceof ImageInputError || error instanceof UploadError) return error.message;
  return "That image couldn't be uploaded. Try another one.";
}

/** Picks images, shrinks them in the browser, uploads them to Cloudinary and keeps the URLs. */
export function ImageUpload({
  label,
  hint,
  urls,
  onChange,
  max,
  folder,
  thumbClass = "aspect-square w-20",
}: Props) {
  const id = useId();
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!cloudinaryConfigured) {
    return (
      <p className="text-sm text-neutral-500">
        {label}: image uploads aren&apos;t set up on this site yet (see docs/CLOUDINARY-SETUP.md).
      </p>
    );
  }

  const room = max - urls.length;

  const pick = async (files: FileList | null) => {
    if (files === null || files.length === 0) return;
    setError(null);
    const chosen = Array.from(files).slice(0, room);
    const added: string[] = [];
    try {
      for (const [n, file] of chosen.entries()) {
        setProgress(n / chosen.length);
        const blob = await shrinkImage(file);
        const url = await uploadImage(blob, folder, (f) => setProgress((n + f) / chosen.length));
        added.push(url);
      }
    } catch (e) {
      setError(message(e));
    } finally {
      setProgress(null);
      if (added.length > 0) onChange(max === 1 ? added.slice(0, 1) : [...urls, ...added]);
    }
  };

  const busy = progress !== null;

  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold">{label}</div>
      {hint !== undefined && <p className="text-xs text-neutral-500">{hint}</p>}
      <div className="flex flex-wrap items-center gap-2">
        {urls.map((url, i) => (
          <div
            key={url}
            className={`relative overflow-hidden rounded-lg bg-neutral-100 ring-1 ring-black/10 ${thumbClass}`}
          >
            <Image
              src={cldUrl(url, "w_320,c_fill,f_auto,q_auto")}
              alt={`${label} ${i + 1}`}
              fill
              sizes="160px"
              className="object-cover"
            />
            <button
              type="button"
              onClick={() => onChange(urls.filter((u) => u !== url))}
              aria-label={`Remove ${label.toLowerCase()} ${i + 1}`}
              className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white hover:bg-black"
            >
              <X className="size-3" aria-hidden="true" />
            </button>
          </div>
        ))}
        {(room > 0 || max === 1) && (
          <label
            htmlFor={id}
            className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-black/25 bg-white text-xs text-neutral-600 hover:border-neutral-900 ${thumbClass} ${busy ? "pointer-events-none opacity-60" : ""}`}
          >
            {busy ? (
              <>
                <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
                <span aria-live="polite">{Math.round((progress ?? 0) * 100)}%</span>
              </>
            ) : (
              <>
                <ImagePlus className="size-5" aria-hidden="true" />
                <span>{urls.length > 0 && max === 1 ? "Replace" : "Add"}</span>
              </>
            )}
            <input
              id={id}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple={max > 1}
              disabled={busy}
              className="sr-only"
              aria-label={`Upload ${label.toLowerCase()}`}
              onChange={(e) => {
                void pick(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        )}
      </div>
      {error !== null && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
