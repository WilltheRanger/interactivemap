# Phase 00 — Decisions & intake register

**Goal:** Codify the 7 (now-resolved) decisions and stand up a living data-intake register, so the
school-dependent assets (the real critical path per planning §Risks) are requested first.
Output is docs — no app code yet.

**Phase complete when:** `DECISIONS.md` records all 7 decisions + tooling choices, `DATA-INTAKE.md`
lists every real asset with required fields + owner + status, the interaction reference is captured
in-repo, and the Supabase project ref + secrets approach are agreed.

---

### 00.1 — DECISIONS.md
- **Scope:** Write the resolved decisions to a committed record.
- **Files:** `DECISIONS.md`.
- **Deliverable / content (decided):**
  1. **Schedule view = passive** — tap a period → class/room/teacher; no live now/next. (Optional static "current period" label deferred, off by default.)
  2. **Map = SVG** (named building shapes, ids = `buildings.id`, grouped by `level`).
  3. **Multi-level = yes** (`level` field + map toggle).
  4. **Master schedule = yes, pickers data source only**; resolution stays teacher/room.
  5. **Auth = Google sign-in, access-gate only, restricted to `@stu.wvusd.org`**; personal data stays on-device, never tied to the Google identity; gating also keeps campus map/360° photos non-public.
  6. **Platform = PWA for v1**; native iOS out of scope (separate future project).
  7. **Maintenance owner = DBHS** (record a specific role/person).
  - **Tooling:** TypeScript; TanStack Query; deploy host TBD in Phase 10.
- **Done when:** every row above is in `DECISIONS.md` with a date; deferred items marked "deferred — revisit by Phase NN".
- **Depends on:** — (answers already gathered).

### 00.2 — DATA-INTAKE.md register 🚩
- **Scope:** One checklist row per real asset, with the exact fields to collect (per CLAUDE.md §Data intake), an owner, and a status (`requested / received / loaded`).
- **Files:** `DATA-INTAKE.md`.
- **Deliverable — rows:**
  - **B Mockup/tokens** — the owner's own mockup (Figma or measured image) + colors/type/spacing/radius.
  - **C Campus map (SVG)** — vector with each building a named shape; shape id = `buildings.id`; shapes grouped by `level`.
  - **D Directory + master schedule** — room→teacher directory; building coordinates; `master_schedule(course, period, room, teacher)`.
  - **E Bell schedule (optional)** — period times + day types; only needed if showing period time ranges or the optional current-period label.
  - **F Locker sections** — per **section**: `{number_start, number_end, building, map_coord, panorama, optional per-locker yaw/pitch}`; **+ panorama image files** (equirectangular Theta exports). Resolution is by range → ~dozens of section rows, not one per locker.
  - **H Google Workspace OAuth** — OAuth client id/secret for the project, authorized redirect URIs (local + prod), and sign-off to restrict to `stu.wvusd.org` (needs district Workspace admin).
  - **G Real-data cutover sign-off** — confirmation to replace all placeholders.
- **Done when:** every checkpoint B–H appears with its required-fields spec and an owner; statuses initialized to `requested`.
- **Depends on:** 00.1 (decisions shape some fields).

### 00.3 — Interaction reference
- **Scope:** Recover `dbhs-wayfinder-prototype.jsx` (referenced but absent) or transcribe its flow.
- **Files:** `plan/interaction-reference.md` (and/or the restored `.jsx`).
- **Deliverable:** The reference flow captured — schedule entry → map highlight → (passive) period detail → locker → 360° — reconciled to the passive decision.
- **Done when:** the flow is documented in-repo; the now/next bits are noted as passive per decision #1.
- **Depends on:** owner supplying the prototype (else transcribe from planning §Current status).

### 00.4 — Supabase project & secrets approach 🚩
- **Scope:** Confirm/identify the Supabase project; agree where the URL + anon/publishable key live. **No schema yet.** (Google OAuth provider config itself is Phase 09.)
- **Files:** `.env.example` (keys only), note in `DECISIONS.md`.
- **Deliverable:** `.env.example` with `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` placeholders; recorded project ref; confirmation the app uses the **anon/publishable** key only.
- **Done when:** `.env.example` is committed and the project ref + key approach are recorded.
- **Depends on:** Supabase project access (Supabase MCP or supplied credentials).
