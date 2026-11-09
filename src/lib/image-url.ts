/**
 * Seller images live on Cloudinary. Only URLs from Cloudinary's image delivery host are stored,
 * so a shop can't point shoppers' browsers (or the 3D scene's texture loader) at any other site.
 * `firestore.rules` enforces the same pattern.
 */

/** Mirrored in firestore.rules (`imageUrl`). Keep both in step. */
export const CLOUDINARY_URL_PATTERN =
  /^https:\/\/res\.cloudinary\.com\/[a-z0-9_-]{1,64}\/image\/upload\/[A-Za-z0-9_.,/-]{1,300}$/;

export const MAX_IMAGE_URL = 400;

export function isCloudinaryUrl(url: string): boolean {
  return url.length <= MAX_IMAGE_URL && CLOUDINARY_URL_PATTERN.test(url);
}

/**
 * Adds delivery transforms to a Cloudinary URL: `cldUrl(url, "w_800,c_fill,f_auto,q_auto")`.
 * Anything that isn't a Cloudinary upload URL comes back unchanged.
 */
export function cldUrl(url: string, transform: string): string {
  const marker = "/image/upload/";
  const at = url.indexOf(marker);
  if (at === -1 || !url.startsWith("https://res.cloudinary.com/")) return url;
  const head = url.slice(0, at + marker.length);
  return `${head}${transform}/${url.slice(at + marker.length)}`;
}
