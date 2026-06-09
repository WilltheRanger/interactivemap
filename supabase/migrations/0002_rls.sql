-- Enable RLS and allow read-only SELECT on all reference tables. There are NO write policies,
-- so insert/update/delete are denied for the app (it uses the anon/publishable key).
--
-- For now SELECT is open (using (true)) to simplify development. Phase 09 (Auth) tightens this to
-- authenticated `@stu.wvusd.org` sessions and moves panoramas/map to a private Storage bucket.

alter table buildings enable row level security;
alter table teachers enable row level security;
alter table rooms enable row level security;
alter table master_schedule enable row level security;
alter table panoramas enable row level security;
alter table locker_sections enable row level security;
alter table lockers enable row level security;

create policy "read buildings" on buildings for select using (true);
create policy "read teachers" on teachers for select using (true);
create policy "read rooms" on rooms for select using (true);
create policy "read master_schedule" on master_schedule for select using (true);
create policy "read panoramas" on panoramas for select using (true);
create policy "read locker_sections" on locker_sections for select using (true);
create policy "read lockers" on lockers for select using (true);
