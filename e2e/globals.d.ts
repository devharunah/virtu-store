/** Debug hooks the showroom exposes on `/store?debug` (see src/components/3d/Experience.tsx). */
interface VirtuVec {
  x: number;
  y: number;
  z: number;
}

interface Window {
  __virtuPlayer?: { ready: boolean; position: VirtuVec };
  /** World point → page pixels, for clicking things in the canvas. */
  __virtuProject?: (x: number, y: number, z: number) => { x: number; y: number };
  /** Where a floor click told the visitor to walk (null once arrived or interrupted). */
  __virtuMove?: {
    point: { x: number; z: number } | null;
    ended: "arrived" | "stuck" | "manual" | "ui" | null;
  };
  __virtuUI?: {
    getState: () => {
      nearSlotId: string | null;
      inspectingId: string | null;
      openInspect: (productId: string, colourId?: string) => void;
    };
  };
}
