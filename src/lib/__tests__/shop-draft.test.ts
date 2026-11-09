import { VIRTU_SHOP, getDemoShop } from "@/data/demo-shops";
import { products } from "@/data/products";
import { DEFAULT_THEME } from "@/data/themes";
import { draftFromShop, draftToShop, parsePrice, previewShop, withName } from "../shop-draft";

describe("draftFromShop", () => {
  it("starts a new shop empty, with every phone listed at catalogue price and unticked", () => {
    const d = draftFromShop(null);
    expect(d).toMatchObject({ name: "", slug: "", slugLocked: false, theme: DEFAULT_THEME });
    expect(d.stock.map((s) => s.productId)).toEqual(products.map((p) => p.id));
    expect(d.stock.every((s) => !s.on)).toBe(true);
  });

  it("puts an existing shop's phones first, ticked, with its prices, and locks the link", () => {
    const shop = getDemoShop("kikuubo-phone-hub");
    if (!shop) throw new Error("demo shop missing");
    const d = draftFromShop(shop);
    expect(d.slugLocked).toBe(true);
    expect(d.stock.slice(0, 3)).toEqual(
      shop.stock.map((s) => ({ productId: s.productId, on: true, price: String(s.price) })),
    );
    expect(d.stock).toHaveLength(products.length);
  });
});

describe("withName", () => {
  it("rewrites the link from the name until it is locked", () => {
    const d = withName(draftFromShop(null), "Ntinda Mobile");
    expect(d.slug).toBe("ntinda-mobile");
    expect(withName({ ...d, slugLocked: true }, "Something Else").slug).toBe("ntinda-mobile");
  });
});

describe("parsePrice", () => {
  it.each([
    ["1,450,000", 1_450_000],
    ["1 450 000", 1_450_000],
    ["650000", 650_000],
  ])("%p → %p", (text, n) => expect(parsePrice(text)).toBe(n));

  it.each(["", "1.5m", "-3", "abc"])("%p is not a price", (text) => {
    expect(parsePrice(text)).toBeNaN();
  });
});

describe("draftToShop", () => {
  const filled = () => {
    const d = withName(draftFromShop(null), "Ntinda Mobile");
    return {
      ...d,
      location: "Ntinda",
      stock: d.stock.map((s, i) => (i < 2 ? { ...s, on: true } : s)),
    };
  };

  it("builds a valid shop from a filled form", () => {
    const r = draftToShop(filled(), "uid-1");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.shop.ownerUid).toBe("uid-1");
      expect(r.shop.stock).toHaveLength(2);
    }
  });

  it("reports the first problem per field", () => {
    const r = draftToShop({ ...filled(), name: "", slug: "x", location: "" }, "uid-1");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(Object.keys(r.errors).sort()).toEqual(["location", "name", "slug"]);
    }
  });

  it("rejects a mistyped price", () => {
    const d = filled();
    const stock = d.stock.map((s, i) => (i === 0 ? { ...s, price: "1.2m" } : s));
    const r = draftToShop({ ...d, stock }, "uid-1");
    expect(r.ok === false && r.errors.stock).toBeTruthy();
  });
});

describe("previewShop", () => {
  it("shows something sensible while the form is still empty", () => {
    const p = previewShop(draftFromShop(null));
    expect(p.name).toBe("Your shop");
    expect(p.stock.map((s) => s.productId)).toEqual(VIRTU_SHOP.stock.map((s) => s.productId));
  });

  it("previews only the ticked phones with readable prices", () => {
    const d = draftFromShop(null);
    const stock = d.stock.map((s, i) =>
      i === 0 ? { ...s, on: true } : i === 1 ? { ...s, on: true, price: "oops" } : s,
    );
    expect(previewShop({ ...d, stock }).stock.map((s) => s.productId)).toEqual([
      d.stock[0]?.productId,
    ]);
  });
});
