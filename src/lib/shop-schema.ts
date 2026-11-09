import { getProduct } from "@/data/products";
import { z } from "zod";
import { isCloudinaryUrl } from "./image-url";

/**
 * A seller's shop: what it is called, how its room is painted and which phones it sells at
 * what price. The same schema validates the dashboard form, every Firestore read, and (mirrored
 * by hand) the Firestore security rules in `firestore.rules`.
 */

export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,30})[a-z0-9]$/;
const HEX = /^#[0-9a-fA-F]{6}$/;

/** Whole UGX. Wide enough for any phone, narrow enough to catch a typo with extra zeros. */
export const MIN_PRICE = 50_000;
export const MAX_PRICE = 20_000_000;
export const MAX_STOCK = 5;

export const themeSchema = z.object({
  wall: z.string().regex(HEX, "Pick a wall colour"),
  accent: z.string().regex(HEX, "Pick an accent colour"),
  floor: z.string().regex(HEX, "Pick a floor colour"),
});

export const stockItemSchema = z.object({
  productId: z.string().refine((id) => getProduct(id) !== undefined, "Unknown phone"),
  price: z
    .number()
    .int("Whole shillings only")
    .min(MIN_PRICE, `At least UGX ${MIN_PRICE.toLocaleString("en-US")}`)
    .max(MAX_PRICE, `At most UGX ${MAX_PRICE.toLocaleString("en-US")}`),
});

/** An uploaded image: a Cloudinary delivery URL (see `src/lib/image-url.ts`). */
export const imageUrlSchema = z.string().refine(isCloudinaryUrl, "Upload the image again");

export const shopSchema = z.object({
  slug: z.string().regex(SLUG_PATTERN, "3–32 characters: lowercase letters, numbers and dashes"),
  name: z.string().trim().min(2, "At least 2 characters").max(40, "At most 40 characters"),
  location: z.string().trim().min(2, "Where is the shop?").max(40, "At most 40 characters"),
  ownerUid: z.string().min(1),
  theme: themeSchema,
  /** Optional wide banner: shown on the directory card and the 3D shop's front sign. */
  bannerUrl: imageUrlSchema.optional(),
  stock: z
    .array(stockItemSchema)
    .min(1, "Sell at least one phone")
    .max(MAX_STOCK)
    .refine(
      (items) => new Set(items.map((i) => i.productId)).size === items.length,
      "Each phone once",
    ),
});

export type ShopTheme = z.infer<typeof themeSchema>;
export type StockItem = z.infer<typeof stockItemSchema>;
export type ShopConfig = z.infer<typeof shopSchema>;

/** Turns a shop name into a URL slug: "Kikuubo Phone Hub!" → "kikuubo-phone-hub". */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Mn}/gu, "") // drop the accents NFKD split off: "é" → "e"
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32)
    .replace(/-+$/g, "");
}

/** Parses untrusted data (Firestore, a form) into a shop, or returns the issues. */
export function parseShop(data: unknown) {
  return shopSchema.safeParse(data);
}
