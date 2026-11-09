import type { Product } from "@/types/product";
import { CUSTOM_PREFIX } from "./shop-products";
import type { ShopConfig } from "./shop-schema";

/** What a shop charges for a phone's base (smallest) variant, or undefined if it doesn't sell it. */
export function shopBasePrice(shop: ShopConfig, productId: string): number | undefined {
  return (
    shop.stock.find((s) => s.productId === productId)?.price ??
    shop.customPhones?.find((p) => `${CUSTOM_PREFIX}${p.id}` === productId)?.price
  );
}

/**
 * One unit at this shop: the shop's base price plus the variant's step (the catalogue's step,
 * or the seller's own for a phone they added). Undefined for an unknown variant or a phone
 * the shop doesn't sell.
 */
export function shopUnitPrice(
  shop: ShopConfig,
  product: Product,
  variantId: string,
): number | undefined {
  const base = shopBasePrice(shop, product.id);
  const variant = product.variants.find((v) => v.id === variantId);
  return base === undefined || variant === undefined ? undefined : base + variant.priceDelta;
}

/** The cheapest phone a shop sells, for "from UGX …" on its card. */
export const shopFromPrice = (shop: ShopConfig) =>
  Math.min(...shop.stock.map((s) => s.price), ...(shop.customPhones ?? []).map((p) => p.price));
