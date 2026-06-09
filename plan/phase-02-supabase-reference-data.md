# Phase 02 — Supabase reference data & access layer

**Goal:** Stand up the reference schema (FKs + constraints), lock it **read-only** to the app via
RLS, seed clearly-labeled placeholder data, and build a typed access layer that encodes the
hard rules (resolve by teacher/room; resolve lockers **by range**).

**Phase complete when:** all 6 tables exist with RLS allowing anon `SELECT` only, the placeholder
seed loads, and every access function is verified against the seed.

> Uses the **anon/publishable** key only. No write path ships in the app.

---

### 02.1 — Schema migration
- **Scope:** Create the reference tables with real foreign keys and constraints.
- **Files:** `supabase/migrations/0001_init.sql`.
- **Deliverable / shape:**
  - `buildings(id text pk, label text not null, level int not null default 0, geometry jsonb, created_at timestamptz default now())` — `id` **must match** map shape ids.
  - `teachers(id text pk, name text not null, home_room_id text null references rooms(id))`
  - `rooms(id text pk, building_id text not null references buildings(id), label text, teacher_id text null references teachers(id))`
  - `panoramas(id text pk, image_url text not null, label text, initial_yaw float, initial_pitch float, hfov float)`
  - `locker_sections(id text pk, building_id text references buildings(id), panorama_id text references panoramas(id), number_start int not null, number_end int not null, map_coord jsonb, label text, check (number_end >= number_start))`
  - `lockers(id text pk, section_id text not null references locker_sections(id), number int, hotspot_yaw float, hotspot_pitch float)` — **optional** per-locker pin; resolution is by section range.
- **Edge cases:** the `rooms↔teachers` FK cycle — make `teachers.home_room_id` nullable (or deferrable) and populate after rooms exist.
- **Done when:** migration applies; `list_tables` shows all 6 with the FKs.
- **Depends on:** 00.4

### 02.2 — RLS read-only policies
- **Scope:** Enable RLS; anon `SELECT` only; no write policies.
- **Files:** `supabase/migrations/0002_rls.sql`.
- **Deliverable:** RLS on all 6 tables; `select` policy for anon; zero insert/update/delete policies.
- **Done when:** with the anon key a `SELECT` returns rows and an `INSERT` is rejected (verify both).
- **Depends on:** 02.1

### 02.3 — Placeholder seed
- **Scope:** Insert clearly-labeled placeholder rows — never invented real campus data (CLAUDE.md).
- **Files:** `supabase/seed.sql`.
- **Deliverable:** e.g. 3–4 buildings ("Placeholder Bldg A/B/C"), ~6 teachers ("Teacher One"…), rooms linked to buildings + teachers, 1 panorama using a public sample equirectangular image, 2–3 `locker_sections` with non-overlapping ranges (e.g. 1000–1080, 1081–1160), a few `lockers` with sample yaw/pitch.
- **Done when:** seed loads; row counts verified; **every** human-visible label is obviously placeholder; locker ranges don't overlap.
- **Depends on:** 02.1

### 02.4 — Generated types + client
- **Scope:** Generate DB types; create the Supabase client.
- **Files:** `src/types/db.ts` (generated), `src/lib/supabase.ts`.
- **Deliverable:** Typed `supabase` client using the anon key from `config`; exported row types.
- **Done when:** a dev smoke query returns seed rows with correct types.
- **Depends on:** 02.2, 02.3, 01.4

### 02.5 — Access layer (encodes hard rules)
- **Scope:** Pure query functions; **resolve location by teacher/room, never class+period; resolve lockers by range.**
- **Files:** `src/lib/refData.ts`.
- **Deliverable / interface:**
  - `getBuildings(): Building[]`
  - `getRoomsByBuilding(buildingId): Room[]`
  - `getRoomWithTeacher(roomId): {room, teacher}`
  - `getTeacher(teacherId): {teacher, homeRoom}`
  - `resolveLocationByTeacher(teacherId): {room, building}` and `resolveLocationByRoom(roomId): {room, building}`
  - `resolveLockerSection(number): LockerSection | null` — `number BETWEEN number_start AND number_end`
  - `getPanorama(id)`, `getLockerHotspot(sectionId, number?)` (per-locker if present, else section default)
- **Done when:** each function returns correct seed results; `resolveLockerSection` returns the section for in-range and `null` for out-of-range; no function joins on class+period.
- **Depends on:** 02.4

### 02.6 — React data hooks
- **Scope:** Hooks wrapping the access layer with loading/error states (TanStack Query per flagged decision, else hand-rolled).
- **Files:** `src/data/hooks.ts`.
- **Deliverable:** `useBuildings`, `useRoom`, `useLockerSection`, etc., exposing `{data, loading, error}`.
- **Done when:** a screen renders seed data through a hook with loading + error paths visibly handled.
- **Depends on:** 02.5
