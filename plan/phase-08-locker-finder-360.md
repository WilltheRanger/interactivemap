# Phase 08 — Locker finder & 360° viewer

**Goal:** A locker number resolves to a **section by range**, highlights on the map, and opens a
Pannellum 360° panorama with a pin on the locker. The student's locker persists on-device.

**Phase complete when:** an in-range number resolves to its section, highlights, and opens its
panorama with a correctly-placed pin; loading / found / not-found states match the mockup; the
saved locker reopens the right section.

> 🚩 **DATA-INTAKE CHECKPOINT F — STOP and ask me** for, per **section**: number range,
> building/map coord, panorama file, and (optional) per-locker yaw/pitch — plus the panorama images
> themselves. Resolution is **by range**, so I supply ~dozens of section rows, **not** one row per
> locker (CLAUDE.md). Panoramas are equirectangular Theta exports.

---

### 08.0 — 🚩 Locker + panorama data intake
- **Scope:** Collect section + panorama data and load it (replacing placeholder rows from 02.3).
- **Files:** `supabase/migrations/000x_lockers_seed.sql` (or data load), panoramas uploaded to Supabase Storage.
- **Deliverable:** `locker_sections` covering the real ranges with **no overlaps**, each linked to a `panorama`; optional `lockers` rows with `hotspot_yaw/pitch`. Panoramas go to a **private** bucket that Phase 09 gates behind an `@stu.wvusd.org` session (campus photos must not be public).
- **Done when:** ranges are contiguous/non-overlapping as intended and every section has a panorama reachable by an authenticated session.
- **Depends on:** owner supplying data + images; 02.1. **Blocks 08.1+ with real data** (placeholder usable meanwhile).

### 08.1 — Number entry & resolution
- **Scope:** Input a locker number → `resolveLockerSection(number)`. States: found / not-found.
- **Files:** `src/features/locker/LockerEntry.tsx`.
- **Deliverable:** In-range → section; out-of-range → not-found per DESIGN.md (number in no range).
- **Done when:** a valid number resolves to the right section; an out-of-range number shows not-found.
- **Depends on:** 02.5, 04.3, 04.5

### 08.2 — Section highlight on map
- **Scope:** On resolve, highlight the section's zone and offer "open 360°".
- **Files:** `src/features/locker/LockerScreen.tsx`.
- **Deliverable:** Resolved section's `map_coord`/building highlighted via `highlight(ids)` (05.6) + an affordance to open the panorama.
- **Done when:** resolving highlights the correct zone on the map.
- **Depends on:** 08.1, 05.6

### 08.3 — Pannellum viewer
- **Scope:** Lazy-loaded 360° viewer for a panorama by id, with loading + error states.
- **Files:** `src/features/locker/PanoramaViewer.tsx`.
- **Deliverable:** Pannellum renders the section's equirectangular image (fetched from the gated Storage bucket via the auth session / signed URL); **loader shows while the large image loads (never a blank screen)**; error state on failure; the viewer chunk is code-split.
- **Done when:** opening a section shows a loader then the panorama; a bad/unauthorized URL shows the error state.
- **Depends on:** 08.2, 04.5, 09.4

### 08.4 — Locker hotspot / pin
- **Scope:** Place a hotspot at the locker's yaw/pitch.
- **Files:** `src/features/locker/PanoramaViewer.tsx`.
- **Deliverable:** Per-locker hotspot if `lockers.hotspot_yaw/pitch` exists, else the section default; rendered with the `Hotspot` primitive style.
- **Done when:** the pin appears at the configured angle for the resolved locker.
- **Depends on:** 08.3, 04.6, 02.5

### 08.5 — Flow states & persistence
- **Scope:** Persist `my_locker`; first-run prompt; quick "go to my locker".
- **Files:** `src/features/locker/LockerScreen.tsx`.
- **Deliverable:** Saved locker reopens the right section + panorama; empty (no locker yet) / found / not-found states all match the mockup.
- **Done when:** a saved locker round-trips and reopens correctly across reload; all three states render per mockup.
- **Depends on:** 03.4, 08.3
