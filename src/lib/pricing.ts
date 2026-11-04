import type { Product } from "@/types/product";

/** Where a boda rider can deliver. Kampala's five divisions, plus everywhere else. */
export const DELIVERY_AREAS = [
  "Kampala Central",
  "Kawempe",
  "Makindye",
  "Nakawa",
  "Rubaga",
  "Outside Kampala",
] as const;

export type DeliveryArea = (typeof DELIVERY_AREAS)[number];

/** Flat delivery fee inside Kampala, in UGX. Also the "Delivery from" price. */
export const DELIVERY_FEE = 10_000;

/** Flat delivery fee for anywhere outside Kampala, in UGX. */
export const DELIVERY_FEE_OUTSIDE_KAMPALA = 25_000;

export const isDeliveryArea = (value: unknown): value is DeliveryArea =>
  typeof value === "string" && (DELIVERY_AREAS as readonly string[]).includes(value);

export const isInsideKampala = (area: DeliveryArea) => area !== "Outside Kampala";

/** The delivery fee for an area. With no area chosen yet, the Kampala fee (the cheapest). */
export const deliveryFeeFor = (area?: DeliveryArea) =>
  area !== undefined && !isInsideKampala(area) ? DELIVERY_FEE_OUTSIDE_KAMPALA : DELIVERY_FEE;

/**
 * The price of one unit: the product's base price plus the variant's price delta.
 * Returns undefined when the variant is not one of the product's variants.
 */
export function unitPrice(product: Product, variantId: string): number | undefined {
  const variant = product.variants.find((v) => v.id === variantId);
  return variant === undefined ? undefined : product.basePrice + variant.priceDelta;
}

export interface PricedLine {
  qty: number;
  unitPrice: number;
}

export interface CartTotals {
  /** Sum of qty × unit price. */
  subtotal: number;
  /** 0 for an empty cart, otherwise the flat fee for the area. */
  delivery: number;
  total: number;
  /** Total quantity across lines. */
  count: number;
}

export function cartTotals(lines: readonly PricedLine[], deliveryArea?: DeliveryArea): CartTotals {
  let subtotal = 0;
  let count = 0;
  for (const line of lines) {
    subtotal += line.qty * line.unitPrice;
    count += line.qty;
  }
  const delivery = count === 0 ? 0 : deliveryFeeFor(deliveryArea);
  return { subtotal, delivery, total: subtotal + delivery, count };
}
