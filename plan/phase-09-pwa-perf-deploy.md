# Phase 09 — PWA, performance & deploy

**Goal:** Make the app an installable PWA, keep panoramas/images performant with no layout shift,
and deploy to a static host + Supabase.

**Phase complete when:** the app installs as a PWA, panoramas load without CLS, and a production URL
serves the app against Supabase with documented env/deploy steps.

> Confirms decision #6: web/PWA, **not** a native store app.

---

### 09.1 — Manifest & icons
- **Scope:** PWA manifest + icon set.
- **Files:** `public/manifest.webmanifest`, `public/icons/*`, `index.html` links.
- **Deliverable:** Name, theme/background colors from tokens, maskable icons, `display: standalone`.
- **Done when:** Lighthouse "installable" passes and Add-to-Home-Screen works on a phone.
- **Depends on:** 04.1

### 09.2 — Service worker
- **Scope:** App-shell precache + runtime caching that does **not** bloat-cache large panoramas.
- **Files:** `vite.config.ts` (vite-plugin-pwa / Workbox config), `src/app/sw-register.ts`.
- **Deliverable:** Shell precached for offline; panoramas use network-first or a capped cache; clean SW update flow.
- **Done when:** the shell loads offline, panoramas are not over-cached, and an update activates without a stuck old SW.
- **Depends on:** 09.1

### 09.3 — Panorama / image performance
- **Scope:** Lazy-load + code-split the viewer; compress/resize panoramas; avoid layout shift.
- **Files:** `src/features/locker/PanoramaViewer.tsx`, image assets/pipeline.
- **Deliverable:** Viewer chunk loads on demand; panoramas sized within a budget; a fixed-size container/placeholder prevents CLS.
- **Done when:** the panorama screen shows ~0 CLS and the viewer JS loads only when opened; image sizes within budget.
- **Depends on:** 08.3

### 09.4 — Build & deploy pipeline
- **Scope:** Configure the chosen host (decision #6), env vars, SPA fallback; deploy.
- **Files:** host config (`vercel.json` / `netlify.toml` / GH Pages workflow), env setup.
- **Deliverable:** Production build deployed; Supabase URL/anon key set as host env vars; SPA routes fall back correctly.
- **Done when:** a production URL serves the app and live data from Supabase, with deep links working.
- **Depends on:** 02.4, 09.2, 00.1

### 09.5 — Deploy & env docs
- **Scope:** Document build/deploy + env.
- **Files:** `README.md`, `CLAUDE.md` §Commands.
- **Deliverable:** Steps to build, set env, and deploy from a fresh clone.
- **Done when:** following the docs from a clean clone produces a working deploy.
- **Depends on:** 09.4
