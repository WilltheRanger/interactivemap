# DECISIONS.md — DBHS Wayfinder

Locked decisions for v1. Source of truth for choices that shape the build. See `PLAN.md` for how
each one threads into the phases, and `dbhs-wayfinder-planning.md` §Open decisions for the original
questions.

_Last updated: 2026-06-09._

## Project decisions

| # | Decision | Choice | Build impact |
|---|----------|--------|--------------|
| 1 | Schedule view: passive vs active | **Passive — fully tap-driven** | Tap a period → its class/room/teacher; static map highlight. No live now/next, no auto-advance, **no** current-period label. The active time-engine is cut. Bell schedule (intake E) is now optional and only revisited if per-period time ranges are ever wanted. |
| 2 | Map format | **SVG** (vector) | Each building is a named SVG shape; the shape `id` **equals** `buildings.id`. Clickable/crisp/per-level for free. |
| 3 | Multi-level | **Yes** | `buildings.level` field + a map level toggle; SVG shapes grouped by level. |
| 4 | Master schedule access | **Yes — as a pickers data source only** | `master_schedule(course, period, room, teacher)` table powers period→course→teacher pickers. **Resolution stays teacher/room** — `(course, period)` is never the join key (hard rule; a course can have multiple sections in one period). |
| 5 | Auth | **Google sign-in, access-gate only, restricted to `@stu.wvusd.org`** | Sign-in gates the app + the campus map/360° photos (kept off the public web). Schedule + locker stay in `localStorage` and are **never** written server-side or keyed to the Google identity (FERPA-avoidance line). |
| 6 | Platform | **PWA for v1** | Installable web app. Native iOS is **out of scope** for this build — a possible separate future project, not re-proposed here. |
| 7 | Maintenance owner | **DBHS** | A named DBHS role/person to be recorded in `MAINTENANCE.md`; data refreshed yearly or it's stale by September. |

## Tooling decisions

| Area | Choice | Note |
|------|--------|------|
| Language | **TypeScript** | The FK-heavy join-key model benefits from compile-time safety. |
| Build tool | **Vite** | Per stack; fast dev + static build for the PWA. |
| Data fetching | **TanStack Query** | Caching + loading/error states for read-only reference data. |
| 2D map | **Leaflet** (`CRS.Simple` + SVG overlay) | Approved stack. |
| 360° viewer | **Pannellum** | Approved stack; single scene + hotspot. |
| Reference DB | **Supabase** (Postgres, RLS read-only) | Approved stack. |
| Auth | **Supabase Auth + Google provider** | Domain-restricted to `stu.wvusd.org`. |
| PWA | **vite-plugin-pwa** (Workbox) | Manifest + service worker. |
| Deploy host | **TBD in Phase 10** | Vercel / Netlify / GitHub Pages — decide at deploy time. |

## Supabase project / secrets
- App uses the **anon / publishable** key only (read-only via RLS). No service-role key in the client.
- Env keys live in `.env` (gitignored); see `.env.example`. Host env vars set at deploy (Phase 10).
- Project ref: _to confirm during Phase 02 schema work._
