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
