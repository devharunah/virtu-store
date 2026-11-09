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
const A17_BLACK_128 = lineKey("galaxy-a17", "black", "128");
const A17_BLACK_256 = lineKey("galaxy-a17", "black", "256");
const A17_BLUE_128 = lineKey("galaxy-a17", "blue", "128");

beforeEach(() => {
  window.localStorage.clear();
  useCart.setState({ lines: [], isOpen: false });
});

describe("addItem", () => {
  it("adds a new line with qty 1 by default", () => {
    cart().addItem({ productId: "galaxy-a17", colourId: "black", variantId: "128" });
    expect(cart().lines).toEqual([
      { key: A17_BLACK_128, productId: "galaxy-a17", colourId: "black", variantId: "128", qty: 1 },
    ]);
  });

  it("merges into the line with the same product, colour and variant", () => {
    cart().addItem({ productId: "galaxy-a17", colourId: "black", variantId: "128" });
    cart().addItem({ productId: "galaxy-a17", colourId: "black", variantId: "128", qty: 2 });
    cart().addItem({ productId: "galaxy-a17", colourId: "blue", variantId: "128" });
    expect(cart().lines.map((l) => [l.key, l.qty])).toEqual([
      [A17_BLACK_128, 3],
      [A17_BLUE_128, 1],
    ]);
  });

  it(`caps a line at ${MAX_QTY}`, () => {
    cart().addItem({ productId: "galaxy-a17", colourId: "black", variantId: "128", qty: 4 });
    cart().addItem({ productId: "galaxy-a17", colourId: "black", variantId: "128", qty: 4 });
    expect(cart().lines[0]?.qty).toBe(MAX_QTY);
  });

  it("ignores unknown products, colours, variants and non-positive quantities", () => {
    cart().addItem({ productId: "nokia-3310", colourId: "black", variantId: "128" });
    cart().addItem({ productId: "galaxy-a17", colourId: "gold", variantId: "128" });
    cart().addItem({ productId: "galaxy-a17", colourId: "black", variantId: "1024" });
    cart().addItem({ productId: "galaxy-a17", colourId: "black", variantId: "128", qty: 0 });
    expect(cart().lines).toEqual([]);
  });
});

describe("setQty", () => {
  beforeEach(() => {
    cart().addItem({ productId: "galaxy-a17", colourId: "black", variantId: "128", qty: 2 });
  });

  it("sets the quantity", () => {
    cart().setQty(A17_BLACK_128, 4);
    expect(cart().lines[0]?.qty).toBe(4);
  });

  it(`clamps to ${MAX_QTY}`, () => {
    cart().setQty(A17_BLACK_128, 99);
    expect(cart().lines[0]?.qty).toBe(MAX_QTY);
  });

  it("removes the line at 0 or below", () => {
    cart().setQty(A17_BLACK_128, 0);
    expect(cart().lines).toEqual([]);
    cart().addItem({ productId: "galaxy-a17", colourId: "black", variantId: "128" });
    cart().setQty(A17_BLACK_128, -3);
    expect(cart().lines).toEqual([]);
  });
});

describe("changeVariant and changeColour", () => {
  it("moves a line to the new variant", () => {
    cart().addItem({ productId: "galaxy-a17", colourId: "black", variantId: "128", qty: 2 });
    cart().changeVariant(A17_BLACK_128, "256");
    expect(cart().lines).toEqual([
      {
        key: A17_BLACK_256,
        productId: "galaxy-a17",
        colourId: "black",
        variantId: "256",
        qty: 2,
      },
    ]);
  });

  it("merges into an existing line with the new variant", () => {
    cart().addItem({ productId: "galaxy-a17", colourId: "black", variantId: "128", qty: 2 });
    cart().addItem({ productId: "galaxy-a17", colourId: "black", variantId: "256", qty: 1 });
    cart().changeVariant(A17_BLACK_128, "256");
    expect(cart().lines.map((l) => [l.key, l.qty])).toEqual([[A17_BLACK_256, 3]]);
  });

  it("merges into an existing line with the new colour, capped", () => {
    cart().addItem({ productId: "galaxy-a17", colourId: "black", variantId: "128", qty: 4 });
    cart().addItem({ productId: "galaxy-a17", colourId: "blue", variantId: "128", qty: 3 });
    cart().changeColour(A17_BLACK_128, "blue");
    expect(cart().lines.map((l) => [l.key, l.qty])).toEqual([[A17_BLUE_128, MAX_QTY]]);
  });

  it("ignores unknown variants and colours", () => {
    cart().addItem({ productId: "galaxy-a17", colourId: "black", variantId: "128" });
    const before = cart().lines;
    cart().changeVariant(A17_BLACK_128, "1024");
    cart().changeColour(A17_BLACK_128, "gold");
    expect(cart().lines).toEqual(before);
  });
});

