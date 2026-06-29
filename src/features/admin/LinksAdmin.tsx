import { createElement, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil } from 'lucide-react';
import { Button, Card } from '../../components';
import { useLinks } from '../../data/hooks';
import type { LinkRow } from '../../lib/refData';
import { getSupabase } from '../../lib/supabase';
import type { TablesInsert } from '../../types/db';
import { ICON_OPTIONS, TINT_PRESETS, iconFor } from '../links/links.data';
import { ConfirmDeleteButton, SectionStates } from './shared';
import '../links/Links.css'; // reuse the .link-row__tile / __text styles for the preview + rows

interface FormState {
  section: string;
  label: string;
  description: string;
  url: string;
  icon: string;
  tint: string;
  sortOrder: string;
}

const EMPTY: FormState = {
  section: 'School tools',
  label: '',
  description: '',
  url: '',
  icon: 'link',
  tint: TINT_PRESETS[0],
  sortOrder: '0',
};

function fromRow(row: LinkRow): FormState {
  return {
    section: row.section,
    label: row.label,
    description: row.description ?? '',
    url: row.url,
    icon: row.icon,
    tint: row.tint,
    sortOrder: String(row.sort_order),
  };
}

function validate(form: FormState): Partial<Record<keyof FormState, string>> {
  const errors: Partial<Record<keyof FormState, string>> = {};
  if (!form.section.trim()) errors.section = 'Section is required.';
  if (!form.label.trim()) errors.label = 'Label is required.';
  if (!form.url.trim()) errors.url = 'URL is required.';
  else if (!/^https?:\/\//i.test(form.url.trim())) errors.url = 'URL must start with http:// or https://';
  return errors;
}

function toRow(form: FormState): TablesInsert<'links'> {
  const n = Number(form.sortOrder);
  return {
    section: form.section.trim(),
    label: form.label.trim(),
    description: form.description.trim() || null,
    url: form.url.trim(),
    icon: form.icon,
    tint: form.tint,
    sort_order: Number.isFinite(n) ? n : 0,
  };
}

/** Create/edit form for one link, with a live icon-tile preview. */
function LinkForm({ editing, onDone }: { editing: LinkRow | null; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(editing ? fromRow(editing) : EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [saved, setSaved] = useState(false);

  const save = useMutation({
    mutationFn: async (row: TablesInsert<'links'>) => {
      const supabase = getSupabase();
      const query = editing
        ? supabase.from('links').update(row).eq('id', editing.id)
        : supabase.from('links').insert(row);
      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['links'] });
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
      <h2 className="admin-form__title">{editing ? 'Edit link' : 'New link'}</h2>

      <div className="links-admin__preview" aria-hidden="true">
        <span className="link-row__tile" style={{ backgroundColor: form.tint }}>
          {createElement(iconFor(form.icon), { size: 20 })}
        </span>
        <span className="link-row__text">
          <span className="link-row__label">{form.label || 'Label'}</span>
          {form.description && <span className="link-row__desc">{form.description}</span>}
        </span>
      </div>

      {field(
        'section',
        'Section (links are grouped under this heading)',
        <input
          className="admin-input"
          type="text"
          value={form.section}
          onChange={(e) => set('section', e.target.value)}
          placeholder="e.g. School tools, Athletics, Wellness"
          aria-invalid={!!errors.section}
        />,
      )}
      {field(
        'label',
        'Label',
        <input
          className="admin-input"
          type="text"
          value={form.label}
          onChange={(e) => set('label', e.target.value)}
          aria-invalid={!!errors.label}
        />,
      )}
      {field(
        'description',
        'Description (optional)',
        <input
          className="admin-input"
          type="text"
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
        />,
      )}
      {field(
        'url',
        'URL',
        <input
          className="admin-input"
          type="url"
          inputMode="url"
          value={form.url}
          onChange={(e) => set('url', e.target.value)}
          placeholder="https://"
          aria-invalid={!!errors.url}
        />,
      )}
      {field(
        'icon',
        'Icon',
        <select
          className="admin-input"
          value={form.icon}
          onChange={(e) => set('icon', e.target.value)}
        >
          {ICON_OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>,
      )}

      <div className="admin-field">
        <span className="admin-field__label">Colour</span>
        <div className="links-admin__tints">
          {TINT_PRESETS.map((t) => (
            <button
              key={t}
              type="button"
              className={`links-admin__swatch${form.tint === t ? ' is-active' : ''}`}
              style={{ backgroundColor: t }}
              aria-label={`Use ${t}`}
              aria-pressed={form.tint === t}
              onClick={() => set('tint', t)}
            />
          ))}
          <input
            type="color"
            className="links-admin__color"
            value={form.tint}
            onChange={(e) => set('tint', e.target.value)}
            aria-label="Custom colour"
          />
        </div>
      </div>

      {field(
        'sortOrder',
        'Sort order (lower shows first)',
        <input
          className="admin-input"
          type="number"
          value={form.sortOrder}
          onChange={(e) => set('sortOrder', e.target.value)}
        />,
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
          {save.isPending ? 'Saving…' : editing ? 'Save changes' : 'Add link'}
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

function AdminList({ onEdit }: { onEdit: (row: LinkRow) => void }) {
  const links = useLinks();
  const queryClient = useQueryClient();

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await getSupabase().from('links').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['links'] }),
  });

  return (
    <SectionStates
      isPending={links.isPending}
      isError={links.isError}
      onRetry={() => void links.refetch()}
    >
      {links.data?.length === 0 ? (
        <p className="admin-empty" role="status">
          No links yet — add the first one above.
        </p>
      ) : (
        <ul className="admin-list">
          {(links.data ?? []).map((row) => {
            const Icon = iconFor(row.icon);
            return (
              <li key={row.id} className="admin-row">
                <span className="link-row__tile links-admin__rowtile" style={{ backgroundColor: row.tint }}>
                  <Icon size={18} aria-hidden="true" />
                </span>
                <div className="admin-row__text">
                  <span className="admin-row__title">{row.label}</span>
                  <span className="admin-row__sub">
                    {row.section} · {row.url}
                  </span>
                </div>
                <div className="admin-row__actions">
                  <Button
                    variant="secondary"
                    icon={<Pencil size={16} />}
                    onClick={() => onEdit(row)}
                    aria-label={`Edit ${row.label}`}
                  >
                    Edit
                  </Button>
                  <ConfirmDeleteButton
                    label={row.label}
                    pending={remove.isPending && remove.variables === row.id}
                    onConfirm={() => remove.mutate(row.id)}
                  />
                </div>
              </li>
            );
          })}
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

/** Links tab — manage the external-resource cards shown on the student Links screen. */
export function LinksAdmin() {
  const [editing, setEditing] = useState<LinkRow | null>(null);
  return (
    <div className="admin-body">
      <Card>
        <LinkForm key={editing?.id ?? 'new'} editing={editing} onDone={() => setEditing(null)} />
      </Card>
      <h2 className="admin-section-title">Links</h2>
      <AdminList onEdit={(row) => setEditing(row)} />
    </div>
  );
}
