import { CORRIDOR, HALF_D, HALF_W, ROOM } from "@/data/store-layout";

const MARGIN = 0.3;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Keep the follow camera inside walkable space: the shop (lower ceiling, narrow) or the arcade
 * corridor (taller, long). Which one depends on which side of the shop front the camera is on.
 */
export function clampCamera(x: number, y: number, z: number): [number, number, number] {
  if (z > HALF_D + 0.15) {
    return [
      clamp(x, -CORRIDOR.halfLength + MARGIN, CORRIDOR.halfLength - MARGIN),
      clamp(y, 0.5, CORRIDOR.height - 0.3),
      clamp(z, HALF_D + 0.15, CORRIDOR.z1 - MARGIN),
    ];
  }
  return [
    clamp(x, -HALF_W + MARGIN, HALF_W - MARGIN),
    clamp(y, 0.5, ROOM.height - 0.2),
    clamp(z, -HALF_D + MARGIN, HALF_D + 0.15),
  ];
}
