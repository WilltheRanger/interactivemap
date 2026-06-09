# DATA-INTAKE.md — DBHS Wayfinder

The real critical path is **data + school cooperation, not code** (planning §Risks). This register
tracks every real asset the build needs. Until an item is `received`/`loaded`, the build uses
**clearly-labeled placeholder** data and must **not** fabricate real values (CLAUDE.md §Data intake).

Status legend: `requested` → `received` → `loaded`/`done`.

| # | Asset | Required fields / format | Owner | Status | Unblocks |
|---|-------|--------------------------|-------|--------|----------|
| B | **Mockup + tokens** | The owner's **own** mockup (Figma link or measured image). Colors (bg/surface/text/primary/accent/border/error), type (fonts + size/weight scale), spacing scale, radius/shadow/density. **Include the Log/QR-scan screens** (Phase 12). (Referenced mockups in the docs are void.) | Owner | requested | Phases 04, 12 (all UI) |
| C | **Campus map (SVG)** | Vector SVG; **each building a named shape** whose `id` = `buildings.id`; shapes grouped by level (e.g. `<g id="level-0">`); known viewBox/dimensions. | Owner / school | requested | Phase 05 (map) |
| D | **Directory + master schedule** | Room→teacher directory; building coordinates/level; `master_schedule` rows `{course, period, room_id, teacher_id}` (operational, non-personal). | School | requested | Phases 05–06 |
| E | **Bell schedule** *(optional)* | Per day-type, ordered periods `{label, start HH:MM, end HH:MM, kind}`. **Only needed if** per-period time ranges are ever displayed (passive build doesn't require it). | School | optional | Phase 07 |
| F | **Locker sections + panoramas** | Per **section**: `{number_start, number_end, building_id, map_coord, panorama}` + optional per-locker `{yaw, pitch}`. **Plus** the panorama image files (equirectangular Theta exports). Resolution is **by range** → ~dozens of section rows, **not** one per locker. | Owner / school | requested | Phase 08 (locker) |
| H | **Google Workspace OAuth** | OAuth client id + secret for the project; authorized redirect URIs (local + prod); written sign-off to restrict sign-in to the `stu.wvusd.org` domain. | District Workspace admin | requested | Phase 09 (auth) |
| L | **Hall-pass loggers (per teacher)** | Each participating teacher deploys their **own** Google Apps Script web app (bound to their Sheet, "Execute as me / Anyone in the Workspace") and prints its `…/exec` QR. Per `docs/hall-pass-teacher-setup.md` (Phase 12.5). Scans append `{time, student email, reason}`; the app stores nothing. | Teachers | not started | Phase 12 (log) |
| G | **Real-data cutover sign-off** | Confirmation to replace all placeholder data with the real data above. | Owner | requested | Phase 11 (launch) |

## Per-section locker prompt (use verbatim when requesting F)
For each locker section, supply:
1. **Number range** — e.g. `1001–1080`.
2. **Map location** — which building / map coordinate the section highlights.
3. **Panorama file** — the equirectangular image for that bank.
4. *(optional)* **Per-locker hotspot** — `yaw`/`pitch` for an exact pin per locker (else one section-level pin).

## Notes
- Building shape `id`s in the SVG (C) **must** match the keys in `buildings`/`rooms` (D) or joins break.
- The campus SVG (C) and panoramas (F) are served from a **private** Supabase Storage bucket gated
  behind an `@stu.wvusd.org` session (Phase 09) — they must not be publicly indexable.
