import { resolveDisplaySlots } from "@/lib/display-slots";
import { shopBasePrice, shopFromPrice, shopUnitPrice } from "@/lib/shop-pricing";
import { parseShop } from "@/lib/shop-schema";
import { DEMO_SHOPS, VIRTU_SHOP, getDemoShop } from "../demo-shops";
import { getProduct, products } from "../products";
import { FIXTURES, buildFixtures } from "../store-layout";
import { DEFAULT_THEME, THEMES, presetFor } from "../themes";

const shownIds = (fixtures: ReturnType<typeof buildFixtures>) =>
  new Set(fixtures.flatMap((f) => (f.phones ?? []).map((p) => p.productId)));

describe("themes", () => {
  it("has unique ids and #RRGGBB colours", () => {
    expect(new Set(THEMES.map((t) => t.id)).size).toBe(THEMES.length);
    for (const t of THEMES) {
      for (const c of [t.wall, t.accent, t.floor]) expect(c).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("starts from the shop as baked (Kampala Teal)", () => {
    expect(presetFor(DEFAULT_THEME)?.id).toBe("kampala-teal");
  });
});

describe("demo shops", () => {
  it.each(DEMO_SHOPS.map((s) => [s.slug, s] as const))("%s passes the shop schema", (_slug, s) => {
    expect(parseShop(s).success).toBe(true);
  });

  it("has unique slugs and the VIRTU showroom first", () => {
    expect(new Set(DEMO_SHOPS.map((s) => s.slug)).size).toBe(DEMO_SHOPS.length);
    expect(DEMO_SHOPS[0]).toBe(VIRTU_SHOP);
    expect(getDemoShop("wandegeya-iworld")?.name).toBe("Wandegeya iWorld");
    expect(getDemoShop("nope")).toBeUndefined();
  });

  it("sells every phone at catalogue price in the VIRTU showroom", () => {
    for (const p of products) expect(shopBasePrice(VIRTU_SHOP, p.id)).toBe(p.basePrice);
  });
});

describe("shop pricing", () => {
  const kikuubo = getDemoShop("kikuubo-phone-hub");
  const a17 = getProduct("galaxy-a17");
  if (!kikuubo || !a17) throw new Error("fixtures missing");

  it("adds the catalogue's storage step to the shop's own base price", () => {
    expect(shopUnitPrice(kikuubo, a17, "128")).toBe(650_000);
    expect(shopUnitPrice(kikuubo, a17, "256")).toBe(650_000 + 120_000);
  });

  it("is undefined for an unknown variant or a phone the shop doesn't sell", () => {
    expect(shopUnitPrice(kikuubo, a17, "1024")).toBeUndefined();
    const iphone = getProduct("iphone-17");
    if (!iphone) throw new Error("fixture missing");
    expect(shopUnitPrice(kikuubo, iphone, "256")).toBeUndefined();
  });

  it("quotes the cheapest phone as the shop's from-price", () => {
    expect(shopFromPrice(kikuubo)).toBe(650_000);
  });
});

describe("buildFixtures", () => {
  it("gives the full catalogue the hand-curated layout", () => {
    expect(buildFixtures(products.map((p) => p.id))).toBe(FIXTURES);
  });

  it.each(DEMO_SHOPS.map((s) => [s.slug, s] as const))(
    "%s: shows every phone it sells and nothing else, in real colourways",
    (_slug, shop) => {
      const ids = shop.stock.map((s) => s.productId);
      const fixtures = buildFixtures(ids);
      expect([...shownIds(fixtures)].sort()).toEqual([...ids].sort());
      for (const f of fixtures) {
        for (const slot of f.phones ?? []) {
          expect(getProduct(slot.productId)?.colours[slot.colourIndex]).toBeDefined();
        }
      }
    },
  );

  it("puts the first phone on the turning hero stand", () => {
    const hero = buildFixtures(["galaxy-a56"]).find((f) => f.id === "hero-stand");
    expect(hero?.phones).toEqual([{ productId: "galaxy-a56", colourIndex: 0 }]);
  });

  it("keeps every counter slot where the curated layout has it", () => {
    const custom = resolveDisplaySlots(buildFixtures(["iphone-17"]));
    const curated = resolveDisplaySlots(FIXTURES);
    expect(custom.map((s) => s.position)).toEqual(curated.map((s) => s.position));
  });

  it("does not mutate the curated fixtures", () => {
    const before = JSON.stringify(FIXTURES);
    buildFixtures(["iphone-17", "galaxy-a17"]);
    expect(JSON.stringify(FIXTURES)).toBe(before);
  });
});
