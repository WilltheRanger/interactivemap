# Phase 10 — PWA, performance & deploy

**Goal:** Make the app an installable PWA, keep panoramas/images performant with no layout shift,
and deploy to a static host + Supabase with the OAuth production redirect wired.

**Phase complete when:** the app installs as a PWA, panoramas load without CLS, and a production URL
serves the app against Supabase with working `@stu.wvusd.org` sign-in and documented env/deploy steps.

> Decision #6 is settled: **web/PWA for v1, not native.** Native iOS is out of scope.

---

### 10.1 — Manifest & icons
- **Scope:** PWA manifest + icon set.
- **Files:** `public/manifest.webmanifest`, `public/icons/*`, `index.html` links.
- **Deliverable:** Name, theme/background colors from tokens, maskable icons, `display: standalone`.
- **Done when:** Lighthouse "installable" passes and Add-to-Home-Screen works on a phone.
- **Depends on:** 04.1

### 10.2 — Service worker
- **Scope:** App-shell precache + runtime caching that does **not** bloat-cache large panoramas, and respects auth-gated assets.
- **Files:** `vite.config.ts` (vite-plugin-pwa / Workbox config), `src/app/sw-register.ts`.
- **Deliverable:** Shell precached for offline; panoramas use network-first or a capped cache; **gated Storage URLs are not cached in a way that leaks them**; clean SW update flow.
- **Done when:** the shell loads offline, panoramas are not over-cached, gated assets aren't served to a signed-out user from cache, and an update activates without a stuck old SW.
- **Depends on:** 10.1, 09.4

### 10.3 — Panorama / image performance
- **Scope:** Lazy-load + code-split the viewer; compress/resize panoramas; avoid layout shift.
- **Files:** `src/features/locker/PanoramaViewer.tsx`, image assets/pipeline.
- **Deliverable:** Viewer chunk loads on demand; panoramas sized within a budget; a fixed-size container/placeholder prevents CLS.
- **Done when:** the panorama screen shows ~0 CLS and the viewer JS loads only when opened; image sizes within budget.
- **Depends on:** 08.3

### 10.4 — Build & deploy pipeline
- **Scope:** Configure the chosen host, env vars, SPA fallback, and the **production OAuth redirect**; deploy.
- **Files:** host config (`vercel.json` / `netlify.toml` / GH Pages workflow), env setup.
- **Deliverable:** Production build deployed; Supabase URL/anon key set as host env vars; the prod URL added to Supabase Auth redirect allow-list; SPA routes fall back correctly.
- **Done when:** a production URL serves the app and live data from Supabase, deep links work, and Google sign-in completes on the deployed domain.
- **Depends on:** 02.4, 10.2, 09.0, 00.1 (host choice)

### 10.5 — Deploy & env docs
- **Scope:** Document build/deploy + env + OAuth redirect setup.
- **Files:** `README.md`, `CLAUDE.md` §Commands.
- **Deliverable:** Steps to build, set env, configure redirects, and deploy from a fresh clone.
- **Done when:** following the docs from a clean clone produces a working deploy.
- **Depends on:** 10.4
