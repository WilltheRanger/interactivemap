# Phase 06 — Schedule entry & resolution

**Goal:** Let the student enter their classes via master-schedule-powered pickers, resolve each to a
location by the **teacher/room** join key, and persist on-device. `class_label` is display-only.

> **Status: built ✅** (against placeholder seed; restyle when mockup B lands). Implementation
> consolidates the pickers into a shared `OptionList` + a `PeriodEditor` state machine
> (course → section, with teacher / building→room directory fallbacks) instead of three separate
> picker files. The period list in `src/data/periods.ts` is the **confirmed structure** (owner,
> 2026-06-10): periods 0–6, with Period 0 the optional zero period (labeled optional; empty = none).
> Live verification against Supabase happens on the deployed preview (this container can't reach
> the network).

**Phase complete when:** a full schedule can be entered/edited, persists across reload, and each
entry resolves to room+building+teacher; empty / filled / lookup-miss states match the mockup.

> The master schedule only narrows the picklist — the field stored and resolved on is always
> `teacher_id` (or `room_id`), never `(course, period)` (hard rule).

---

### 06.1 — Period model
- **Scope:** Define the period slots that drive the form (period labels; real bell times are optional, Phase 07).
- **Files:** `src/data/periods.ts`.
- **Deliverable:** Ordered period list (e.g. P0…P7 as applicable) → one form row per period.
- **Done when:** the period list renders the form rows.
- **Depends on:** 01.3

### 06.2 — Schedule entry form
- **Scope:** Per period, capture the student's section and a `class_label`.
- **Files:** `src/features/schedule/ScheduleForm.tsx`.
- **Deliverable:** Saving a period writes `{kind:'teacher'|'room', teacher_id|room_id, class_label}` via `setPeriod`; reload persists. The resolver field is teacher/room; `class_label` is never used to resolve.
- **Done when:** entering/saving a period round-trips through `personalStore`.
- **Depends on:** 03.3, 04.3

### 06.3 — Course/teacher pickers (master-schedule-powered)
- **Scope:** Per period: pick a **course** (filtered to that period via `getCoursesForPeriod`); if the course has multiple sections, **force a teacher choice** (`getSectionsForCourse`); resolve to a `teacher_id`/`room_id`. `class_label` auto-fills from the course (editable, display-only). Fall back to a plain teacher/room directory picker if the master schedule is absent.
- **Files:** `src/features/schedule/CoursePicker.tsx`, `TeacherPicker.tsx`, `RoomPicker.tsx`.
- **Deliverable:** Type-to-filter pickers; a single-section course auto-selects its teacher, a multi-section course requires choosing one.
- **Done when:** picking the seed duplicate-section course presents both sections and the chosen one yields the correct `teacher_id`/`room_id` + `class_label`.
- **Depends on:** 06.2, 02.5

### 06.4 — Resolution to location
- **Scope:** Resolve a saved entry → room → building (teacher→home_room or room→building).
- **Files:** `src/features/schedule/resolveEntry.ts`.
- **Deliverable:** Each saved period shows resolved room + building + teacher.
- **Done when:** resolution is correct for seed data; a teacher with no home room degrades gracefully ("room TBD", not a crash).
- **Depends on:** 06.3, 02.5

### 06.5 — States (empty / filled / miss)
- **Scope:** First-run prompt, filled view, and lookup-miss.
- **Files:** `src/features/schedule/ScheduleScreen.tsx`.
- **Deliverable:** Empty = clear CTA to add classes (not a blank screen); filled = the schedule list; miss = course/teacher/room not found — reusing state primitives.
- **Done when:** each state renders per DESIGN.md.
- **Depends on:** 06.4, 04.5

### 06.6 — Edit / clear
- **Scope:** Edit a period, remove a period, clear all.
- **Files:** `src/features/schedule/ScheduleForm.tsx`.
- **Deliverable:** Mutations persist and update reactively via `useSchedule`.
- **Done when:** edit/remove/clear all persist and reflect live.
- **Depends on:** 06.2, 03.5
