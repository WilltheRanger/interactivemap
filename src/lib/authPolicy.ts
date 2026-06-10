/**
 * Sign-in policy (Phase 09 auth gate + announcements admin).
 *
 * The app requires a school Google account; the announcement admins are additionally
 * whitelisted by exact email (they may be outside the school domains).
 */

/** School Google Workspace domains: students + staff. */
export const ALLOWED_EMAIL_DOMAINS = ['stu.wvusd.org', 'wvusd.org'];

/**
 * Admin allow-list for the /admin announcements manager.
 *
 * TODO(owner): aryamshah2@gmail.com is the interim admin; replace with the school-managed
 * account(s) before launch. Keep this list in sync with is_announcements_admin() in
 * supabase/migrations/0004_announcements_admin_email.sql — RLS is the real gate, this array only
 * controls the UI.
 */
export const ADMIN_EMAILS = ['aryamshah2@gmail.com'];

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
}

/** Anyone with a school account may use the app; admins are allowed even off-domain. */
export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase();
  return (
    ALLOWED_EMAIL_DOMAINS.some((domain) => normalized.endsWith(`@${domain}`)) ||
    isAdminEmail(normalized)
  );
}