describe("removeItem and clear", () => {
  beforeEach(() => {
    cart().addItem({ productId: "galaxy-a17", colourId: "black", variantId: "128" });
    cart().addItem({ productId: "iphone-17", colourId: "white", variantId: "256" });
  });

  it("removes one line", () => {
    cart().removeItem(A17_BLACK_128);
    expect(cart().lines.map((l) => l.productId)).toEqual(["iphone-17"]);
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
    cart().addItem({ productId: "galaxy-a17", colourId: "black", variantId: "128" });
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
            { productId: "iphone-17", colourId: "white", variantId: "256", qty: 2, unitPrice: 1 },
            { productId: "iphone-17", colourId: "white", variantId: "256", qty: 9 },
            { productId: "galaxy-a17", colourId: "blue", variantId: "128", qty: "lots" },
            null,
          ],
        },
        version: 1,
      }),
    );
    await useCart.persist.rehydrate();
    expect(cart().lines).toEqual([
      {
        key: lineKey("iphone-17", "white", "256"),
        productId: "iphone-17",
        colourId: "white",
        variantId: "256",
        qty: MAX_QTY,
      },
    ]);
  });
});

describe("lines from a seller's shop", () => {
  const SHOP = { slug: "kikuubo-phone-hub", name: "Kikuubo Phone Hub", basePrice: 650_000 };

  it("keeps the shop's lines apart from the showroom's, and prices them at the shop's price", () => {
    cart().addItem({ productId: "galaxy-a17", colourId: "black", variantId: "256", shop: SHOP });
    cart().addItem({ productId: "galaxy-a17", colourId: "black", variantId: "256" });
    expect(cart().lines.map((l) => l.key)).toEqual([
      lineKey("galaxy-a17", "black", "256", SHOP.slug),
      A17_BLACK_256,
    ]);
    expect(priceLines(cart().lines).map((l) => l.unitPrice)).toEqual([
      650_000 + 120_000, // the shop's base plus the catalogue's storage step
      840_000,
    ]);
  });

  it("keeps the shop when the variant changes", () => {
    cart().addItem({ productId: "galaxy-a17", colourId: "black", variantId: "128", shop: SHOP });
    cart().changeVariant(lineKey("galaxy-a17", "black", "128", SHOP.slug), "256");
    expect(cart().lines[0]).toMatchObject({
      key: lineKey("galaxy-a17", "black", "256", SHOP.slug),
      shop: SHOP,
    });
  });

  it("takes the latest price when the same phone is added again", () => {
    cart().addItem({ productId: "galaxy-a17", colourId: "black", variantId: "128", shop: SHOP });
    cart().addItem({
      productId: "galaxy-a17",
      colourId: "black",
      variantId: "128",
      shop: { ...SHOP, basePrice: 600_000 },
    });
    expect(cart().lines).toHaveLength(1);
    expect(cart().lines[0]).toMatchObject({ qty: 2, shop: { basePrice: 600_000 } });
  });

  it("refuses a malformed shop snapshot", () => {
    cart().addItem({
      productId: "galaxy-a17",
      colourId: "black",
      variantId: "128",
      shop: { ...SHOP, basePrice: -1 },
    });
    expect(cart().lines).toEqual([]);
  });

  it("drops tampered shop snapshots when rehydrating", async () => {
    window.localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({
        state: {
          lines: [
            { productId: "galaxy-a17", colourId: "black", variantId: "128", qty: 1, shop: SHOP },
            {
              productId: "galaxy-a17",
              colourId: "blue",
              variantId: "128",
              qty: 1,
              shop: { ...SHOP, basePrice: 1 },
            },
            {
              productId: "galaxy-a17",
              colourId: "gray",
              variantId: "128",
              qty: 1,
              shop: { ...SHOP, slug: "<script>" },
            },
          ],
        },
        version: 1,
      }),
    );
    await useCart.persist.rehydrate();
    expect(cart().lines.map((l) => l.key)).toEqual([
      lineKey("galaxy-a17", "black", "128", SHOP.slug),
    ]);
  });
});

describe("priced lines", () => {
  it("prices from the catalogue and skips lines that no longer exist", () => {
    useCart.setState({
      lines: [
        {
          key: A17_BLACK_256,
          productId: "galaxy-a17",
          colourId: "black",
          variantId: "256",
          qty: 2,
        },
        { key: "gone:black:64", productId: "gone", colourId: "black", variantId: "128", qty: 1 },
        {
          key: "galaxy-a17:black:9",
          productId: "galaxy-a17",
          colourId: "black",
          variantId: "9",
          qty: 1,
        },
        {
          key: "galaxy-a17:gold:128",
          productId: "galaxy-a17",
          colourId: "gold",
          variantId: "128",
          qty: 1,
        },
      ],
    });
    const priced = priceLines(cart().lines);
    expect(priced).toHaveLength(1);
    expect(priced[0]).toMatchObject({
      key: A17_BLACK_256,
      unitPrice: 840_000,
      lineTotal: 1_680_000,
      colour: { label: "Black" },
      variant: { label: "256 GB" },
    });
  });

  it("feeds useCartLines and useCartCount once the saved cart has loaded", () => {
    useCart.setState({
      lines: [
        {
          key: A17_BLACK_128,
          productId: "galaxy-a17",
          colourId: "black",
          variantId: "128",
          qty: 2,
        },
        { key: "gone:black:64", productId: "gone", colourId: "black", variantId: "128", qty: 3 },
      ],
    });
    const { result } = renderHook(() => ({ lines: useCartLines(), count: useCartCount() }));
    expect(result.current.lines.map((l) => l.key)).toEqual([A17_BLACK_128]);
    expect(result.current.count).toBe(2);

    act(() => cart().addItem({ productId: "iphone-17", colourId: "white", variantId: "256" }));
    expect(result.current.count).toBe(3);
  });
});
