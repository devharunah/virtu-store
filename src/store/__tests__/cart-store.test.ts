import { act, renderHook } from "@testing-library/react";
import {
  CART_STORAGE_KEY,
  MAX_QTY,
  lineKey,
  priceLines,
  useCart,
  useCartCount,
  useCartLines,
} from "../cart-store";

const cart = () => useCart.getState();
const A1_MIDNIGHT_64 = lineKey("nova-a1", "midnight", "64");
const A1_MIDNIGHT_128 = lineKey("nova-a1", "midnight", "128");
const A1_SAND_64 = lineKey("nova-a1", "sand", "64");

beforeEach(() => {
  window.localStorage.clear();
  useCart.setState({ lines: [], isOpen: false });
});

describe("addItem", () => {
  it("adds a new line with qty 1 by default", () => {
    cart().addItem({ productId: "nova-a1", colourId: "midnight", variantId: "64" });
    expect(cart().lines).toEqual([
      { key: A1_MIDNIGHT_64, productId: "nova-a1", colourId: "midnight", variantId: "64", qty: 1 },
    ]);
  });

  it("merges into the line with the same product, colour and variant", () => {
    cart().addItem({ productId: "nova-a1", colourId: "midnight", variantId: "64" });
    cart().addItem({ productId: "nova-a1", colourId: "midnight", variantId: "64", qty: 2 });
    cart().addItem({ productId: "nova-a1", colourId: "sand", variantId: "64" });
    expect(cart().lines.map((l) => [l.key, l.qty])).toEqual([
      [A1_MIDNIGHT_64, 3],
      [A1_SAND_64, 1],
    ]);
  });

  it(`caps a line at ${MAX_QTY}`, () => {
    cart().addItem({ productId: "nova-a1", colourId: "midnight", variantId: "64", qty: 4 });
    cart().addItem({ productId: "nova-a1", colourId: "midnight", variantId: "64", qty: 4 });
    expect(cart().lines[0]?.qty).toBe(MAX_QTY);
  });

  it("ignores unknown products, colours, variants and non-positive quantities", () => {
    cart().addItem({ productId: "nokia-3310", colourId: "midnight", variantId: "64" });
    cart().addItem({ productId: "nova-a1", colourId: "gold", variantId: "64" });
    cart().addItem({ productId: "nova-a1", colourId: "midnight", variantId: "1024" });
    cart().addItem({ productId: "nova-a1", colourId: "midnight", variantId: "64", qty: 0 });
    expect(cart().lines).toEqual([]);
  });
});

describe("setQty", () => {
  beforeEach(() => {
    cart().addItem({ productId: "nova-a1", colourId: "midnight", variantId: "64", qty: 2 });
  });

  it("sets the quantity", () => {
    cart().setQty(A1_MIDNIGHT_64, 4);
    expect(cart().lines[0]?.qty).toBe(4);
  });

  it(`clamps to ${MAX_QTY}`, () => {
    cart().setQty(A1_MIDNIGHT_64, 99);
    expect(cart().lines[0]?.qty).toBe(MAX_QTY);
  });

  it("removes the line at 0 or below", () => {
    cart().setQty(A1_MIDNIGHT_64, 0);
    expect(cart().lines).toEqual([]);
    cart().addItem({ productId: "nova-a1", colourId: "midnight", variantId: "64" });
    cart().setQty(A1_MIDNIGHT_64, -3);
    expect(cart().lines).toEqual([]);
  });
});

describe("changeVariant and changeColour", () => {
  it("moves a line to the new variant", () => {
    cart().addItem({ productId: "nova-a1", colourId: "midnight", variantId: "64", qty: 2 });
    cart().changeVariant(A1_MIDNIGHT_64, "128");
    expect(cart().lines).toEqual([
      {
        key: A1_MIDNIGHT_128,
        productId: "nova-a1",
        colourId: "midnight",
        variantId: "128",
        qty: 2,
      },
    ]);
  });

  it("merges into an existing line with the new variant", () => {
    cart().addItem({ productId: "nova-a1", colourId: "midnight", variantId: "64", qty: 2 });
    cart().addItem({ productId: "nova-a1", colourId: "midnight", variantId: "128", qty: 1 });
    cart().changeVariant(A1_MIDNIGHT_64, "128");
    expect(cart().lines.map((l) => [l.key, l.qty])).toEqual([[A1_MIDNIGHT_128, 3]]);
  });

  it("merges into an existing line with the new colour, capped", () => {
    cart().addItem({ productId: "nova-a1", colourId: "midnight", variantId: "64", qty: 4 });
    cart().addItem({ productId: "nova-a1", colourId: "sand", variantId: "64", qty: 3 });
    cart().changeColour(A1_MIDNIGHT_64, "sand");
    expect(cart().lines.map((l) => [l.key, l.qty])).toEqual([[A1_SAND_64, MAX_QTY]]);
  });

  it("ignores unknown variants and colours", () => {
    cart().addItem({ productId: "nova-a1", colourId: "midnight", variantId: "64" });
    const before = cart().lines;
    cart().changeVariant(A1_MIDNIGHT_64, "1024");
    cart().changeColour(A1_MIDNIGHT_64, "gold");
    expect(cart().lines).toEqual(before);
  });
});

