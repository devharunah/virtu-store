import * as THREE from "three";

const cache = new Map<string, THREE.CanvasTexture>();

/**
 * An original lock-screen wallpaper drawn at runtime (no download, no real OS UI or logos):
 * a soft gradient in the phone's colour, a clock and the VIRTU wordmark.
 * Cached per colour, so every phone of that colour shares one texture.
 */
export function screenTexture(hex: string): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const hit = cache.get(hex);
  if (hit) return hit;

  const w = 256;
  const h = 540; // roughly a 19.5:9 display
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const base = new THREE.Color(hex);
  const light = base.clone().lerp(new THREE.Color("#ffffff"), 0.45).getStyle();
  const dark = base.clone().lerp(new THREE.Color("#0b0d14"), 0.75).getStyle();

  const g = ctx.createLinearGradient(0, 0, w * 0.4, h);
  g.addColorStop(0, light);
  g.addColorStop(0.55, base.getStyle());
  g.addColorStop(1, dark);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Soft light blobs
  for (const [x, y, r, a] of [
    [0.2, 0.25, 0.55, 0.22],
    [0.85, 0.7, 0.45, 0.16],
  ] as const) {
    const blob = ctx.createRadialGradient(x * w, y * h, 0, x * w, y * h, r * w);
    blob.addColorStop(0, `rgba(255,255,255,${a})`);
    blob.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = blob;
    ctx.fillRect(0, 0, w, h);
  }

  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.textAlign = "center";
  ctx.font = "600 64px system-ui, sans-serif";
  ctx.fillText("09:41", w / 2, h * 0.24);
  ctx.font = "500 15px system-ui, sans-serif";
  ctx.fillText("Saturday, Kampala", w / 2, h * 0.24 + 28);
  ctx.font = "700 13px system-ui, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.fillText("V I R T U", w / 2, h * 0.93);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.flipY = false; // glTF UV convention: v = 0 is the top of the image
  tex.anisotropy = 4;
  cache.set(hex, tex);
  return tex;
}
