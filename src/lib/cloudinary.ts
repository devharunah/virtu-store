import { requireEnv } from "./env";
import { isCloudinaryUrl } from "./image-url";

/**
 * Browser uploads straight to Cloudinary with an unsigned upload preset. Only the returned
 * `secure_url` is kept (in Firestore). See docs/CLOUDINARY-SETUP.md for the preset's limits.
 */

// Named literally so Next inlines them into the browser bundle.
const CLOUD_NAME = process.env["NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME"];
const UPLOAD_PRESET = process.env["NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET"];

/** True when both Cloudinary variables are set. Without them, image uploads are hidden. */
export const cloudinaryConfigured =
  CLOUD_NAME !== undefined &&
  CLOUD_NAME !== "" &&
  UPLOAD_PRESET !== undefined &&
  UPLOAD_PRESET !== "";

export class UploadError extends Error {
  override name = "UploadError";
}

/** Uploads one image and resolves with its delivery URL. `folder` is under the preset's folder. */
export function uploadImage(
  file: Blob,
  folder: string,
  onProgress?: (fraction: number) => void,
): Promise<string> {
  const cloud = requireEnv("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME", CLOUD_NAME);
  const preset = requireEnv("NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET", UPLOAD_PRESET);
  const body = new FormData();
  body.append("file", file);
  body.append("upload_preset", preset);
  body.append("folder", folder);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloud)}/image/upload`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onerror = () =>
      reject(new UploadError("Upload failed. Check your connection and try again."));
    xhr.onload = () => {
      let url: unknown;
      try {
        url = (JSON.parse(xhr.responseText) as { secure_url?: unknown }).secure_url;
      } catch {
        url = undefined;
      }
      if (
        xhr.status >= 200 &&
        xhr.status < 300 &&
        typeof url === "string" &&
        isCloudinaryUrl(url)
      ) {
        resolve(url);
      } else {
        reject(
          new UploadError(
            "The image service refused that file. Try a JPG, PNG or WebP under 5 MB.",
          ),
        );
      }
    };
    xhr.send(body);
  });
}
