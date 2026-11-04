/** Debug hooks the showroom exposes on `/store?debug` (see src/components/3d/Experience.tsx). */
interface VirtuVec {
  x: number;
  y: number;
  z: number;
}

interface Window {
  __virtuPlayer?: { ready: boolean; position: VirtuVec };
  __virtuUI?: {
    getState: () => { nearSlotId: string | null; inspectingId: string | null };
  };
}
