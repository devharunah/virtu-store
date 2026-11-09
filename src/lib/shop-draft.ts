import { products } from "@/data/products";
import { DEFAULT_THEME } from "@/data/themes";
import { type ShopConfig, type ShopTheme, shopSchema, slugify } from "./shop-schema";

/**
 * The seller dashboard's form state, and how it becomes a shop. Pure, so it is unit tested;
 * the React form only holds it. Prices are kept as typed text until save.
 */
export interface StockDraft {
  productId: string;
  on: boolean;
  price: string;
}

export interface ShopDraft {
  name: string;
  slug: string;
  /** Once the seller types their own link (or the shop exists), the name stops rewriting it. */
  slugLocked: boolean;
  location: string;
  theme: ShopTheme;
  stock: StockDraft[];
}

/** Field → first error message, for showing next to the inputs. */
export type DraftErrors = Partial<Record<"name" | "slug" | "location" | "theme" | "stock", string>>;

export function draftFromShop(shop: ShopConfig | null): ShopDraft {
  return {
    name: shop?.name ?? "",
    slug: shop?.slug ?? "",
    slugLocked: shop !== null,
    location: shop?.location ?? "",
    theme: shop?.theme ?? DEFAULT_THEME,
    // Every catalogue phone gets a row; the shop's own phones keep their order, on top.
    stock: [
      ...(shop?.stock ?? []).map((s) => ({
        productId: s.productId,
        on: true,
        price: String(s.price),
      })),
      ...products
        .filter((p) => !shop?.stock.some((s) => s.productId === p.id))
        .map((p) => ({ productId: p.id, on: false, price: String(p.basePrice) })),
    ],
  };
}

/** The name changes the link too, until the link is locked. Returns a new draft. */
export function withName(draft: ShopDraft, name: string): ShopDraft {
  return { ...draft, name, slug: draft.slugLocked ? draft.slug : slugify(name) };
}

/** "1,450,000" or "1 450 000" → 1450000; anything else → NaN (the schema then rejects it). */
export const parsePrice = (text: string) => {
  const digits = text.replace(/[\s,_]/g, "");
  return /^\d+$/.test(digits) ? Number(digits) : Number.NaN;
};

const toCandidate = (draft: ShopDraft, ownerUid: string) => ({
  slug: draft.slug,
  name: draft.name.trim(),
  location: draft.location.trim(),
  ownerUid,
  theme: draft.theme,
  stock: draft.stock
    .filter((s) => s.on)
    .map((s) => ({ productId: s.productId, price: parsePrice(s.price) })),
});

export function draftToShop(
  draft: ShopDraft,
  ownerUid: string,
): { ok: true; shop: ShopConfig } | { ok: false; errors: DraftErrors } {
  const parsed = shopSchema.safeParse(toCandidate(draft, ownerUid));
  if (parsed.success) return { ok: true, shop: parsed.data };
  const errors: DraftErrors = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0];
    if (
      (field === "name" ||
        field === "slug" ||
        field === "location" ||
        field === "theme" ||
        field === "stock") &&
      errors[field] === undefined
    ) {
      errors[field] = issue.message;
    }
  }
  return { ok: false, errors };
}

/**
 * What the live 3D preview shows while the form is half-filled: the draft's colours and name,
 * and its valid priced phones (or the full catalogue while none are picked yet).
 */
export function previewShop(draft: ShopDraft): ShopConfig {
  const stock = draft.stock
    .filter((s) => s.on)
    .map((s) => ({ productId: s.productId, price: parsePrice(s.price) }))
    .filter((s) => Number.isFinite(s.price) && s.price > 0);
  return {
    slug: draft.slug || "preview",
    name: draft.name.trim() || "Your shop",
    location: draft.location.trim() || "Kampala",
    ownerUid: "preview",
    theme: draft.theme,
    stock:
      stock.length > 0 ? stock : products.map((p) => ({ productId: p.id, price: p.basePrice })),
  };
}
