import { CORRIDOR, HALF_D, HALF_W, ROOM } from "@/data/store-layout";
import { clampCamera } from "../camera-bounds";

describe("clampCamera", () => {
  it("keeps the camera under the shop's lower ceiling and inside its walls", () => {
    const [x, y, z] = clampCamera(99, 99, -99);
    expect(x).toBeLessThan(HALF_W);
    expect(y).toBeLessThan(ROOM.height);
    expect(z).toBeGreaterThan(-HALF_D);
  });

  it("lets the camera range along the taller arcade corridor", () => {
    const [x, y, z] = clampCamera(10, 3.6, 20);
    expect(x).toBe(10);
    expect(y).toBe(3.6);
    expect(z).toBeLessThan(CORRIDOR.z1);
  });

  it("leaves a camera that is already in a valid spot alone", () => {
    expect(clampCamera(0, 1.6, 1)).toEqual([0, 1.6, 1]);
  });
});
