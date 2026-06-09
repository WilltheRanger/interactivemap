# Phase 12 — Hall-pass Log (QR → teacher's Google Sheet)

**Goal:** A student taps **Log**, scans the teacher's QR, and is taken to **the teacher's own Google
Form** (linked to the teacher's Sheet) to record their hall pass. The app **stores nothing** about
the log — all student data lives in the teacher's Google Workspace.

**Phase complete when:** scanning a teacher's hall-pass QR opens their Google Form (with the
student's school identity auto-captured by the Form), a non-approved QR is rejected, and an audit
confirms the app retains no log data.

> **Privacy (decision):** chosen design routes the log to the **teacher's own Google Form/Sheet**, so
> the project's hard rule — *no student-identifying data server-side* — **stays intact**: our app
> only scans a QR and opens the contained URL. It never reads, stores, or forwards the student's
> name/time/reason. (The alternative — storing logs in our DB — was declined.)
>
> Still loop in the internship supervisor: it's a student-data workflow even though we don't hold it.

---

### 12.1 — QR-URL safety validator *(NON-UI — buildable now, no mockup needed)*
- **Scope:** Pure validator so a scanned QR can only ever open an **approved Google Form**, never an
  arbitrary/phishing URL (these are minors).
- **Files:** `src/lib/hallPass.ts`, `src/lib/hallPass.test.ts`.
- **Deliverable:** `isAllowedHallPassUrl(raw)` — require `https:`, hostname ∈ {`forms.gle`,
  `forms.google.com`, `docs.google.com` with a `/forms` path}; reject anything else (other Google
  surfaces, look-alike subdomains, non-URLs).
- **Done when:** unit tests cover allowed Form links and reject http, non-Form Google URLs
  (Sheets/Docs), look-alike hosts (`forms.gle.evil.com`), and junk.
- **Depends on:** — (done in this phase ahead of the rest).

### 12.2 — QR scanner component *(UI — gated on mockup B)*
- **Scope:** Camera-based QR scanner that decodes a code, validates it via 12.1, then opens the URL.
- **Files:** `src/features/log/QrScanner.tsx`.
- **Deliverable:** Uses the native `BarcodeDetector` where available with a JS fallback (e.g.
  `@zxing/browser` — **new dep, flag before adding**). States: requesting-camera, scanning,
  invalid-QR (failed 12.1), no-camera/permission-denied. On success, navigates to the Form.
- **Done when:** a valid teacher Form QR opens the Form; a disallowed QR shows the invalid state;
  denied camera permission shows a clear message.
- **Depends on:** 12.1, mockup B, 04 primitives.

### 12.3 — Log entry point *(UI — gated on mockup B)*
- **Scope:** The "Log" affordance in the app per the mockup (likely a 4th nav item or a button).
- **Files:** `src/app/router.tsx`, `src/features/log/LogScreen.tsx`, nav.
- **Deliverable:** Reachable Log screen hosting the scanner + a one-line "scan your teacher's hall-pass code" prompt.
- **Done when:** Log is reachable and matches the mockup; nav still works at 375px.
- **Depends on:** 12.2, mockup B, 01.5.

### 12.4 — Teacher setup guide *(docs)*
- **Scope:** Short guide for a teacher to stand up their own hall-pass Form + QR.
- **Files:** `docs/hall-pass-teacher-setup.md`.
- **Deliverable:** Steps: create a Google Form (restrict to the school Workspace so it auto-collects
  the respondent's email; add a "Reason" question; timestamp is automatic) → link a response Sheet →
  generate/print the Form's QR. Note retention/who-can-see guidance.
- **Done when:** following the guide yields a working QR whose scans append rows to the teacher's Sheet.
- **Depends on:** —

### 12.5 — Privacy assertion *(verification)*
- **Scope:** Prove the app keeps no log data.
- **Files:** `docs/privacy-check.md` (extend).
- **Deliverable:** Audit showing the Log flow performs no Supabase write and no `localStorage` write
  of log content — it only opens the scanned Form URL.
- **Done when:** the audit confirms zero retained log data in the app.
- **Depends on:** 12.2.
