import type { Product } from "@/types/product";
import type { ShopConfig } from "./shop-schema";

/** What a shop charges for a phone's base (smallest) variant, or undefined if it doesn't sell it. */
export function shopBasePrice(shop: ShopConfig, productId: string): number | undefined {
  return shop.stock.find((s) => s.productId === productId)?.price;
}

/**
 * One unit at this shop: the shop's base price plus the catalogue's step for the variant
 * (bigger storage costs the same extra everywhere). Undefined for an unknown variant or a phone
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
export const shopFromPrice = (shop: ShopConfig) => Math.min(...shop.stock.map((s) => s.price));
