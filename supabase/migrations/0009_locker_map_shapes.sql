-- Map shape → section mapping for the in-app "Tag lockers on map" tool.
--
-- Each locker bank drawn on the campus map is a shape (an SVG element with a stable id). A locker
-- SECTION (one range, e.g. 001–069 in Block 4) owns one or more of those shapes. Tapping a shape on
-- the map resolves to its section, so the map can show that range + its block + 360° photo. The admin
-- tagger assigns shapes to sections by clicking them — no SVG-file editing.

alter table locker_sections
  add column if not exists map_shape_ids text[] not null default '{}';
