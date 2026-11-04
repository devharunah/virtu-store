import { getProduct } from "@/data/products";
import { unitPrice } from "@/lib/pricing";
import type { ColourOption, Product, VariantOption } from "@/types/product";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { create } from "zustand";
import { type StateStorage, createJSONStorage, persist } from "zustand/middleware";

export const CART_STORAGE_KEY = "virtu-cart-v1";
export const CART_STORAGE_VERSION = 1;
export const MIN_QTY = 1;
export const MAX_QTY = 5;

/** What the cart stores. Prices are never stored; they come from the catalogue at read time. */
export interface CartLine {
  /** `${productId}:${colourId}:${variantId}` */
  key: string;
  productId: string;
  colourId: string;
  variantId: string;
  qty: number;
}

export interface AddItemInput {
  productId: string;
  colourId: string;
  variantId: string;
  /** Defaults to 1. */
  qty?: number;
}

/** A cart line joined with its catalogue data and priced. */
export interface PricedCartLine extends CartLine {
  product: Product;
  colour: ColourOption;
  variant: VariantOption;
  unitPrice: number;
  lineTotal: number;
}

export interface CartState {
  lines: CartLine[];
  /** Drawer UI state. Not persisted. */
  isOpen: boolean;
  /** Adds a line, or adds to the quantity of the line with the same key (capped at MAX_QTY). */
  addItem: (input: AddItemInput) => void;
  /** Sets a line's quantity (capped at MAX_QTY). A quantity of 0 or less removes the line. */
  setQty: (key: string, qty: number) => void;
  /** Switches a line's variant. Merges into an existing line if the new key already exists. */
  changeVariant: (key: string, variantId: string) => void;
  /** Switches a line's colour. Merges into an existing line if the new key already exists. */
  changeColour: (key: string, colourId: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
}

export const lineKey = (productId: string, colourId: string, variantId: string) =>
  `${productId}:${colourId}:${variantId}`;

const clampQty = (qty: number) => Math.min(MAX_QTY, Math.max(0, Math.floor(qty)));

const isKnown = (productId: string, colourId: string, variantId: string) => {
  const product = getProduct(productId);
  return (
    (product?.colours.some((c) => c.id === colourId) ?? false) &&
    (product?.variants.some((v) => v.id === variantId) ?? false)
  );
};

/**
 * Moves the line at `key` to new colour/variant ids, merging into a line that already has the
 * resulting key. Exported for tests; the store actions are the public API.
 */
export function relocateLine(
  lines: readonly CartLine[],
  key: string,
  next: { colourId?: string; variantId?: string },
): CartLine[] {
  const line = lines.find((l) => l.key === key);
  if (line === undefined) return [...lines];
  const colourId = next.colourId ?? line.colourId;
  const variantId = next.variantId ?? line.variantId;
  if (!isKnown(line.productId, colourId, variantId)) return [...lines];
  const newKey = lineKey(line.productId, colourId, variantId);
  if (newKey === key) return [...lines];

  const target = lines.find((l) => l.key === newKey);
  if (target === undefined) {
    return lines.map((l) => (l.key === key ? { ...l, key: newKey, colourId, variantId } : l));
  }
  const qty = clampQty(target.qty + line.qty);
  return lines.filter((l) => l.key !== key).map((l) => (l.key === newKey ? { ...l, qty } : l));
}

/** Joins lines with the catalogue, skipping any whose product, colour or variant is gone. */
export function priceLines(lines: readonly CartLine[]): PricedCartLine[] {
  const priced: PricedCartLine[] = [];
  for (const line of lines) {
    const product = getProduct(line.productId);
    if (product === undefined) continue;
    const colour = product.colours.find((c) => c.id === line.colourId);
    const variant = product.variants.find((v) => v.id === line.variantId);
    const price = unitPrice(product, line.variantId);
    if (colour === undefined || variant === undefined || price === undefined) continue;
    priced.push({
      ...line,
      product,
      colour,
      variant,
      unitPrice: price,
      lineTotal: price * line.qty,
    });
  }
  return priced;
}

/** Turns whatever came out of storage into well-formed lines. Drops anything malformed. */
function sanitizeStoredLines(value: unknown): CartLine[] {
  if (!Array.isArray(value)) return [];
  const byKey = new Map<string, CartLine>();
  for (const raw of value as unknown[]) {
    if (typeof raw !== "object" || raw === null) continue;
    const { productId, colourId, variantId, qty } = raw as Record<string, unknown>;
    if (typeof productId !== "string" || typeof colourId !== "string") continue;
    if (typeof variantId !== "string" || typeof qty !== "number" || !Number.isFinite(qty)) continue;
    const key = lineKey(productId, colourId, variantId);
    const total = clampQty((byKey.get(key)?.qty ?? 0) + qty);
    if (total <= 0) continue;
    byKey.set(key, { key, productId, colourId, variantId, qty: total });
  }
  return [...byKey.values()];
}

// The server has no localStorage. A no-op storage keeps `persist` (and `useCart.persist`)
// defined during prerendering without touching `window`.
const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

/** Loads the saved cart once. Safe to call repeatedly; a no-op after the first load. */
export function ensureCartHydrated() {
  if (!useCart.persist.hasHydrated()) void useCart.persist.rehydrate();
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      isOpen: false,

      addItem: ({ productId, colourId, variantId, qty = 1 }) => {
        ensureCartHydrated();
        const add = clampQty(qty);
        if (add <= 0 || !isKnown(productId, colourId, variantId)) return;
        const key = lineKey(productId, colourId, variantId);
        const lines = get().lines;
        const existing = lines.find((l) => l.key === key);
        set({
          lines:
            existing === undefined
              ? [...lines, { key, productId, colourId, variantId, qty: add }]
              : lines.map((l) => (l.key === key ? { ...l, qty: clampQty(l.qty + add) } : l)),
        });
      },

      setQty: (key, qty) => {
        ensureCartHydrated();
        const next = clampQty(qty);
        set({
          lines:
            next <= 0
              ? get().lines.filter((l) => l.key !== key)
              : get().lines.map((l) => (l.key === key ? { ...l, qty: next } : l)),
        });
      },

      changeVariant: (key, variantId) => {
        ensureCartHydrated();
        set({ lines: relocateLine(get().lines, key, { variantId }) });
      },

      changeColour: (key, colourId) => {
        ensureCartHydrated();
        set({ lines: relocateLine(get().lines, key, { colourId }) });
      },

      removeItem: (key) => {
        ensureCartHydrated();
        set({ lines: get().lines.filter((l) => l.key !== key) });
      },

      clear: () => {
        ensureCartHydrated();
        set({ lines: [] });
      },

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set({ isOpen: !get().isOpen }),
    }),
    {
      name: CART_STORAGE_KEY,
      version: CART_STORAGE_VERSION,
      storage: createJSONStorage(() =>
        typeof window === "undefined" ? noopStorage : window.localStorage,
      ),
      // Hydrate from an effect (see useCartHydrated), so the server render and the first
      // client render agree: both start with an empty cart.
      skipHydration: true,
      partialize: (state) => ({ lines: state.lines }),
      merge: (persisted, current) => ({
        ...current,
        lines: sanitizeStoredLines((persisted as { lines?: unknown } | undefined)?.lines),
      }),
    },
  ),
);

const subscribeHydration = (onChange: () => void) => useCart.persist.onFinishHydration(onChange);
const getHydrated = () => useCart.persist.hasHydrated();
const getServerHydrated = () => false;

/**
 * True once the saved cart has loaded. Always false on the server and during the first client
 * render (so they match), then true. Mounting it triggers the load.
 */
export function useCartHydrated(): boolean {
  const hydrated = useSyncExternalStore(subscribeHydration, getHydrated, getServerHydrated);
  useEffect(ensureCartHydrated, []);
  return hydrated;
}

const NO_LINES: PricedCartLine[] = [];

/** Lines joined with catalogue data and priced. Empty until the saved cart has loaded. */
export function useCartLines(): PricedCartLine[] {
  const hydrated = useCartHydrated();
  const lines = useCart((s) => s.lines);
  return useMemo(() => (hydrated ? priceLines(lines) : NO_LINES), [hydrated, lines]);
}

/** Total quantity of the lines the catalogue can still price. 0 until the saved cart has loaded. */
export function useCartCount(): number {
  const lines = useCartLines();
  return lines.reduce((sum, l) => sum + l.qty, 0);
}