describe("removeItem and clear", () => {
  beforeEach(() => {
    cart().addItem({ productId: "nova-a1", colourId: "midnight", variantId: "64" });
    cart().addItem({ productId: "pulse-x", colourId: "ink", variantId: "256" });
  });

  it("removes one line", () => {
    cart().removeItem(A1_MIDNIGHT_64);
    expect(cart().lines.map((l) => l.productId)).toEqual(["pulse-x"]);
  });

  it("clears every line", () => {
    cart().clear();
    expect(cart().lines).toEqual([]);
  });
});

describe("drawer state", () => {
  it("opens, closes and toggles", () => {
    cart().openCart();
    expect(cart().isOpen).toBe(true);
    cart().closeCart();
    expect(cart().isOpen).toBe(false);
    cart().toggleCart();
    expect(cart().isOpen).toBe(true);
  });
});

describe("persistence", () => {
  it("saves lines (and not drawer state) under virtu-cart-v1, version 1", () => {
    cart().openCart();
    cart().addItem({ productId: "nova-a1", colourId: "midnight", variantId: "64" });
    const saved = JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) ?? "null");
    expect(saved.version).toBe(1);
    expect(saved.state).toEqual({ lines: cart().lines });
  });

  it("rehydrates and sanitises what it finds in storage", async () => {
    window.localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({
        state: {
          lines: [
            { productId: "pulse-x", colourId: "ink", variantId: "256", qty: 2, unitPrice: 1 },
            { productId: "pulse-x", colourId: "ink", variantId: "256", qty: 9 },
            { productId: "nova-a1", colourId: "sand", variantId: "64", qty: "lots" },
            null,
          ],
        },
        version: 1,
      }),
    );
    await useCart.persist.rehydrate();
    expect(cart().lines).toEqual([
      {
        key: lineKey("pulse-x", "ink", "256"),
        productId: "pulse-x",
        colourId: "ink",
        variantId: "256",
        qty: MAX_QTY,
      },
    ]);
  });
});

describe("priced lines", () => {
  it("prices from the catalogue and skips lines that no longer exist", () => {
    useCart.setState({
      lines: [
        {
          key: A1_MIDNIGHT_128,
          productId: "nova-a1",
          colourId: "midnight",
          variantId: "128",
          qty: 2,
        },
        { key: "gone:black:64", productId: "gone", colourId: "black", variantId: "64", qty: 1 },
        {
          key: "nova-a1:midnight:9",
          productId: "nova-a1",
          colourId: "midnight",
          variantId: "9",
          qty: 1,
        },
        { key: "nova-a1:gold:64", productId: "nova-a1", colourId: "gold", variantId: "64", qty: 1 },
      ],
    });
    const priced = priceLines(cart().lines);
    expect(priced).toHaveLength(1);
    expect(priced[0]).toMatchObject({
      key: A1_MIDNIGHT_128,
      unitPrice: 409_000,
      lineTotal: 818_000,
      colour: { label: "Midnight" },
      variant: { label: "128 GB" },
    });
  });

  it("feeds useCartLines and useCartCount once the saved cart has loaded", () => {
    useCart.setState({
      lines: [
        {
          key: A1_MIDNIGHT_64,
          productId: "nova-a1",
          colourId: "midnight",
          variantId: "64",
          qty: 2,
        },
        { key: "gone:black:64", productId: "gone", colourId: "black", variantId: "64", qty: 3 },
      ],
    });
    const { result } = renderHook(() => ({ lines: useCartLines(), count: useCartCount() }));
    expect(result.current.lines.map((l) => l.key)).toEqual([A1_MIDNIGHT_64]);
    expect(result.current.count).toBe(2);

    act(() => cart().addItem({ productId: "pulse-x", colourId: "ink", variantId: "256" }));
    expect(result.current.count).toBe(3);
  });
});
