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

### 12.2 — Reason picker *(UI — gated on mockup B)*
- **Scope:** Student picks a reason from `HALL_PASS_REASONS` before scanning.
- **Files:** `src/features/log/ReasonPicker.tsx`.
- **Deliverable:** Reason selection per the mockup; selected reason held for the scan step.
- **Done when:** a reason can be chosen and is passed to the scanner; matches the mockup.
- **Depends on:** 12.1, mockup B, 04 primitives.

### 12.3 — QR scanner *(UI — gated on mockup B)*
- **Scope:** Camera scanner that decodes a QR, builds the URL via 12.1, and opens it.
- **Files:** `src/features/log/QrScanner.tsx`.
- **Deliverable:** Native `BarcodeDetector` where available + a JS fallback (e.g. `@zxing/browser` —
  **new dep, flag before adding**). On scan: `buildHallPassUrl(scanned, reason, signedInStudent)` (the
  student comes from the Phase-09 sign-in) → if `null` show the invalid-QR state, else open the URL.
  States: requesting-camera, scanning, invalid-QR, permission-denied.
- **Done when:** a valid teacher QR opens the logger (row appears in the Sheet); a disallowed QR shows
  invalid; denied camera shows a clear message.
- **Depends on:** 12.1, 12.2, mockup B, 04 primitives, 09 (signed-in student id).

### 12.4 — Log entry point *(UI — gated on mockup B)*
- **Scope:** The "Log" affordance in the app per the mockup (4th nav item or a button) → reason picker → scanner.
- **Files:** `src/app/router.tsx`, `src/features/log/LogScreen.tsx`, nav.
- **Done when:** Log is reachable and matches the mockup; nav still works at 375px.
- **Depends on:** 12.2, 12.3, mockup B, 01.5.

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
