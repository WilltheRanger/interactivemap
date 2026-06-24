-- PLACEHOLDER seed data. Every visible label is clearly marked as placeholder — no real campus
-- room numbers, teacher names, or coordinates (CLAUDE.md). Replaced with real data in Phase 11.
-- Idempotent via ON CONFLICT DO NOTHING.

-- Buildings (bldg-c is on level 1 to exercise the multi-level feature).
insert into buildings (id, label, level, geometry) values
  ('bldg-a', 'Placeholder Bldg A', 0, null),
  ('bldg-b', 'Placeholder Bldg B', 0, null),
  ('bldg-c', 'Placeholder Bldg C', 1, null)
on conflict (id) do nothing;

-- Teachers (home_room_id set after rooms exist, below).
insert into teachers (id, name) values
  ('t-1', 'Placeholder Teacher One'),
  ('t-2', 'Placeholder Teacher Two'),
  ('t-3', 'Placeholder Teacher Three'),
  ('t-4', 'Placeholder Teacher Four')
on conflict (id) do nothing;

-- Rooms.
insert into rooms (id, building_id, label, teacher_id) values
  ('a-101', 'bldg-a', 'A-101', 't-1'),
  ('a-102', 'bldg-a', 'A-102', 't-2'),
  ('b-201', 'bldg-b', 'B-201', 't-3'),
  ('c-301', 'bldg-c', 'C-301', 't-4')
on conflict (id) do nothing;

update teachers set home_room_id = 'a-101' where id = 't-1';
update teachers set home_room_id = 'a-102' where id = 't-2';
update teachers set home_room_id = 'b-201' where id = 't-3';
update teachers set home_room_id = 'c-301' where id = 't-4';

-- Master schedule. NOTE: 'Placeholder Algebra' runs TWO sections in period 3 (rooms a-101 and
-- b-201) — this is the ambiguity that proves resolution must be by teacher/room, not class+period.
insert into master_schedule (id, course, period, room_id, teacher_id) values
  ('ms-1', 'Placeholder Algebra', '3', 'a-101', 't-1'),
  ('ms-2', 'Placeholder Algebra', '3', 'b-201', 't-3'),
  ('ms-3', 'Placeholder Chemistry', '2', 'a-102', 't-2'),
  ('ms-4', 'Placeholder History', '4', 'c-301', 't-4')
on conflict (id) do nothing;

-- Panorama (public sample equirectangular image used only as a placeholder).
insert into panoramas (id, image_url, label, initial_yaw, initial_pitch, hfov) values
  ('pano-1', 'https://pannellum.org/images/cerro-toco-0.jpg', 'Placeholder panorama', 0, 0, 100)
on conflict (id) do nothing;

-- Locker blocks. A student types a pin like "BK3301" = BK + block digit (3) + 3-digit locker (301).
-- The block label is "BK<n>"; <n> is the digit the student types. NOT tied to buildings.
insert into locker_blocks (id, label, sort_order) values
  ('block-1', 'BK1', 1),
  ('block-2', 'BK2', 2),
  ('block-4', 'BK4', 4)
on conflict (id) do nothing;

-- Locker sections (ranges) belong to a block; the range is the 3-digit locker number (1–999). BK4
-- shows the real-world case: ONE block with multiple non-contiguous ranges, each its own bank/photo.
-- Numbers repeat across blocks (BK1 and BK2 both have 1–80) — which is why the pin's block digit is
-- needed to disambiguate.
insert into locker_sections
  (id, block_id, panorama_id, number_start, number_end, map_coord, label) values
  ('sec-b1-001', 'block-1', 'pano-1',   1,  80, '{"x":120,"y":200}', '001–080'),
  ('sec-b2-001', 'block-2', 'pano-1',   1,  80, '{"x":300,"y":240}', '001–080'),
  ('sec-b4-001', 'block-4', 'pano-1',   1,  69, '{"x":400,"y":300}', '001–069'),
  ('sec-b4-070', 'block-4', 'pano-1',  70, 156, '{"x":420,"y":300}', '070–156'),
  ('sec-b4-253', 'block-4', 'pano-1', 253, 264, '{"x":440,"y":300}', '253–264'),
  ('sec-b4-265', 'block-4', 'pano-1', 265, 306, '{"x":460,"y":300}', '265–306')
on conflict (id) do nothing;

-- A few lockers with sample hotspot angles (per-locker pin is optional). Locker 42 exists in both BK1
-- and BK2 — the pin (BK1042 vs BK2042) is what tells them apart.
insert into lockers (id, section_id, number, hotspot_yaw, hotspot_pitch) values
  ('lk-b1-042', 'sec-b1-001', 42, 10, -5),
  ('lk-b2-042', 'sec-b2-001', 42, -30, 0),
  ('lk-b4-260', 'sec-b4-253', 260, 5, 0)
on conflict (id) do nothing;

-- Announcements (placeholder posts so the feed has content; one carries an event to
-- exercise the Add to Calendar buttons).
insert into announcements (title, body, event_date, event_title, event_location)
select * from (values
  ('Welcome to the Wayfinder (placeholder)',
   'This is placeholder text so the feed has something to show. Real announcements from school staff will appear here.',
   null::timestamptz, null::text, null::text),
  ('Placeholder event: Back-to-School Night',
   'A placeholder event post — tap Add to Calendar to try the Google Calendar and .ics buttons.',
   now() + interval '7 days', 'Back-to-School Night (placeholder)', 'DBHS Gym (placeholder)')
) as seed(title, body, event_date, event_title, event_location)
where not exists (select 1 from announcements);
