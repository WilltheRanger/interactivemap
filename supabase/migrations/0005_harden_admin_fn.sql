-- Security hardening for is_announcements_admin (from `supabase get_advisors`):
--  1. Pin search_path (advisor 0011: role-mutable search_path on SECURITY-relevant functions).
--  2. Require a Google-issued identity, so a Supabase email/password signup claiming an admin
--     address can never satisfy the whitelist (the app only offers Google OAuth, but the Auth
--     API would otherwise accept email signups too).
-- TODO(owner): the whitelist still holds the interim admin; replace before launch and keep in
-- sync with ADMIN_EMAILS in src/lib/authPolicy.ts.

create or replace function public.is_announcements_admin()
returns boolean language sql stable
set search_path = ''
as $$
  select
    coalesce(auth.jwt() ->> 'email', '') in (
      'aryamshah2@gmail.com'
    )
    and coalesce(auth.jwt() -> 'app_metadata' ->> 'provider', '') = 'google';
$$;
