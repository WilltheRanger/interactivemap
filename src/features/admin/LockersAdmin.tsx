import { lazy, Suspense, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, Pencil, Plus, Upload } from 'lucide-react';
import { Button, Card } from '../../components';
import { useBuildings, useLockerSections, useLockersBySection } from '../../data/hooks';
import { config } from '../../lib/config';
import { uploadPanorama } from '../../lib/cloudinary';
import type { LockerSection } from '../../lib/refData';
import { getSupabase } from '../../lib/supabase';
import { ConfirmDeleteButton, Field, MutationStatus, SectionStates } from './shared';
import { slugify } from './slugify';

// Pannellum + the panorama image are heavy and admin-only, so the visual tagger is code-split.
const LockerTagger = lazy(() => import('./LockerTagger'));

interface SectionFormState {
  label: string;
  number_start: string;
  number_end: string;
  building_id: string;
  panorama_url: string;
  map_x: string;
  map_y: string;
}

function fromSection(s: LockerSection | null, panoramaUrl: string): SectionFormState {
  const coord = (s?.map_coord ?? null) as { x?: number; y?: number } | null;
  return {
    label: s?.label ?? '',
    number_start: s ? String(s.number_start) : '',
    number_end: s ? String(s.number_end) : '',
    building_id: s?.building_id ?? '',
    panorama_url: panoramaUrl,
    map_x: coord?.x != null ? String(coord.x) : '',
    map_y: coord?.y != null ? String(coord.y) : '',
  };
}

