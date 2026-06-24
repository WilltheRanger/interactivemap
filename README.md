# DBHS Wayfinder

A mobile-first web app (PWA) that helps Diamond Bar High School students find their classrooms and
locker on an interactive 2D campus map, with a 360° photo view at the locker bank.

- **Plan:** [`PLAN.md`](./PLAN.md) (index) → [`plan/`](./plan) phase files.
- **Spec / source of truth:** [`dbhs-wayfinder-planning.md`](./dbhs-wayfinder-planning.md).
- **Working agreement + hard rules:** [`CLAUDE.md`](./CLAUDE.md).
- **UI rules + tokens:** [`DESIGN.md`](./DESIGN.md).
- **Locked decisions:** [`DECISIONS.md`](./DECISIONS.md) · **Data still needed:** [`DATA-INTAKE.md`](./DATA-INTAKE.md).

## Stack
React + TypeScript + Vite · React Router · Leaflet (2D map) · Pannellum (360°) · Supabase
(read-only reference data) · `localStorage` (personal data) · Supabase Auth (Google, gate only).

## Getting started
```bash
npm install
cp .env.example .env   # set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (anon key only)
npm run dev
```

See [`CLAUDE.md` → Commands](./CLAUDE.md#commands) for the full script list and the `src/` layout.

## Privacy
Reference data (buildings, rooms, teachers, lockers, panoramas) lives in Supabase, read-only.
A student's schedule and locker number stay **on the device** in `localStorage` — never stored
server-side and never tied to the signed-in identity.
