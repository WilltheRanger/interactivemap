import { config } from './config';
import { getSupabase } from './supabase';

/**
 * Panorama photos live in a PRIVATE Supabase Storage bucket (`panoramas`), with writes gated to
 * admins by Storage RLS — replacing the old *unsigned* Cloudinary upload preset, which let anyone who
 * read the cloud name + preset out of the client bundle upload arbitrary images to the account.
 *
 * The bytes never go on the public web: the viewer fetches a short-lived *signed* delivery URL at
 * display time (see `useSignedPanoramaUrl` in data/hooks). Legacy panoramas whose `image_url` points
 * at Cloudinary (or anywhere else) still display unchanged — `panoramaStoragePath` returns null for
 * them and the viewer uses the stored URL as-is.
 */
const PANORAMA_BUCKET = 'panoramas';
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

function extensionFor(mime: string): string {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
}

/**
 * Upload a (resized, optionally seam-fixed) panorama to the private `panoramas` bucket and return a
 * stable object URL. The write succeeds only for an admin session (Storage RLS); a student/anon token
 * is rejected server-side. The returned URL is a path carrier — the viewer signs it on demand — so it
 * stays valid after the bucket is switched to private.
 */
export async function uploadPanoramaToStorage(
  file: File,
  opts: { swapHalves?: boolean } = {},
): Promise<string> {
  const blob = await prepareForUpload(file, opts.swapHalves ?? false);
  const mime = blob.type || file.type || 'image/jpeg';
  const key = `${crypto.randomUUID()}.${extensionFor(mime)}`;

  const { error } = await getSupabase()
    .storage.from(PANORAMA_BUCKET)
    .upload(key, blob, { contentType: mime, upsert: false });
  if (error) {
    throw new Error(
      error.message || 'Upload failed — check you’re signed in as an admin and the file is an image.',
    );
  }
  return `${config.supabaseUrl}/storage/v1/object/public/${PANORAMA_BUCKET}/${encodeURIComponent(key)}`;
}

/**
 * If `url` is a Supabase Storage object URL for the `panoramas` bucket (in any access form —
 * public / sign / authenticated), return its decoded object key so the viewer can mint a signed URL.
 * Returns null for external URLs (e.g. legacy Cloudinary), which are used as-is.
 */
export function panoramaStoragePath(url: string): string | null {
  const match = url.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/panoramas\/([^?]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}
