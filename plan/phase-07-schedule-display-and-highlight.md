# Phase 07 — Schedule display & map highlight (passive)

**Goal:** Display the entered schedule, let the student tap a period to see its class + location, and
highlight the student's classes on the map. **Passive** per decision #1 — no live now/next
auto-tracking, no clock-driven auto-advance.

**Phase complete when:** the saved schedule renders, tapping a period shows its class + resolved
room/building/teacher and highlights that building on the map, and all class buildings highlight on
the map. Empty state matches the mockup.

> **No bell schedule needed (CHECKPOINT E not required).** Per the owner's final call the schedule
> is **fully passive / tap-driven** — the active time-engine, the auto-advancing now-next banner,
> AND the optional static "current period" label are all **cut**. Intake E is only ever revisited
> if the owner later wants per-period time ranges displayed.

---

### 07.1 — Schedule list view
- **Scope:** Render the entered periods as a list (period → `class_label` → resolved room/building/teacher).
- **Files:** `src/features/schedule/ScheduleList.tsx`.
- **Deliverable:** Tappable list reusing Card/state primitives; empty state with a CTA when no schedule exists.
- **Done when:** the saved schedule renders as a list; empty shows the prompt, not a blank screen.
- **Depends on:** 06.4, 04.4, 04.5

### 07.2 — Tap-to-locate (period detail)
- **Scope:** Tap a period → detail (class + room + building + teacher) and trigger the map highlight for that period's building.
- **Files:** `src/features/schedule/PeriodDetail.tsx`.
- **Deliverable:** Period detail view; selecting a period calls `highlight([buildingId])` and (if needed) switches the map level.
- **Done when:** tapping a period shows its details and highlights its building on the map.
- **Depends on:** 07.1, 05.6

### 07.3 — Your-classes map highlight (static)
- **Scope:** Highlight all of the student's scheduled buildings on the map at once.
- **Files:** `src/features/map/ScheduleHighlight.ts`.
- **Deliverable:** Uses `highlight(ids)` (05.6) to mark every scheduled building; no time-based emphasis.
- **Done when:** opening the map with a saved schedule highlights all class buildings across the relevant levels.
- **Depends on:** 05.6, 06.4

### 07.4 — Cross-screen sync
- **Scope:** Keep the schedule list + map highlight in sync as the schedule changes.
- **Files:** `src/data/usePersonal.ts` consumers.
- **Deliverable:** Editing the schedule updates the list and the map highlight live.
- **Done when:** a schedule edit reflects in both without reload.
- **Depends on:** 07.1, 07.3, 03.5
