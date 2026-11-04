import { FIXTURES, type Fixture, INTERACT_RADIUS, SPAWN } from "@/data/store-layout";
import { nearestSlot, resolveDisplaySlots, slotLocalX } from "../display-slots";

const fixture = (over: Partial<Fixture>): Fixture => ({
  id: "t",
  model: "/m.glb",
  position: [10, 0, 5],
  collider: { halfExtents: [1, 1, 1], center: [0, 1, 0] },
  surfaceY: 0.9,
  spacing: 0.5,
  phones: [
    { productId: "a", colourIndex: 0 },
    { productId: "b", colourIndex: 1 },
  ],
  ...over,
});

describe("slotLocalX", () => {
  it("centres phones on the fixture", () => {
    expect(slotLocalX(0, 1, 0.5)).toBe(0);
    expect([0, 1, 2].map((i) => slotLocalX(i, 3, 0.5))).toEqual([-0.5, 0, 0.5]);
  });
});

describe("resolveDisplaySlots", () => {
  it("places phones in world space on top of the fixture", () => {
    const [a, b] = resolveDisplaySlots([fixture({})]);
    expect(a).toMatchObject({
      id: "t:0",
      productId: "a",
      colourIndex: 0,
      position: [9.75, 0.9, 5],
    });
    expect(b?.position).toEqual([10.25, 0.9, 5]);
  });

  it("rotates the row of phones with the fixture", () => {
    const [a] = resolveDisplaySlots([fixture({ rotationY: Math.PI / 2 })]);
    expect(a?.position[0]).toBeCloseTo(10);
    expect(a?.position[2]).toBeCloseTo(5.25);
  });

  it("covers every phone in the real store", () => {
    const expected = FIXTURES.reduce((n, f) => n + (f.phones?.length ?? 0), 0);
    expect(resolveDisplaySlots(FIXTURES)).toHaveLength(expected);
  });
});

describe("nearestSlot", () => {
  const slots = resolveDisplaySlots([fixture({})]);

  it("picks the closest phone within range, ignoring height", () => {
    expect(nearestSlot({ x: 10.3, z: 5.4 }, slots, 1)?.id).toBe("t:1");
    expect(nearestSlot({ x: 9.6, z: 5.4 }, slots, 1)?.id).toBe("t:0");
  });

  it("returns null when nothing is in reach", () => {
    expect(nearestSlot({ x: 0, z: 0 }, slots, 1)).toBeNull();
  });

  it("shows no prompt at the spawn point (the visitor walks to a phone first)", () => {
    const [x, , z] = SPAWN.position;
    expect(nearestSlot({ x, z }, resolveDisplaySlots(FIXTURES), INTERACT_RADIUS)).toBeNull();
  });
});
