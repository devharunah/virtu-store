import {
  ARRIVE_RADIUS,
  STUCK_AFTER_S,
  clampToFloor,
  isStuck,
  startProgress,
  steerToward,
  trackProgress,
} from "../steer";

const close = (a: number, b: number) => expect(a).toBeCloseTo(b, 6);

describe("steerToward", () => {
  // The default view: camera behind the player looking into the shop (-Z).
  const intoShop = { x: 0, z: -1 };

  it("pushes the stick straight up when the target is straight ahead of the camera", () => {
    const j = steerToward({ x: 0, z: 4 }, { x: 0, z: 0 }, intoShop);
    if (!j) throw new Error("expected a joystick vector");
    close(j.x, 0);
    close(j.y, 1);
  });

  it("pushes right for a target on the camera's right", () => {
    // Looking toward -Z, the camera's right is +X.
    const j = steerToward({ x: 0, z: 0 }, { x: 3, z: 0 }, intoShop);
    if (!j) throw new Error("expected a joystick vector");
    close(j.x, 1);
    close(j.y, 0);
  });

  it("pulls back for a target behind the camera", () => {
    const j = steerToward({ x: 0, z: 0 }, { x: 0, z: 2 }, intoShop);
    if (!j) throw new Error("expected a joystick vector");
    close(j.x, 0);
    close(j.y, -1);
  });

  it("follows the camera when it is turned", () => {
    // Camera looking toward +X: its right is +Z, so a target at +Z is "right".
    const j = steerToward({ x: 0, z: 0 }, { x: 0, z: 5 }, { x: 2, z: 0 });
    if (!j) throw new Error("expected a joystick vector");
    close(j.x, 1);
    close(j.y, 0);
  });

  it("returns a unit vector for diagonal targets", () => {
    const j = steerToward({ x: 1, z: 1 }, { x: 4, z: -3 }, { x: 0.3, z: -0.8 });
    if (!j) throw new Error("expected a joystick vector");
    close(Math.hypot(j.x, j.y), 1);
  });

  it("stops inside the arrival radius", () => {
    expect(steerToward({ x: 0, z: 0 }, { x: ARRIVE_RADIUS * 0.9, z: 0 }, intoShop)).toBeNull();
  });

  it("gives up on a degenerate camera direction", () => {
    expect(steerToward({ x: 0, z: 0 }, { x: 3, z: 0 }, { x: 0, z: 0 })).toBeNull();
  });
});

describe("progress tracking", () => {
  it("resets the stall timer whenever the player gets meaningfully closer", () => {
    const p = trackProgress({ best: 3, stalled: 0.5 }, 2.5, 0.1);
    expect(p).toEqual({ best: 2.5, stalled: 0 });
  });

  it("accumulates stall time when the player is blocked", () => {
    let p = startProgress(3);
    for (let i = 0; i < 25; i++) p = trackProgress(p, 2.99, 0.1);
    expect(p.best).toBe(3);
    expect(isStuck(p)).toBe(true);
  });

  it("counts a single long frame as at most 0.1 s of stalling", () => {
    expect(trackProgress(startProgress(3), 3, 5).stalled).toBeCloseTo(0.1);
  });

  it("is not stuck before the threshold", () => {
    expect(isStuck({ best: 1, stalled: STUCK_AFTER_S - 0.01 })).toBe(false);
  });

  it("does not mutate the previous state", () => {
    const prev = startProgress(2);
    trackProgress(prev, 2, 0.5);
    expect(prev).toEqual({ best: 2, stalled: 0 });
  });
});

describe("clampToFloor", () => {
  const box = { minX: -4, maxX: 4, minZ: -3, maxZ: 7 };

  it("keeps a point that is already inside", () => {
    expect(clampToFloor({ x: 1, z: 2 }, box, 0.3)).toEqual({ x: 1, z: 2 });
  });

  it("pulls an outside point in by the margin", () => {
    expect(clampToFloor({ x: 9, z: -9 }, box, 0.3)).toEqual({ x: 3.7, z: -2.7 });
  });
});
