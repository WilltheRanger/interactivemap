# Phase 07 — Now/next highlighting & map integration

**Goal:** Drive a "now / next class" banner from a hard-coded bell schedule + current time, and
highlight the student's classes (especially now/next) on the map.

**Phase complete when:** the time engine computes the correct state across all boundaries, the
banner reflects it, and the student's classes are highlighted on the map — matching the recorded
passive-vs-active decision.

> 🚩 **DATA-INTAKE CHECKPOINT E — STOP and ask me** for the real bell schedule (period times +
> day types) and confirm decision #1 (passive vs active). Until then use a clearly-labeled
> placeholder schedule.

---

### 07.0 — 🚩 Bell schedule data
- **Scope:** Encode the bell schedule as a hard-coded module.
- **Files:** `src/data/bellSchedule.ts`.
- **Deliverable / shape:** `DayType` (e.g. `regular | minimum | …`) → ordered periods `{ id, label, start: "HH:MM", end: "HH:MM", kind: "class" | "passing" | "lunch" }`; a calendar/default mapping date→day type (or a manual day-type selector if a calendar isn't supplied).
- **Done when:** schedule encodes real times (or labeled placeholder) with day-type + passing/lunch support.
- **Depends on:** me supplying bell times. **Blocks 07.1+ correctness.**

### 07.1 — Time engine
- **Scope:** Pure function: (now, dayType) → current period, next period, and off-states.
- **Files:** `src/lib/timeEngine.ts`, `src/lib/timeEngine.test.ts`.
- **Deliverable:** `getNowNext(now, schedule): { current?, next?, state }` where `state ∈ before-school | in-class | passing | lunch | after-school | weekend`.
- **Done when:** unit tests (injected fixed clock) cover all boundaries: exact start, exact end, passing gap, lunch, before/after school, weekend.
- **Depends on:** 07.0

### 07.2 — Now/next banner
- **Scope:** Banner showing current + next class with resolved locations, or the right off-hours state.
- **Files:** `src/features/schedule/NowNextBanner.tsx`.
- **Deliverable:** Banner reflecting `getNowNext` + the student's schedule (current/next class → room+building); off-hours shows an appropriate empty state.
- **Done when:** with an injected time, the banner is correct in every `state`.
- **Depends on:** 07.1, 06.4, 04.5

### 07.3 — Your-classes highlight on map
- **Scope:** Highlight the student's class buildings/rooms on the map; emphasize now/next.
- **Files:** `src/features/map/ScheduleHighlight.ts`.
- **Deliverable:** Uses `highlight(ids)` (05.6) to mark all scheduled buildings; now/next visually distinct.
- **Done when:** entering a schedule highlights those buildings and now/next stands out.
- **Depends on:** 05.6, 06.4

### 07.4 — Passive vs active (decision #1)
- **Scope:** Honor the recorded decision — time-aware (active) or plain schedule display (passive).
- **Files:** `src/features/schedule/NowNextBanner.tsx` (+ a config flag).
- **Deliverable:** Behavior matches decision #1; if passive, no time-driven emphasis.
- **Done when:** the shipped behavior equals the DECISIONS.md answer.
- **Depends on:** 00.1, 07.2

### 07.5 — Cross-screen wiring
- **Scope:** Keep banner + map highlight + schedule in sync.
- **Files:** `src/data/usePersonal.ts` consumers.
- **Deliverable:** Editing the schedule updates the banner and map highlight live.
- **Done when:** a schedule edit reflects in both without reload.
- **Depends on:** 07.2, 07.3, 03.5
