import type { Fixture, Vec3 } from "@/data/store-layout";

/** A phone standing on a fixture, resolved to world space. */
export interface DisplaySlot {
  id: string; // `${fixtureId}:${index}`
  fixtureId: string;
  productId: string;
  colourIndex: number;
  /** Position of the phone's base in world space (metres). */
  position: Vec3;
}

/** Local X offset of the i-th of n phones spaced evenly and centred on the fixture. */
export function slotLocalX(index: number, count: number, spacing: number): number {
  return (index - (count - 1) / 2) * spacing;
}

/** Resolve every phone slot of every fixture to world space (fixture rotation is about Y only). */
export function resolveDisplaySlots(fixtures: readonly Fixture[]): DisplaySlot[] {
  const out: DisplaySlot[] = [];
  for (const f of fixtures) {
    const phones = f.phones ?? [];
    const rot = f.rotationY ?? 0;
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    phones.forEach((slot, i) => {
      const lx = slotLocalX(i, phones.length, f.spacing ?? 0.4);
      // Rotate (lx, 0) about Y: x' = x cos, z' = -x sin
      out.push({
        id: `${f.id}:${i}`,
        fixtureId: f.id,
        productId: slot.productId,
        colourIndex: slot.colourIndex,
        position: [
          f.position[0] + lx * cos,
          f.position[1] + (f.surfaceY ?? 0),
          f.position[2] - lx * sin,
        ],
      });
    });
  }
  return out;
}

/**
 * The display slot closest to a point on the floor plane, if it is within `maxDistance`.
 * Height is ignored: what matters is how close the visitor stands to the table.
 */
export function nearestSlot(
  point: { x: number; z: number },
  slots: readonly DisplaySlot[],
  maxDistance: number,
): DisplaySlot | null {
  let best: DisplaySlot | null = null;
  let bestD = maxDistance;
  for (const s of slots) {
    const d = Math.hypot(s.position[0] - point.x, s.position[2] - point.z);
    if (d <= bestD) {
      best = s;
      bestD = d;
    }
  }
  return best;
}
