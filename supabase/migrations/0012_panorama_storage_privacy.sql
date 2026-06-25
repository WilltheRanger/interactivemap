-- Make the 360° panorama photos private (PLAN decision #5: "off the public web").
--
-- Panoramas live in the `panoramas` Storage bucket. It was PUBLIC, so anyone with an object URL could
-- view a campus-interior photo, and uploads used an *unsigned* Cloudinary preset that let anyone who
-- read the cloud name + preset out of the client bundle upload to the account. This migration:
--   1. Adds Storage RLS so only admins can write the bucket and only school members can read/sign it.
--   2. (FINAL STEP, deferred) flips the bucket private so delivery requires a signed URL.
--
-- The app now uploads to this bucket (admin-gated) and fetches a short-lived SIGNED url at display
-- time (useSignedPanoramaUrl). Legacy Cloudinary-hosted panoramas keep working unchanged.

-- ── Storage RLS (safe to apply while the bucket is still public; only governs authed ops + signing) ──
create policy "panoramas read (school)" on storage.objects
  for select to authenticated
  using (bucket_id = 'panoramas' and public.is_school_member());

create policy "panoramas admin insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'panoramas' and public.is_announcements_admin());

create policy "panoramas admin update" on storage.objects
  for update to authenticated
  using (bucket_id = 'panoramas' and public.is_announcements_admin())
  with check (bucket_id = 'panoramas' and public.is_announcements_admin());

create policy "panoramas admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'panoramas' and public.is_announcements_admin());

-- ── FINAL STEP — DO NOT run until the signed-URL frontend (this PR) is DEPLOYED ───────────────────
-- Flipping the bucket private makes every `/object/public/panoramas/...` URL 403, so the OLD frontend
-- (which loads panoramas by public URL) would break. Once the new build is live, run:
--
--   update storage.buckets set public = false where id = 'panoramas';
--
-- Legacy panoramas still hosted on Cloudinary remain public until re-uploaded through the admin tool
-- (which now writes to this private bucket).
