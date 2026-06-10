import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../../components';
import { getSupabase } from '../../lib/supabase';
import type { Announcement } from '../../lib/refData';
import type { TablesInsert } from '../../types/db';

interface AnnouncementFormProps {
  /** When set, the form edits this announcement; otherwise it creates a new one. */
  editing: Announcement | null;
  onDone: () => void;
}

interface FormState {
  title: string;
  body: string;
  hasEvent: boolean;
  eventTitle: string;
  eventDate: string; // datetime-local format (YYYY-MM-DDTHH:mm), local time
  eventLocation: string;
}

const EMPTY: FormState = {
  title: '',
  body: '',
  hasEvent: false,
  eventTitle: '',
  eventDate: '',
  eventLocation: '',
};

const pad = (n: number) => String(n).padStart(2, '0');

/** ISO (DB) → datetime-local input value, in the admin's local time. */
function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromAnnouncement(a: Announcement): FormState {
  return {
    title: a.title,
    body: a.body,
    hasEvent: a.event_date != null,
    eventTitle: a.event_title ?? '',
    eventDate: a.event_date ? isoToLocalInput(a.event_date) : '',
    eventLocation: a.event_location ?? '',
  };
}

function validate(form: FormState): Partial<Record<keyof FormState, string>> {
  const errors: Partial<Record<keyof FormState, string>> = {};
  if (!form.title.trim()) errors.title = 'Title is required.';
  if (!form.body.trim()) errors.body = 'Body is required.';
  if (form.hasEvent) {
    if (!form.eventDate) errors.eventDate = 'Event date and time are required.';
    else if (Number.isNaN(new Date(form.eventDate).getTime()))
      errors.eventDate = 'Enter a valid date and time.';
  }
  return errors;
}

function toRow(form: FormState): TablesInsert<'announcements'> {
  return {
    title: form.title.trim(),
    body: form.body.trim(),
    event_date: form.hasEvent ? new Date(form.eventDate).toISOString() : null,
    event_title: form.hasEvent && form.eventTitle.trim() ? form.eventTitle.trim() : null,
    event_location: form.hasEvent && form.eventLocation.trim() ? form.eventLocation.trim() : null,
  };
}

/**
 * Create/edit form with inline validation, pending state, and success/error feedback.
 * The parent keys this component by the edit target, so switching targets remounts with
 * fresh state — no prop-sync effect needed.
 */
export function AnnouncementForm({ editing, onDone }: AnnouncementFormProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(editing ? fromAnnouncement(editing) : EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [saved, setSaved] = useState(false);

  const save = useMutation({
    mutationFn: async (row: TablesInsert<'announcements'>) => {
      const supabase = getSupabase();
      const query = editing
        ? supabase.from('announcements').update(row).eq('id', editing.id)
        : supabase.from('announcements').insert(row);
      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['announcements'] });
      setSaved(true);
      if (!editing) setForm(EMPTY);
      onDone();
    },
  });

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) save.mutate(toRow(form));
  };

  const field = (key: keyof FormState, label: string, input: React.ReactNode) => (
    <label className="admin-field">
      <span className="admin-field__label">{label}</span>
      {input}
      {errors[key] && (
        <span className="admin-field__error" role="alert">
          {errors[key]}
        </span>
      )}
    </label>
  );

  return (
    <form className="admin-form" onSubmit={submit} noValidate>
      <h2 className="admin-form__title">{editing ? 'Edit announcement' : 'New announcement'}</h2>

      {field(
        'title',
        'Title',
        <input
          className="admin-input"
          type="text"
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          aria-invalid={!!errors.title}
          required
        />,
      )}

      {field(
        'body',
        'Body',
        <textarea
          className="admin-input admin-input--area"
          rows={4}
          value={form.body}
          onChange={(e) => set('body', e.target.value)}
          aria-invalid={!!errors.body}
          required
        />,
      )}

      <label className="admin-toggle">
        <input
          type="checkbox"
          checked={form.hasEvent}
          onChange={(e) => set('hasEvent', e.target.checked)}
        />
        <span>This announcement is an event</span>
      </label>

      {form.hasEvent && (
        <div className="admin-form__event">
          {field(
            'eventTitle',
            'Event title (optional — defaults to the announcement title)',
            <input
              className="admin-input"
              type="text"
              value={form.eventTitle}
              onChange={(e) => set('eventTitle', e.target.value)}
            />,
          )}
          {field(
            'eventDate',
            'Event date & time',
            <input
              className="admin-input"
              type="datetime-local"
              value={form.eventDate}
              onChange={(e) => set('eventDate', e.target.value)}
              aria-invalid={!!errors.eventDate}
              required
            />,
          )}
          {field(
            'eventLocation',
            'Event location (optional)',
            <input
              className="admin-input"
              type="text"
              value={form.eventLocation}
              onChange={(e) => set('eventLocation', e.target.value)}
            />,
          )}
        </div>
      )}

      {save.isError && (
        <p className="admin-status admin-status--error" role="alert">
          Couldn&rsquo;t save: {save.error instanceof Error ? save.error.message : 'unknown error'}
        </p>
      )}
      {saved && !save.isPending && (
        <p className="admin-status" role="status">
          Saved ✓
        </p>
      )}

      <div className="admin-form__actions">
        <Button type="submit" variant="primary" disabled={save.isPending}>
          {save.isPending ? 'Saving…' : editing ? 'Save changes' : 'Post announcement'}
        </Button>
        {editing && (
          <Button type="button" variant="secondary" onClick={onDone} disabled={save.isPending}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
