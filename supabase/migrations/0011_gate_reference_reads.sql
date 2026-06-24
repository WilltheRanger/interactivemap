-- Gate reference-data reads to signed-in school sessions (fulfils the Phase-09 promise in
-- 0002_rls.sql and PLAN decision #5: "gating keeps the campus map / 360° photos off the public web").
--
-- THE PROBLEM this fixes:
--   0002_rls.sql opened every reference table's SELECT policy with `using (true)` "to simplify
--   development", with a note that Phase 09 would tighten it — but no migration ever did. Because the
--   Supabase URL + anon key ship in the client bundle, ANYONE could read the full teacher directory,
--   master schedule, rooms, lockers, and panorama URLs via the REST API WITHOUT signing in. The
--   client-side RequireAuth gate only controls rendering and is trivially bypassed.
--
-- THE FIX:
--   Restrict every reference read to an authenticated session whose Google email is on a school
--   domain (students @stu.wvusd.org, staff @wvusd.org) or is a whitelisted admin. Every real user of
--   the app already signs in (RequireAuth), so legitimate access is unchanged — this only closes the
--   anonymous-bypass hole. The bell-schedule / school-menu Edge Functions are unaffected: they proxy
--   public third-party feeds and never read these tables.
--
-- NOTE (panoramas): this gates the `panoramas` TABLE (the rows holding image URLs). The image bytes
--   themselves are served from public, unsigned Cloudinary URLs, so they remain reachable by direct
--   URL. Closing that fully needs signed delivery / a private bucket — tracked separately.
--
-- ROLLBACK: re-open a policy with e.g.
--   alter policy "read teachers" on teachers to public using (true);

-- Membership predicate: a school-domain Google session, or a whitelisted admin (off-domain Gmail
-- admins are allowed via is_announcements_admin(), which additionally requires provider = google).
-- Pinned search_path per the same advisor guidance that hardened is_announcements_admin (0005).
-- OPTIONAL HARDENING: to also reject email/password signups that claim a school address, AND the
--   following to the first two predicates:
--     coalesce(auth.jwt() -> 'app_metadata' ->> 'provider', '') = 'google'
create or replace function public.is_school_member()
returns boolean
language sql
stable
set search_path = ''
as $$
  select
    lower(coalesce(auth.jwt() ->> 'email', '')) like '%@stu.wvusd.org'
    or lower(coalesce(auth.jwt() ->> 'email', '')) like '%@wvusd.org'
    or public.is_announcements_admin();
$$;

-- Tighten each open read policy in place (changes the role + USING; preserves the policy name).
alter policy "read buildings"              on buildings              to authenticated using (public.is_school_member());
alter policy "read teachers"               on teachers               to authenticated using (public.is_school_member());
alter policy "read rooms"                  on rooms                  to authenticated using (public.is_school_member());
alter policy "read master_schedule"        on master_schedule        to authenticated using (public.is_school_member());
alter policy "read panoramas"              on panoramas              to authenticated using (public.is_school_member());
alter policy "read locker_sections"        on locker_sections        to authenticated using (public.is_school_member());
alter policy "read lockers"                on lockers                to authenticated using (public.is_school_member());
alter policy "read announcements"          on announcements          to authenticated using (public.is_school_member());
alter policy "read graduation_requirements" on graduation_requirements to authenticated using (public.is_school_member());
alter policy "read courses"                on courses                to authenticated using (public.is_school_member());
alter policy "read bell_schedule"          on bell_schedule          to authenticated using (public.is_school_member());
alter policy "read locker_blocks"          on locker_blocks          to authenticated using (public.is_school_member());
