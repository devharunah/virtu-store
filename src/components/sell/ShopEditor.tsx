"use client";

import ExperienceLoader from "@/components/3d/ExperienceLoader";
import { getDemoShop } from "@/data/demo-shops";
import {
  type DraftErrors,
  type ShopDraft,
  draftFromShop,
  draftToShop,
  previewShop,
  withName,
} from "@/lib/shop-draft";
import { SlugTakenError, getMyShop, isSlugFree, saveShop } from "@/lib/shops-repo";
import Link from "next/link";
import { type FormEvent, useDeferredValue, useEffect, useMemo, useState } from "react";
import { CustomPhoneEditor } from "./CustomPhoneEditor";
import { ImageUpload } from "./ImageUpload";
import { StockPicker } from "./StockPicker";
import { ThemePicker } from "./ThemePicker";

const input =
  "h-11 w-full rounded-xl border border-black/15 bg-white px-3 text-[15px] outline-none focus:border-neutral-900 aria-invalid:border-red-600";

type Load =
  | { status: "loading" }
  | { status: "ready"; saved: boolean }
  | { status: "error"; message: string };

function FieldError({ id, message }: { id: string; message: string | undefined }) {
  return message ? (
    <p id={id} className="text-sm text-red-700">
      {message}
    </p>
  ) : null;
}

/** Build or edit your shop, with the 3D room repainting live beside the form. */
export function ShopEditor({ uid }: { uid: string }) {
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [draft, setDraft] = useState<ShopDraft>(() => draftFromShop(null));
  const [errors, setErrors] = useState<DraftErrors>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [savedSlug, setSavedSlug] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMyShop(uid)
      .then((shop) => {
        if (cancelled) return;
        setDraft(draftFromShop(shop));
        setSavedSlug(shop?.slug ?? null);
        setLoad({ status: "ready", saved: shop !== null });
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setLoad({ status: "error", message: e instanceof Error ? e.message : "Couldn't load" });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  // Typing shouldn't rebuild the 3D shop on every keystroke.
  const deferred = useDeferredValue(draft);
  const preview = useMemo(() => previewShop(deferred), [deferred]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const result = draftToShop(draft, uid);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    if (getDemoShop(result.shop.slug)) {
      setErrors({ slug: "That link belongs to a featured shop. Pick another." });
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      if (savedSlug === null && !(await isSlugFree(result.shop.slug, uid))) {
        throw new SlugTakenError(result.shop.slug);
      }
      await saveShop(result.shop);
      setSavedSlug(result.shop.slug);
      setDraft((d) => ({ ...d, slugLocked: true }));
      setMessage("Saved. Your shop is live.");
    } catch (err) {
      if (err instanceof SlugTakenError) setErrors({ slug: err.message });
      else setMessage(err instanceof Error ? err.message : "Couldn't save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (load.status === "loading")
    return <p className="text-sm text-neutral-500">Loading your shop…</p>;
  if (load.status === "error") {
    return (
      <p role="alert" className="text-sm text-red-700">
        {load.message}
      </p>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,420px)_1fr]">
      <form onSubmit={save} className="space-y-6" noValidate>
        <label className="block space-y-1 text-sm font-medium">
          <span>Shop name</span>
          <input
            value={draft.name}
            onChange={(e) => setDraft((d) => withName(d, e.target.value))}
            maxLength={40}
            aria-invalid={errors.name !== undefined}
            aria-describedby="name-error"
            className={input}
            placeholder="Kikuubo Phone Hub"
          />
          <FieldError id="name-error" message={errors.name} />
        </label>

        <label className="block space-y-1 text-sm font-medium">
          <span>Link</span>
          <span className="flex items-center gap-1 text-neutral-500">
            /stores/
            <input
              value={draft.slug}
              readOnly={savedSlug !== null}
              onChange={(e) =>
                setDraft((d) => ({ ...d, slug: e.target.value.toLowerCase(), slugLocked: true }))
              }
              maxLength={32}
              aria-invalid={errors.slug !== undefined}
              aria-describedby="slug-error"
              className={`${input} read-only:bg-neutral-100`}
            />
          </span>
          <FieldError id="slug-error" message={errors.slug} />
        </label>

        <label className="block space-y-1 text-sm font-medium">
          <span>Where is it?</span>
          <input
            value={draft.location}
            onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))}
            maxLength={40}
            aria-invalid={errors.location !== undefined}
            aria-describedby="location-error"
            className={input}
            placeholder="Kikuubo, Kampala"
          />
          <FieldError id="location-error" message={errors.location} />
        </label>

        <ThemePicker theme={draft.theme} onChange={(theme) => setDraft((d) => ({ ...d, theme }))} />
        <FieldError id="theme-error" message={errors.theme} />

        <ImageUpload
          label="Shop banner"
          hint="Optional. A wide image, about 4:1 (e.g. 1600 × 400). It shows on your card in the shop directory and over your 3D shop front; the middle is what fits."
          urls={draft.bannerUrl === "" ? [] : [draft.bannerUrl]}
          onChange={(urls) => setDraft((d) => ({ ...d, bannerUrl: urls[0] ?? "" }))}
          max={1}
          folder={`virtu/shops/${uid}`}
          thumbClass="aspect-[4/1] w-full max-w-sm"
        />
        <FieldError id="banner-error" message={errors.bannerUrl} />

        <StockPicker
          stock={draft.stock}
          onChange={(stock) => setDraft((d) => ({ ...d, stock }))}
          folder={`virtu/shops/${uid}`}
        />
        <FieldError id="stock-error" message={errors.stock} />

        <CustomPhoneEditor
          phones={draft.customPhones}
          onChange={(customPhones) => setDraft((d) => ({ ...d, customPhones }))}
          folder={`virtu/shops/${uid}`}
        />
        <FieldError id="custom-phones-error" message={errors.customPhones} />

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="h-12 rounded-full bg-neutral-900 px-6 font-semibold text-white hover:bg-neutral-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : savedSlug ? "Save changes" : "Open my shop"}
          </button>
          {savedSlug && (
            <Link
              href={`/stores/${savedSlug}`}
              className="h-12 rounded-full border border-neutral-900 px-6 font-medium leading-[46px] hover:bg-black/5"
            >
              View my shop
            </Link>
          )}
        </div>
        {message && <output className="block text-sm text-neutral-700">{message}</output>}
      </form>

      <section aria-label="Live preview" className="space-y-2">
        <p className="text-sm font-semibold">Live preview: walk around while you edit</p>
        <div className="relative h-[60dvh] min-h-[420px] overflow-hidden rounded-3xl border border-black/10 lg:sticky lg:top-4">
          <ExperienceLoader shop={preview} />
        </div>
      </section>
    </div>
  );
}
