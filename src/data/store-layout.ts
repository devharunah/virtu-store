/**
 * Showroom layout in metres (three.js: Y up, entrance at +Z, back wall at -Z).
 * Everything that physically blocks the player is described here once, so the
 * 3D scene and the physics colliders always agree.
 */

export const ROOM = {
  width: 12, // X: -6 .. 6
  depth: 10, // Z: -5 .. 5
  height: 3.4,
  door: { width: 2.4, height: 2.7 },
  kerb: 0.5, // solid strip under the shop-front glass
} as const;

export const HALF_W = ROOM.width / 2;
export const HALF_D = ROOM.depth / 2;

/** Where the camera (and in Phase 2 the player) starts: just inside the door, facing the hero podium. */
export const SPAWN = {
  position: [0, 1.65, 4.3] as [number, number, number],
  lookAt: [0, 1.1, -2] as [number, number, number],
};

export type Vec3 = [number, number, number];

export interface PhoneSlot {
  productId: string;
  colourIndex: number; // index into product.colours
}

export interface Fixture {
  id: string;
  model: string;
  position: Vec3;
  rotationY?: number;
  /** Box collider in the fixture's local space: half extents and centre. */
  collider: { halfExtents: Vec3; center: Vec3 };
  /** Height of the surface phones stand on, and how far apart they sit (local X). */
  surfaceY?: number;
  spacing?: number;
  phones?: PhoneSlot[];
  spinPhones?: boolean;
  phoneScale?: number;
}

const TABLE = "/models/fixtures/display_table.glb";
const TABLE_COLLIDER = { halfExtents: [0.8, 0.46, 0.4] as Vec3, center: [0, 0.46, 0] as Vec3 };

export const FIXTURES: Fixture[] = [
  {
    id: "table-1",
    model: TABLE,
    position: [-3.3, 0, 0.2],
    collider: TABLE_COLLIDER,
    surfaceY: 0.9,
    spacing: 0.55,
    phones: [
      { productId: "nova-a1", colourIndex: 0 },
      { productId: "nova-a5", colourIndex: 0 },
    ],
  },
  {
    id: "table-2",
    model: TABLE,
    position: [3.3, 0, 0.2],
    collider: TABLE_COLLIDER,
    surfaceY: 0.9,
    spacing: 0.55,
    phones: [
      { productId: "pulse-x", colourIndex: 0 },
      { productId: "pulse-x-pro", colourIndex: 0 },
    ],
  },
  {
    // "Colour bar": every phone in its second colourway
    id: "table-3",
    model: TABLE,
    position: [0, 0, 1.7],
    collider: TABLE_COLLIDER,
    surfaceY: 0.9,
    spacing: 0.3,
    phoneScale: 1.2,
    phones: ["nova-a1", "nova-a5", "pulse-x", "pulse-x-pro", "zenith-ultra"].map((productId) => ({
      productId,
      colourIndex: 1,
    })),
  },
  {
    id: "podium",
    model: "/models/fixtures/podium.glb",
    position: [0, 0, -2.1],
    collider: { halfExtents: [0.3, 0.46, 0.3], center: [0, 0.46, 0] },
    surfaceY: 0.92,
    spacing: 0,
    phoneScale: 2.4,
    spinPhones: true,
    phones: [{ productId: "zenith-ultra", colourIndex: 0 }],
  },
  {
    id: "wall-bay-left",
    model: "/models/environment/wall_bay.glb",
    position: [-3.2, 0, -HALF_D + 0.02],
    collider: { halfExtents: [1.2, 1.15, 0.16], center: [0, 1.15, 0.14] },
  },
  {
    id: "wall-bay-right",
    model: "/models/environment/wall_bay.glb",
    position: [3.2, 0, -HALF_D + 0.02],
    collider: { halfExtents: [1.2, 1.15, 0.16], center: [0, 1.15, 0.14] },
  },
  {
    // Counter faces the middle of the room (customer side toward -X)
    id: "counter",
    model: "/models/environment/counter.glb",
    position: [4.6, 0, -2.6],
    rotationY: -Math.PI / 2,
    collider: { halfExtents: [1.06, 0.5, 0.35], center: [0, 0.5, 0] },
  },
  ...(
    [
      [-5.5, -4.5],
      [5.5, -4.5],
      [-5.4, 4.4],
      [5.4, 4.4],
    ] as const
  ).map(([x, z], i) => ({
    id: `plant-${i + 1}`,
    model: "/models/environment/plant.glb",
    position: [x, 0, z] as Vec3,
    rotationY: i * 1.3,
    collider: { halfExtents: [0.22, 0.5, 0.22] as Vec3, center: [0, 0.5, 0] as Vec3 },
  })),
];

/** Shelf heights (top surface) of wall_bay.glb, used to stack product boxes. */
export const WALL_BAY_SHELVES = [0.12, 0.975, 1.375, 1.775];
export const WALL_BAY_INNER_WIDTH = 2.2;

export const SIGN = {
  model: "/models/environment/sign.glb",
  position: [0, 2.5, -HALF_D + 0.01] as Vec3,
};
