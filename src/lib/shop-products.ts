import { getProduct } from "@/data/products";
import type { Product } from "@/types/product";
import type { CustomPhone, ShopConfig } from "./shop-schema";

/**
 * Everything a shop sells, as `Product`s: catalogue phones (with the shop's own photos) and the
 * phones the seller added themselves. The 3D scene, the inspect panel and the directory card
 * look phones up here instead of in the catalogue alone.
 */

/** Seller-added phones show on the shelves as this unbranded model (blender/phones.py). */
export const GENERIC_PHONE_URL = "/models/phones/generic-phone.glb";
export const CUSTOM_PREFIX = "custom-";

export const isCustomId = (id: string) => id.startsWith(CUSTOM_PREFIX);

/** A seller's own phone as a product. Colour and storage ids are positional ("c0", "s0"). */
export function customProduct(phone: CustomPhone): Product {
  return {
    id: `${CUSTOM_PREFIX}${phone.id}`,
    brand: phone.brand,
    name: phone.name,
    tier: "Seller's phone",
    basePrice: phone.price,
    modelUrl: GENERIC_PHONE_URL,
    colours: phone.colours.map((c, i) => ({ id: `c${i}`, label: c.label, hex: c.hex })),
    variantKind: "storage",
    variants: phone.storage.map((s, i) => ({
      id: `s${i}`,
      label: s.label,
      priceDelta: s.priceDelta,
    })),
    displaySlot: "",
    photos: phone.photos,
    custom: true,
  };
}

/** The shop's phones in display order: its catalogue phones first, then its own. */
export function shopProducts(shop: ShopConfig): Product[] {
  const catalogue = shop.stock.flatMap((item) => {
    const product = getProduct(item.productId);
    if (product === undefined) return [];
    return [item.photos && item.photos.length > 0 ? { ...product, photos: item.photos } : product];
  });
  return [...catalogue, ...(shop.customPhones ?? []).map(customProduct)];
}

/**
 * A phone by id, as this shop sells it: a seller-added phone, or a catalogue phone with the
 * shop's photos. Falls back to the plain catalogue for phones the shop doesn't list (the
 * VIRTU showroom prices those from the catalogue).
 */
export function resolveShopProduct(shop: ShopConfig, id: string): Product | undefined {
  if (isCustomId(id)) {
    const phone = shop.customPhones?.find((p) => `${CUSTOM_PREFIX}${p.id}` === id);
    return phone === undefined ? undefined : customProduct(phone);
  }
  const product = getProduct(id);
  const photos = shop.stock.find((s) => s.productId === id)?.photos;
  return product && photos && photos.length > 0 ? { ...product, photos } : product;
}
