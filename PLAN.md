# PLAN.md — DBHS Wayfinder build plan (index)

Lean phase index. Detail for each phase lives in `plan/phase-NN-*.md`. **No code is written
until this plan is reviewed.**

## Binding sources (read before any phase)
- `dbhs-wayfinder-planning.md` — scope, architecture, data model, open decisions, risks (source of truth).
- `CLAUDE.md` — hard rules, out-of-scope list, data-intake protocol, stack.
- `DESIGN.md` — UI rules + design tokens. A mockup is the visual source of truth (the owner will supply their own — see below).

## Repo status at planning time
- Only docs exist (`CLAUDE.md`, `DESIGN.md`, `dbhs-wayfinder-planning.md`, `README.md`). No app yet.
- **The mockups referenced in the docs are void** (owner's instruction). The owner will supply **their own mockup later**; until then UI styling waits, but non-visual phases proceed. → intake B, Phase 04.
- **`dbhs-wayfinder-prototype.jsx` referenced but NOT in the repo.** → recover/transcribe in Phase 00.

## Hard rules — enforce in every phase (from CLAUDE.md)
- **Join key:** resolve a class location by **teacher or room, NEVER class+period.** `class_label` is display-only. (The master schedule is a data *source* for pickers only — it does not become the join key.)
- **Data split:** reference data → Supabase (read-only to the app); personal data (schedule, locker) → device `localStorage`. **No student-identifying data server-side, ever** — and personal data is never keyed to the signed-in Google identity.
- **Placeholder, never invented:** until real data arrives, all data is clearly labeled placeholder.
- **Match the mockup** (the owner's forthcoming one); ask before inventing any screen/state. Building shape ids in the SVG map **must equal** `buildings.id`.
- **Stay in scope:** no SIS auto-pull, no navigable/photoreal 3D, **no native app** (PWA only), no live GPS. Ask before new scope/deps.

## Resolved decisions (Phase 00 — locked with the owner)
1. **Schedule view: passive (fully tap-driven).** Tap a period → see its class/room/teacher. **No** live now/next auto-tracking and **no** current-period label.
2. **Map format: SVG** (vector, each building a named shape; shape id = `buildings.id`).
3. **Multi-level: yes** (`level` field + a map level toggle).
4. **Master schedule: yes, as a pickers data source**; resolution stays **teacher/room** (hard rule).
5. **Auth: Google sign-in, access-gate only, restricted to `@stu.wvusd.org`.** Personal data stays on-device, never tied to the Google identity. Gating also keeps the campus map/360° photos off the public web.
6. **Platform: PWA for v1.** Native iOS is **out of scope** (a possible separate future project, not this build).
7. **Maintenance owner: DBHS** (name a specific role/person in `MAINTENANCE.md`).
- **Tooling:** TypeScript; TanStack Query for data fetching; deploy host chosen in Phase 10. (Leaflet, Pannellum, Supabase JS, Supabase Auth, vite-plugin-pwa already in the approved stack.)

## 🚩 Data-intake checkpoints (STOP and ask the owner — do not fabricate)
| # | Asset | Status | Needed by | Phase |
|---|-------|--------|-----------|-------|
| A | Open-decision answers | ✅ resolved (see above) | whole build | 00 |
| B | Owner's **mockup** + exact tokens (their own; the referenced ones are void) | pending | all UI | 04 |
| C | Campus **map as SVG** (named building shapes, ids = `buildings.id`, grouped by level) | pending | map | 05 |
| D | **Room→teacher directory**, building coords, **master schedule** (course, period, room, teacher) | pending | map, schedule | 05/06 |
| E | **Bell schedule** (period times, day types) — **optional** (only if the owner later wants per-period time ranges shown) | pending | schedule | 07 |
| F | **Locker sections** (range, building/coord, panorama, optional per-locker yaw/pitch) + **panorama images** | pending | locker | 08 |
| G | **Real-data cutover** — replace all placeholders | pending | launch | 11 |
| H | **Google Workspace OAuth** for `stu.wvusd.org` (client id/secret, redirect URIs, domain-restriction sign-off) | pending | auth | 09 |

## Phases
- **[00 — Decisions & intake register](plan/phase-00-decisions-and-intake.md)** — Codify the 7 resolved decisions and stand up the intake register so school-dependent assets are requested first. Chunks: Decisions doc · Intake register · Interaction reference · Supabase project & secrets. *Complete when:* decisions recorded, intake register live with owners/status, env approach agreed.
- **[01 — Scaffold & tooling](plan/phase-01-scaffold-and-tooling.md)** — Boot a React+TS app with structure, lint/format, env config, a 3-screen shell, and centralized (placeholder) tokens. Chunks: Vite+React · Lint/format · Structure · Env/config · App shell · Placeholder theme · Commands. *Complete when:* app boots/builds/lints, the 3 screens navigate, commands documented.
- **[02 — Supabase reference data](plan/phase-02-supabase-reference-data.md)** — Schema (incl. `master_schedule`) + FKs + RLS read-only + placeholder seed + typed access layer encoding the join-key rules. Chunks: Schema · RLS · Seed · Types/client · Query layer · Hooks. *Complete when:* read-only schema live, placeholder seed loads, query layer proven against seed.
- **[03 — Personal data (localStorage)](plan/phase-03-personal-data-localstorage.md)** — On-device schedule + locker store with versioning/validation; nothing personal leaves the device or ties to the auth identity. Chunks: Store module · Versioning · Schedule API · Locker API · Hooks. *Complete when:* personal data persists/validates/versions, no network writes.
- **[04 — Design system & primitives](plan/phase-04-design-system-primitives.md)** 🚩 — Extract real tokens from the owner's mockup and build reusable, accessible primitives. Chunks: Token extraction · Theme wiring · Button · Input/Select · Card · State primitives · Pin/Hotspot · Gallery. *Complete when:* tokens sourced from the mockup, primitives match it + a11y baseline, gallery verifies them.
- **[05 — Interactive 2D map (SVG)](plan/phase-05-interactive-map.md)** 🚩 — Leaflet-hosted campus SVG with clickable named building shapes → room+teacher detail, multi-level toggle, and a reusable highlight API. Chunks: SVG intake · Base map · Shape interactivity · Selection/detail · Room detail · Multi-level · Highlight API. *Complete when:* building shapes (ids matching DB) are clickable and show rooms+teachers; level toggle + highlight API work.
- **[06 — Schedule entry & resolution](plan/phase-06-schedule-entry.md)** — Student enters classes via master-schedule-powered pickers; each resolves to a location by teacher/room; persists locally. Chunks: Period model · Entry form · Course/teacher pickers · Resolution · States · Edit/clear. *Complete when:* a full schedule persists and each entry resolves to room+building+teacher; empty/filled/miss states match mockup.
- **[07 — Schedule display & map highlight (passive)](plan/phase-07-schedule-display-and-highlight.md)** 🚩 — Show the schedule, tap a period → its class+location, and highlight the student's classes on the map. No live now/next, fully tap-driven. Chunks: Schedule list · Tap-to-locate · Static map highlight · Sync. *Complete when:* the schedule renders, tapping a period highlights its building, and all class buildings highlight on the map.
- **[08 — Locker finder & 360°](plan/phase-08-locker-finder-360.md)** 🚩 — Locker number → section by range → map highlight → Pannellum 360° (from gated Storage) with a pin; persists locally. Chunks: Data intake · Entry/resolve · Section highlight · Pannellum · Hotspot · States/persistence. *Complete when:* a number resolves by range, highlights, and opens its panorama with a correct pin; loading/found/not-found match mockup.
- **[09 — Auth & access gating](plan/phase-09-auth-access-gating.md)** 🚩 — Google sign-in restricted to `@stu.wvusd.org`, gating the app + campus photos; personal data stays device-local. Chunks: OAuth setup · Auth client/session · Domain enforcement · Protected shell · RLS+Storage gating · Privacy assertion. *Complete when:* only `@stu.wvusd.org` accounts enter, reference data + photos are gated, and no personal data is tied to identity.
- **[10 — PWA, performance & deploy](plan/phase-10-pwa-perf-deploy.md)** — Installable PWA, performant panoramas without layout shift, deployed to a static host + Supabase with OAuth redirects wired. Chunks: Manifest/icons · Service worker · Image perf · Deploy pipeline · Docs. *Complete when:* installable PWA serves from a production URL against Supabase, with no panorama CLS and working sign-in.
- **[11 — A11y, real-data cutover & pilot](plan/phase-11-a11y-realdata-pilot.md)** 🚩 — WCAG AA + keyboard pass, replace every placeholder with validated real data, pilot on a phone, document maintenance. Chunks: A11y audit · Real-data cutover · Device QA · Pilot · Maintenance handoff. *Complete when:* AA + keyboard pass, no placeholders remain, end-to-end flow verified on a real phone, maintenance owner documented.

## Recommended build order & blocking
Ordered so each builds on verified prior work. **00 → 01 → 02 → 03** have no external blockers — run them first.
**04, 05, 08, 09, 11** each open with a 🚩 intake checkpoint (mockup, SVG map, locker/panorama data, Google
OAuth, real-data cutover) and will stall there until the owner supplies the asset — front-load those requests in
Phase 00. **07** is now lightweight (passive). Non-blocked work (data layers, pickers logic, PWA plumbing) can
proceed while intake is pending. Auth (09) gates the shell but doesn't block feature dev, so it lands after the
features and before deploy (which wires its production redirect).
