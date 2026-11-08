/**
 * Click-to-move steering, kept pure so it can be unit tested without three.js.
 *
 * ecctrl v2 turns a joystick vector into movement relative to the camera:
 * `y` pushes along the camera's forward direction flattened onto the floor, and `x` along its
 * right (forward × up). So to walk toward a world point we project the direction to the target
 * onto those two axes.
 */

/** A point or direction on the floor plane (world X and Z). */
export interface FloorVec {
  x: number;
  z: number;
}

export interface Joystick {
  x: number;
  y: number;
}

/** Stop this close to the target (metres). Smaller than the capsule radius so it looks exact. */
export const ARRIVE_RADIUS = 0.25;

/**
 * The joystick input that walks from `pos` toward `target`, given the camera's forward direction
 * on the floor plane. Returns `null` once the player has arrived (or the camera direction is
 * degenerate, e.g. looking straight down).
 */
export function steerToward(
  pos: FloorVec,
  target: FloorVec,
  camForward: FloorVec,
): Joystick | null {
  const dx = target.x - pos.x;
  const dz = target.z - pos.z;
  const dist = Math.hypot(dx, dz);
  if (dist <= ARRIVE_RADIUS) return null;

  const fLen = Math.hypot(camForward.x, camForward.z);
  if (fLen < 1e-6) return null;
  const fx = camForward.x / fLen;
  const fz = camForward.z / fLen;
  // right = forward × up = (-fz, 0, fx)
  const rx = -fz;
  const rz = fx;

  const ux = dx / dist;
  const uz = dz / dist;
  return { x: ux * rx + uz * rz, y: ux * fx + uz * fz };
}

/** Progress bookkeeping so a target behind a counter is abandoned instead of walked into forever. */
export interface Progress {
  /** Closest distance to the target reached so far. */
  best: number;
  /** Seconds since `best` last improved meaningfully. */
  stalled: number;
}

/** Give up after this long without getting at least `MIN_GAIN` closer. */
// Generous on purpose: a slow phone (or software WebGL) takes a while to get the capsule moving.
export const STUCK_AFTER_S = 2;
const MIN_GAIN = 0.03;

export const startProgress = (dist: number): Progress => ({ best: dist, stalled: 0 });

/** Returns the next progress state; it never mutates the one passed in. */
export function trackProgress(prev: Progress, dist: number, dt: number): Progress {
  if (dist < prev.best - MIN_GAIN) return { best: dist, stalled: 0 };
  // One long frame (a tab coming back from the background) must not count as being stuck.
  return { best: prev.best, stalled: prev.stalled + Math.min(dt, 0.1) };
}

export const isStuck = (p: Progress): boolean => p.stalled >= STUCK_AFTER_S;

/** Clamp a clicked point into an axis-aligned floor rectangle, `margin` metres in from its edges. */
export function clampToFloor(
  p: FloorVec,
  box: { minX: number; maxX: number; minZ: number; maxZ: number },
  margin: number,
): FloorVec {
  return {
    x: Math.min(box.maxX - margin, Math.max(box.minX + margin, p.x)),
    z: Math.min(box.maxZ - margin, Math.max(box.minZ + margin, p.z)),
  };
}
