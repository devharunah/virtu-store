"use client";

import { type CustomPhoneDraft, newCustomPhone } from "@/lib/shop-draft";
import { MAX_COLOUR_OPTIONS, MAX_PHOTOS, MAX_STORAGE_OPTIONS } from "@/lib/shop-schema";
import { Plus, Trash2 } from "lucide-react";
import { ImageUpload } from "./ImageUpload";

const field =
  "h-10 w-full rounded-xl border border-black/15 bg-white px-3 text-[15px] outline-none focus:border-neutral-900";
const small = "text-xs text-neutral-600 underline underline-offset-2 disabled:opacity-40";

/**
 * Phones the seller adds themselves: name, brand, price, storage and colour options, and real
 * photos. In the 3D shop each shows as an unbranded phone in its colours; shoppers see the
 * photos when they open it.
 */
export function CustomPhoneEditor({
  phones,
  onChange,
  folder,
}: {
  phones: CustomPhoneDraft[];
  onChange: (phones: CustomPhoneDraft[]) => void;
  /** Cloudinary folder for this seller's uploads. */
  folder: string;
}) {
  const next = newCustomPhone(phones);
  const update = (id: string, patch: Partial<CustomPhoneDraft>) =>
    onChange(phones.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold">Your own phones</legend>
      <p className="text-xs text-neutral-500">
        Selling a phone that isn&apos;t in the list above? Add it here with real photos. In the 3D
        shop it stands on the counter as a plain display phone in your colours; shoppers open it to
        see your photos.
      </p>

      {phones.map((phone, n) => (
        <div
          key={phone.id}
          className="space-y-3 rounded-2xl border border-black/10 bg-white p-4"
          data-testid="custom-phone"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{phone.name.trim() || `Phone ${n + 1}`}</p>
            <button
              type="button"
              onClick={() => onChange(phones.filter((p) => p.id !== phone.id))}
              aria-label={`Remove ${phone.name.trim() || `phone ${n + 1}`}`}
              className="rounded-full p-1.5 text-neutral-500 hover:bg-black/5 hover:text-red-700"
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1 text-xs font-medium">
              <span>Brand</span>
              <input
                value={phone.brand}
                maxLength={20}
                placeholder="Tecno"
                onChange={(e) => update(phone.id, { brand: e.target.value })}
                className={field}
              />
            </label>
            <label className="space-y-1 text-xs font-medium">
              <span>Model</span>
              <input
                value={phone.name}
                maxLength={40}
                placeholder="Spark 30"
                onChange={(e) => update(phone.id, { name: e.target.value })}
                className={field}
              />
            </label>
          </div>

          <label className="block space-y-1 text-xs font-medium">
            <span>Price (UGX, smallest storage)</span>
            <input
              value={phone.price}
              inputMode="numeric"
              placeholder="550,000"
              onChange={(e) => update(phone.id, { price: e.target.value })}
              className={`${field} tabular-nums`}
            />
          </label>

          <div className="space-y-2">
            <p className="text-xs font-medium">Storage options and extra price</p>
            {phone.storage.map((s, i) => (
              <div key={`${phone.id}-s${i}`} className="flex items-center gap-2">
                <input
                  value={s.label}
                  maxLength={12}
                  aria-label={`Storage option ${i + 1}`}
                  onChange={(e) =>
                    update(phone.id, {
                      storage: phone.storage.map((x, j) =>
                        j === i ? { ...x, label: e.target.value } : x,
                      ),
                    })
                  }
                  className={field}
                />
                <span className="text-xs text-neutral-500">+</span>
                <input
                  value={s.priceDelta}
                  inputMode="numeric"
                  aria-label={`Extra price for storage option ${i + 1}`}
                  disabled={i === 0}
                  onChange={(e) =>
                    update(phone.id, {
                      storage: phone.storage.map((x, j) =>
                        j === i ? { ...x, priceDelta: e.target.value } : x,
                      ),
                    })
                  }
                  className={`${field} w-32 text-right tabular-nums disabled:opacity-40`}
                />
                {i > 0 && (
                  <button
                    type="button"
                    aria-label={`Remove storage option ${i + 1}`}
                    onClick={() =>
                      update(phone.id, { storage: phone.storage.filter((_, j) => j !== i) })
                    }
                    className="p-1 text-neutral-500 hover:text-red-700"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              className={small}
              disabled={phone.storage.length >= MAX_STORAGE_OPTIONS}
              onClick={() =>
                update(phone.id, {
                  storage: [...phone.storage, { label: "256 GB", priceDelta: "" }],
                })
              }
            >
              Add storage option
            </button>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium">Colours</p>
            {phone.colours.map((c, i) => (
              <div key={`${phone.id}-c${i}`} className="flex items-center gap-2">
                <input
                  type="color"
                  value={c.hex}
                  aria-label={`Colour ${i + 1}`}
                  onChange={(e) =>
                    update(phone.id, {
                      colours: phone.colours.map((x, j) =>
                        j === i ? { ...x, hex: e.target.value } : x,
                      ),
                    })
                  }
                  className="size-10 shrink-0 cursor-pointer rounded-lg border border-black/15 bg-white p-0.5"
                />
                <input
                  value={c.label}
                  maxLength={20}
                  aria-label={`Name of colour ${i + 1}`}
                  onChange={(e) =>
                    update(phone.id, {
                      colours: phone.colours.map((x, j) =>
                        j === i ? { ...x, label: e.target.value } : x,
                      ),
                    })
                  }
                  className={field}
                />
                {i > 0 && (
                  <button
                    type="button"
                    aria-label={`Remove colour ${i + 1}`}
                    onClick={() =>
                      update(phone.id, { colours: phone.colours.filter((_, j) => j !== i) })
                    }
                    className="p-1 text-neutral-500 hover:text-red-700"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              className={small}
              disabled={phone.colours.length >= MAX_COLOUR_OPTIONS}
              onClick={() =>
                update(phone.id, {
                  colours: [...phone.colours, { label: "", hex: "#5D7FA8" }],
                })
              }
            >
              Add colour
            </button>
          </div>

          <ImageUpload
            label="Photos"
            hint={`Up to ${MAX_PHOTOS}. Shoppers swipe through them when they open the phone.`}
            urls={phone.photos}
            onChange={(photos) => update(phone.id, { photos })}
            max={MAX_PHOTOS}
            folder={folder}
          />
        </div>
      ))}

      {next !== null && (
        <button
          type="button"
          onClick={() => onChange([...phones, next])}
          className="inline-flex items-center gap-1.5 rounded-full border border-neutral-900 px-4 py-2 text-sm font-medium hover:bg-black/5"
        >
          <Plus className="size-4" aria-hidden="true" /> Add a phone
        </button>
      )}
    </fieldset>
  );
}
