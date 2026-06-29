-- Links directory (the "Links" tab): admin-managed external resources grouped into sections.
--
-- Same RLS shape as the other reference tables — school members read, announcement admins write
-- (is_school_member / is_announcements_admin). Icons are a small registry of keys the client maps to
-- a Lucide glyph (see src/features/links/links.data.ts ICONS); `tint` is the icon-tile colour.

create table if not exists public.links (
  id uuid primary key default gen_random_uuid(),
  section text not null,
  label text not null,
  description text,
  url text not null,
  icon text not null default 'link',
  tint text not null default '#582c83',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.links enable row level security;

create policy "read links" on public.links
  for select using (public.is_school_member());

create policy "admin write links" on public.links
  for all using (public.is_announcements_admin()) with check (public.is_announcements_admin());

-- Seed with the links the screen shipped with (no-op if already populated).
insert into public.links (section, label, description, url, icon, tint, sort_order)
select * from (values
  ('School tools', 'Aeries', 'Grades & attendance', 'https://walnutvalleyusd.aeries.net/student/', 'clipboard-list', '#0b8390', 10),
  ('School tools', 'Google Classroom', 'Assignments & class streams', 'https://classroom.google.com', 'book-open', '#1e8e3e', 20),
  ('School tools', 'Google Drive', 'Your school files', 'https://drive.google.com', 'folder', '#1a73e8', 30),
  ('School tools', 'Diamond Bar High School', 'Official school website', 'https://dbhs.wvusd.org/', 'school', '#582c83', 40),
  ('School tools', 'Course Descriptions', 'Course catalog (PDF)', 'https://4.files.edl.io/5605/05/26/26/224404-8067a323-ef30-4c2f-8e96-37c9720689dd.pdf', 'file-text', '#c0392b', 50),
  ('School tools', 'College Board', 'AP, SAT & score reports', 'https://www.collegeboard.org', 'graduation-cap', '#0a2a66', 60)
) as seed(section, label, description, url, icon, tint, sort_order)
where not exists (select 1 from public.links);
