import { config } from './config';

/**
 * Upload a panorama photo to Cloudinary with an *unsigned* preset (browser-side, no secret), and
 * return an optimized, CORS-enabled delivery URL the 360° viewer can use.
 *
 * Why Cloudinary: Supabase Storage's CDN doesn't return the `Access-Control-Allow-Origin` header the
 * WebGL viewer needs, so panoramas served from it fail to load. Cloudinary always sends CORS, serves
 * from a global CDN, and resizes on the fly.
 *
 * Before upload we downscale to <=4096 px (see below) so the *stored* image is ~1 MB instead of ~8 MB
 * — cutting Cloudinary storage and per-view bandwidth, and keeping it under the WebGL texture cap most
 * phones enforce. The returned URL also carries a delivery transform (`q_auto,f_auto`, plus a
 * defensive `w_4096,c_limit`) so what's served is small and CORS-safe. Admins never see any of this.
 */
const MAX_DIM = 4096;
const JPEG_QUALITY = 0.85;

/**
 * Prepare a panorama for upload: optionally fix a "split the wrong way" equirectangular by swapping
 * its left and right halves (a lossless 180° yaw rotation that moves the stitch seam from the middle
 * of the content back to the edges where it belongs), then downscale to <=MAX_DIM and re-encode as
 * JPEG. Best-effort: any decode/resize/canvas failure falls back to the original file, so an upload is
 * never blocked. When nothing needs doing (small enough, no swap), the original bytes are kept as-is.
 */
async function prepareForUpload(file: File, swapHalves: boolean): Promise<Blob> {
  try {
    if (typeof createImageBitmap !== 'function') return file;
    const bitmap = await createImageBitmap(file);
    const longest = Math.max(bitmap.width, bitmap.height);
    const needsResize = longest > MAX_DIM;
    if (!needsResize && !swapHalves) {
      bitmap.close?.();
      return file; // already small enough and nothing to fix — keep the original bytes
    }
    const scale = needsResize ? MAX_DIM / longest : 1;
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close?.();
      return file;
    }
    if (swapHalves) {
      // Output left half ← input right half, output right half ← input left half (seam → edges).
      const half = Math.floor(bitmap.width / 2);
      const rightSrcW = bitmap.width - half;
      const rightDstW = Math.round(rightSrcW * scale);
      ctx.drawImage(bitmap, half, 0, rightSrcW, bitmap.height, 0, 0, rightDstW, h);
      ctx.drawImage(bitmap, 0, 0, half, bitmap.height, rightDstW, 0, w - rightDstW, h);
    } else {
      ctx.drawImage(bitmap, 0, 0, w, h);
    }
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
    );
    return blob ?? file;
  } catch {
    return file;
  }
}

export async function uploadPanorama(
  file: File,
  opts: { swapHalves?: boolean } = {},
): Promise<string> {
  const { cloudinaryCloudName, cloudinaryUploadPreset } = config;
  if (!cloudinaryCloudName || !cloudinaryUploadPreset) {
    throw new Error('Photo upload isn’t set up yet (Cloudinary not configured).');
  }

  const upload = await prepareForUpload(file, opts.swapHalves ?? false);

  const body = new FormData();
  body.append('file', upload, file.name);
  body.append('upload_preset', cloudinaryUploadPreset);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/image/upload`,
    { method: 'POST', body },
  );
  if (!res.ok) {
    let detail = '';
    try {
      detail = ((await res.json()) as { error?: { message?: string } })?.error?.message ?? '';
    } catch {
      // non-JSON error body — fall back to the status
    }
    throw new Error(detail || `Upload failed (${res.status}).`);
  }

  const data = (await res.json()) as { secure_url?: string };
  if (!data.secure_url) throw new Error('Upload succeeded but no URL was returned.');
  return data.secure_url.replace(
    '/image/upload/',
    '/image/upload/w_4096,c_limit,q_auto,f_auto/',
  );
}
