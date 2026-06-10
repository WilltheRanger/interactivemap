-- Announcements: school-wide posts, optionally tied to a calendar event.
-- The first table with WRITE policies — writes are restricted to signed-in
-- admin accounts (email whitelist enforced server-side); everything else in
-- the project stays read-only to the app.

create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  created_at timestamptz not null default now(),
  event_date timestamptz,        -- nullable; set => the post is an event
  event_title text,
  event_location text
);

-- The feed lists newest-first.
create index if not exists announcements_created_at_idx
  on announcements (created_at desc);

alter table announcements enable row level security;

-- Public read (matches the existing reference tables).
create policy "read announcements" on announcements
  for select using (true);

-- Admin whitelist, enforced server-side.
-- TODO(owner): replace the placeholder with the real admin email(s).
create or replace function public.is_announcements_admin()
returns boolean language sql stable as $$
  select coalesce(auth.jwt() ->> 'email', '') in (
    'ADMIN_EMAIL_PLACEHOLDER@example.com'
  );
$$;

create policy "admin insert announcements" on announcements
  for insert to authenticated with check (public.is_announcements_admin());
create policy "admin update announcements" on announcements
  for update to authenticated using (public.is_announcements_admin())
  with check (public.is_announcements_admin());
create policy "admin delete announcements" on announcements
  for delete to authenticated using (public.is_announcements_admin());
