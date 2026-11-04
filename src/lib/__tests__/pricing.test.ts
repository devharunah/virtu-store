import { getProduct } from "@/data/products";
import {
  DELIVERY_AREAS,
  DELIVERY_FEE,
  DELIVERY_FEE_OUTSIDE_KAMPALA,
  cartTotals,
  deliveryFeeFor,
  isDeliveryArea,
  unitPrice,
} from "../pricing";

const product = (id: string) => {
  const p = getProduct(id);
  if (p === undefined) throw new Error(`missing product ${id}`);
  return p;
};

describe("unitPrice", () => {
  it("is the base price for the base variant", () => {
    expect(unitPrice(product("nova-a1"), "64")).toBe(349_000);
  });

  it("adds the variant's price delta", () => {
    expect(unitPrice(product("nova-a1"), "128")).toBe(409_000);
  });

  it("returns undefined for a variant the product doesn't have", () => {
    expect(unitPrice(product("nova-a1"), "1024")).toBeUndefined();
  });
});

describe("delivery fees", () => {
  it("charges UGX 10,000 inside Kampala and UGX 25,000 outside", () => {
    expect(DELIVERY_FEE).toBe(10_000);
    expect(DELIVERY_FEE_OUTSIDE_KAMPALA).toBe(25_000);
    for (const area of DELIVERY_AREAS) {
      expect(deliveryFeeFor(area)).toBe(area === "Outside Kampala" ? 25_000 : 10_000);
    }
  });

  it("quotes the Kampala fee before an area is chosen", () => {
    expect(deliveryFeeFor()).toBe(DELIVERY_FEE);
  });

  it("recognises only the listed areas", () => {
    expect(isDeliveryArea("Nakawa")).toBe(true);
    expect(isDeliveryArea("Entebbe")).toBe(false);
    expect(isDeliveryArea(undefined)).toBe(false);
  });
});

describe("cartTotals", () => {
  const lines = [
    { qty: 2, unitPrice: 349_000 },
    { qty: 1, unitPrice: 1_499_000 },
  ];

  it("sums the lines and adds Kampala delivery by default", () => {
    expect(cartTotals(lines)).toEqual({
      subtotal: 2_197_000,
      delivery: 10_000,
      total: 2_207_000,
      count: 3,
    });
  });

  it("uses the outside-Kampala fee for that area", () => {
    expect(cartTotals(lines, "Outside Kampala")).toMatchObject({
      delivery: 25_000,
      total: 2_222_000,
    });
  });

  it("charges no delivery for an empty cart", () => {
    expect(cartTotals([], "Outside Kampala")).toEqual({
      subtotal: 0,
      delivery: 0,
      total: 0,
      count: 0,
    });
  });
});
