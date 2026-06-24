-- Set the announcements admin whitelist to the interim admin account.
-- TODO(owner): replace with the school-managed admin account(s) before launch.
-- Keep in sync with ADMIN_EMAILS in src/lib/adminAuth.ts (the UI gate); this
-- function backs the RLS write policies and is the gate that actually matters.

create or replace function public.is_announcements_admin()
returns boolean language sql stable as $$
  select coalesce(auth.jwt() ->> 'email', '') in (
    'aryamshah2@gmail.com'
  );
$$;