function SectionForm({
  editing,
  panoramaUrl,
  onDone,
}: {
  editing: LockerSection | null;
  panoramaUrl: string;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const buildings = useBuildings();
  const [form, setForm] = useState<SectionFormState>(fromSection(editing, panoramaUrl));
  const [errors, setErrors] = useState<Partial<Record<keyof SectionFormState, string>>>({});
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const set = <K extends keyof SectionFormState>(key: K, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  };

  // Admin-friendly upload: pick a photo → Cloudinary (CORS + auto-resize) → fill the URL automatically.
  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // let the same file be re-picked after an error
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      set('panorama_url', await uploadPanorama(file));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const save = useMutation({
    mutationFn: async () => {
      const supabase = getSupabase();
      const id = editing?.id ?? `sec-${slugify(form.label) || form.number_start}`;

      // Panorama: a URL creates/updates a panoramas row tied to this section; blank clears it.
      let panoramaId: string | null = editing?.panorama_id ?? null;
      const url = form.panorama_url.trim();
      if (url) {
        panoramaId = panoramaId ?? `pan-${id}`;
        const { error: panErr } = await supabase
          .from('panoramas')
          .upsert({ id: panoramaId, image_url: url, label: form.label || id });
        if (panErr) throw panErr;
      } else {
        panoramaId = null;
      }

      const row = {
        id,
        label: form.label.trim() || null,
        number_start: Number(form.number_start),
        number_end: Number(form.number_end),
        building_id: form.building_id || null,
        panorama_id: panoramaId,
        map_coord:
          form.map_x.trim() && form.map_y.trim()
            ? { x: Number(form.map_x), y: Number(form.map_y) }
            : null,
      };
      const query = editing
        ? supabase.from('locker_sections').update(row).eq('id', editing.id)
        : supabase.from('locker_sections').insert(row);
      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['lockerSections'] });
      void queryClient.invalidateQueries({ queryKey: ['panoramas'] });
      setSaved(true);
      onDone();
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    const start = Number(form.number_start);
    const end = Number(form.number_end);
    if (!form.number_start.trim() || !Number.isInteger(start) || start <= 0)
      next.number_start = 'Enter the first locker number.';
    if (!form.number_end.trim() || !Number.isInteger(end) || end <= 0)
      next.number_end = 'Enter the last locker number.';
    if (!next.number_start && !next.number_end && end < start)
      next.number_end = 'Must be ≥ the start number.';
    if ((form.map_x.trim() === '') !== (form.map_y.trim() === ''))
      next.map_y = 'Provide both X and Y (or neither).';
    setErrors(next);
    if (Object.keys(next).length === 0) save.mutate();
  };

  return (
    <form className="admin-form" onSubmit={submit} noValidate>
      <h3 className="admin-form__title">
        {editing ? `Edit ${editing.label ?? editing.id}` : 'New locker section'}
      </h3>
      <div className="admin-form__grid">
        <Field label="Label (e.g. “400s breezeway”)">
          <input
            className="admin-input"
            type="text"
            value={form.label}
            onChange={(e) => set('label', e.target.value)}
          />
        </Field>
        <Field label="Building (optional)">
          <select
            className="admin-input"
            value={form.building_id}
            onChange={(e) => set('building_id', e.target.value)}
          >
            <option value="">None</option>
            {(buildings.data ?? []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="First locker number" error={errors.number_start}>
          <input
            className="admin-input"
            type="number"
            min={1}
            value={form.number_start}
            onChange={(e) => set('number_start', e.target.value)}
            aria-invalid={!!errors.number_start}
          />
        </Field>
        <Field label="Last locker number" error={errors.number_end}>
          <input
            className="admin-input"
            type="number"
            min={1}
            value={form.number_end}
            onChange={(e) => set('number_end', e.target.value)}
            aria-invalid={!!errors.number_end}
          />
        </Field>
        <Field label="360° panorama photo (optional)">
          {config.isCloudinaryConfigured && (
            <div className="admin-upload">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={onPickFile}
              />
              <Button
                type="button"
                variant="secondary"
                icon={<Upload size={16} />}
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? 'Uploading…' : form.panorama_url ? 'Replace photo' : 'Upload photo'}
              </Button>
              {form.panorama_url && !uploading && (
                <a
                  className="admin-upload__preview"
                  href={form.panorama_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Uploaded ✓ — preview
                </a>
              )}
              {uploadError && (
                <span className="admin-status admin-status--error" role="alert">
                  {uploadError}
                </span>
              )}
            </div>
          )}
          <input
            className="admin-input"
            type="url"
            placeholder={
              config.isCloudinaryConfigured ? 'Filled in automatically when you upload' : 'https://…'
            }
            value={form.panorama_url}
            onChange={(e) => set('panorama_url', e.target.value)}
          />
        </Field>
        <Field label="Map X (optional)">
          <input
            className="admin-input"
            type="number"
            value={form.map_x}
            onChange={(e) => set('map_x', e.target.value)}
          />
        </Field>
        <Field label="Map Y (optional)" error={errors.map_y}>
          <input
            className="admin-input"
            type="number"
            value={form.map_y}
            onChange={(e) => set('map_y', e.target.value)}
            aria-invalid={!!errors.map_y}
          />
        </Field>
      </div>
      <MutationStatus error={save.isError ? save.error : null} saved={saved && !save.isPending} />
      <div className="admin-form__actions">
        <Button type="submit" variant="primary" disabled={save.isPending}>
          {save.isPending ? 'Saving…' : editing ? 'Save changes' : 'Add section'}
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

/** Per-locker hotspot editor (yaw/pitch) for one section — optional fine-tuning. */
function HotspotEditor({ section }: { section: LockerSection }) {
  const lockers = useLockersBySection(section.id);
  const queryClient = useQueryClient();
  const [number, setNumber] = useState('');
  const [yaw, setYaw] = useState('');
  const [pitch, setPitch] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [tagging, setTagging] = useState(false);

  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: ['lockers', section.id] });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await getSupabase()
        .from('lockers')
        .insert({
          id: `${section.id}-${number}`,
          section_id: section.id,
          number: Number(number),
          hotspot_yaw: yaw.trim() ? Number(yaw) : null,
          hotspot_pitch: pitch.trim() ? Number(pitch) : null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      setNumber('');
      setYaw('');
      setPitch('');
    },
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await getSupabase().from('lockers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(number);
    if (!number.trim() || !Number.isInteger(n)) return setFormError('Enter a locker number.');
    if (n < section.number_start || n > section.number_end)
      return setFormError(
        `Locker must be in this section's range (${section.number_start}–${section.number_end}).`,
      );
    setFormError(null);
    add.mutate();
  };

  return (
    <div className="admin-hotspots">
      <h4 className="admin-hotspots__title">
        Per-locker pins{' '}
        <span className="admin-row__sub">(optional — yaw/pitch in the panorama)</span>
      </h4>
      {section.panorama_id ? (
        <Button variant="secondary" icon={<Camera size={16} />} onClick={() => setTagging(true)}>
          Tag in 360°
        </Button>
      ) : (
        <p className="admin-row__sub">Add a panorama URL (Edit) to tag pins visually.</p>
      )}
      {tagging && (
        <Suspense fallback={null}>
          <LockerTagger section={section} onClose={() => setTagging(false)} />
        </Suspense>
      )}
      <SectionStates
        isPending={lockers.isPending}
        isError={lockers.isError}
        onRetry={() => void lockers.refetch()}
      >
        {(lockers.data ?? []).length > 0 && (
          <ul className="admin-list admin-list--compact">
            {(lockers.data ?? []).map((l) => (
              <li key={l.id} className="admin-row">
                <span className="admin-row__title">#{l.number}</span>
                <span className="admin-row__sub">
                  yaw {l.hotspot_yaw ?? '—'} · pitch {l.hotspot_pitch ?? '—'}
                </span>
                <div className="admin-row__actions">
                  <ConfirmDeleteButton
                    label={`locker ${l.number}`}
                    pending={remove.isPending && remove.variables === l.id}
                    onConfirm={() => remove.mutate(l.id)}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionStates>
      <form className="admin-hotspots__form" onSubmit={submit} noValidate>
        <input
          className="admin-input"
          type="number"
          placeholder="Locker #"
          aria-label="Locker number"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
        />
        <input
          className="admin-input"
          type="number"
          step="0.1"
          placeholder="Yaw"
          aria-label="Hotspot yaw"
          value={yaw}
          onChange={(e) => setYaw(e.target.value)}
        />
        <input
          className="admin-input"
          type="number"
          step="0.1"
          placeholder="Pitch"
          aria-label="Hotspot pitch"
          value={pitch}
          onChange={(e) => setPitch(e.target.value)}
        />
        <Button type="submit" variant="secondary" disabled={add.isPending}>
          {add.isPending ? 'Adding…' : 'Add pin'}
        </Button>
      </form>
      {(formError || add.isError) && (
        <p className="admin-status admin-status--error" role="alert">
          {formError ?? (add.error instanceof Error ? add.error.message : 'Couldn’t add the pin.')}
        </p>
      )}
    </div>
  );
}

/**
 * Locker Sections tab. Current rows are placeholder until the owner supplies real ranges,
 * coordinates, and panorama files (DATA-INTAKE checkpoint) — this UI is how they get entered.
 */
export function LockersAdmin() {
  const sections = useLockerSections();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<LockerSection | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await getSupabase().from('locker_sections').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['lockerSections'] }),
  });

  return (
    <div className="admin-body">
      <p className="admin-note" role="note">
        Placeholder sections until the real locker ranges, map coordinates, and panoramas are
        supplied. A locker number typed by a student resolves to a section by its range.
      </p>

      <div className="admin-subsection__head">
        <h2 className="admin-section-title">Locker sections</h2>
        {!showForm && !editing && (
          <Button variant="secondary" icon={<Plus size={16} />} onClick={() => setShowForm(true)}>
            Add section
          </Button>
        )}
      </div>
      {(showForm || editing) && (
        <Card>
          <SectionForm
            key={editing?.id ?? 'new-section'}
            editing={editing}
            panoramaUrl=""
            onDone={() => {
              setEditing(null);
              setShowForm(false);
            }}
          />
        </Card>
      )}

      <SectionStates
        isPending={sections.isPending}
        isError={sections.isError}
        onRetry={() => void sections.refetch()}
      >
        {sections.data?.length === 0 ? (
          <p className="admin-empty" role="status">
            No locker sections yet — add the first one above.
          </p>
        ) : (
          <ul className="admin-list">
            {(sections.data ?? []).map((s) => (
              <li key={s.id} className="admin-row admin-row--stacked">
                <div className="admin-row__main">
                  <div className="admin-row__text">
                    <span className="admin-row__title">{s.label ?? s.id}</span>
                    <span className="admin-row__sub">
                      #{s.number_start}–{s.number_end}
                      {s.building_id && ` · ${s.building_id}`}
                      {s.panorama_id ? ' · panorama set' : ' · no panorama'}
                    </span>
                  </div>
                  <div className="admin-row__actions">
                    <Button
                      variant="secondary"
                      onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                    >
                      {expanded === s.id ? 'Hide pins' : 'Pins'}
                    </Button>
                    <Button
                      variant="secondary"
                      icon={<Pencil size={16} />}
                      onClick={() => setEditing(s)}
                      aria-label={`Edit ${s.label ?? s.id}`}
                    >
                      Edit
                    </Button>
                    <ConfirmDeleteButton
                      label={s.label ?? s.id}
                      pending={remove.isPending && remove.variables === s.id}
                      onConfirm={() => remove.mutate(s.id)}
                    />
                  </div>
                </div>
                {expanded === s.id && <HotspotEditor section={s} />}
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
    </div>
  );
}
