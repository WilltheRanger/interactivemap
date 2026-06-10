import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LogIn, LogOut, Pencil, Trash2 } from 'lucide-react';
import { Button, Card, Skeleton } from '../../components';
import { useAnnouncements } from '../../data/hooks';
import { signInWithGoogle, useSupabaseSession } from '../../data/useSession';
import { isAdminEmail } from '../../lib/authPolicy';
import type { Announcement } from '../../lib/refData';
import { getSupabase } from '../../lib/supabase';
import { AnnouncementForm } from './AnnouncementForm';
import './Admin.css';

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
 * The app-wide RequireAuth gate has already ensured a signed-in, school-or-admin account;
 * here the hardcoded whitelist (src/lib/authPolicy.ts) additionally gates the manager UI.
 * School accounts that aren't admins see a "not authorized" panel but stay signed in to the
 * app. RLS enforces the same whitelist server-side, so the client check is UX, not security.
 */
export function AdminScreen() {
  const { loading, session } = useSupabaseSession();
  const [editing, setEditing] = useState<Announcement | null>(null);
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
          <p className="screen__sub">Staff sign-in for posting announcements.</p>
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
              {session.user.email} can&rsquo;t manage announcements. If you should have access, ask
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
