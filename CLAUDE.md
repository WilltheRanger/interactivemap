# CLAUDE.md — DBHS Wayfinder

## Why
A web app to help Diamond Bar High School students find their classrooms and their locker
on an interactive 2D campus map, with a 360° photo view at the locker bank. Solo IT
internship project. Goal: ship a working web app before the school year starts.

Full spec and rationale live in `./PLANNING.md` — treat it as the source of truth and read it
before planning any non-trivial work.

## What (v1 scope)
- Interactive 2D campus map; click a building/room → room number + teacher.
- Manual schedule entry by the student; the app resolves class location from reference data.
- "Now / next" period highlighting, driven by a hard-coded bell schedule.
- Locker finder: the map shows the locker section; click it → a 360° panorama with a pin on the locker.

## Out of scope — do NOT build or re-propose
- Auto-pulling student schedules from the SIS (personal/FERPA-protected, access-gated). Students self-enter.
- Navigable / photorealistic 3D, photogrammetry, Gaussian splats. 360° photos only.
- Native iOS / Android app. Web app / PWA only.
- Live GPS "you are here" positioning.

## Hard rules — enforce in every feature
- **Join key:** resolve a student's class location by **teacher (or room)**, NEVER by class+period.
  Class+period is ambiguous (multiple sections of a course run in the same period). The class name
  is a display label only.
- **Data split:** reference data (buildings, rooms, teachers, lockers, panoramas) lives in Supabase.
  Personal data (a student's schedule + their locker number) stays on the device in `localStorage`.
  Never store student-identifying data server-side.
- Until real campus data is provided, use clearly-labeled **placeholder** data. Do not invent real
  room numbers, teacher names, or coordinates and present them as real.

## Data intake — pause and ask, don't invent
When building the locker and map features, STOP and ask me to supply real data; do not fabricate it.
For each **locker section**, ask for: the locker **number range** (e.g. 1001–1080), the **map
coordinate / building**, and the **panorama file** (optionally per-locker hotspot yaw/pitch for an
exact pin). Also prompt for the **room → teacher directory** and **building coordinates** when those
features are built. The locker number a student types resolves to a section **by range**, so I
populate ~dozens of section records — not one row per locker.

## Stack
- Frontend: React.
- 2D map: Leaflet (image overlay of the campus map with clickable zones) — or MapLibre GL if using geo tiles.
- 360 viewer: Pannellum (single scene + pin). Use Marzipano or Photo Sphere Viewer's virtual-tour
  plugin ONLY if the navigable Street-View locker feature is approved (not in v1 unless time allows).
- Database: Supabase (Postgres, real foreign keys, read-only to the app).
- Personal data: browser `localStorage`.
- Deploy: static host (Vercel / Netlify / GitHub Pages) + Supabase; ship as a PWA.

## Data model
See `./PLANNING.md` → Data model. Reference tables: `buildings`, `rooms`(→building, →teacher),
`teachers`(→home_room), `locker_sections`(→building, →panorama, number_start, number_end, map_coord), `lockers`(→section,
hotspot_yaw, hotspot_pitch), `panoramas`. Personal (local): `schedule[period] = {teacher_id | room_id,
class_label}`, `my_locker`.

## UI / design
The visual source of truth is the mockup; the rules live in `./DESIGN.md`. Match the mockup exactly,
follow the DESIGN.md checklist, and ask before inventing any screen or state not in the mockup.

## How to work in this repo
- Workflow: **Explore → Plan → Implement → Commit.** Propose a plan before large changes and wait for an OK.
- Work in small, scoped steps. Commit after each working step with a clear message.
- Ask before adding scope, new dependencies, or anything on the "out of scope" list.
- Building IDs in the map file MUST match the keys in the `rooms` table, or joins break.

## Commands
<!-- Fill in once the project is scaffolded: dev server, build, lint, test -->
