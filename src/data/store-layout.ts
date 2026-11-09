/**
 * The Kampala arcade shop, in metres (three.js: Y up, the shop opens onto the corridor at +Z).
 * Geometry numbers live in `shop-layout.json`, which blender/shop.py reads too, so the baked
 * 3D model, the physics colliders and the phone slots can never drift apart.
 */
import { getProduct, products } from "./products";
import shop from "./shop-layout.json";

export type Vec3 = [number, number, number];

export const SHOP = shop;
export const HALF_W = shop.shop.width / 2;
export const HALF_D = shop.shop.depth / 2;
export const ROOM = {
  width: shop.shop.width,
  depth: shop.shop.depth,
  height: shop.shop.height,
} as const;
export const CORRIDOR = {
  z0: HALF_D,
  z1: HALF_D + shop.corridor.depth,
  halfLength: shop.corridor.halfLength,
  height: shop.corridor.height,
} as const;

/** Where the visitor's feet start: in the arcade corridor, facing the shop (toward -Z). */
export const SPAWN = {
  position: shop.spawn as Vec3,
  lookAt: [0, 1.1, -2] as Vec3,
};

/** How close (metres, on the floor plane) the visitor must stand to a phone to inspect it. */
export const INTERACT_RADIUS = 1.5;

export interface PhoneSlot {
  productId: string;
  colourIndex: number; // index into product.colours
  /** Position along the fixture (local X). Defaults to even spacing. */
  x?: number;
}

export interface Fixture {
  id: string;
  /** A separate GLB to draw. Fixtures built into shop_shell.glb have none. */
  model?: string;
  position: Vec3;
  rotationY?: number;
  /** Box collider in the fixture's local space: half extents and centre. */
  collider?: { halfExtents: Vec3; center: Vec3 };
  /** Height of the surface phones rest on, and how far apart they sit (local X). */
  surfaceY?: number;
  spacing?: number;
  phones?: PhoneSlot[];
  /** "flat" = lying face-up inside a glass counter; "upright" = standing, as on a stand. */
  pose?: "upright" | "flat";
  spinPhones?: boolean;
  phoneScale?: number;
}

/** Top of the velvet deck inside the glass counters (blender/shop.py: deck 0.55 + 0.03). */
export const COUNTER_DECK = 0.58;

const counter = (id: string) => {
  const c = shop.counters.find((k) => k.id === id);
  if (!c) throw new Error(`shop-layout.json has no counter "${id}"`);
  return c;
};

const counterFixture = (id: string, phones: PhoneSlot[], spacing: number): Fixture => {
  const c = counter(id);
  return {
    id,
    position: [c.x, 0, c.z],
    rotationY: c.rotY,
    collider: {
      halfExtents: [c.length / 2, c.height / 2, c.depth / 2],
      center: [0, c.height / 2, 0],
    },
    surfaceY: COUNTER_DECK,
    spacing,
    pose: "flat",
    phoneScale: 1.6,
    phones,
  };
};

const back = counter("counter-back");
const k = shop.kiosk;

export const FIXTURES: Fixture[] = [
  counterFixture(
    "counter-left",
    [
      { productId: "galaxy-a17", colourIndex: 0 },
      { productId: "galaxy-a56", colourIndex: 0 },
      { productId: "galaxy-a17", colourIndex: 1 },
      { productId: "galaxy-a56", colourIndex: 1 },
      { productId: "galaxy-a56", colourIndex: 3 },
    ],
    0.68,
  ),
  counterFixture(
    "counter-back",
    [
      { productId: "iphone-17", colourIndex: 0, x: -2.05 },
      { productId: "iphone-17", colourIndex: 3, x: -1.35 },
      { productId: "galaxy-s25-ultra", colourIndex: 0, x: 1.35 },
      { productId: "galaxy-s25-ultra", colourIndex: 1, x: 2.05 },
    ],
    0.7,
  ),
  counterFixture(
    "counter-right",
    [
      { productId: "iphone-17-pro-max", colourIndex: 1 },
      { productId: "iphone-17-pro-max", colourIndex: 2 },
      { productId: "iphone-17", colourIndex: 2 },
    ],
    0.7,
  ),
  {
    // The hero: iPhone 17 Pro Max turning slowly on the lit stand on the back counter
    id: "hero-stand",
    position: [shop.heroStand.x, 0, shop.heroStand.z],
    surfaceY: back.height + shop.heroStand.height,
    spacing: 0,
    pose: "upright",
    phoneScale: 1.8,
    spinPhones: true,
    phones: [{ productId: "iphone-17-pro-max", colourIndex: 0 }],
  },
  {
    id: k.id,
    position: [k.x, 0, k.z],
    rotationY: k.rotY,
    collider: {
      halfExtents: [k.width / 2 + 0.03, k.height / 2, k.depth / 2 + 0.04],
      center: [0, k.height / 2, 0],
    },
  },
  ...shop.chairs.map(
    (c, i): Fixture => ({
      id: `chair-${i + 1}`,
      position: [c.x, 0, c.z],
      rotationY: c.rotY,
      collider: { halfExtents: [0.27, 0.45, 0.25], center: [0, 0.45, 0] },
    }),
  ),
];

