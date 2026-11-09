import { readFileSync } from "node:fs";
import { join } from "node:path";
import { products } from "@/data/products";
import { CLOUDINARY_URL_PATTERN } from "../image-url";
import { MAX_PRICE, MIN_PRICE, type ShopConfig, parseShop, slugify } from "../shop-schema";

const valid: ShopConfig = {
  slug: "kikuubo-phone-hub",
  name: "Kikuubo Phone Hub",
  location: "Kikuubo",
  ownerUid: "uid-1",
  theme: { wall: "#F6E7D6", accent: "#E2621B", floor: "#E3D5C4" },
  stock: [
    { productId: "galaxy-a17", price: 650_000 },
    { productId: "iphone-17", price: 3_900_000 },
  ],
};

const firstIssue = (data: unknown) => {
  const r = parseShop(data);
  return r.success
    ? null
    : { path: r.error.issues[0]?.path[0], message: r.error.issues[0]?.message };
};

describe("shop schema", () => {
  it("accepts a well-formed shop", () => {
    expect(parseShop(valid).success).toBe(true);
  });

  it("trims the name and location", () => {
    const r = parseShop({ ...valid, name: "  Hub  ", location: " Kikuubo " });
    expect(r.success && [r.data.name, r.data.location]).toEqual(["Hub", "Kikuubo"]);
  });

  it("drops fields it doesn't know (Firestore timestamps, anything injected)", () => {
    const r = parseShop({ ...valid, createdAt: 1, isAdmin: true });
    expect(r.success && Object.keys(r.data).sort()).toEqual([
      "location",
      "name",
      "ownerUid",
      "slug",
      "stock",
      "theme",
    ]);
  });

  it.each([
    ["AB", "too short and uppercase"],
    ["-hub", "a leading dash"],
    ["hub-", "a trailing dash"],
    ["my hub", "a space"],
    ["a".repeat(33), "too long"],
  ])("rejects the slug %p (%s)", (slug) => {
    expect(firstIssue({ ...valid, slug })?.path).toBe("slug");
  });

  it("rejects a phone that isn't in the catalogue", () => {
    const issue = firstIssue({ ...valid, stock: [{ productId: "nokia-3310", price: 100_000 }] });
    expect(issue?.path).toBe("stock");
  });

  it.each([
    [MIN_PRICE - 1, "below the minimum"],
    [MAX_PRICE + 1, "above the maximum"],
    [650_000.5, "not whole shillings"],
    [Number.NaN, "not a number"],
  ])("rejects the price %p (%s)", (price) => {
    expect(firstIssue({ ...valid, stock: [{ productId: "galaxy-a17", price }] })?.path).toBe(
      "stock",
    );
  });

  it("rejects the same phone twice", () => {
    const issue = firstIssue({
      ...valid,
      stock: [
        { productId: "galaxy-a17", price: 650_000 },
        { productId: "galaxy-a17", price: 700_000 },
      ],
    });
    expect(issue).toEqual({ path: "stock", message: "Each phone once" });
  });

  it("needs at least one phone", () => {
    expect(firstIssue({ ...valid, stock: [] })?.path).toBe("stock");
  });

  it("rejects colours that aren't #RRGGBB", () => {
    expect(firstIssue({ ...valid, theme: { ...valid.theme, wall: "red" } })?.path).toBe("theme");
  });
});

describe("slugify", () => {
  it.each([
    ["Kikuubo Phone Hub!", "kikuubo-phone-hub"],
    ["  Café Mobile  ", "cafe-mobile"],
    ["iPhone & Galaxy -- Store", "iphone-galaxy-store"],
    ["A".repeat(50), "a".repeat(32)],
  ])("%p → %p", (name, slug) => {
    expect(slugify(name)).toBe(slug);
  });
});

const IMAGE_URL_SAMPLES = [
  "https://res.cloudinary.com/virtu/image/upload/v1731000000/virtu/shops/abc_123.webp",
  "https://res.cloudinary.com/demo/image/upload/w_800,c_fill/sample.jpg",
  "http://res.cloudinary.com/virtu/image/upload/x.jpg",
  "https://res.cloudinary.com.evil.io/virtu/image/upload/x.jpg",
  "https://res.cloudinary.com/virtu/video/upload/x.mp4",
  "https://res.cloudinary.com/virtu/image/upload/x.jpg?track=1",
  "https://evil.example/x.png",
  "javascript:alert(1)",
];

describe("bannerUrl", () => {
  const base = {
    slug: "banner-shop",
    name: "Banner Shop",
    location: "Kampala",
    ownerUid: "u1",
    theme: { wall: "#EFE9DA", accent: "#0F6E74", floor: "#D8D1C3" },
    stock: [{ productId: "galaxy-a17", price: 700_000 }],
  };

  it("is optional", () => {
    expect(parseShop(base).success).toBe(true);
  });

  it("accepts a Cloudinary image", () => {
    expect(parseShop({ ...base, bannerUrl: IMAGE_URL_SAMPLES[0] }).success).toBe(true);
  });

  it.each(IMAGE_URL_SAMPLES.slice(2))("refuses %p", (bannerUrl) => {
    expect(parseShop({ ...base, bannerUrl }).success).toBe(false);
  });
});

describe("firestore.rules", () => {
  const rules = readFileSync(join(process.cwd(), "firestore.rules"), "utf8");

  it("allows exactly the catalogue's phones", () => {
    const list = /PRODUCT_IDS\s*\n\s*&& i\.productId in \[([^\]]+)\]/.exec(rules)?.[1] ?? "";
    const ids = [...list.matchAll(/'([^']+)'/g)].map((m) => m[1]).sort();
    expect(ids).toEqual(products.map((p) => p.id).sort());
  });

  it("uses the same price range as the schema", () => {
    expect(rules).toContain(`i.price >= ${MIN_PRICE}`);
    expect(rules).toContain(`i.price <= ${MAX_PRICE}`);
  });

  it("accepts the same image URLs as src/lib/image-url.ts", () => {
    const source = /IMAGE_URL\s*\n\s*&& v\.matches\('([^']+)'\)/.exec(rules)?.[1];
    expect(source).toBeDefined();
    const rulesPattern = new RegExp(source ?? "^$");
    for (const url of IMAGE_URL_SAMPLES) {
      expect([url, rulesPattern.test(url)]).toEqual([url, CLOUDINARY_URL_PATTERN.test(url)]);
    }
  });
});
