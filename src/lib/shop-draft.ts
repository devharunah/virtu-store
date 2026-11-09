import { products } from "@/data/products";
import { DEFAULT_THEME } from "@/data/themes";
import { isCloudinaryUrl } from "./image-url";
import {
  type CustomPhone,
  MAX_CUSTOM_PHONES,
  type ShopConfig,
  type ShopTheme,
  customPhoneSchema,
  shopSchema,
  slugify,
} from "./shop-schema";

/**
 * The seller dashboard's form state, and how it becomes a shop. Pure, so it is unit tested;
 * the React form only holds it. Prices are kept as typed text until save.
 */
export interface StockDraft {
  productId: string;
  on: boolean;
  price: string;
  photos: string[];
}

/** A phone the seller adds themselves, as typed. Prices stay text until save. */
export interface CustomPhoneDraft {
  id: string;
  name: string;
  brand: string;
  price: string;
  storage: { label: string; priceDelta: string }[];
  colours: { label: string; hex: string }[];
  photos: string[];
}

export interface ShopDraft {
  name: string;
  slug: string;
  /** Once the seller types their own link (or the shop exists), the name stops rewriting it. */
  slugLocked: boolean;
  location: string;
  theme: ShopTheme;
  /** Empty when the shop has no banner. */
  bannerUrl: string;
  stock: StockDraft[];
  customPhones: CustomPhoneDraft[];
}

/** Field → first error message, for showing next to the inputs. */
export type DraftErrors = Partial<
  Record<"name" | "slug" | "location" | "theme" | "bannerUrl" | "stock" | "customPhones", string>
>;

const customToDraft = (p: CustomPhone): CustomPhoneDraft => ({
  id: p.id,
  name: p.name,
  brand: p.brand,
  price: String(p.price),
  storage: p.storage.map((s) => ({ label: s.label, priceDelta: String(s.priceDelta) })),
  colours: p.colours.map((c) => ({ ...c })),
  photos: [...p.photos],
});

/** A blank phone for the "Add a phone" button, with the first free id ("c1".."c4"). */
export function newCustomPhone(existing: readonly CustomPhoneDraft[]): CustomPhoneDraft | null {
  if (existing.length >= MAX_CUSTOM_PHONES) return null;
  const used = new Set(existing.map((p) => p.id));
  const id = ["c1", "c2", "c3", "c4"].find((c) => !used.has(c));
  if (id === undefined) return null;
  return {
    id,
    name: "",
    brand: "",
    price: "",
    storage: [{ label: "128 GB", priceDelta: "0" }],
    colours: [{ label: "Black", hex: "#1C1D20" }],
    photos: [],
  };
}

export function draftFromShop(shop: ShopConfig | null): ShopDraft {
  return {
    name: shop?.name ?? "",
    slug: shop?.slug ?? "",
    slugLocked: shop !== null,
    location: shop?.location ?? "",
    theme: shop?.theme ?? DEFAULT_THEME,
    bannerUrl: shop?.bannerUrl ?? "",
    // Every catalogue phone gets a row; the shop's own phones keep their order, on top.
    stock: [
      ...(shop?.stock ?? []).map((s) => ({
        productId: s.productId,
        on: true,
        price: String(s.price),
        photos: [...(s.photos ?? [])],
      })),
      ...products
        .filter((p) => !shop?.stock.some((s) => s.productId === p.id))
        .map((p) => ({ productId: p.id, on: false, price: String(p.basePrice), photos: [] })),
    ],
    customPhones: (shop?.customPhones ?? []).map(customToDraft),
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

const stockCandidate = (s: StockDraft) => ({
  productId: s.productId,
  price: parsePrice(s.price),
  ...(s.photos.length > 0 && { photos: s.photos }),
});

const customCandidate = (p: CustomPhoneDraft) => ({
  id: p.id,
  name: p.name.trim(),
  brand: p.brand.trim(),
  price: parsePrice(p.price),
  storage: p.storage.map((s) => ({ label: s.label.trim(), priceDelta: parsePrice(s.priceDelta) })),
  colours: p.colours.map((c) => ({ label: c.label.trim(), hex: c.hex })),
  photos: p.photos,
});

const toCandidate = (draft: ShopDraft, ownerUid: string) => ({
  slug: draft.slug,
  name: draft.name.trim(),
  location: draft.location.trim(),
  ownerUid,
  theme: draft.theme,
  ...(draft.bannerUrl !== "" && { bannerUrl: draft.bannerUrl }),
  stock: draft.stock.filter((s) => s.on).map(stockCandidate),
  ...(draft.customPhones.length > 0 && { customPhones: draft.customPhones.map(customCandidate) }),
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
        field === "bannerUrl" ||
        field === "stock") &&
      errors[field] === undefined
    ) {
      errors[field] = issue.message;
    } else if (field === "customPhones" && errors.customPhones === undefined) {
      // Name the phone the problem is on: "Kabira K1: At least UGX 50,000".
      const index = issue.path[1];
      const phone = typeof index === "number" ? draft.customPhones[index] : undefined;
      const label = phone
        ? phone.name.trim() || `Phone ${index === undefined ? "" : Number(index) + 1}`
        : "";
      errors.customPhones = label ? `${label}: ${issue.message}` : issue.message;
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
    .map(stockCandidate)
    .filter((s) => Number.isFinite(s.price) && s.price > 0);
  // Only the seller's phones that are complete enough to show.
  const customPhones = draft.customPhones.flatMap((p) => {
    const parsed = customPhoneSchema.safeParse(customCandidate(p));
    return parsed.success ? [parsed.data] : [];
  });
  return {
    slug: draft.slug || "preview",
    name: draft.name.trim() || "Your shop",
    location: draft.location.trim() || "Kampala",
    ownerUid: "preview",
    theme: draft.theme,
    ...(isCloudinaryUrl(draft.bannerUrl) && { bannerUrl: draft.bannerUrl }),
    stock:
      stock.length > 0 || customPhones.length > 0
        ? stock
        : products.map((p) => ({ productId: p.id, price: p.basePrice })),
    ...(customPhones.length > 0 && { customPhones }),
  };
}
