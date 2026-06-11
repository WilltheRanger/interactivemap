# DBHS Wayfinder — Handoff Guide

This document is for the person who maintains the Wayfinder after the original developer
leaves. It is written in plain English. You do not need to be a programmer to keep the app
running — almost everything is done through the app's own admin panel.

---

## 1. What this app is

The DBHS Wayfinder is a web app that helps Diamond Bar High School students find their way
around campus. Students sign in with their school Google account and can: look up rooms on an
interactive two-level campus map, read school announcements (with add-to-calendar events),
find their locker, log hall passes by scanning a teacher's QR code, and plan their four years
of classes with a credit tracker (graduation / UC / Brahma Tech). It exists so new students
stop getting lost and so schedule/locker/planning info lives in one place. A student's
personal data (their schedule, locker number, and 4-year plan) is stored **only on their own
device** — the school's database holds only shared reference data.

## 2. How to access everything

| What | Where |
|---|---|
| Live app | https://willtheranger.github.io/interactivemap/ |
| Admin panel | https://willtheranger.github.io/interactivemap/admin |
| GitHub repo | https://github.com/WilltheRanger/interactivemap |
| Supabase dashboard | https://supabase.com/dashboard/project/mnvntttootxbbbnsnvke |

- **Logging into the admin panel:** open the admin URL and sign in with Google. Only email
  addresses on the *admin whitelist* (see section 4) get the management screen. Everyone else
  sees "not authorized."
- **Supabase** is the database that stores the shared data (rooms, courses, announcements…).
  You should rarely need its dashboard — the admin panel covers day-to-day edits. If you do
  need it, log in at the link above with the project owner's account.
- **Deploying updates:** the app redeploys itself automatically whenever changes are pushed
  to the repo (see section 5).

## 3. Yearly maintenance checklist (every August)

Do all of these from the **admin panel** (no code needed):

1. **Rooms & teachers** — Admin → *Rooms & Teachers* tab. Update teacher names and their
   rooms to match the new staffing list. Edit a room to change its assigned teacher; add or
   delete teachers as staff changes.
2. **Locker sections** — Admin → *Lockers* tab. If locker assignments changed ranges, edit
   each section's first/last locker number. Each section can also hold a 360° photo URL and a
   map position.
3. **Bell schedule** — Admin → *Bell Schedule* tab. Check each day type (Regular, Block,
   Minimum, Rally) and fix any period times that changed.
4. **Course catalog** — Admin → *Courses & Requirements* tab. Add new courses from the new
   Course Description Booklet, remove discontinued ones, and check the UC / Brahma Tech
   checkboxes and grade levels on anything that changed.
5. **Graduation / UC / Brahma Tech requirements** — same tab, lower half. Only edit these if
   the district or UC changes requirements (rare). Each row is a subject area with required
   credits and a notes field.
