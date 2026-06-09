# Interaction reference (passive)

`dbhs-wayfinder-prototype.jsx` is referenced in the planning doc but is **not in the repo**. Until
it's recovered, this transcribes the intended interaction flow from `dbhs-wayfinder-planning.md`
§Current status — **adapted to the passive schedule decision** (DECISIONS.md #1).

> The original prototype was *active* (time-aware now/next). Per decision #1 the shipped flow is
> **passive / tap-driven** — wherever the prototype auto-advanced by clock, the real app instead
> responds to the student tapping a period.

## Core flow
1. **Sign in** (`@stu.wvusd.org` Google) → app shell. _(Phase 09; gate only — no personal data stored server-side.)_
2. **Schedule entry** — the student self-enters classes period by period:
   - pick the **course** (filtered to that period via the master schedule),
   - if the course has multiple sections, **pick the teacher** (the join key),
   - `class_label` auto-fills from the course (display-only, editable).
   - Saved to `localStorage` only.
3. **Schedule display (passive)** — the saved schedule renders as a list (period → class → resolved room/building/teacher). **Tapping a period** shows its detail and highlights that building on the map.
4. **Map** — campus SVG; tap any building → its rooms + teachers. The student's classes are highlighted; multi-level via a level toggle.
5. **Locker** — enter a locker number → resolves to a **section by range** → highlights the section on the map → open the **360° panorama** with a pin on the locker. The locker number persists in `localStorage`.

## States to honor (DESIGN.md)
- **Loading** — panorama loading (large Theta images → loader, never a blank screen).
- **Empty / first-run** — no schedule yet → a clear CTA; no locker yet → prompt.
- **Not-found** — locker number in no range; teacher/room/course not found.

## Hard rules visible in this flow
- Resolve by **teacher/room**, never class+period (the section pick in step 2 is exactly this).
- Reference data (buildings/rooms/teachers/master schedule/lockers/panoramas) is read-only from Supabase;
  the **schedule + locker live only on the device**.
