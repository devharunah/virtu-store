import { VIRTU_SHOP, getDemoShop } from "@/data/demo-shops";
import { products } from "@/data/products";
import { DEFAULT_THEME } from "@/data/themes";
import {
  draftFromShop,
  draftToShop,
  newCustomPhone,
  parsePrice,
  previewShop,
  withName,
} from "../shop-draft";

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
      shop.stock.map((s) => ({
        productId: s.productId,
        on: true,
        price: String(s.price),
        photos: [],
      })),
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

describe("seller's own phones", () => {
  const PHOTO = "https://res.cloudinary.com/virtu/image/upload/v1/virtu/shops/u1/p.webp";
  const withPhone = () => {
    const base = withName({ ...draftFromShop(null), location: "Kisekka" }, "Pioneer Mall Shop");
    const phone = newCustomPhone([]);
    if (!phone) throw new Error("no phone");
    return {
      ...base,
      customPhones: [
        {
          ...phone,
          brand: "Tecno",
          name: "Spark 30",
          price: "550,000",
          storage: [
            { label: "128 GB", priceDelta: "0" },
            { label: "256 GB", priceDelta: "80,000" },
          ],
          photos: [PHOTO],
        },
      ],
    };
  };

  it("hands out the first free id and stops at the limit", () => {
    expect(newCustomPhone([])?.id).toBe("c1");
    const one = newCustomPhone([]);
    if (!one) throw new Error("no phone");
    expect(newCustomPhone([one])?.id).toBe("c2");
    const four = ["c1", "c2", "c3", "c4"].map((id) => ({ ...one, id }));
    expect(newCustomPhone(four)).toBeNull();
  });

  it("opens a shop that sells only the seller's own phone", () => {
    const result = draftToShop(withPhone(), "u1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.shop.stock).toEqual([]);
    expect(result.shop.customPhones?.[0]).toMatchObject({
      id: "c1",
      brand: "Tecno",
      name: "Spark 30",
      price: 550_000,
      storage: [
        { label: "128 GB", priceDelta: 0 },
        { label: "256 GB", priceDelta: 80_000 },
      ],
      photos: [PHOTO],
    });
  });

  it("names the phone a problem is on", () => {
    const d = withPhone();
    const bad = { ...d, customPhones: d.customPhones.map((p) => ({ ...p, price: "5" })) };
    const result = draftToShop(bad, "u1");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.customPhones).toMatch(/^Spark 30: At least UGX 50,000/);
  });

  it("round-trips through draftFromShop", () => {
    const result = draftToShop(withPhone(), "u1");
    if (!result.ok) throw new Error("invalid");
    const again = draftToShop(draftFromShop(result.shop), "u1");
    expect(again).toEqual(result);
  });

  it("previews only complete phones, and no catalogue filler when one is complete", () => {
    const preview = previewShop(withPhone());
    expect(preview.stock).toEqual([]);
    expect(preview.customPhones).toHaveLength(1);
    const half = withPhone();
    const incomplete = {
      ...half,
      customPhones: half.customPhones.map((p) => ({ ...p, name: "" })),
    };
    expect(previewShop(incomplete).customPhones).toBeUndefined();
    expect(previewShop(incomplete).stock).toHaveLength(products.length);
  });
});
