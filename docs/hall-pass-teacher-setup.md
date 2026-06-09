# Hall-pass Log — teacher setup (Apps Script → your Google Sheet)

This sets up a QR that students scan to log a hall pass straight into **your own Google Sheet** — no
form, no submit. Each scan appends a row: **time, student email, reason**. The Wayfinder app stores
nothing; all data lives in your Sheet, in your school Google account.

> One-time setup, ~5 minutes. You'll need to be signed into your **@wvusd.org** (staff) account.

## 1. Make the Sheet
1. Create a new Google Sheet (e.g. "Period 3 Hall Pass Log").
2. In row 1 add headers: `Time` · `Student` · `Reason`.

## 2. Add the script
1. In the Sheet: **Extensions → Apps Script**.
2. Delete any starter code and paste this:

```javascript
function doGet(e) {
  var reason = (e && e.parameter && e.parameter.reason) ? String(e.parameter.reason) : '';
  var email = Session.getActiveUser().getEmail(); // the scanning student (same Workspace)
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];

  // Optional: ignore an accidental double-scan within 60s from the same student.
  var last = sheet.getLastRow();
  if (last > 1) {
    var prev = sheet.getRange(last, 1, 1, 2).getValues()[0]; // [time, email]
    if (prev[1] === email && (new Date() - new Date(prev[0])) < 60 * 1000) {
      return HtmlService.createHtmlOutput('<p>Already logged. You can close this.</p>');
    }
  }

  sheet.appendRow([new Date(), email, reason]);
  return HtmlService.createHtmlOutput('<p>Logged ✓ You can close this tab.</p>');
}
```

3. **Save** (disk icon).

## 3. Deploy as a web app
1. **Deploy → New deployment → ⚙ → Web app**.
2. **Execute as:** `Me (you@wvusd.org)`.
3. **Who has access:** `Anyone within <your district Workspace>` (NOT "Anyone").
4. **Deploy** → approve the permissions prompt the first time.
5. Copy the **Web app URL** — it looks like
   `https://script.google.com/a/macros/wvusd.org/s/AKfycb…/exec`.

## 4. Make the QR
- Generate a QR for that `…/exec` URL (any QR generator) and post it by your door.
- That's it. When a student picks a reason in the app and scans, a row appears in your Sheet.

## Notes
- **Identity:** `getActiveUser().getEmail()` returns the student's email only because they're signed
  into their **@stu.wvusd.org** account in the same Workspace (the app's Google sign-in ensures this).
  A student signed into a personal Google account would log blank/own email — expected.
- **Privacy:** the data is a student record. Keep the Sheet private to you, and decide a retention
  period (e.g. clear it each semester). Loop in your supervisor before using it with students.
- **Limits:** a QR can be photographed, so this can't *prove* physical presence; the 60-second dedupe
  only blocks accidental double-scans, not deliberate re-logging.
