# Phase 06 — Schedule entry & resolution

**Goal:** Let the student enter their classes by **teacher or room**, resolve each to a location via
the join key, and persist on-device. `class_label` is a display label only.

**Phase complete when:** a full schedule can be entered/edited, persists across reload, and each
entry resolves to room+building+teacher; empty / filled / lookup-miss states match the mockup.

---

### 06.1 — Period model
- **Scope:** Define the period slots that drive the form (period labels from the bell schedule; real times land in Phase 07).
- **Files:** `src/data/periods.ts`.
- **Deliverable:** Ordered period list (e.g. P1…P6 + any 0/7) used to render one form row per period.
- **Done when:** the period list renders the form rows.
- **Depends on:** 01.3

### 06.2 — Schedule entry form
- **Scope:** Per period: pick a **teacher** OR a **room**, plus a free-text `class_label`.
- **Files:** `src/features/schedule/ScheduleForm.tsx`.
- **Deliverable:** Saving a period writes `{kind, teacher_id|room_id, class_label}` via `setPeriod`; reload persists. The resolver field is teacher/room — `class_label` is never used to resolve.
- **Done when:** entering/saving a period round-trips through `personalStore`.
- **Depends on:** 03.3, 04.3

### 06.3 — Teacher / room pickers
- **Scope:** Searchable pickers backed by reference data; handle large lists.
- **Files:** `src/features/schedule/TeacherPicker.tsx`, `RoomPicker.tsx`.
- **Deliverable:** Type-to-filter selects listing seed teachers/rooms; selection yields an id.
- **Done when:** picking resolves to the correct `teacher_id`/`room_id`.
- **Depends on:** 06.2, 02.5

### 06.4 — Resolution to location
- **Scope:** Resolve a saved entry → room → building (teacher→home_room or room→building).
- **Files:** `src/features/schedule/resolveEntry.ts`.
- **Deliverable:** Each saved period shows resolved room + building + teacher.
- **Done when:** resolution is correct for seed data; a teacher with no home room degrades gracefully (clear "room TBD", not a crash).
- **Depends on:** 06.3, 02.5

### 06.5 — States (empty / filled / miss)
- **Scope:** First-run prompt, filled view, and lookup-miss.
- **Files:** `src/features/schedule/ScheduleScreen.tsx`.
- **Deliverable:** Empty state = clear CTA to add classes (not a blank screen); filled = the schedule list; miss = teacher/room not found message — reusing state primitives.
- **Done when:** each state renders per DESIGN.md.
- **Depends on:** 06.4, 04.5

### 06.6 — Edit / clear
- **Scope:** Edit a period, remove a period, clear all.
- **Files:** `src/features/schedule/ScheduleForm.tsx`.
- **Deliverable:** Mutations persist and update reactively via `useSchedule`.
- **Done when:** edit/remove/clear all persist and reflect live.
- **Depends on:** 06.2, 03.5
