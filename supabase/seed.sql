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

-- Locker sections with NON-OVERLAPPING ranges.
insert into locker_sections
  (id, building_id, panorama_id, number_start, number_end, map_coord, label) values
  ('sec-1000s', 'bldg-a', 'pano-1', 1000, 1080, '{"x":120,"y":200}', 'Placeholder Section 1000s'),
  ('sec-1100s', 'bldg-b', 'pano-1', 1081, 1160, '{"x":300,"y":240}', 'Placeholder Section 1100s')
on conflict (id) do nothing;

-- A few lockers with sample hotspot angles (per-locker pin is optional).
insert into lockers (id, section_id, number, hotspot_yaw, hotspot_pitch) values
  ('lk-1042', 'sec-1000s', 1042, 10, -5),
  ('lk-1100', 'sec-1100s', 1100, -30, 0)
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
