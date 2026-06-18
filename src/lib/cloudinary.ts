import { config } from './config';

/**
 * Upload a panorama photo to Cloudinary with an *unsigned* preset (browser-side, no secret), and
 * return an optimized, CORS-enabled delivery URL the 360° viewer can use.
 *
 * Why Cloudinary: Supabase Storage's CDN doesn't return the `Access-Control-Allow-Origin` header the
 * WebGL viewer needs, so panoramas served from it fail to load. Cloudinary always sends CORS, serves
 * from a global CDN, and resizes on the fly — so it fixes the broken load *and* the slow 8 MB files.
 *
 * The returned URL has a delivery transform baked in: `w_4096,c_limit` caps the width for mobile
 * WebGL (many phones max out at 4096 px and `c_limit` only shrinks, never upscales, preserving the
 * 2:1 equirectangular ratio); `q_auto,f_auto` pick an efficient quality/format. Admins never see any
 * of this — they just pick a photo.
 */
export async function uploadPanorama(file: File): Promise<string> {
  const { cloudinaryCloudName, cloudinaryUploadPreset } = config;
  if (!cloudinaryCloudName || !cloudinaryUploadPreset) {
    throw new Error('Photo upload isn’t set up yet (Cloudinary not configured).');
  }

  const body = new FormData();
  body.append('file', file);
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
