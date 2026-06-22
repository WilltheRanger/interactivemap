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
 * Shrink a panorama to <=MAX_DIM on its longest side and re-encode as JPEG. Best-effort: any
 * decode/resize failure (odd format, no canvas, etc.) falls back to the original file, so an upload
 * is never blocked by the optimization.
 */
async function downscaleForUpload(file: File): Promise<Blob> {
  try {
    if (typeof createImageBitmap !== 'function') return file;
    const bitmap = await createImageBitmap(file);
    const longest = Math.max(bitmap.width, bitmap.height);
    if (longest <= MAX_DIM) {
      bitmap.close?.();
      return file; // already small enough — keep the original bytes
    }
    const scale = MAX_DIM / longest;
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
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
    );
    return blob ?? file;
  } catch {
    return file;
  }
}

export async function uploadPanorama(file: File): Promise<string> {
  const { cloudinaryCloudName, cloudinaryUploadPreset } = config;
  if (!cloudinaryCloudName || !cloudinaryUploadPreset) {
    throw new Error('Photo upload isn’t set up yet (Cloudinary not configured).');
  }

  const upload = await downscaleForUpload(file);

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
