# DBHS Wayfinder — Project Plan

A web app to help Diamond Bar High School students find their classrooms and locker
on an interactive 2D campus map, with a 360° photo view at the locker. Built solo as a
Diamond Bar IT internship project. Target: a usable web app before the school year starts.

> Status note: this doc is the source of truth for scope, data model, and key decisions.
> Keep it in the repo root and point Claude Code at it.

---

## Current status (end of planning)

- Concept and architecture are decided (below).
- An **interaction prototype** exists with placeholder data (`dbhs-wayfinder-prototype.jsx`).
  It proves the flow: manual schedule entry → map highlight → now/next banner → locker stub.
  It does **not** contain real campus data.
- Real campus data is **not yet assembled.** That assembly is the gating work, not the code.

---

## Scope

### In (v1)
- Interactive 2D campus map: click a building/room → room number + teacher.
- Manual schedule entry by the student; the app resolves location from reference data.
- "Now / next class" highlighting, time-aware via a hard-coded bell schedule *(pending confirm — see Open Decisions)*.
- Locker finder: the 2D map shows your locker section; click it → a 360° photo with a pin on your locker.

### Out (explicitly cut — and why)
- **Auto-pulling student schedules from the SIS** — a personal/FERPA-protected record and access-gated by the district. The student enters their own classes instead.
- **Navigable / photorealistic 3D, photogrammetry, Gaussian splats** — wrong cost/benefit; a 360° photo is enough for "recognize the spot at my locker," and reconstructed geometry fights the wayfinding goal.
- **Native iOS/Android app** — timeline. Ship a web app / PWA.
- **Live GPS "you are here"** — possible outdoors but too imprecise (~5–10m) to identify a specific locker. Defer to a later version, if ever.

---

## Architecture

Two layers, deliberately kept separate:

1. **2D wayfinding layer (primary).** Clean, queryable map. Buildings and rooms are clickable entities with metadata. This is the "clean but plain" layer.
2. **360° locker layer (narrow).** One panorama per locker bank; a hotspot marks the student's locker. No 3D geometry. This is the "pretty, fixed-viewpoint" layer.

### The privacy line (important)
- **Reference data** (non-personal, shared): buildings, rooms, teachers, lockers, panoramas → lives in a **central database**.
- **Personal data** (this student's schedule + locker assignment) → stays **on the device** (localStorage), never the shared DB. This keeps you out of student-records custody entirely.

---

## Data model

### Reference DB (non-personal — central)
- `buildings(id, label, coords/geometry, level)`
- `rooms(id, building_id, teacher_id)`
- `teachers(id, name, home_room_id)`
- `locker_sections(id, building_id, panorama_id)`
- `lockers(id, section_id, hotspot_yaw, hotspot_pitch)` — position within its panorama
- `panoramas(id, image_url)` — equirectangular exports from the Ricoh Theta
- *(optional)* `master_schedule(course, period, room_id, teacher_id)` — operational data, **not** a student record; obtainable from the school if you want class+period resolution

### Personal (on-device only)
- `schedule[period] = { teacher_id (or room_id), class_label }`
- `my_locker = locker_id`

### Join-key decision (do not skip)
Resolve a student's class location by **teacher (or room)** — **not** class+period.
The same course runs multiple sections in one period, so "Algebra 2, P3" can map to several
rooms. Class name is a **display label only**, never the field you join on.

(Note on the earlier FERPA discussion: the `master_schedule` table itself is operational data
with no student identifiers, so it is *not* FERPA-protected. What's protected is the link
"*this named student* is enrolled in *this section*" — which is exactly the part that stays
on-device.)

---

## Tech stack

- **Frontend:** React
- **2D map:** Leaflet (image overlay of the provided campus map with clickable zones), or MapLibre GL if using real geo tiles
- **360 viewer:** Pannellum — feed it the Theta equirectangular image; define a hotspot at a fixed yaw/pitch per locker
- **Reference DB:** Supabase (Postgres, real foreign keys, read-only to the app) — already connected in your tooling
- **Personal data:** browser `localStorage` (no account, no server-side student data)
- **Deploy:** static host (Vercel / Netlify / GitHub Pages) + Supabase; ship as a **PWA** for an installable feel
- **Build:** Claude Code; **document:** private GitHub repo

---

## Hardware / assets

- **Ricoh Theta (360 camera)** — locker-bank panoramas. Shoot in 1–2 sessions under consistent, ideally overcast light (harsh midday sun blows out the sky on an open-air campus). One shot per bank covers both sides of a walkway.
- **2D campus map** — you will provide. **Best format: SVG / vector with each building as a named shape** (clickable for free; building IDs match the `rooms` table). A flat PNG/JPG works but requires hand-placed clickable zones at coordinates. Either way, building labels/IDs on the map must match the keys in the room directory.

---

## Open decisions (resolve before/early in the build)

1. **Passive vs active schedule view.** Prototype is active (time-aware). Confirm the supervisor wants that vs. just displaying the schedule.
2. **Map format** you can actually obtain (SVG vs PNG).
3. **Multi-level?** Any lockers/rooms on upper-floor exterior walkways → add a `level` field and a map toggle *now*, not later.
4. **Master schedule access.** Full master schedule (enables class+period+teacher) or only a teacher→room directory (resolve via teacher)?
5. **Auth.** Needed at all? Simplest = no auth; schedule + locker entered locally. Add SSO only if it's a hard requirement.
6. **"Publish an app" = web/PWA** (recommended, fits timeline). Confirm it isn't expected to be a native store app.
7. **Maintenance owner.** Locker assignments and room/teacher data change yearly. Who updates it so it isn't wrong by September?

---

## Risks (honest)

- **Critical path is data + school cooperation, not code.** The map, directory, locker→panorama tagging, and 360 capture are the real work — and some need staff who may be off over summer. Lock down access now.
- **Per-locker tagging is a grind.** One panorama per bank is fine, but every locker needs its position tagged once.
- **~10-week timeline** (June → mid-August) is tight for a solo build that depends on other people. Front-load the school-dependent items.
- **Longevity.** Without a maintenance owner, it's stale within a year.

---

## Suggested build sequence

1. **(Now) Lock school approvals + data access:** campus map, room/teacher directory, locker-assignment data, and permission to photograph and publish.
2. Stand up the repo + Supabase reference schema; load buildings/rooms/teachers.
3. Wire the real 2D map into the interaction prototype (replace placeholders).
4. Capture locker panoramas; build the locker → panorama + angle table; integrate Pannellum.
5. Manual schedule entry + on-device storage + now/next logic.
6. PWA polish, deploy, test with a handful of students, iterate.

---

## Using this with Claude Code

- Keep this file at the repo root (e.g., `PLANNING.md`) as the source of truth.
- Keep `dbhs-wayfinder-prototype.jsx` as the interaction reference.
- Enforce the **join-key rule** (teacher/room, not class+period) and the **reference-vs-personal data split** in every feature you build on top.
