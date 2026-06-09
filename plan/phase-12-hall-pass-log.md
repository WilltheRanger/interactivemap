# Phase 12 — Hall-pass Log (QR → teacher's Google Sheet, zero-submit)

**Goal:** A student taps **Log**, picks a reason, and scans the teacher's QR — which opens the
teacher's own **Google Apps Script** endpoint that appends `{time, student email, reason}` to the
teacher's Sheet and shows "Logged ✓". **No form, no submit.** The app **stores nothing**.

**Phase complete when:** picking a reason + scanning a teacher's QR logs a row to their Sheet (with
the student's school identity captured by the script), a non-approved QR is rejected, and an audit
confirms the app retains no log data.

> **Privacy (decision #8):** the log is written by the **teacher's own Apps Script into the teacher's
> own Sheet**, so the hard rule — *no student-identifying data server-side* — **stays intact**: our
> app only validates the scanned URL, appends the chosen reason, and opens it. It never reads or
> stores the student's name/time/reason. (Storing logs in our DB was declined.)
>
> Still a student-data workflow — loop in the internship supervisor; keep the Sheet private; set a
> retention period.

---

### 12.1 — URL safety + reason model + URL builder ✅ *(NON-UI — done)*
- **Scope:** Pure logic so a scanned QR can only open the teacher's approved Apps Script endpoint,
  with the in-app reason appended.
- **Files:** `src/lib/hallPass.ts`, `src/lib/hallPass.test.ts`.
- **Deliverable:** `isAllowedHallPassUrl` (https + `script.google.com` + `/macros/…/exec`);
  `HALL_PASS_REASONS` (placeholder list); `buildHallPassUrl(scanned, reason, student?)` → validated
  URL with `?reason=` / `?student=` appended, else `null`. The app passes the **signed-in student**
  (Phase 09) so logging doesn't rely on Apps Script reading the email across `stu`/`wvusd.org`.
- **Done when:** tests cover allowed `/exec` endpoints, reject `/dev`/other Google surfaces/look-alikes/junk, and verify reason encoding + null-on-invalid. **(8 tests passing.)**
- **Depends on:** —

### 12.2 — Reason picker ✅ *(UI — built; restyle when mockup B lands)*
- **Scope:** Student picks a reason from `HALL_PASS_REASONS` before scanning.
- **Files:** `src/features/log/ReasonPicker.tsx`, `src/features/log/LogScreen.css`.
- **Deliverable:** One-tap reason list (tap a reason → straight to the scanner), styled with the
  current design tokens. Built ahead of mockup B; revisit styling once the owner's mockup arrives.
- **Done when:** a reason can be chosen and is passed to the scanner. ✅
- **Depends on:** 12.1, 04 primitives.

### 12.3 — QR scanner ✅ *(UI — built; restyle when mockup B lands)*
- **Scope:** Camera scanner that decodes a QR, builds the URL via 12.1, and opens it.
- **Files:** `src/features/log/QrScanner.tsx`, `src/types/barcode-detector.d.ts`,
  `src/features/log/LogScreen.css`.
- **Deliverable:** `getUserMedia` rear camera + native `BarcodeDetector` fast path with a **jsQR**
  fallback (chosen over `@zxing/browser`; **lazy-imported** so it's a separate chunk, off the path for
  browsers with the native API). On scan: `buildHallPassUrl(scanned, reason, student?)` → if `null`
  the invalid-QR state, else a **confirm** step whose button opens the logger in a new tab (user
  gesture, so it isn't pop-up-blocked; same-tab fallback if it is). States: starting, scanning,
  permission-denied, unsupported, error, invalid-QR, confirm, done.
- **Done when:** a valid teacher QR opens the logger; a disallowed QR shows invalid; denied/unsupported
  camera shows a clear message + retry. ✅
- **Deferred:** the `student=` param waits on Phase 09 sign-in; until then the teacher's Apps Script
  captures the same-Workspace email itself. Real-device camera test pending (needs https + a phone).
- **Depends on:** 12.1, 12.2, 04 primitives; 09 for the signed-in student id (deferred).

### 12.4 — Log entry point ✅ *(built)*
- **Scope:** The "Log" affordance → reason picker → scanner.
- **Files:** `src/app/router.tsx` (`/log`), `src/app/BottomNav.tsx` (Log nav item),
  `src/features/log/LogScreen.tsx` (orchestrates reason → scan → confirm → done).
- **Done when:** Log is reachable from the bottom nav and runs the full flow; nav works at 375px. ✅
  Final styling revisits mockup B.
- **Depends on:** 12.2, 12.3.

### 12.5 — Teacher setup guide ✅ *(docs — done)*
- **Scope:** Guide for a teacher to deploy their own Apps Script logger + QR.
- **Files:** `docs/hall-pass-teacher-setup.md`.
- **Deliverable:** Sheet headers, the Apps Script template (captures the same-Workspace student email,
  optional 60s dedupe, appends a row), web-app deploy settings (Execute as me / Anyone in domain), and
  QR generation.
- **Done when:** following it yields a `…/exec` QR whose scans append rows to the teacher's Sheet. **(Written.)**
- **Depends on:** —

### 12.6 — Privacy assertion *(verification)*
- **Scope:** Prove the app keeps no log data.
- **Files:** `docs/privacy-check.md` (extend).
- **Deliverable:** Audit showing the Log flow does no Supabase write and no `localStorage` write of
  log content — it only opens the validated Apps Script URL.
- **Done when:** the audit confirms zero retained log data in the app.
- **Depends on:** 12.3.
