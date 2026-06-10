import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LogIn, LogOut, Pencil, Trash2 } from 'lucide-react';
import { Button, Card, Skeleton } from '../../components';
import { useAnnouncements } from '../../data/hooks';
import { isAdminEmail } from '../../lib/adminAuth';
import type { Announcement } from '../../lib/refData';
import { getSupabase } from '../../lib/supabase';
import { AnnouncementForm } from './AnnouncementForm';
import './Admin.css';

type AuthState =
  | { name: 'loading' }
  | { name: 'signed-out' }
  | { name: 'unauthorized'; email: string }
  | { name: 'admin'; session: Session };

/** Watch the Supabase session; non-whitelisted accounts are signed out immediately. */
function useAdminSession(): [AuthState, () => void] {
  const [state, setState] = useState<AuthState>({ name: 'loading' });

  useEffect(() => {
    const supabase = getSupabase();
    let cancelled = false;

    const apply = (session: Session | null) => {
      if (cancelled) return;
      if (!session) {
        setState((s) => (s.name === 'unauthorized' ? s : { name: 'signed-out' }));
      } else if (isAdminEmail(session.user.email)) {
        setState({ name: 'admin', session });
      } else {
        // Not on the whitelist: drop the session right away (RLS would reject writes anyway).
        setState({ name: 'unauthorized', email: session.user.email ?? 'unknown account' });
        void supabase.auth.signOut();
      }
    };

    void supabase.auth.getSession().then(({ data }) => apply(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => apply(session));
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = () => {
    void getSupabase().auth.signInWithOAuth({
      provider: 'google',
      // Back to /admin after Google: respects the GitHub Pages base path.
      options: { redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}admin` },
    });
  };

  return [state, signIn];
}

function AdminList({ onEdit }: { onEdit: (a: Announcement) => void }) {
  const announcements = useAnnouncements();
  const queryClient = useQueryClient();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await getSupabase().from('announcements').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      setConfirmingId(null);
      void queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });

  if (announcements.isPending) {
    return (
      <div className="admin-list" aria-busy="true" role="status" aria-label="Loading announcements">
        <Skeleton height={64} radius="var(--radius-md)" />
        <Skeleton height={64} radius="var(--radius-md)" />
      </div>
    );
  }

  if (announcements.isError) {
    return (
      <div className="ann-panel ann-panel--error" role="alert">
        <p className="ann-panel__title">Couldn&rsquo;t load announcements</p>
        <Button variant="primary" onClick={() => void announcements.refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  if (announcements.data.length === 0) {
    return (
      <p className="admin-empty" role="status">
        Nothing posted yet — your first announcement will appear here.
      </p>
    );
  }

  return (
    <ul className="admin-list">
      {announcements.data.map((a) => (
        <li key={a.id} className="admin-row">
          <div className="admin-row__text">
            <span className="admin-row__title">{a.title}</span>
            <span className="admin-row__sub">
              {new Date(a.created_at).toLocaleDateString()}
              {a.event_date &&
                ` · event ${new Date(a.event_date).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}`}
            </span>
          </div>
          <div className="admin-row__actions">
            <Button
              variant="secondary"
              icon={<Pencil size={16} />}
              onClick={() => onEdit(a)}
              aria-label={`Edit ${a.title}`}
            >
              Edit
            </Button>
            <Button
              variant="danger"
              icon={<Trash2 size={16} />}
              disabled={remove.isPending && confirmingId === a.id}
              onClick={() => (confirmingId === a.id ? remove.mutate(a.id) : setConfirmingId(a.id))}
              aria-label={
                confirmingId === a.id ? `Confirm deleting ${a.title}` : `Delete ${a.title}`
              }
            >
              {remove.isPending && confirmingId === a.id
                ? 'Deleting…'
                : confirmingId === a.id
                  ? 'Confirm?'
                  : 'Delete'}
            </Button>
          </div>
          {remove.isError && confirmingId === a.id && (
            <p className="admin-status admin-status--error" role="alert">
              Couldn&rsquo;t delete:{' '}
              {remove.error instanceof Error ? remove.error.message : 'unknown error'}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * /admin — announcements manager. Not linked from the student nav; reached by URL only.
 * Google OAuth via Supabase Auth, then a hardcoded email whitelist (src/lib/adminAuth.ts) gates
 * the UI — non-whitelisted sign-ins are dropped immediately. RLS enforces the same whitelist
 * server-side, so the client check is UX, not security.
 */
export function AdminScreen() {
  const [auth, signIn] = useAdminSession();
  const [editing, setEditing] = useState<Announcement | null>(null);

  return (
    <section className="screen" aria-labelledby="admin-title">
      <h1 id="admin-title" className="screen__title">
        Admin
      </h1>

      {auth.name === 'loading' && (
        <div className="screen__body" aria-busy="true" role="status" aria-label="Checking sign-in">
          <Skeleton height={48} radius="var(--radius-md)" />
        </div>
      )}

      {auth.name === 'signed-out' && (
        <>
          <p className="screen__sub">Staff sign-in for posting announcements.</p>
          <div className="screen__body">
            <Button variant="primary" icon={<LogIn size={18} />} onClick={signIn}>
              Sign in with Google
            </Button>
          </div>
        </>
      )}

      {auth.name === 'unauthorized' && (
        <div className="screen__body">
          <div className="ann-panel ann-panel--error" role="alert">
            <p className="ann-panel__title">This account isn&rsquo;t authorized</p>
            <p>
              {auth.email} can&rsquo;t manage announcements, so it was signed out. If you should
              have access, ask the Wayfinder owner to add you.
            </p>
            <Button variant="secondary" onClick={signIn}>
              Sign in with a different account
            </Button>
          </div>
        </div>
      )}

      {auth.name === 'admin' && (
        <>
          <p className="screen__sub">
            Signed in as {auth.session.user.email}
            <Button
              className="admin-signout"
              variant="secondary"
              icon={<LogOut size={16} />}
              onClick={() => void getSupabase().auth.signOut()}
            >
              Sign out
            </Button>
          </p>
          <div className="screen__body admin-body">
            <Card>
              {/* Keyed by target: picking another announcement remounts the form with fresh state. */}
              <AnnouncementForm
                key={editing?.id ?? 'new'}
                editing={editing}
                onDone={() => setEditing(null)}
              />
            </Card>
            <h2 className="admin-section-title">Posted</h2>
            <AdminList onEdit={(a) => setEditing(a)} />
          </div>
        </>
      )}
    </section>
  );
}
