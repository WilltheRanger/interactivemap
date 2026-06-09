# Phase 09 — Auth & access gating

**Goal:** Require Google sign-in restricted to **`@stu.wvusd.org`** to enter the app, and use that
session to gate the reference data **and** the campus map/360° photos — while keeping all personal
data on-device and never tied to the Google identity.

**Phase complete when:** only `@stu.wvusd.org` Google accounts can reach the app, reference data +
panoramas/map are readable only by such a session (not the public web), sign-out works, and a
network audit shows no personal data leaves the device.

> **Hard-rule guardrail:** sign-in is an **access gate only**. The schedule + locker stay in
> `localStorage`; they are **never** written server-side or keyed by the user's identity. This is
> the FERPA-avoidance line from the planning doc.

---

### 09.0 — 🚩 Google Workspace OAuth setup (intake H)
- **Scope:** Obtain/confirm a Google OAuth client and wire it into Supabase Auth.
- **Files:** Supabase project Auth config (provider), `DECISIONS.md` (record), `.env` redirect notes.
- **Deliverable:** Supabase Google provider enabled with client id/secret; authorized redirect URIs for local **and** prod; domain-restriction approach signed off with the district Workspace admin.
- **Done when:** the Google provider is configured and a test sign-in completes the OAuth handshake.
- **Depends on:** district Workspace admin supplying the OAuth client + sign-off. **Blocks 09.1+.**

### 09.1 — Auth client & session
- **Scope:** Integrate Supabase Auth; sign-in-with-Google; a session context/hook.
- **Files:** `src/lib/auth.ts`, `src/data/useAuth.ts`.
- **Deliverable:** `signInWithGoogle()`, `signOut()`, `useAuth(): {user, status}`; session persists across reloads.
- **Done when:** a user can sign in with Google and the session survives a reload.
- **Depends on:** 09.0, 02.4

### 09.2 — Domain restriction (`@stu.wvusd.org`)
- **Scope:** Reject non-`stu.wvusd.org` accounts at both the UI and the server.
- **Files:** `src/lib/auth.ts` (client check), `supabase/migrations/000x_auth_domain.sql` (server enforcement).
- **Deliverable:** OAuth `hd` hint client-side **plus** real enforcement — RLS policies and/or an auth hook keyed on `(auth.jwt() ->> 'email') like '%@stu.wvusd.org'`. A wrong-domain account is signed out with a clear message.
- **Done when:** a non-`stu.wvusd.org` account is denied access and cannot read gated data (verified), while an `@stu.wvusd.org` account succeeds.
- **Depends on:** 09.1

### 09.3 — Protected app shell
- **Scope:** Gate all routes behind auth; unauthenticated → sign-in screen with loading/auth-error states.
- **Files:** `src/app/router.tsx`, `src/features/auth/SignInScreen.tsx`, `src/components/AuthGuard.tsx`.
- **Deliverable:** Unauthenticated users see only the sign-in screen; authenticated users reach Schedule/Map/Locker; sign-out returns to sign-in. Offer "clear my local data on sign-out" (shared-device hygiene).
- **Done when:** the three screens require sign-in; sign-out works; local personal data is **not** keyed to identity (a different sign-in on the same device sees the same device-local data unless cleared).
- **Depends on:** 09.2, 01.5, 03.5

### 09.4 — Tighten RLS + gate Storage
- **Scope:** Move reference reads and campus media behind the authenticated session.
- **Files:** `supabase/migrations/000x_rls_authenticated.sql`, Storage bucket policies.
- **Deliverable:** Reference-table `select` policies switched from `anon` → authenticated `@stu.wvusd.org`; panoramas + the campus SVG moved to a **private** Supabase Storage bucket whose RLS requires the same session (served via signed URLs / authenticated fetch).
- **Done when:** an anonymous request to reference data, a panorama, or the map asset is denied; an `@stu.wvusd.org` session reads all three.
- **Depends on:** 09.2, 02.2, 08.0

### 09.5 — Privacy assertion
- **Scope:** Prove no personal data leaves the device.
- **Files:** `docs/privacy-check.md` (audit notes), a test/harness.
- **Deliverable:** A network audit of a full session showing only reference reads + the auth handshake; schedule/locker writes occur **only** to `localStorage`.
- **Done when:** the audit confirms zero server-side writes of schedule/locker and no association to the auth identity.
- **Depends on:** 09.3, 09.4
