-- Phase 3 Chunk 3: the unified /admin manager needs write access to reference data.
--
-- 1. bell_schedule — new reference table (periods per day type), read-only to students.
-- 2. Admin write policies on every table the admin UI manages, gated by the same
--    server-side whitelist as announcements (public.is_announcements_admin()) — the
--    client-side whitelist is UX, these policies are the real gate.

create table if not exists bell_schedule (
  id uuid primary key default gen_random_uuid(),
  day_type text not null,        -- 'regular' | 'block' | 'minimum' | 'rally'
  period text not null,          -- display label: '1', '2', 'Lunch', ...
  start_time time not null,
  end_time time not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists bell_schedule_day_idx on bell_schedule (day_type, sort_order);

alter table bell_schedule enable row level security;
create policy "read bell_schedule" on bell_schedule for select using (true);

-- ── Admin write policies (insert / update / delete per table) ──────────────────
create policy "admin write teachers" on teachers
  for all to authenticated using (public.is_announcements_admin()) with check (public.is_announcements_admin());
create policy "admin write rooms" on rooms
  for all to authenticated using (public.is_announcements_admin()) with check (public.is_announcements_admin());
create policy "admin write locker_sections" on locker_sections
  for all to authenticated using (public.is_announcements_admin()) with check (public.is_announcements_admin());
create policy "admin write lockers" on lockers
  for all to authenticated using (public.is_announcements_admin()) with check (public.is_announcements_admin());
create policy "admin write panoramas" on panoramas
  for all to authenticated using (public.is_announcements_admin()) with check (public.is_announcements_admin());
create policy "admin write courses" on courses
  for all to authenticated using (public.is_announcements_admin()) with check (public.is_announcements_admin());
create policy "admin write graduation_requirements" on graduation_requirements
  for all to authenticated using (public.is_announcements_admin()) with check (public.is_announcements_admin());
create policy "admin write bell_schedule" on bell_schedule
  for all to authenticated using (public.is_announcements_admin()) with check (public.is_announcements_admin());
