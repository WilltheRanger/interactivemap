# Phase 11 — Accessibility, real-data cutover & pilot

**Goal:** Pass WCAG AA + full keyboard nav, replace **every** placeholder with validated real data,
verify the end-to-end flow on a real phone, and hand off maintenance.

**Phase complete when:** a11y has no critical violations and is keyboard-navigable, no placeholder
data remains and integrity checks pass, the full flow works on a real phone, pilot feedback is
captured, and a maintenance owner + runbook exist.

---

### 11.1 — Accessibility audit & fixes
- **Scope:** WCAG AA across all screens (sign-in, map, schedule, locker, panorama).
- **Files:** cross-cutting (components + screens).
- **Deliverable:** AA contrast, logical focus order, full keyboard nav (incl. the sign-in flow and the map's building shapes), alt text on images, ARIA labels on controls, a screen-reader pass.
- **Done when:** axe/Lighthouse a11y reports no critical violations and every flow is operable by keyboard alone.
- **Depends on:** Phases 04–09

### 11.2 — 🚩 Real-data cutover (CHECKPOINT G)
- **Scope:** Replace placeholder reference data with the real intake data; remove placeholder labels.
- **Files:** Supabase data, `src/assets/campus-map.svg`, `src/data/mapMeta.ts`, (optional) `src/data/bellSchedule.ts`.
- **Deliverable:** Real `buildings/rooms/teachers/master_schedule/locker_sections/panoramas` (+ optional bell times) loaded; placeholder rows gone.
- **Integrity checks:** every SVG building shape id ∈ `buildings`; every `buildings.level` has a matching SVG level group; locker ranges non-overlapping and covering; every `room.teacher_id`/`teacher.home_room_id` resolves; every `master_schedule` row resolves to a real teacher+room; every section has a (gated) panorama.
- **Done when:** no placeholder rows/labels remain, all integrity checks pass, RLS is confirmed authenticated-only, and a spot-check matches campus reality.
- **Depends on:** all prior intake (B–F, H) received and signed off.

### 11.3 — End-to-end device QA
- **Scope:** Run the full flow on a real phone at ~375px in a hallway-like setting.
- **Files:** — (test pass; bug-fix commits as needed).
- **Deliverable:** Verified flow: sign-in → schedule entry → tap period → map highlight → locker → 360° pin.
- **Done when:** the whole flow works on a real mobile device with real data and sign-in.
- **Depends on:** 11.1, 11.2

### 11.4 — Pilot & feedback
- **Scope:** Pilot with a handful of students; capture feedback.
- **Files:** `docs/pilot-feedback.md`.
- **Deliverable:** ≥ a few students complete the flow; feedback logged with severity.
- **Done when:** the feedback log exists and blocking issues are triaged.
- **Depends on:** 11.3

### 11.5 — Maintenance handoff (decision #7)
- **Scope:** Document who at DBHS updates locker/room/teacher/master-schedule (+ optional bell) data yearly and how.
- **Files:** `MAINTENANCE.md`.
- **Deliverable:** A named DBHS owner/role + a runbook (SQL/seed/admin steps, incl. re-checking SVG↔`buildings` id parity) for the yearly refresh, noting that data goes stale by September without it (planning §Risks).
- **Done when:** `MAINTENANCE.md` has a named owner and a reproducible update procedure.
- **Depends on:** 00.1 (decision #7), 11.2
