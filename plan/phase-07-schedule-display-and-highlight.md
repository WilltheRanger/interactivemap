# Phase 07 — Schedule display & map highlight (passive)

**Goal:** Display the entered schedule, let the student tap a period to see its class + location, and
highlight the student's classes on the map. **Passive** per decision #1 — no live now/next
auto-tracking, no clock-driven auto-advance.

**Phase complete when:** the saved schedule renders, tapping a period shows its class + resolved
room/building/teacher and highlights that building on the map, and all class buildings highlight on
the map. Empty state matches the mockup.

> 🚩 **CHECKPOINT E is OPTIONAL here.** A bell schedule is only needed for the optional static
> "current period" label (07.4). Core passive display needs no bell times.
>
> Scope note: the active time-engine / auto-advancing now-next banner from the prototype is **cut**
> per decision #1.

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

### 07.4 — (Optional) static current-period label — pending confirm
- **Scope:** A one-time clock→period lookup that labels the period happening now (e.g. "Now: Period 3"), **no** auto-advance or auto-highlight. Off by default; build only if the owner confirms + supplies bell times (intake E).
- **Files:** `src/data/bellSchedule.ts`, `src/features/schedule/CurrentPeriodLabel.tsx`.
- **Deliverable:** If enabled, a static label computed once on load; absent when disabled or off-hours.
- **Done when:** with the feature enabled and a bell schedule present, the label shows the correct current period; with it disabled, nothing renders.
- **Depends on:** owner confirm + intake E. **Skippable.**

### 07.5 — Cross-screen sync
- **Scope:** Keep the schedule list + map highlight in sync as the schedule changes.
- **Files:** `src/data/usePersonal.ts` consumers.
- **Deliverable:** Editing the schedule updates the list and the map highlight live.
- **Done when:** a schedule edit reflects in both without reload.
- **Depends on:** 07.1, 07.3, 03.5
