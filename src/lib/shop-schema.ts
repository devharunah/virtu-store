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
/** Seller-added phones (not in the catalogue). */
export const MAX_CUSTOM_PHONES = 4;
export const MAX_PHOTOS = 5;
export const MAX_STORAGE_OPTIONS = 3;
export const MAX_COLOUR_OPTIONS = 4;
/** The most a bigger storage option may add to a seller's phone price. */
export const MAX_PRICE_STEP = 5_000_000;

export const themeSchema = z.object({
  wall: z.string().regex(HEX, "Pick a wall colour"),
  accent: z.string().regex(HEX, "Pick an accent colour"),
  floor: z.string().regex(HEX, "Pick a floor colour"),
});

/** An uploaded image: a Cloudinary delivery URL (see `src/lib/image-url.ts`). */
export const imageUrlSchema = z.string().refine(isCloudinaryUrl, "Upload the image again");

const photosSchema = z.array(imageUrlSchema).max(MAX_PHOTOS, `At most ${MAX_PHOTOS} photos`);

const priceSchema = z
  .number({ error: "Enter a price" })
  .int("Whole shillings only")
  .min(MIN_PRICE, `At least UGX ${MIN_PRICE.toLocaleString("en-US")}`)
  .max(MAX_PRICE, `At most UGX ${MAX_PRICE.toLocaleString("en-US")}`);

export const stockItemSchema = z.object({
  productId: z.string().refine((id) => getProduct(id) !== undefined, "Unknown phone"),
  price: priceSchema,
  /** Real photos of the phone in this shop, shown next to the 3D model. */
  photos: photosSchema.optional(),
});

/** A phone the seller adds themselves. It shows on the shelves as the generic, unbranded model. */
export const customPhoneSchema = z.object({
  /** "c1".."c4": stable within the shop, so a shopper's choices survive edits. */
  id: z.string().regex(/^c[1-4]$/),
  name: z.string().trim().min(2, "Name the phone").max(40, "At most 40 characters"),
  brand: z.string().trim().min(2, "Which brand?").max(20, "At most 20 characters"),
  price: priceSchema,
  storage: z
    .array(
      z.object({
        label: z
          .string()
          .trim()
          .min(1, "Name each storage option")
          .max(12, "At most 12 characters"),
        priceDelta: z
          .number({ error: "Enter the extra price" })
          .int("Whole shillings only")
          .min(0, "Extra price can't be negative")
          .max(MAX_PRICE_STEP, `At most UGX ${MAX_PRICE_STEP.toLocaleString("en-US")} extra`),
      }),
    )
    .min(1, "Add a storage option")
    .max(MAX_STORAGE_OPTIONS),
  colours: z
    .array(
      z.object({
        label: z.string().trim().min(1, "Name each colour").max(20, "At most 20 characters"),
        hex: z.string().regex(HEX, "Pick a colour"),
      }),
    )
    .min(1, "Add a colour")
    .max(MAX_COLOUR_OPTIONS),
  photos: photosSchema,
});

export const shopSchema = z
  .object({
    slug: z.string().regex(SLUG_PATTERN, "3–32 characters: lowercase letters, numbers and dashes"),
    name: z.string().trim().min(2, "At least 2 characters").max(40, "At most 40 characters"),
    location: z.string().trim().min(2, "Where is the shop?").max(40, "At most 40 characters"),
    ownerUid: z.string().min(1),
    theme: themeSchema,
    /** Optional wide banner: shown on the directory card and the 3D shop's front sign. */
    bannerUrl: imageUrlSchema.optional(),
    stock: z
      .array(stockItemSchema)
      .max(MAX_STOCK)
      .refine(
        (items) => new Set(items.map((i) => i.productId)).size === items.length,
        "Each phone once",
      ),
    /** Phones the seller added themselves. */
    customPhones: z
      .array(customPhoneSchema)
      .max(MAX_CUSTOM_PHONES, `At most ${MAX_CUSTOM_PHONES} of your own phones`)
      .refine((items) => new Set(items.map((i) => i.id)).size === items.length, "Each phone once")
      .optional(),
  })
  .refine((shop) => shop.stock.length + (shop.customPhones?.length ?? 0) > 0, {
    message: "Sell at least one phone",
    path: ["stock"],
  });

export type ShopTheme = z.infer<typeof themeSchema>;
export type StockItem = z.infer<typeof stockItemSchema>;
export type CustomPhone = z.infer<typeof customPhoneSchema>;
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
