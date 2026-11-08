import type { ShopTheme } from "@/lib/shop-schema";

/**
 * Room colour presets a seller can start from. They recolour the baked shop's `PaintWall`,
 * `PaintAccent` and `TileFloor` materials; the lightmap holds light only, so any colour sits
 * correctly under the baked shadows.
 */
export interface ThemePreset extends ShopTheme {
  id: string;
  label: string;
}

export const THEMES: readonly ThemePreset[] = [
  // The shop as it was baked (blender/shop.py), floor as dressed in ShopShell.
  {
    id: "kampala-teal",
    label: "Kampala Teal",
    wall: "#EFE9DA",
    accent: "#0F6E74",
    floor: "#D8D1C3",
  },
  {
    id: "sunset-orange",
    label: "Sunset Orange",
    wall: "#F6E7D6",
    accent: "#E2621B",
    floor: "#E3D5C4",
  },
  { id: "midnight", label: "Midnight", wall: "#2B3140", accent: "#C9A227", floor: "#4A4F5A" },
  { id: "mint", label: "Mint", wall: "#E6F2EC", accent: "#2F9E74", floor: "#DCE5E0" },
  { id: "rose", label: "Rose", wall: "#F7E4E6", accent: "#C2416B", floor: "#E9D9DA" },
];

export const DEFAULT_THEME: ShopTheme = {
  wall: "#EFE9DA",
  accent: "#0F6E74",
  floor: "#D8D1C3",
};

/** The preset a theme matches exactly, if any (to highlight it in the dashboard). */
export const presetFor = (theme: ShopTheme) =>
  THEMES.find(
    (t) =>
      t.wall.toLowerCase() === theme.wall.toLowerCase() &&
      t.accent.toLowerCase() === theme.accent.toLowerCase() &&
      t.floor.toLowerCase() === theme.floor.toLowerCase(),
  );
