import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveDisplaySlots } from "@/lib/display-slots";
import { getProduct, products } from "../products";
import { CORRIDOR, FIXTURES, HALF_D, HALF_W, INTERACT_RADIUS, SPAWN, WALLS } from "../store-layout";

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

describe("kampala shop layout", () => {
  const CAPSULE_CLEARANCE = 0.35; // visitor capsule radius + a little air

  it("ships the baked shop models and lightmap", () => {
    for (const f of ["shop_shell.glb", "shop_glass.glb", "shop_fan.glb", "lightmap.webp"]) {
      expect(existsSync(publicFile(`/models/shop/${f}`))).toBe(true);
    }
  });

  it("places every fixture inside the shop", () => {
    for (const f of FIXTURES) {
      const [x, , z] = f.position;
      expect(Math.abs(x)).toBeLessThan(HALF_W);
      expect(Math.abs(z)).toBeLessThan(HALF_D);
    }
  });

  it("only displays products and colourways that exist, and every product is on show", () => {
    const shown = new Set<string>();
    for (const f of FIXTURES) {
      for (const slot of f.phones ?? []) {
        const p = getProduct(slot.productId);
        expect(p?.colours[slot.colourIndex]).toBeDefined();
        shown.add(slot.productId);
      }
    }
    for (const p of products) expect(shown.has(p.id)).toBe(true);
  });

  it("lets the visitor reach every phone from the floor (within the inspect radius)", () => {
    // The visitor can stand right against a fixture's front face; the slot sits on its centre line.
    const counters = FIXTURES.filter((f) => f.collider);
    for (const slot of resolveDisplaySlots(FIXTURES)) {
      const host = counters.find((c) => {
        const [hx, , hz] = c.collider?.halfExtents ?? [0, 0, 0];
        const r = c.rotationY ?? 0;
        const dx = slot.position[0] - c.position[0];
        const dz = slot.position[2] - c.position[2];
        // world -> fixture-local (inverse of the Y rotation)
        const lx = dx * Math.cos(r) - dz * Math.sin(r);
        const lz = dx * Math.sin(r) + dz * Math.cos(r);
        return Math.abs(lx) <= hx + 0.05 && Math.abs(lz) <= hz + 0.35;
      });
      const reach = (host?.collider?.halfExtents[2] ?? 0.3) + CAPSULE_CLEARANCE;
      expect(reach).toBeLessThan(INTERACT_RADIUS);
    }
  });

  it("spawns the visitor in the corridor, clear of every wall and fixture", () => {
    const [sx, , sz] = SPAWN.position;
    expect(sz).toBeGreaterThan(CORRIDOR.z0);
    expect(sz).toBeLessThan(CORRIDOR.z1);
    for (const w of WALLS) {
      const inside =
        Math.abs(sx - w.center[0]) < w.halfExtents[0] + CAPSULE_CLEARANCE &&
        Math.abs(sz - w.center[2]) < w.halfExtents[2] + CAPSULE_CLEARANCE;
      expect(inside).toBe(false);
    }
    expect(
      resolveDisplaySlots(FIXTURES).every(
        (s) => Math.hypot(s.position[0] - sx, s.position[2] - sz) > INTERACT_RADIUS,
      ),
    ).toBe(true);
  });
});
