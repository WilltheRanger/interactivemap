/**
 * Hall-pass (Log) QR safety + URL building.
 *
 * Flow: the student picks a reason in-app, then scans the teacher's QR. The QR encodes the teacher's
 * own Google Apps Script web-app endpoint (script.google.com/.../exec). We validate it, append the
 * chosen reason as a query param, and open it — the script appends a row to the teacher's own Sheet.
 * The app itself stores nothing (plan/phase-12).
 *
 * Validation guards minors against a tampered/replaced QR sending them anywhere but an approved
 * Apps Script endpoint.
 */

const SCRIPT_HOST = 'script.google.com';

export function isAllowedHallPassUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return false;
  }
  if (url.protocol !== 'https:') return false;
  if (url.hostname.toLowerCase() !== SCRIPT_HOST) return false;
  // Apps Script web-app endpoints: /macros/s/<id>/exec  or  /a/macros/<domain>/s/<id>/exec
  return url.pathname.includes('/macros/') && url.pathname.endsWith('/exec');
}

/** Reasons a student can pick before scanning. PLACEHOLDER list — adjust to school policy / mockup. */
export const HALL_PASS_REASONS = ['Bathroom', 'Nurse', 'Office', 'Water', 'Other'] as const;
export type HallPassReason = (typeof HALL_PASS_REASONS)[number];

/**
 * Compose the URL to open after a scan: validate the scanned endpoint, then append the chosen reason
 * (URL-encoded). Returns null if the scanned QR is not an approved Apps Script endpoint.
 */
export function buildHallPassUrl(scanned: string, reason: string): string | null {
  if (!isAllowedHallPassUrl(scanned)) return null;
  const url = new URL(scanned.trim());
  if (reason) url.searchParams.set('reason', reason);
  return url.toString();
}
