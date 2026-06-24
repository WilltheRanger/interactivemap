-- Locker BLOCKS.
--
-- The school's lockers are grouped into named blocks ("Block 1", "Block 2", …) that are NOT tied to
-- buildings, and a single block contains MULTIPLE locker sections (ranges) — e.g. Block 4 spans
-- 001–069, 070–156, 253–264, and 265–306. Locker numbers repeat across blocks, so a number alone is
-- ambiguous: a student picks their block and types a number, and the app finds the section in that
-- block whose range contains the number (and shows that section's 360° photo + map spot + pin).
--
-- Model: locker_blocks (1) → locker_sections (many). This replaces the section→building link, which
-- was never meaningful for lockers, with a section→block link.

create table if not exists locker_blocks (
  id text primary key,
  label text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table locker_blocks enable row level security;
-- Public read (reference data); writes gated by the same admin whitelist as the rest (migration 0007).
create policy "read locker_blocks" on locker_blocks for select using (true);
create policy "admin write locker_blocks" on locker_blocks
  for all to authenticated
  using (public.is_announcements_admin())
  with check (public.is_announcements_admin());

-- A section now belongs to a block instead of a building.
alter table locker_sections add column if not exists block_id text references locker_blocks (id);
create index if not exists locker_sections_block_id_idx on locker_sections (block_id);

-- Buildings are no longer part of the locker model (lockers aren't building-correlated). Dropping the
-- column also drops its foreign-key constraint.
alter table locker_sections drop column if exists building_id;
