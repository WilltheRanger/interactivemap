# Hall-pass Log — teacher setup (Apps Script → your Google Sheet)

This sets up a QR that students scan to log a hall pass straight into **your own Google Sheet** — no
form, no submit, and the student never leaves the app (the pass is logged by a silent background
request). Each scan appends a row: **time, student, reason** — the **student** column fills in once the
app's Google sign-in ships; until then rows record **time + reason**. The Wayfinder app stores nothing;
all data lives in your Sheet, in your school Google account.

> One-time setup, ~5 minutes. **Do this on a staff `@wvusd.org` account** — district policy usually
> blocks **student** accounts from publishing Apps Script web apps, so a student account will fail at
> the Deploy step.

## 1. Make the Sheet
1. Create a new Google Sheet (e.g. "Period 3 Hall Pass Log").
2. In row 1 add headers: `Time` · `Student` · `Reason`.

## 2. Add the script
1. In the Sheet: **Extensions → Apps Script**.
2. Delete any starter code and paste this:

```javascript
function doGet(e) {
  var p = (e && e.parameter) || {};
  var reason = p.reason ? String(p.reason) : '';
  // The Wayfinder app passes the signed-in student (?student=…) once its Google sign-in ships. The
  // app's background call is anonymous, so getActiveUser() is empty until then — that's expected.
  var student = p.student ? String(p.student) : Session.getActiveUser().getEmail();
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];

  // Optional: ignore an accidental double-scan within 60s from the same student.
  var last = sheet.getLastRow();
  if (last > 1) {
    var prev = sheet.getRange(last, 1, 1, 2).getValues()[0]; // [time, student]
    if (prev[1] === student && (new Date() - new Date(prev[0])) < 60 * 1000) {
      return HtmlService.createHtmlOutput('<p>Already logged. You can close this.</p>');
    }
  }

  sheet.appendRow([new Date(), student, reason]);
  return HtmlService.createHtmlOutput('<p>Logged ✓ You can close this tab.</p>');
}
```

3. **Save** (disk icon).

## 3. Deploy as a web app
1. **Deploy → New deployment → ⚙ → Web app**.
2. **Execute as:** `Me (you@wvusd.org)`.
3. **Who has access:** `Anyone`. The app logs with a silent background request that carries **no
   login**, so it can't get past the "Anyone within the district" gate — that gate would block the
   log without any error. "Anyone" only means the URL can be reached; it still does nothing except
   append a row to your Sheet, and the `…/exec` URL is effectively unguessable.
4. **Deploy** → approve the permissions prompt the first time.
5. Copy the **Web app URL** — it looks like
   `https://script.google.com/a/macros/wvusd.org/s/AKfycb…/exec`.

## 4. Make the QR
- Generate a QR for that `…/exec` URL (any QR generator) and post it by your door.
- That's it. When a student picks a reason in the app and scans, a row appears in your Sheet.

## Notes
- **Identity:** the app logs with a silent, anonymous background request, so right now rows record
  **time + reason** only (the `Student` column stays blank). Once the app's Google sign-in ships it
  will pass the signed-in student as `?student=…` and the column will fill in. The app supplies the
  name (rather than the script reading it), so a student could in principle log a different name —
  acceptable for a hall pass, same as a paper sign-out sheet.
- **Privacy:** the data is a student record. Keep the Sheet private to you, and decide a retention
  period (e.g. clear it each semester). Loop in your supervisor before using it with students.
- **Limits:** a QR can be photographed, so this can't *prove* physical presence; the 60-second dedupe
  only blocks accidental double-scans, not deliberate re-logging.
