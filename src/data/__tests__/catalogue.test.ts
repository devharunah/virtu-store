import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getProduct, products } from "../products";
import { FIXTURES, HALF_D, HALF_W, ROOM, SPAWN } from "../store-layout";

const publicFile = (url: string) => join(process.cwd(), "public", url);

describe("product catalogue", () => {
  it("has unique ids", () => {
    const ids = products.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(products.map((p) => [p.id, p] as const))("%s has a model file on disk", (_id, p) => {
    expect(existsSync(publicFile(p.modelUrl))).toBe(true);
  });

  it.each(products.map((p) => [p.id, p] as const))(
    "%s has valid colours and variants",
    (_id, p) => {
      expect(p.colours.length).toBeGreaterThan(0);
      for (const c of p.colours) expect(c.hex).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(p.variants[0]?.priceDelta).toBe(0); // the base price is the first variant
      expect(Number.isInteger(p.basePrice)).toBe(true);
    },
  );

  it("finds products by id", () => {
    expect(getProduct("iphone-17-pro-max")?.name).toBe("iPhone 17 Pro Max");
    expect(getProduct("nope")).toBeUndefined();
  });
});

describe("phone models", () => {
  const manifest = JSON.parse(readFileSync(publicFile("/models/manifest.json"), "utf8")) as {
    phones: { id: string; file: string; materials: string[] }[];
  };

  it("has a model entry for every product", () => {
    for (const p of products) {
      expect(manifest.phones.find((m) => m.id === p.id)?.file).toBe(p.modelUrl);
    }
  });

  it.each(manifest.phones.map((m) => [m.id, m] as const))(
    "%s keeps the material contract (Body recolour, Screen wallpaper, brand Logo)",
    (_id, m) => {
      expect(m.materials).toEqual(expect.arrayContaining(["Body", "Screen", "Logo"]));
    },
  );

  it("sells only Apple and Samsung phones, with the brand in the name", () => {
    for (const p of products) {
      expect(["Apple", "Samsung"]).toContain(p.brand);
      expect(p.name).toMatch(p.brand === "Apple" ? /^iPhone/ : /^Galaxy/);
    }
  });
});

describe("store layout", () => {
  it("places every fixture inside the room", () => {
    for (const f of FIXTURES) {
      const [x, , z] = f.position;
      expect(Math.abs(x)).toBeLessThan(HALF_W);
      expect(Math.abs(z)).toBeLessThanOrEqual(HALF_D);
    }
  });

  it("points every fixture at a model that exists", () => {
    for (const f of FIXTURES) expect(existsSync(publicFile(f.model))).toBe(true);
  });

  it("only displays products and colourways that exist", () => {
    for (const f of FIXTURES) {
      for (const slot of f.phones ?? []) {
        const p = getProduct(slot.productId);
        expect(p).toBeDefined();
        expect(p?.colours[slot.colourIndex]).toBeDefined();
      }
    }
  });

  it("puts every product on display somewhere", () => {
    const shown = new Set(FIXTURES.flatMap((f) => (f.phones ?? []).map((s) => s.productId)));
    for (const p of products) expect(shown.has(p.id)).toBe(true);
  });

  it("spawns the visitor inside the room, clear of every fixture", () => {
    const [sx, sy, sz] = SPAWN.position;
    expect(Math.abs(sx)).toBeLessThan(HALF_W);
    expect(Math.abs(sz)).toBeLessThan(HALF_D);
    expect(sy).toBeLessThan(ROOM.height);
    for (const f of FIXTURES) {
      const [hx, , hz] = f.collider.halfExtents;
      const r = Math.max(hx, hz);
      const dist = Math.hypot(sx - f.position[0], sz - f.position[2]);
      expect(dist).toBeGreaterThan(r);
    }
  });
});
