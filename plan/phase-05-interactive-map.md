# Phase 05 — Interactive 2D map (SVG)

**Goal:** A Leaflet-hosted campus **SVG** whose named building shapes are directly clickable and
show room number + teacher, with a multi-level toggle and a reusable highlight API for later phases.

**Phase complete when:** the map renders the SVG on mobile, building shapes (ids matching
`buildings.id`) are tappable and open a detail panel of rooms+teachers via the Phase-02 layer, the
level toggle filters shapes, and `highlight(ids)` works.

> 🚩 **DATA-INTAKE CHECKPOINT C/D — STOP and wait for the owner** for the campus map **as SVG**
> (each building a named shape; shapes grouped by `level`), the building→id mapping, and the
> room→teacher directory + master schedule. **SVG shape ids MUST equal `buildings.id`** (hard rule)
> or joins break.

---

### 05.0 — 🚩 SVG asset & id reconciliation
- **Scope:** Receive the campus SVG and reconcile its shape ids/levels to the `buildings` table.
- **Files:** `src/assets/campus-map.svg`, `src/data/mapMeta.ts` (viewBox, level groups, id list).
- **Deliverable:** SVG committed with each building as a `<path>`/`<g id="…">` whose `id` = `buildings.id`, shapes grouped by level (e.g. `<g id="level-0">`); a recorded viewBox/dimensions.
- **Done when:** a dev assertion confirms every interactive shape id exists in `buildings` (and vice-versa) and every shape has a valid `level`; mismatches are listed, not silently ignored.
- **Depends on:** owner supplying the SVG; 02.1 (building ids/levels). **Blocks the rest of Phase 05.**

### 05.1 — Leaflet + SVG base map
- **Scope:** Host the SVG in Leaflet on `CRS.Simple` (e.g. `L.svgOverlay` with the inline SVG, bounds = viewBox), so it pans/zooms crisply. (If `L.svgOverlay` proves limiting, fall back to converting shapes to GeoJSON polygons in image-CRS.)
- **Files:** `src/features/map/MapView.tsx`.
- **Deliverable:** Pan/zoom-bounded map; pinch-zoom on mobile; SVG stays crisp at all zooms; fits 375px.
- **Done when:** the campus SVG renders, bounded, with sane min/max zoom on a phone viewport, no rasterization blur.
- **Depends on:** 05.0

### 05.2 — Building-shape interactivity
- **Scope:** Make each building shape tappable/hoverable and report its id.
- **Files:** `src/features/map/ZonesLayer.tsx` (attach handlers to shapes by id).
- **Deliverable:** Per-shape pointer/keyboard handlers; ≥44px effective targets (pad small shapes); ids validated at load (dev warning on mismatch).
- **Done when:** each building is independently tappable/focusable and reports its `buildings.id`.
- **Depends on:** 05.1, 02.5

### 05.3 — Selection state & detail panel
- **Scope:** Tap a building → fetch building + rooms + teachers → detail panel. States: default / building-selected / not-found.
- **Files:** `src/features/map/BuildingDetail.tsx`.
- **Deliverable:** Panel listing the building's rooms with room numbers + teachers (reuses Card + state primitives); selected shape visually marked.
- **Done when:** tapping a placeholder building shows its rooms/teachers; clearing returns to default; a building with no data shows the not-found state.
- **Depends on:** 05.2, 04.4, 04.5

### 05.4 — Room-level detail
- **Scope:** From a building, select a room → room number + teacher (join via room/teacher, **never** class+period).
- **Files:** `src/features/map/RoomDetail.tsx`.
- **Deliverable:** Room → teacher view using `getRoomWithTeacher`.
- **Done when:** room number + teacher render correctly for seed rooms.
- **Depends on:** 05.3

### 05.5 — Multi-level toggle
- **Scope:** A level switcher that shows only the selected level's building shapes (decision #3 = yes).
- **Files:** `src/features/map/LevelToggle.tsx`.
- **Deliverable:** Toggle that filters by SVG level group / `buildings.level`; remembers the last level; sensible default (ground).
- **Done when:** toggling changes the visible shape set and selection/highlight respect the active level.
- **Depends on:** 05.2

### 05.6 — Highlight API
- **Scope:** Reusable method to highlight a set of building shape ids (reused by schedule highlight and locker).
- **Files:** `src/features/map/useMapHighlight.ts`.
- **Deliverable:** `highlight(ids: string[])` / `clearHighlight()` that styles the matching shapes; switches to a shape's level if needed.
- **Done when:** calling `highlight` marks the right shapes (on the right level) and `clearHighlight` resets them.
- **Depends on:** 05.2, 05.5
