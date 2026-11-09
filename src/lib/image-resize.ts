/**
 * Shrinks a photo in the browser before upload, so a 12 MP phone photo goes up as a few hundred
 * KB on mobile data. Browser-only (uses canvas).
 */

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_INPUT_BYTES = 8 * 1024 * 1024;
const MAX_SIDE = 1600;

export class ImageInputError extends Error {
  override name = "ImageInputError";
}

export function checkImageFile(file: File): void {
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    throw new ImageInputError("Use a JPG, PNG or WebP image.");
  }
  if (file.size > MAX_INPUT_BYTES) throw new ImageInputError("That image is over 8 MB.");
}

export async function shrinkImage(file: File): Promise<Blob> {
  checkImageFile(file);
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (ctx === null) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.82),
  );
  return blob !== null && blob.size < file.size ? blob : file;
}
