# Phase 03 — Personal data layer (localStorage)

**Goal:** Persist the student's schedule + locker **on the device only**, with versioning and
validation. Enforce the privacy line: nothing personal is ever sent to Supabase.

**Phase complete when:** personal data round-trips through `localStorage`, survives reload,
validates input, carries a version with a migration path, and a check confirms no network writes
of personal data occur.

> Only the **join key** (`teacher_id` or `room_id`) + a display `class_label` are stored — never
> class+period as the resolver, never anything identifying the student to a server.

---

### 03.1 — Store module
- **Scope:** Typed read/write wrapper over `localStorage` under one namespaced key.
- **Files:** `src/lib/personalStore.ts`.
- **Deliverable / shape:**
  ```ts
  // key: "dbhs-wayfinder:v1"
  type Personal = {
    version: 1;
    schedule: Record<string /*period*/, ScheduleEntry>;
    my_locker: number | null;
  };
  type ScheduleEntry =
    | { kind: "teacher"; teacher_id: string; class_label: string }
    | { kind: "room";    room_id: string;    class_label: string };
  ```
  `read(): Personal`, `write(p): void`, `clearAll(): void`.
- **Done when:** round-trip works; missing/corrupt JSON returns safe defaults instead of throwing.
- **Depends on:** 01.3

### 03.2 — Versioning & migration
- **Scope:** Version gate + migration function for future shape changes.
- **Files:** `src/lib/personalStore.ts` (migrate), `src/lib/personalStore.test.ts`.
- **Deliverable:** `migrate(raw): Personal` mapping unknown/older shapes → current default.
- **Done when:** a unit test covers unknown-version → default and a stubbed v0→v1 path.
- **Depends on:** 03.1

### 03.3 — Schedule API
- **Scope:** Period-keyed schedule mutations enforcing the join-key shape.
- **Files:** `src/lib/personalStore.ts`.
- **Deliverable:** `setPeriod(period, ScheduleEntry)`, `removePeriod(period)`, `getSchedule()`. Types make it impossible to store class+period as the resolver.
- **Done when:** set/get/remove verified; an entry always carries `teacher_id|room_id` + `class_label`.
- **Depends on:** 03.1

### 03.4 — Locker API
- **Scope:** Locker number persistence + validation.
- **Files:** `src/lib/personalStore.ts`.
- **Deliverable:** `setMyLocker(n: number | null)`, `getMyLocker()`; validates positive integer within a plausible bound.
- **Done when:** set/get/clear verified; non-integer/empty input rejected with a clear result.
- **Depends on:** 03.1

### 03.5 — React hooks
- **Scope:** Reactive hooks so edits propagate across screens without reload.
- **Files:** `src/data/usePersonal.ts`.
- **Deliverable:** `useSchedule()`, `useMyLocker()` backed by a context or the `storage` event.
- **Done when:** updating in one component reflects in another live; reload restores state.
- **Depends on:** 03.3, 03.4
