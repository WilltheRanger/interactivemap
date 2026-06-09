# Phase 10 — Accessibility, real-data cutover & pilot

**Goal:** Pass WCAG AA + full keyboard nav, replace **every** placeholder with validated real data,
verify the end-to-end flow on a real phone, and hand off maintenance.

**Phase complete when:** a11y has no critical violations and is keyboard-navigable, no placeholder
data remains and integrity checks pass, the full flow works on a real phone, pilot feedback is
captured, and a maintenance owner + runbook exist.

---

### 10.1 — Accessibility audit & fixes
- **Scope:** WCAG AA across all screens (map, schedule, locker, panorama).
- **Files:** cross-cutting (components + screens).
- **Deliverable:** AA contrast, logical focus order, full keyboard nav, alt text on images, ARIA labels on controls, a screen-reader pass.
- **Done when:** axe/Lighthouse a11y reports no critical violations and every flow is operable by keyboard alone.
- **Depends on:** Phases 04–08

### 10.2 — 🚩 Real-data cutover (CHECKPOINT G)
- **Scope:** Replace placeholder reference data + bell schedule with the real intake data; remove placeholder labels.
- **Files:** Supabase data, `src/data/bellSchedule.ts`, `src/data/mapZones.ts`.
- **Deliverable:** Real `buildings/rooms/teachers/locker_sections/panoramas` + bell times loaded; placeholder rows gone.
- **Integrity checks:** every `mapZones` building id ∈ `buildings`; locker ranges non-overlapping and covering; every `room.teacher_id`/`teacher.home_room_id` resolves; every section has a panorama.
- **Done when:** no placeholder rows/labels remain, all integrity checks pass, and a spot-check matches campus reality.
- **Depends on:** all prior intake (C–F) received and signed off.

### 10.3 — End-to-end device QA
- **Scope:** Run the full prototype flow on a real phone at ~375px in a hallway-like setting.
- **Files:** — (test pass; bug-fix commits as needed).
- **Deliverable:** Verified flow: schedule entry → map highlight → now/next → locker → 360° pin.
- **Done when:** the whole flow works on a real mobile device with real data.
- **Depends on:** 10.1, 10.2

### 10.4 — Pilot & feedback
- **Scope:** Pilot with a handful of students; capture feedback.
- **Files:** `docs/pilot-feedback.md`.
- **Deliverable:** ≥ a few students complete the flow; feedback logged with severity.
- **Done when:** the feedback log exists and blocking issues are triaged.
- **Depends on:** 10.3

### 10.5 — Maintenance handoff (decision #7)
- **Scope:** Document who updates locker/room/teacher/bell data yearly and how.
- **Files:** `MAINTENANCE.md`.
- **Deliverable:** Named owner + a runbook (SQL/seed/admin steps) for the yearly data refresh, noting that data goes stale by September without it (planning §Risks).
- **Done when:** `MAINTENANCE.md` has an owner and a reproducible update procedure.
- **Depends on:** 00.1 (decision #7), 10.2
