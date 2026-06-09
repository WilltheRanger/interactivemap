/**
 * Hall-pass (Log) QR safety.
 *
 * A scanned QR may ONLY open an approved Google Form (the teacher's own hall-pass form). This guards
 * minors against a tampered/replaced QR redirecting them to a phishing or arbitrary site. The app
 * itself stores nothing about the log — it only opens the validated URL (see plan/phase-12).
 */

/** Hosts that are exclusively Google Forms surfaces. */
const FORMS_ONLY_HOSTS = new Set(['forms.gle', 'forms.google.com']);
/** Multi-purpose Google host that also serves Forms — only the /forms path is allowed. */
const DOCS_HOST = 'docs.google.com';

export function isAllowedHallPassUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return false;
  }

  if (url.protocol !== 'https:') return false;

  const host = url.hostname.toLowerCase();
  if (FORMS_ONLY_HOSTS.has(host)) return true;
  if (host === DOCS_HOST) {
    // e.g. https://docs.google.com/forms/d/e/FORM_ID/viewform — Forms only, not Sheets/Docs.
    return url.pathname.startsWith('/forms/');
  }
  return false;
}
