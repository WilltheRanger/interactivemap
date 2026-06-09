# Phase 01 — Scaffold & tooling

**Goal:** Boot a React app with a clear structure, lint/format, typed env config, a navigable
3-screen shell, and centralized **placeholder** tokens (real tokens come from the mockup in Phase 04).

**Phase complete when:** `npm run dev` serves the app, `npm run build` succeeds, `npm run lint`
passes, the three screens (Schedule / Map / Locker) navigate, tokens are centralized, and
CLAUDE.md §Commands is filled.

> Assumes TypeScript per the flagged decision (00.1). If JS is chosen, swap `.ts/.tsx`→`.js/.jsx`.

---

### 01.1 — Vite + React scaffold
- **Scope:** Scaffold Vite + React (+ TS).
- **Files:** `package.json`, `vite.config.ts`, `tsconfig*.json`, `index.html`, `src/main.tsx`, `src/App.tsx`.
- **Deliverable:** Minimal app that renders a placeholder home.
- **Done when:** `npm run dev` serves a blank app and `npm run build` produces `dist/`.
- **Depends on:** —

### 01.2 — Lint, format, editor config
- **Scope:** ESLint + Prettier + EditorConfig + scripts.
- **Files:** `.eslintrc.*`, `.prettierrc`, `.editorconfig`, `package.json` scripts.
- **Deliverable:** `lint`, `format`, `format:check` scripts.
- **Done when:** `npm run lint` and `npm run format:check` pass clean on the scaffold.
- **Depends on:** 01.1

### 01.3 — Project structure & conventions
- **Scope:** Create the folder layout and barrels.
- **Files:** `src/{app,components,features,lib,data,styles,types}/` with index files; short structure note in README.
- **Deliverable:** Documented structure: `components` = primitives, `features` = screen logic (map/schedule/locker), `lib` = supabase/personalStore/time, `data` = static data (bell schedule, map zones), `types` = shared types.
- **Done when:** folders + barrels exist and the structure note is in README.
- **Depends on:** 01.1

### 01.4 — Env config module
- **Scope:** Typed config loader for Supabase URL/anon key that fails loudly if missing.
- **Files:** `src/lib/config.ts`, `.env.example` (from 00.4).
- **Deliverable:** `config.supabaseUrl` / `config.supabaseAnonKey` read from `import.meta.env`, asserted present in dev.
- **Done when:** missing env throws a clear dev error; present env resolves.
- **Depends on:** 00.4, 01.1

### 01.5 — App shell & routing
- **Scope:** Routes/tabs for the three v1 screens with mobile-first bottom nav; stub each screen's loading/empty/error slots (unstyled — mockup wiring is Phase 04).
- **Files:** `src/app/router.tsx`, `src/features/{schedule,map,locker}/*Screen.tsx`, nav component.
- **Deliverable:** Schedule / Map / Locker screens reachable via nav.
- **Done when:** navigating between all three works at 375px width; deep-link/refresh keeps the route.
- **Depends on:** 01.3

### 01.6 — Placeholder theme + base styles
- **Scope:** Centralize tokens as CSS variables with **clearly-labeled PLACEHOLDER values**; add a reset and mobile viewport meta.
- **Files:** `src/styles/tokens.css`, `src/styles/global.css`, `index.html` meta.
- **Deliverable:** `--color-*`, `--space-*`, `--radius-*`, `--font-*` vars (placeholder), consumed by the shell.
- **Done when:** no hard-coded colors/px in components; a comment marks tokens as placeholder pending Phase 04 (B).
- **Depends on:** 01.5

### 01.7 — Commands documentation
- **Scope:** Fill CLAUDE.md §Commands.
- **Files:** `CLAUDE.md`.
- **Deliverable:** dev / build / preview / lint / format / test commands.
- **Done when:** each documented command runs as written.
- **Depends on:** 01.1–01.2
