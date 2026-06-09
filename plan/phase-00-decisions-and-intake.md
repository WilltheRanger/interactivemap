# Phase 00 — Decisions & intake register

**Goal:** Resolve the 7 open decisions and stand up a living data-intake register, so the
school-dependent assets (the real critical path per planning §Risks) are requested first.
Output is docs — no app code yet.

**Phase complete when:** all 7 decisions are recorded (answer or explicit "deferred"),
`DATA-INTAKE.md` lists every real asset with required fields + owner + status, the interaction
reference is captured in-repo, and the Supabase project ref + secrets approach are agreed.

---

### 00.1 — DECISIONS.md 🚩 (asks me)
- **Scope:** Record answers to the 7 open decisions from `dbhs-wayfinder-planning.md` §Open decisions, plus the 3 flagged tooling decisions from `PLAN.md`.
- **Files:** `DECISIONS.md`.
- **Deliverable:** A table — Decision · Chosen answer · Date · Build impact — covering: (1) passive vs active schedule view, (2) map format (SVG vs PNG), (3) multi-level?, (4) master-schedule access vs teacher→room directory, (5) auth (recommend none), (6) web/PWA confirm (not native), (7) yearly maintenance owner; **plus** TypeScript?, data-fetching lib?, deploy host?.
- **Done when:** every row has an answer or an explicit "deferred — revisit by Phase NN"; no blank rows.
- **Depends on:** my input.

### 00.2 — DATA-INTAKE.md register 🚩
- **Scope:** One checklist row per real asset the build needs, with the exact fields to collect (per CLAUDE.md §Data intake), an owner, and a status.
- **Files:** `DATA-INTAKE.md`.
- **Deliverable:** Rows for: mockup/tokens (B); campus map asset + format + building→id map (C); room→teacher directory + building coords (D); bell schedule + day types (E); per locker **section** {number_start, number_end, building, map_coord, panorama, optional per-locker yaw/pitch} (F); panorama image files (F); real-data cutover sign-off (G). Each row: required fields · owner · status (`requested / received / loaded`) · the phase it unblocks.
- **Done when:** every checkpoint A–G appears with its required-fields spec and an owner; statuses initialized to `requested`.
- **Depends on:** 00.1 (decisions shape some fields, e.g. multi-level → `level`).

### 00.3 — Interaction reference
- **Scope:** Recover `dbhs-wayfinder-prototype.jsx` (referenced but absent) or transcribe its flow so the build has an interaction baseline.
- **Files:** `plan/interaction-reference.md` (and/or the restored `.jsx`).
- **Deliverable:** The reference flow captured: manual schedule entry → map highlight → now/next banner → locker stub, with any screen/state notes.
- **Done when:** the flow is documented in-repo and reconciled against the mockup intake (B) once it arrives.
- **Depends on:** me supplying the prototype (else we transcribe from planning §Current status).

### 00.4 — Supabase project & secrets approach 🚩
- **Scope:** Confirm/identify the Supabase project (planning says "already connected in your tooling"); agree where the URL + anon/publishable key live. **No schema yet.**
- **Files:** `.env.example` (keys only, no secrets), note in `DECISIONS.md`.
- **Deliverable:** `.env.example` with `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` placeholders; recorded project ref; confirmation the app uses the **anon/publishable** key only (read-only).
- **Done when:** `.env.example` is committed and the project ref + read-only-key decision are recorded.
- **Depends on:** Supabase project access (via Supabase MCP or supplied credentials).