6. **Panorama photos** — reshoot locker-bank panoramas if lockers were repainted/moved or the
   photos look outdated. Shoot with a 360° camera (the school's Ricoh Theta), upload the
   image somewhere students can access (e.g. the school site's file storage), and paste the
   image URL into the locker section in the admin panel.
7. **Announcements** — clear out stale posts from last year (Admin → *Announcements*).

## 4. How to add a new authorized admin

The admin whitelist lives in **two places** and both must be updated:

1. **The app code** — file `src/lib/authPolicy.ts` in the repo. Find the list:
   `export const ADMIN_EMAILS = ['aryamshah2@gmail.com'];`
   Add the new email in quotes, separated by a comma, e.g.
   `['aryamshah2@gmail.com', 'newadmin@wvusd.org']`. Then deploy (section 5).
2. **The database rule** — in the Supabase dashboard, open **SQL Editor** and run (replacing
   the emails with the full list you want):

   ```sql
   create or replace function public.is_announcements_admin()
   returns boolean language sql stable
   set search_path = ''
   as $$
     select coalesce(auth.jwt() ->> 'email', '') in (
       'aryamshah2@gmail.com',
       'newadmin@wvusd.org'
     )
     and coalesce(auth.jwt() -> 'app_metadata' ->> 'provider', '') = 'google';
   $$;
   ```

Step 1 controls what the new admin *sees*; step 2 controls what they can actually *change*.
If you only do step 1, their edits will be rejected with a permissions error.

## 5. How to deploy an update

You need a GitHub account with access to the repo, and Git installed.

1. Get the code (first time only): `git clone https://github.com/WilltheRanger/interactivemap.git`
2. Open the folder and make your change (e.g. edit `src/lib/authPolicy.ts`).
3. Save, then run:
   ```
   git add -A
   git commit -m "describe your change"
   git push
   ```
4. That's it. Pushing to the deployment branch triggers GitHub Actions, which builds and
   publishes the site automatically (check the repo's **Actions** tab — the run should turn
   green in ~1 minute). The live site picks the update up within about 10 minutes; open tabs
   refresh themselves.
5. If the Actions run fails with a "401" error on the deploy step, it's a known temporary
   GitHub glitch — open the failed run and click **Re-run failed jobs**, or push any new
   commit.

To test changes on your own computer first: install Node.js, run `npm install` once, then
`npm run dev` and open the printed local address.

## 6. What to do if something breaks

- **App won't load at all** → check the repo's **Actions** tab for a failed deploy (re-run
  it), and https://www.githubstatus.com for GitHub Pages outages.
- **Data not showing (map works but lists are empty / errors)** → log into the Supabase
  dashboard. Two common causes:
  - **Project paused:** Supabase's free tier pauses projects after ~1 week with no traffic.
    The dashboard will show a "Restore" / "Resume" button — click it and the app recovers in
    a couple of minutes.
  - Check **Table Editor** to confirm the data is still there.
- **Admin can't log in** → confirm their email is in *both* whitelist places (section 4),
  that they're using the right Google account, and that the Google provider is still enabled
  in Supabase (Authentication → Sign In / Providers).
- **Students can't sign in at all** → in Supabase: Authentication → URL Configuration must
  list the live site URL; in Google Cloud Console the OAuth app must still be published and
  its credentials valid.
- **If all else fails** → contact: _[IT contact name + email — fill this in]_, or the
  original developer: _[fill in]_.

## 7. Known limitations and future ideas

**Not built (deliberately deferred):**
- Street-View-style navigable locker walkthrough — only single 360° panoramas with a pin.
- Native iOS/Android app — the Wayfinder is a web app / PWA (students can "Add to Home
  Screen" for an app-like feel).
- Live GPS "you are here" positioning.
- Automatic schedule import from the SIS (FERPA/access constraints — students self-enter).

**Known gaps / rough edges:**
- **Brahma Tech requirements are placeholders** — the real strand-by-strand course map (in
  the academy's Canva doc) was never supplied. The 4-year-plan tracker flags this in the UI.
  Enter the real rows under Admin → Courses & Requirements when available.
- **Rooms/teachers and locker sections are placeholder data** until the real campus
  directory and locker ranges are entered through the admin panel.
- **Bell schedule starts empty** — enter the official times in the admin panel.
- The UC tracker counts UC-approved credits per subject area; it does not validate the exact
  a–g letter of each course (e.g. "same language for 2 years" is noted, not enforced).
- The campus map images are 1x resolution — they soften slightly at maximum zoom. A 2x
  re-export of the same artwork can be swapped in if sharper zoom matters.
- Hall-pass logging depends on each teacher deploying their Apps Script sheet logger (see
  `docs/hall-pass-teacher-setup.md`).

**Future ideas:**
- "Now / next class" highlighting driven by the bell schedule (the schedule table now exists).
- Push notifications for announcements.
- Real per-strand Brahma Tech tracking once the academy publishes the course map.
- An in-map locker pin once real locker coordinates are entered.
