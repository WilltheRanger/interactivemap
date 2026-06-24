-- Sync the admin write-gate with the app's admin list (src/lib/authPolicy.ts ADMIN_EMAILS).
--
-- The admin whitelist lives in TWO places and both must agree:
--   1. src/lib/authPolicy.ts ADMIN_EMAILS — controls what an admin SEES (the /admin UI). Client-side.
--   2. this function — the REAL gate (RLS) on what an admin can CHANGE. Server-side.
-- If an email is added to (1) but not (2), that admin can open the panel but every save is rejected
-- with a permissions error ("couldn't save"). Keep the two lists identical.

create or replace function public.is_announcements_admin()
returns boolean language sql stable
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'email', '') in (
    'aryamshah2@gmail.com',
    'jwai@wvusd.org',
    'duxinyu774@gmail.com',
    'albusshih@gmail.com'
  )
  and coalesce(auth.jwt() -> 'app_metadata' ->> 'provider', '') = 'google';
$$;
