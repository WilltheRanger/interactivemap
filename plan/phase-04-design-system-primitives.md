# Phase 04 — Design system & UI primitives

**Goal:** Replace placeholder tokens with values **extracted from the mockup**, then build the
small, reusable, accessible primitive set DESIGN.md requires.

**Phase complete when:** every `<from mockup>` placeholder in DESIGN.md is a real value mirrored in
`tokens.css`, the primitives match the mockup with the a11y baseline (≥44px targets, visible focus,
labels), and a dev-only gallery verifies them.

> 🚩 **DATA-INTAKE CHECKPOINT B — STOP and ask me for the mockup before starting.** Do not invent
> colors, type, spacing, or any screen/state not in the mockup (DESIGN.md). If it's a Figma file,
> read variables/measurements directly rather than eyeballing.

---

### 04.0 — 🚩 Mockup intake & token extraction
- **Scope:** Pull exact tokens from the mockup and record them.
- **Files:** `DESIGN.md` (fill the token tables), `src/styles/tokens.css`.
- **Deliverable:** Real values for colors (bg/surface/text/primary/accent/border/error), type (fonts + size/weight scale), spacing scale, radius/shadow/density.
- **Done when:** no `<from mockup>` / placeholder tokens remain; `tokens.css` mirrors DESIGN.md exactly.
- **Depends on:** me supplying the mockup. **Blocks all of Phase 04+ UI.**

### 04.1 — Theme wiring + contrast check
- **Scope:** Swap the Phase-01 placeholder tokens for the real ones; verify AA contrast.
- **Files:** `src/styles/tokens.css`, `src/styles/global.css`.
- **Deliverable:** App shell renders in the real palette; a documented list of text/background pairs meeting WCAG AA.
- **Done when:** shell uses real tokens and each core text/bg pair passes AA.
- **Depends on:** 04.0, 01.6

### 04.2 — Button primitive
- **Scope:** Button with the mockup's variants/states.
- **Files:** `src/components/Button.tsx`.
- **Deliverable:** Variants/states per mockup (default/hover/focus/active/disabled).
- **Done when:** matches mockup, ≥44px touch target, visible keyboard focus ring.
- **Depends on:** 04.1

### 04.3 — Input + Select primitives
- **Scope:** Labeled, accessible text input and select (used by schedule/locker entry).
- **Files:** `src/components/Input.tsx`, `src/components/Select.tsx`.
- **Deliverable:** Associated `<label>`, error/invalid styling per mockup, keyboard operable.
- **Done when:** screen-reader announces label; keyboard selection works; matches mockup.
- **Depends on:** 04.1

### 04.4 — Card / list-item primitive
- **Scope:** Surface used for room/teacher detail and schedule rows.
- **Files:** `src/components/Card.tsx`.
- **Deliverable:** Card matching mockup spacing/radius/shadow.
- **Done when:** matches mockup; reused by later phases.
- **Depends on:** 04.1

### 04.5 — State primitives (loading / empty / error)
- **Scope:** The three required async states as reusable components (DESIGN.md §async states).
- **Files:** `src/components/{Loader,EmptyState,ErrorState}.tsx`.
- **Deliverable:** `Loader` (e.g. panorama loading), `EmptyState` (first-run prompt), `ErrorState` (lookup miss) — each takes a message.
- **Done when:** each renders per mockup and is reused by map/schedule/locker.
- **Depends on:** 04.1

### 04.6 — MapPin & PanoramaHotspot primitives
- **Scope:** Visual pin and hotspot (no map/viewer yet).
- **Files:** `src/components/{MapPin,Hotspot}.tsx`.
- **Deliverable:** Standalone pin + hotspot matching the mockup.
- **Done when:** both render in isolation matching mockup; consumed in Phases 05/08.
- **Depends on:** 04.1

### 04.7 — Component gallery (dev-only)
- **Scope:** A dev route showing all primitives + states for visual QA.
- **Files:** `src/features/dev/Gallery.tsx` (excluded from prod nav).
- **Deliverable:** Gallery page rendering every primitive and state.
- **Done when:** all primitives appear and match the mockup; not in production navigation.
- **Depends on:** 04.2–04.6
