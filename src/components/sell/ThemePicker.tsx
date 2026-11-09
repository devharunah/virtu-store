"use client";

import { THEMES, presetFor } from "@/data/themes";
import type { ShopTheme } from "@/lib/shop-schema";

const PARTS: { key: keyof ShopTheme; label: string }[] = [
  { key: "wall", label: "Walls" },
  { key: "accent", label: "Accent and sign" },
  { key: "floor", label: "Floor" },
];

/** Room colours: one-click presets, or any colour for walls, accent and floor. */
export function ThemePicker({
  theme,
  onChange,
}: {
  theme: ShopTheme;
  onChange: (theme: ShopTheme) => void;
}) {
  const current = presetFor(theme)?.id;
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold">Paint your shop</legend>
      <div className="flex flex-wrap gap-2">
        {THEMES.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={current === t.id}
            onClick={() => onChange({ wall: t.wall, accent: t.accent, floor: t.floor })}
            className="flex items-center gap-2 rounded-full border border-black/15 bg-white py-1 pl-1 pr-3 text-sm aria-pressed:border-neutral-900 aria-pressed:ring-1 aria-pressed:ring-neutral-900"
          >
            <span className="flex overflow-hidden rounded-full" aria-hidden="true">
              <span className="size-5" style={{ backgroundColor: t.wall }} />
              <span className="size-5" style={{ backgroundColor: t.accent }} />
              <span className="size-5" style={{ backgroundColor: t.floor }} />
            </span>
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-4">
        {PARTS.map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2 text-sm">
            <input
              type="color"
              value={theme[key]}
              onChange={(e) => onChange({ ...theme, [key]: e.target.value })}
              className="size-9 cursor-pointer rounded-lg border border-black/15 bg-white p-0.5"
            />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
