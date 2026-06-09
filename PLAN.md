# PLAN.md — DBHS Wayfinder build plan (index)

Lean phase index. Detail for each phase lives in `plan/phase-NN-*.md`. **No code is written
until this plan is reviewed.**

## Binding sources (read before any phase)
- `dbhs-wayfinder-planning.md` — scope, architecture, data model, open decisions, risks (source of truth).
- `CLAUDE.md` — hard rules, out-of-scope list, data-intake protocol, stack.
- `DESIGN.md` — UI rules + design tokens. **The mockup is the visual source of truth.**

## Repo status at planning time
- Only docs exist (`CLAUDE.md`, `DESIGN.md`, `dbhs-wayfinder-planning.md`, `README.md`). No app yet.
- **Mockup is NOT in the repo** — DESIGN.md tokens are still `<from mockup>` placeholders. → intake in Phase 04.
- **`dbhs-wayfinder-prototype.jsx` referenced but NOT in the repo.** → recover/transcribe in Phase 00.

## Hard rules — enforce in every phase (from CLAUDE.md)
- **Join key:** resolve a class location by **teacher or room, NEVER class+period.** `class_label` is display-only.
- **Data split:** reference data → Supabase (read-only to the app); personal data (schedule, locker) → device `localStorage`. **No student-identifying data server-side, ever.**
- **Placeholder, never invented:** until real data arrives, all data is clearly labeled placeholder.
- **Match the mockup**; ask before inventing any screen/state. Building shape ids in the map **must equal** `buildings.id`.
- **Stay in scope:** no SIS auto-pull, no navigable/photoreal 3D, no native app, no live GPS. Ask before new scope/deps.

## 🚩 Data-intake checkpoints (STOP and ask me — do not fabricate)
| # | Asset | Needed by | Phase |
|---|-------|-----------|-------|
| A | Open-decision answers (the 7 in planning §Open decisions) | whole build | 00 |
| B | Design **mockup** + exact tokens (Figma URL or measured image) | all UI | 04 |
| C | Campus **map asset** (SVG named shapes preferred, else PNG + zone coords) + building→id map | map | 05 |
| D | **Room→teacher directory** + building coordinates/zones | map, schedule | 05/06 |
| E | **Bell schedule** (period times, day types) + passive-vs-active decision | now/next | 07 |
| F | **Locker sections** (range, building/coord, panorama, optional per-locker yaw/pitch) + **panorama images** | locker | 08 |
| G | **Real-data cutover** — replace all placeholders | launch | 10 |

## Flagged decisions (recommend, but confirm — these add deps/scope)
- **TypeScript** (recommended for the FK-heavy join-key model) vs plain JS. Plan assumes `.ts/.tsx`.
- **Data fetching:** TanStack Query (recommended) vs hand-rolled hooks.
- **Deploy host:** Vercel / Netlify / GitHub Pages (decision #6 confirms web/PWA, not native).
- Approved-in-stack deps (no flag needed): Leaflet, Pannellum, Supabase JS, vite-plugin-pwa.

## Phases
- **[00 — Decisions & intake register](plan/phase-00-decisions-and-intake.md)** — Resolve the 7 open decisions and stand up the data-intake register so school-dependent assets are requested first. Chunks: Decisions doc · Intake register · Interaction reference · Supabase project & secrets. *Complete when:* decisions recorded, intake register live with owners/status, env approach agreed.
- **[01 — Scaffold & tooling](plan/phase-01-scaffold-and-tooling.md)** — Boot a React app with structure, lint/format, env config, a 3-screen shell, and centralized (placeholder) tokens. Chunks: Vite+React · Lint/format · Structure · Env/config · App shell · Placeholder theme · Commands. *Complete when:* app boots/builds/lints, the 3 screens navigate, commands documented.
- **[02 — Supabase reference data](plan/phase-02-supabase-reference-data.md)** — Schema + FKs + RLS read-only + placeholder seed + typed access layer encoding the join-key rules. Chunks: Schema · RLS · Seed · Types/client · Query layer · Hooks. *Complete when:* read-only schema live, placeholder seed loads, query layer proven against seed.
- **[03 — Personal data (localStorage)](plan/phase-03-personal-data-localstorage.md)** — On-device schedule + locker store with versioning/validation; nothing personal leaves the device. Chunks: Store module · Versioning · Schedule API · Locker API · Hooks. *Complete when:* personal data persists/validates/versions, no network writes.
- **[04 — Design system & primitives](plan/phase-04-design-system-primitives.md)** 🚩 — Extract real tokens from the mockup and build reusable, accessible primitives. Chunks: Token extraction · Theme wiring · Button · Input/Select · Card · State primitives · Pin/Hotspot · Gallery. *Complete when:* tokens sourced from mockup, primitives match mockup + a11y baseline, gallery verifies them.
- **[05 — Interactive 2D map](plan/phase-05-interactive-map.md)** 🚩 — Leaflet image-overlay map with clickable building/room zones → room+teacher detail, plus a reusable highlight API. Chunks: Asset intake · Base map · Zones · Selection/detail · Room detail · Multi-level · Highlight API. *Complete when:* zones (ids matching DB) are clickable and show rooms+teachers; highlight API ready.
- **[06 — Schedule entry & resolution](plan/phase-06-schedule-entry.md)** — Student enters classes by teacher/room; each resolves to a location via the join key; persists locally. Chunks: Period model · Entry form · Pickers · Resolution · States · Edit/clear. *Complete when:* a full schedule persists and each entry resolves to room+building+teacher; empty/filled/miss states match mockup.
- **[07 — Now/next & map highlight](plan/phase-07-now-next-and-highlight.md)** 🚩 — Time engine over a bell schedule drives a now/next banner and highlights the student's classes on the map. Chunks: Bell data · Time engine · Banner · Map highlight · Passive/active · Wiring. *Complete when:* now/next computed across all time states and reflected in banner + map highlight.
- **[08 — Locker finder & 360°](plan/phase-08-locker-finder-360.md)** 🚩 — Locker number → section by range → map highlight → Pannellum 360° with a pin; persists locally. Chunks: Data intake · Entry/resolve · Section highlight · Pannellum · Hotspot · States/persistence. *Complete when:* a number resolves by range, highlights, and opens its panorama with a correct pin; loading/found/not-found match mockup.
- **[09 — PWA, performance & deploy](plan/phase-09-pwa-perf-deploy.md)** — Installable PWA, performant panoramas without layout shift, deployed to a static host + Supabase. Chunks: Manifest/icons · Service worker · Image perf · Deploy pipeline · Docs. *Complete when:* installable PWA serves from a production URL against Supabase, with no panorama CLS.
- **[10 — A11y, real-data cutover & pilot](plan/phase-10-a11y-realdata-pilot.md)** 🚩 — WCAG AA + keyboard pass, replace every placeholder with validated real data, pilot on a phone, document maintenance. Chunks: A11y audit · Real-data cutover · Device QA · Pilot · Maintenance handoff. *Complete when:* AA + keyboard pass, no placeholders remain, end-to-end flow verified on a real phone, maintenance owner documented.

## Recommended build order & blocking
Phases are ordered so each builds on verified prior work. **00 → 01 → 02 → 03** have no external blockers and
should run first to de-risk. **04, 05, 07, 08, 10** each open with a 🚩 intake checkpoint and will stall there
until I supply the asset — front-load those requests during Phase 00. Non-blocked work (data layers, time engine,
PWA plumbing) can proceed while intake is pending.
