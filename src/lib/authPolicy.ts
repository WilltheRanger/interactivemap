/**
 * Sign-in policy (Phase 09 auth gate + announcements admin).
 *
 * The app requires a school Google account; the announcement admins are additionally
 * whitelisted by exact email (they may be outside the school domains).
 */

/** School Google Workspace domains: students + staff. */
export const ALLOWED_EMAIL_DOMAINS = ['stu.wvusd.org', 'wvusd.org'];

/**
 * Admin allow-list for the /admin manager.
 *
 * IMPORTANT: this array only controls the UI (what an admin SEES). The REAL gate is the
 * `public.is_announcements_admin()` RLS function in Supabase. They MUST list the same emails — when
 * you add an admin here, also update that function (see supabase/migrations/0010_admin_emails_sync.sql
 * for the exact SQL), or the new admin can open the panel but every save fails with "couldn't save".
 *
 * TODO(owner): aryamshah2@gmail.com is the interim admin; replace with the school-managed
 * account(s) before launch.
 */
export const ADMIN_EMAILS = [
  'aryamshah2@gmail.com',
  'jwai@wvusd.org',
  'duxinyu774@gmail.com',
  'albusshih@gmail.com',
];

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
