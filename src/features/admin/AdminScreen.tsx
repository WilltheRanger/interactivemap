import { useState } from 'react';
import { LogIn, LogOut } from 'lucide-react';
import { Button, Skeleton } from '../../components';
import { signInWithGoogle, useSupabaseSession } from '../../data/useSession';
import { isAdminEmail } from '../../lib/authPolicy';
import { getSupabase } from '../../lib/supabase';
import { AnnouncementsAdmin } from './AnnouncementsAdmin';
import { RoomsTeachersAdmin } from './RoomsTeachersAdmin';
import { LockersAdmin } from './LockersAdmin';
import { BellScheduleAdmin } from './BellScheduleAdmin';
import { CoursesAdmin } from './CoursesAdmin';
import './Admin.css';

const TABS = [
  { id: 'announcements', label: 'Announcements' },
  { id: 'rooms', label: 'Rooms & Teachers' },
  { id: 'lockers', label: 'Lockers' },
  { id: 'bell', label: 'Bell Schedule' },
  { id: 'courses', label: 'Courses & Requirements' },
] as const;
type TabId = (typeof TABS)[number]['id'];

/**
 * /admin — the unified reference-data manager (announcements, rooms/teachers, locker sections,
 * bell schedule, courses/requirements). Not linked from the student nav; reached by URL only.
 * The app-wide RequireAuth gate has already ensured a signed-in, school-or-admin account; here
 * the hardcoded whitelist (src/lib/authPolicy.ts) additionally gates the manager UI. School
 * accounts that aren't admins see a "not authorized" panel but stay signed in to the app.
 * RLS enforces the same whitelist server-side on every table, so the client check is UX,
 * not security.
 */
export function AdminScreen() {
  const { loading, session } = useSupabaseSession();
  const [tab, setTab] = useState<TabId>('announcements');
  const isAdmin = !!session && isAdminEmail(session.user.email);

  return (
    <section className="screen" aria-labelledby="admin-title">
      <h1 id="admin-title" className="screen__title">
        Admin
      </h1>

      {loading && (
        <div className="screen__body" aria-busy="true" role="status" aria-label="Checking sign-in">
          <Skeleton height={48} radius="var(--radius-md)" />
        </div>
      )}

      {!loading && !session && (
        <>
          <p className="screen__sub">Staff sign-in for managing the Wayfinder&rsquo;s data.</p>
          <div className="screen__body">
            <Button variant="primary" icon={<LogIn size={18} />} onClick={signInWithGoogle}>
              Sign in with Google
            </Button>
          </div>
        </>
      )}

      {!loading && session && !isAdmin && (
        <div className="screen__body">
          <div className="ann-panel ann-panel--error" role="alert">
            <p className="ann-panel__title">This account isn&rsquo;t authorized</p>
            <p>
              {session.user.email} can&rsquo;t manage the Wayfinder. If you should have access, ask
              the Wayfinder owner to add you.
            </p>
          </div>
        </div>
      )}

      {!loading && session && isAdmin && (
        <>
          <p className="screen__sub">
            Signed in as {session.user.email}
            <Button
              className="admin-signout"
              variant="secondary"
              icon={<LogOut size={16} />}
              onClick={() => void getSupabase().auth.signOut()}
            >
              Sign out
            </Button>
          </p>
          <div className="screen__body">
            <nav className="admin-tabs" role="tablist" aria-label="Admin sections">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  className={`admin-tab ${tab === t.id ? 'is-active' : ''}`}
                  onClick={() => setTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </nav>

            {tab === 'announcements' && <AnnouncementsAdmin />}
            {tab === 'rooms' && <RoomsTeachersAdmin />}
            {tab === 'lockers' && <LockersAdmin />}
            {tab === 'bell' && <BellScheduleAdmin />}
            {tab === 'courses' && <CoursesAdmin />}
          </div>
        </>
      )}
    </section>
  );
}
