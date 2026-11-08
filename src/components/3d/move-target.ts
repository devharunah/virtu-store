import type { FloorVec } from "@/lib/steer";

/** Why the last walk ended. Read by e2e through `window.__virtuMove` under ?debug. */
export type MoveEnd = "arrived" | "stuck" | "manual" | "ui";

/**
 * Where a floor click asked the visitor to walk. Written by <FloorPicker>, read and cleared by
 * <Player> every frame. A mutable singleton like `playerState`: per-frame data stays out of React.
 */
export const moveTarget: { point: FloorVec | null; version: number; ended: MoveEnd | null } = {
  point: null,
  /** Bumped on every new click so the player can restart its progress tracking. */
  version: 0,
  ended: null,
};

export function setMoveTarget(point: FloorVec) {
  moveTarget.point = point;
  moveTarget.version += 1;
  moveTarget.ended = null;
}

export function clearMoveTarget(reason: MoveEnd) {
  if (moveTarget.point === null) return;
  moveTarget.point = null;
  moveTarget.ended = reason;
}