/** The order `FIXTURES` was curated for: the full catalogue. */
const CURATED_ORDER = products.map((p) => p.id).join(",");

/** Display slots in the order they get filled for a custom shop: back counter first (seen first). */
const FILL_ORDER = ["counter-back", "counter-left", "counter-right"] as const;

/**
 * The shop's fixtures for a seller's stock. The full catalogue in catalogue order gets the
 * hand-curated `FIXTURES`. Any other stock keeps every counter and slot position, puts the first
 * phone on the turning hero stand, and fills the counters round-robin, cycling colourways so
 * repeats look different.
 */
export function buildFixtures(
  productIds: readonly string[],
  /** How many colourways a phone has (seller-added phones aren't in the catalogue). */
  colourCount: (id: string) => number = (id) => getProduct(id)?.colours.length ?? 1,
): Fixture[] {
  if (productIds.length === 0 || productIds.join(",") === CURATED_ORDER) return FIXTURES;

  let n = 0;
  const next = (): PhoneSlot => {
    const id = productIds[n % productIds.length] ?? productIds[0] ?? "";
    const colours = Math.max(1, colourCount(id));
    const slot = { productId: id, colourIndex: Math.floor(n / productIds.length) % colours };
    n += 1;
    return slot;
  };

  const filled = new Map<string, PhoneSlot[]>();
  for (const id of FILL_ORDER) {
    const template = FIXTURES.find((f) => f.id === id)?.phones ?? [];
    filled.set(
      id,
      template.map((t) => ({ ...next(), ...(t.x === undefined ? {} : { x: t.x }) })),
    );
  }

  return FIXTURES.map((f) => {
    if (f.id === "hero-stand") {
      return { ...f, phones: [{ productId: productIds[0] ?? "", colourIndex: 0 }] };
    }
    const phones = filled.get(f.id);
    return phones ? { ...f, phones } : f;
  });
}

/** A static box the visitor cannot walk through (world space: centre + half extents). */
export interface WallBox {
  center: Vec3;
  halfExtents: Vec3;
}

const T = 0.1; // half thickness of an invisible wall
const pillar = shop.front.pillar;
const nearHalf = (CORRIDOR.halfLength - HALF_W) / 2;

export const WALLS: WallBox[] = [
  // the shop's back and side walls
  { center: [0, ROOM.height / 2, -HALF_D - T], halfExtents: [HALF_W, ROOM.height / 2, T] },
  { center: [-HALF_W - T, ROOM.height / 2, 0], halfExtents: [T, ROOM.height / 2, HALF_D] },
  { center: [HALF_W + T, ROOM.height / 2, 0], halfExtents: [T, ROOM.height / 2, HALF_D] },
  // pillars either side of the shop opening
  ...[-1, 1].map(
    (s): WallBox => ({
      center: [s * (HALF_W - pillar / 2), CORRIDOR.height / 2, HALF_D - 0.05],
      halfExtents: [pillar / 2, CORRIDOR.height / 2, 0.05],
    }),
  ),
  // corridor: the neighbours' fronts on our side, the opposite side, and both ends
  ...[-1, 1].map(
    (s): WallBox => ({
      center: [s * (HALF_W + nearHalf), CORRIDOR.height / 2, HALF_D - T],
      halfExtents: [nearHalf, CORRIDOR.height / 2, T],
    }),
  ),
  {
    center: [0, CORRIDOR.height / 2, CORRIDOR.z1 + T],
    halfExtents: [CORRIDOR.halfLength, CORRIDOR.height / 2, T],
  },
  ...[-1, 1].map(
    (s): WallBox => ({
      center: [s * (CORRIDOR.halfLength + T), CORRIDOR.height / 2, (CORRIDOR.z0 + CORRIDOR.z1) / 2],
      halfExtents: [T, CORRIDOR.height / 2, shop.corridor.depth / 2],
    }),
  ),
];

/** The walkable floor: shop + corridor. */
export const FLOOR_BOX: WallBox = {
  center: [0, -0.1, (CORRIDOR.z1 - HALF_D) / 2],
  halfExtents: [CORRIDOR.halfLength, 0.1, (CORRIDOR.z1 + HALF_D) / 2],
};

/** Phone boxes stacked on the back-wall shelves (instanced in the app). */
export const SHELF_STOCK = {
  levels: shop.backShelves.levels,
  width: shop.backShelves.width,
  z: -HALF_D + shop.backShelves.depth / 2,
  perShelf: 22,
};

/** Accessory packs hanging on the pegboard (right wall, facing -X). */
export const PEGBOARD = {
  x: HALF_W - 0.04,
  z: shop.pegboard.z,
  width: shop.pegboard.width,
  bottom: shop.pegboard.bottom,
  top: shop.pegboard.top,
};
