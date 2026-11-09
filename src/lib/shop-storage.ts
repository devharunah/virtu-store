import { getProduct } from "@/data/products";
import { z } from "zod";
import { shopFromPrice } from "./shop-pricing";
import {
  type CustomPhone,
  type ShopConfig,
  customPhoneSchema,
  imageUrlSchema,
  parseShop,
  themeSchema,
} from "./shop-schema";

/**
 * How a shop is laid out in Firestore, and back. A shop in the app is one `ShopConfig`; in
 * Firestore it is split in two, because security rules may evaluate at most 1,000 expressions
 * per write and checking every phone's colours, storage and photos inside one document goes
 * over that (see `firestore.rules`):
 *
 *   shops/{slug}               the shop, its catalogue phones and prices, and a summary of
 *                              the seller's own phones ({ id, name, price }) for the directory
 *   shops/{slug}/phones/c1..c4 a seller-added phone's details
 *   shops/{slug}/phones/{productId}  photos of a catalogue phone the shop sells
 */

const summarySchema = z.object({ id: z.string(), name: z.string(), price: z.number() });

/** The shop document as stored (timestamps aside). */
export type StoredShop = Omit<ShopConfig, "stock" | "customPhones"> & {
  stock: { productId: string; price: number }[];
  customPhones?: { id: string; name: string; price: number }[];
};

const photoSetSchema = z.object({ photos: z.array(imageUrlSchema) });

export type StoredPhone =
  | Omit<CustomPhone, "id">
  | {
      photos: string[];
    };

/** The shop document plus one document per phone that has details or photos. */
export function splitShop(shop: ShopConfig): {
  doc: StoredShop;
  phones: Map<string, StoredPhone>;
} {
  const { stock, customPhones, ...rest } = shop;
  const phones = new Map<string, StoredPhone>();
  for (const item of stock) {
    if (item.photos && item.photos.length > 0) phones.set(item.productId, { photos: item.photos });
  }
  for (const { id, ...phone } of customPhones ?? []) phones.set(id, phone);
  return {
    doc: {
      ...rest,
      stock: stock.map(({ productId, price }) => ({ productId, price })),
      ...(customPhones &&
        customPhones.length > 0 && {
          customPhones: customPhones.map(({ id, name, price }) => ({ id, name, price })),
        }),
    },
    phones,
  };
}

/**
 * Rebuilds a shop from its documents. Untrusted input: the result goes through the zod schema,
 * and a phone whose details are missing or malformed is left out rather than sinking the shop.
 */
export function joinShop(
  doc: Record<string, unknown>,
  phones: ReadonlyMap<string, unknown>,
): ShopConfig | null {
  const stock = Array.isArray(doc["stock"]) ? (doc["stock"] as unknown[]) : [];
  const summaries = z.array(summarySchema).safeParse(doc["customPhones"] ?? []);
  const photosOf = (id: string) => {
    const parsed = photoSetSchema.safeParse(phones.get(id));
    return parsed.success && parsed.data.photos.length > 0 ? parsed.data.photos : undefined;
  };

  const customPhones = (summaries.success ? summaries.data : []).flatMap(({ id }) => {
    const parsed = customPhoneSchema.safeParse({ ...(phones.get(id) as object), id });
    return parsed.success ? [parsed.data] : [];
  });

  const parsed = parseShop({
    slug: doc["slug"],
    name: doc["name"],
    location: doc["location"],
    ownerUid: doc["ownerUid"],
    theme: doc["theme"],
    ...(doc["bannerUrl"] !== undefined && { bannerUrl: doc["bannerUrl"] }),
    stock: stock.map((item) => {
      const productId = (item as { productId?: unknown })?.productId;
      const photos = typeof productId === "string" ? photosOf(productId) : undefined;
      return photos ? { ...(item as object), photos } : item;
    }),
    ...(customPhones.length > 0 && { customPhones }),
  });
  return parsed.success ? parsed.data : null;
}

/** What a directory card shows: enough to read from the shop document alone. */
export interface ShopListing {
  slug: string;
  name: string;
  location: string;
  theme: ShopConfig["theme"];
  bannerUrl?: string;
  phones: string[];
  fromPrice: number;
}

export function listingFromShop(shop: ShopConfig): ShopListing {
  return {
    slug: shop.slug,
    name: shop.name,
    location: shop.location,
    theme: shop.theme,
    ...(shop.bannerUrl !== undefined && { bannerUrl: shop.bannerUrl }),
    phones: [
      ...shop.stock.flatMap((s) => getProduct(s.productId)?.name ?? []),
      ...(shop.customPhones ?? []).map((p) => p.name),
    ],
    fromPrice: shopFromPrice(shop),
  };
}

const listingDocSchema = z.object({
  slug: z.string(),
  name: z.string(),
  location: z.string(),
  theme: themeSchema,
  bannerUrl: imageUrlSchema.optional(),
  stock: z.array(z.object({ productId: z.string(), price: z.number() })),
  customPhones: z.array(summarySchema).optional(),
});

/** A directory card from the shop document, or null if it is malformed. */
export function listingFromDoc(doc: unknown): ShopListing | null {
  const parsed = listingDocSchema.safeParse(doc);
  if (!parsed.success) return null;
  const { stock, customPhones = [], bannerUrl, ...rest } = parsed.data;
  const prices = [...stock.map((s) => s.price), ...customPhones.map((p) => p.price)];
  if (prices.length === 0) return null;
  return {
    ...rest,
    ...(bannerUrl !== undefined && { bannerUrl }),
    phones: [
      ...stock.flatMap((s) => getProduct(s.productId)?.name ?? []),
      ...customPhones.map((p) => p.name),
    ],
    fromPrice: Math.min(...prices),
  };
}
