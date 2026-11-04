import type { Product } from "@/types/product";
import { create } from "zustand";

export interface Selection {
  colourId: string;
  variantId: string;
}

interface UiState {
  /** True once the player has spawned in the showroom (assets loaded and physics running). */
  sceneReady: boolean;
  setSceneReady: (ready: boolean) => void;
  /** The phone the visitor is standing next to (drives the "Press E" prompt). */
  nearSlotId: string | null;
  nearProductId: string | null;
  /** Colour of the phone on display there, so inspecting starts on that colourway. */
  nearColourId: string | null;
  /** The phone open in the inspection panel. */
  inspectingId: string | null;
  /** The visitor's colour and storage choice per product, remembered while they browse. */
  selections: Record<string, Selection>;

  setNear: (slotId: string | null, productId: string | null, colourId?: string | null) => void;
  openInspect: (productId: string, colourId?: string) => void;
  closeInspect: () => void;
  selectColour: (product: Product, colourId: string) => void;
  selectVariant: (product: Product, variantId: string) => void;
}

/** The current selection for a product, defaulting to its first colour and its base storage. */
export function selectionFor(selections: Record<string, Selection>, product: Product): Selection {
  const chosen = selections[product.id];
  const colour = product.colours.find((c) => c.id === chosen?.colourId) ?? product.colours[0];
  const variant = product.variants.find((v) => v.id === chosen?.variantId) ?? product.variants[0];
  return { colourId: colour?.id ?? "", variantId: variant?.id ?? "" };
}

export const useUiStore = create<UiState>()((set, get) => ({
  sceneReady: false,
  setSceneReady: (sceneReady) => {
    if (get().sceneReady !== sceneReady) set({ sceneReady });
  },
  nearSlotId: null,
  nearProductId: null,
  nearColourId: null,
  inspectingId: null,
  selections: {},

  setNear: (nearSlotId, nearProductId, nearColourId = null) => {
    if (get().nearSlotId !== nearSlotId) set({ nearSlotId, nearProductId, nearColourId });
  },

  openInspect: (productId, colourId) =>
    set((s) => {
      const existing = s.selections[productId];
      // Opening from a display shows the colour that was on display, unless the visitor already chose one.
      if (colourId && !existing) {
        return {
          inspectingId: productId,
          selections: { ...s.selections, [productId]: { colourId, variantId: "" } },
        };
      }
      return { inspectingId: productId };
    }),

  closeInspect: () => set({ inspectingId: null }),

  selectColour: (product, colourId) =>
    set((s) => ({
      selections: {
        ...s.selections,
        [product.id]: { ...selectionFor(s.selections, product), colourId },
      },
    })),

  selectVariant: (product, variantId) =>
    set((s) => ({
      selections: {
        ...s.selections,
        [product.id]: { ...selectionFor(s.selections, product), variantId },
      },
    })),
}));
