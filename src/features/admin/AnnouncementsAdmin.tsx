import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil } from 'lucide-react';
import { Button, Card } from '../../components';
import { useAnnouncements } from '../../data/hooks';
import type { Announcement } from '../../lib/refData';
import { getSupabase } from '../../lib/supabase';
import { AnnouncementForm } from './AnnouncementForm';
import { ConfirmDeleteButton, SectionStates } from './shared';

function AdminList({ onEdit }: { onEdit: (a: Announcement) => void }) {
  const announcements = useAnnouncements();
  const queryClient = useQueryClient();

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await getSupabase().from('announcements').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['announcements'] }),
  });

  return (
    <SectionStates
      isPending={announcements.isPending}
      isError={announcements.isError}
      onRetry={() => void announcements.refetch()}
    >
      {announcements.data?.length === 0 ? (
        <p className="admin-empty" role="status">
          Nothing posted yet — your first announcement will appear here.
        </p>
      ) : (
        <ul className="admin-list">
          {(announcements.data ?? []).map((a) => (
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
                <ConfirmDeleteButton
                  label={a.title}
                  pending={remove.isPending && remove.variables === a.id}
                  onConfirm={() => remove.mutate(a.id)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
      {remove.isError && (
        <p className="admin-status admin-status--error" role="alert">
          Couldn&rsquo;t delete:{' '}
          {remove.error instanceof Error ? remove.error.message : 'unknown error'}
        </p>
      )}
    </SectionStates>
  );
}

/** Announcements tab — the original announcements manager (form + posted list). */
export function AnnouncementsAdmin() {
  const [editing, setEditing] = useState<Announcement | null>(null);
  return (
    <div className="admin-body">
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
  );
}
