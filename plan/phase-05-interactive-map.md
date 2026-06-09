# Phase 05 — Interactive 2D map

**Goal:** A Leaflet image-overlay campus map with clickable building/room zones that show room
number + teacher, plus a reusable highlight API for later phases.

**Phase complete when:** the map renders the asset on mobile, building zones (ids matching
`buildings.id`) are tappable and open a detail panel of rooms+teachers via the Phase-02 layer, and
`highlight(ids)` works.

> 🚩 **DATA-INTAKE CHECKPOINT C/D — STOP and ask me** for the campus map asset (SVG with named
> shapes preferred, else PNG + zone coords), the building→id mapping, and the room→teacher
> directory. **Building shape ids MUST equal `buildings.id`** (hard rule) or joins break.

---

### 05.0 — 🚩 Map asset & zone-config intake
- **Scope:** Receive the campus map (format per decision #2) and produce a zone config keyed by building id.
- **Files:** `src/assets/campus-map.*` (or Supabase storage), `src/data/mapZones.ts`.
- **Deliverable:** Asset committed/hosted with recorded pixel dimensions; `mapZones` = polygons (image-CRS coords) or named SVG shapes, each keyed to a `buildings.id`; `level` per zone if multi-level (decision #3).
- **Done when:** asset is in place and a dev assertion confirms every zone id exists in `buildings` (and vice-versa); mismatches are listed, not silently ignored.
- **Depends on:** me supplying the asset; 02.1 (building ids). **Blocks the rest of Phase 05.**

### 05.1 — Leaflet base map
- **Scope:** Render the asset via `L.imageOverlay` on `CRS.Simple` with bounds = image size.
- **Files:** `src/features/map/MapView.tsx`.
- **Deliverable:** Pan/zoom-bounded map; pinch-zoom on mobile; fits 375px.
- **Done when:** the campus image renders, bounded, with sane min/max zoom on a phone viewport.
- **Depends on:** 05.0

### 05.2 — Building zones layer
- **Scope:** Render interactive zones from `mapZones`, linked to building ids.
- **Files:** `src/features/map/ZonesLayer.tsx`.
- **Deliverable:** Hoverable/tappable zones with ≥44px effective targets; ids validated at load (dev warning on mismatch).
- **Done when:** each building is independently tappable and reports its id.
- **Depends on:** 05.1, 02.5

### 05.3 — Selection state & detail panel
- **Scope:** Tap a building → fetch building + rooms + teachers → detail panel. States: default / building-selected / not-found.
- **Files:** `src/features/map/BuildingDetail.tsx`.
- **Deliverable:** Panel listing the building's rooms with room numbers + teachers (reuses Card + state primitives).
- **Done when:** tapping a placeholder building shows its rooms/teachers; clearing returns to default; a building with no data shows the not-found state.
- **Depends on:** 05.2, 04.4, 04.5

### 05.4 — Room-level detail
- **Scope:** From a building, select a room → room number + teacher (join via room/teacher, **never** class+period).
- **Files:** `src/features/map/RoomDetail.tsx`.
- **Deliverable:** Room → teacher view using `getRoomWithTeacher`.
- **Done when:** room number + teacher render correctly for seed rooms.
- **Depends on:** 05.3

### 05.5 — Multi-level toggle (conditional)
- **Scope:** If decision #3 = multi-level, add a level switcher filtering zones by `buildings.level`.
- **Files:** `src/features/map/LevelToggle.tsx`.
- **Deliverable:** Toggle showing only the selected level's zones.
- **Done when:** toggling changes the visible zone set; control is hidden when single-level.
- **Depends on:** 05.2; decision #3

### 05.6 — Highlight API
- **Scope:** Reusable method to highlight a set of zone/building ids (reused by now/next and locker).
- **Files:** `src/features/map/useMapHighlight.ts`.
- **Deliverable:** `highlight(ids: string[])` / `clearHighlight()` that visibly marks zones.
- **Done when:** calling `highlight` marks the right zones and `clearHighlight` resets them.
- **Depends on:** 05.2
