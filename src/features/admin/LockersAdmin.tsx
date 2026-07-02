import { Suspense, useRef, useState } from 'react';
import { lazyWithRetry } from '../../lib/lazyWithRetry';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, Check, Map, Pencil, Plus, Upload, X } from 'lucide-react';
import { Button, Card, Skeleton } from '../../components';
import {
  useLockerBlocks,
  useLockerSections,
  useLockersBySection,
  usePanorama,
} from '../../data/hooks';
import { config } from '../../lib/config';
import { uploadPanoramaToStorage } from '../../lib/panoramaUpload';
import type { LockerSection } from '../../lib/refData';
import { getSupabase } from '../../lib/supabase';
import { ConfirmDeleteButton, Field, MutationStatus, SectionStates } from './shared';
import { errorMessage } from './errorMessage';
import { slugify } from './slugify';

// Pannellum + the panorama image are heavy and admin-only, so the visual tagger is code-split.
const LockerTagger = lazyWithRetry(() => import('./LockerTagger'), 'LockerTagger');
// The map tagger loads the full campus SVG + illustration — admin-only, so code-split too.
const LockerMapTagger = lazyWithRetry(() => import('./LockerMapTagger'), 'LockerMapTagger');

/**
 * Blocks manager: a block ("Block 4") is what a student picks. Each block holds one or more locker
 * sections (ranges) — managed below. Blocks aren't tied to buildings.
 */
function BlocksManager() {
  const blocks = useLockerBlocks();
  const queryClient = useQueryClient();
  const [newLabel, setNewLabel] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['lockerBlocks'] });

  const add = useMutation({
    mutationFn: async (label: string) => {
      const sortOrders = (blocks.data ?? []).map((b) => b.sort_order);
      const sort_order = (sortOrders.length ? Math.max(...sortOrders) : 0) + 1;
      const id = `block-${slugify(label) || sort_order}`;
      const { error } = await getSupabase()
        .from('locker_blocks')
        .insert({ id, label: label.trim(), sort_order });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewLabel('');
      invalidate();
    },
  });

  const rename = useMutation({
    mutationFn: async ({ id, label }: { id: string; label: string }) => {
      const { error } = await getSupabase()
        .from('locker_blocks')
        .update({ label: label.trim() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditingId(null);
      invalidate();
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await getSupabase().from('locker_blocks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const submitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newLabel.trim()) add.mutate(newLabel);
  };

  return (
    <div className="admin-subsection">
      <div className="admin-subsection__head">
        <h2 className="admin-section-title">Blocks</h2>
      </div>
      <p className="admin-note" role="note">
        Name each block <strong>BK&lt;n&gt;</strong> (e.g. “BK4”) — the &lt;n&gt; is the single digit a
        student types in their pin, like <strong>BK4</strong> + a 3-digit locker number. Each block
        holds one or more locker <em>sections</em> (ranges) — add those below and assign each to its
        block. Blocks aren’t tied to buildings.
      </p>

      <form className="admin-inline-form" onSubmit={submitAdd}>
        <input
          className="admin-input"
          type="text"
          placeholder="New block name (e.g. BK8)"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          aria-label="New block name"
        />
        <Button
          type="submit"
          variant="secondary"
          icon={<Plus size={16} />}
          disabled={add.isPending || !newLabel.trim()}
        >
          {add.isPending ? 'Adding…' : 'Add block'}
        </Button>
      </form>
      {add.isError && (
        <p className="admin-status admin-status--error" role="alert">
          Couldn’t add block: {errorMessage(add.error)}
        </p>
      )}

      <SectionStates
        isPending={blocks.isPending}
        isError={blocks.isError}
        onRetry={() => void blocks.refetch()}
      >
        {(blocks.data ?? []).length === 0 ? (
          <p className="admin-empty" role="status">
            No blocks yet — add the first one above.
          </p>
        ) : (
          <ul className="admin-list">
            {(blocks.data ?? []).map((b) => (
              <li key={b.id} className="admin-row">
                {editingId === b.id ? (
                  <>
                    <input
                      className="admin-input admin-input--inline"
                      type="text"
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      aria-label={`Rename ${b.label}`}
                    />
                    <div className="admin-row__actions">
                      <Button
                        variant="primary"
                        icon={<Check size={16} />}
                        disabled={rename.isPending || !editLabel.trim()}
                        onClick={() => rename.mutate({ id: b.id, label: editLabel })}
                      >
                        Save
                      </Button>
                      <Button
                        variant="secondary"
                        icon={<X size={16} />}
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="admin-row__text">
                      <span className="admin-row__title">{b.label}</span>
                    </span>
                    <div className="admin-row__actions">
                      <Button
                        variant="secondary"
                        icon={<Pencil size={16} />}
                        onClick={() => {
                          setEditingId(b.id);
                          setEditLabel(b.label);
                        }}
                        aria-label={`Rename ${b.label}`}
                      >
                        Rename
                      </Button>
                      <ConfirmDeleteButton
                        label={b.label}
                        pending={remove.isPending && remove.variables === b.id}
                        onConfirm={() => remove.mutate(b.id)}
                      />
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
        {remove.isError && (
          <p className="admin-status admin-status--error" role="alert">
            Couldn’t delete this block — move or delete its sections first.
          </p>
        )}
        {rename.isError && (
          <p className="admin-status admin-status--error" role="alert">
            Couldn’t rename the block.
          </p>
        )}
      </SectionStates>
    </div>
  );
}

interface SectionFormState {
  label: string;
  number_start: string;
  number_end: string;
  block_id: string;
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
    block_id: s?.block_id ?? '',
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
  const blocks = useLockerBlocks();
  const [form, setForm] = useState<SectionFormState>(fromSection(editing, panoramaUrl));
  const [errors, setErrors] = useState<Partial<Record<keyof SectionFormState, string>>>({});
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [swapHalves, setSwapHalves] = useState(false);
  const [lastFile, setLastFile] = useState<File | null>(null);

  const set = <K extends keyof SectionFormState>(key: K, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  };

  // Admin-friendly upload: pick a photo → (optional swap-halves fix) → resize → private Supabase
  // Storage bucket (admin-only via RLS) → fill the URL automatically. The viewer signs it on display.
  const runUpload = async (file: File, swap: boolean) => {
    setUploadError(null);
    setUploading(true);
    try {
      set('panorama_url', await uploadPanoramaToStorage(file, { swapHalves: swap }));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // let the same file be re-picked after an error
    if (!file) return;
    setLastFile(file);
    await runUpload(file, swapHalves);
  };

  // Toggling the fix re-processes the same photo so the corrected result shows without re-picking.
  const onToggleSwap = (next: boolean) => {
    setSwapHalves(next);
    if (lastFile && !uploading) void runUpload(lastFile, next);
  };

  const save = useMutation({
    mutationFn: async () => {
      const supabase = getSupabase();
      const id =
        editing?.id ?? `sec-${slugify(form.label) || `${form.block_id}-${form.number_start}`}`;

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
        block_id: form.block_id || null,
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
      if (error) {
        // A new section's id is derived from its label (or block+start), so re-using a label that
        // already exists collides on the primary key. Turn Postgres's 23505 into a plain-language fix.
        if (!editing && error.code === '23505') {
          throw new Error(
            `A locker section “${id}” already exists — give this one a different label, or edit the existing section instead of adding a new one.`,
          );
        }
        throw error;
      }
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
    if (!form.block_id) next.block_id = 'Choose the block this section belongs to.';
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
        <Field label="Block" error={errors.block_id}>
          <select
            className="admin-input"
            value={form.block_id}
            onChange={(e) => set('block_id', e.target.value)}
            aria-invalid={!!errors.block_id}
          >
            <option value="">Select a block</option>
            {(blocks.data ?? []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Label (e.g. “001–069”)">
          <input
            className="admin-input"
            type="text"
            value={form.label}
            onChange={(e) => set('label', e.target.value)}
          />
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
          {config.isSupabaseConfigured && (
            <div className="admin-upload">
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickFile} />
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
                // No external preview link: panoramas live in a private bucket, so the raw URL 403s
                // until signed. Verify the photo via "Pins → Tag in 360°", which signs it.
                <span className="admin-upload__preview">Uploaded ✓</span>
              )}
              {uploadError && (
                <span className="admin-status admin-status--error" role="alert">
                  {uploadError} You can paste an image URL below instead.
                </span>
              )}
              <label className="admin-toggle admin-upload__fix">
                <input
                  type="checkbox"
                  checked={swapHalves}
                  onChange={(e) => onToggleSwap(e.target.checked)}
                  disabled={uploading}
                />
                <span>Photo is split the wrong way — swap left/right halves</span>
              </label>
            </div>
          )}
          <input
            className="admin-input"
            type="url"
            placeholder={
              config.isSupabaseConfigured ? 'Filled in automatically when you upload' : 'https://…'
            }
            value={form.panorama_url}
            onChange={(e) => set('panorama_url', e.target.value)}
          />
          <p className="admin-form__hint">
            One 360° (equirectangular) photo of this locker bank — from a 360 camera, or your phone’s
            Panorama / “Photo Sphere” mode. The app shrinks it for you. If the preview’s seam runs
            through the middle of the scene, tick “split the wrong way” and it re-fixes the photo.
          </p>
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

/**
 * Per-locker pins for one section: the read-only list (with delete) + the visual "Tag in 360°" tool,
 * which is the single way to add/move pins (no more raw yaw/pitch typing).
 */
function HotspotEditor({ section }: { section: LockerSection }) {
  const lockers = useLockersBySection(section.id);
  const queryClient = useQueryClient();
  const [tagging, setTagging] = useState(false);

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await getSupabase().from('lockers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['lockers', section.id] }),
  });

  return (
    <div className="admin-hotspots">
      <h4 className="admin-hotspots__title">
        Per-locker pins{' '}
        <span className="admin-row__sub">(tap each locker in the 360° photo)</span>
      </h4>
      {section.panorama_id ? (
        <Button variant="secondary" icon={<Camera size={16} />} onClick={() => setTagging(true)}>
          Tag in 360°
        </Button>
      ) : (
        <p className="admin-row__sub">Add a panorama photo (Edit) to tag pins.</p>
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
        {(lockers.data ?? []).length > 0 ? (
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
        ) : (
          section.panorama_id && (
            <p className="admin-row__sub">No pins yet — use “Tag in 360°”.</p>
          )
        )}
      </SectionStates>
      {remove.isError && (
        <p className="admin-status admin-status--error" role="alert">
          Couldn’t delete the pin.
        </p>
      )}
    </div>
  );
}

/**
 * Locker tab: manage Blocks (what a student picks) and the locker Sections (ranges) within them.
 * Current rows are placeholder until the owner supplies real ranges, coordinates, and panorama files.
 */
export function LockersAdmin() {
  const sections = useLockerSections();
  const blocks = useLockerBlocks();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<LockerSection | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [tagging, setTagging] = useState(false);
  // Editing a section needs its current panorama URL preloaded, or saving would clear the panorama
  // (a blank URL field = "remove panorama"). Wait for the load to *succeed* before mounting the edit
  // form; if it errors, show a retry rather than risk wiping the photo.
  const editingPanorama = usePanorama(editing?.panorama_id ?? null);
  const editFormReady = !editing?.panorama_id || editingPanorama.isSuccess;
  const closeForm = () => {
    setEditing(null);
    setShowForm(false);
  };

  const remove = useMutation({
    mutationFn: async (section: LockerSection) => {
      const supabase = getSupabase();
      // Children first: lockers reference the section (FK, no cascade), so they block the delete.
      const { error: lockersErr } = await supabase
        .from('lockers')
        .delete()
        .eq('section_id', section.id);
      if (lockersErr) throw new Error(lockersErr.message);
      const { error: secErr } = await supabase
        .from('locker_sections')
        .delete()
        .eq('id', section.id);
      if (secErr) throw new Error(secErr.message);
      // Tidy up the now-orphaned panorama (the section was the only thing referencing it).
      if (section.panorama_id) {
        await supabase.from('panoramas').delete().eq('id', section.panorama_id);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['lockerSections'] });
      void queryClient.invalidateQueries({ queryKey: ['panoramas'] });
    },
  });

  const renderSection = (s: LockerSection) => (
    <li key={s.id} className="admin-row admin-row--stacked">
      <div className="admin-row__main">
        <div className="admin-row__text">
          <span className="admin-row__title">{s.label ?? `${s.number_start}–${s.number_end}`}</span>
          <span className="admin-row__sub">
            #{s.number_start}–{s.number_end}
            {s.panorama_id ? ' · photo set' : ' · no photo'}
            {s.map_shape_ids?.length ? ` · ${s.map_shape_ids.length} on map` : ' · not on map'}
          </span>
        </div>
        <div className="admin-row__actions">
          <Button variant="secondary" onClick={() => setExpanded(expanded === s.id ? null : s.id)}>
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
            pending={remove.isPending && remove.variables?.id === s.id}
            onConfirm={() => remove.mutate(s)}
          />
        </div>
      </div>
      {expanded === s.id && <HotspotEditor section={s} />}
    </li>
  );

  // Group sections under their block (blocks in their sort order), plus a trailing "No block" group
  // for any section that isn't assigned — so the list is easy to scan by block.
  const sectionList = sections.data ?? [];
  const blockList = blocks.data ?? [];
  const knownBlockIds = new Set(blockList.map((b) => b.id));
  const groups: { key: string; label: string; items: LockerSection[] }[] = blockList.map((b) => ({
    key: b.id,
    label: b.label,
    items: sectionList.filter((s) => s.block_id === b.id),
  }));
  const orphans = sectionList.filter((s) => !s.block_id || !knownBlockIds.has(s.block_id));
  if (orphans.length) groups.push({ key: '__none', label: 'No block', items: orphans });

  return (
    <div className="admin-body">
      <BlocksManager />

      <p className="admin-note" role="note">
        <strong>How to add a locker bank:</strong> 1) Make sure its <em>Block</em> exists above. 2){' '}
        <em>Add section</em> — pick the block, give its number range. 3) <em>Upload</em> the bank’s
        360° photo. 4) Open <em>Pins → Tag in 360°</em> and tap each locker. Students pick their block
        and type their number; the app finds the section whose range contains it.
      </p>

      <div className="admin-subsection__head">
        <h2 className="admin-section-title">Locker sections</h2>
        <div className="admin-row__actions">
          <Button variant="secondary" icon={<Map size={16} />} onClick={() => setTagging(true)}>
            Tag on map
          </Button>
          {!showForm && !editing && (
            <Button variant="secondary" icon={<Plus size={16} />} onClick={() => setShowForm(true)}>
              Add section
            </Button>
          )}
        </div>
      </div>
      {(showForm || editing) && (
        <Card>
          {editFormReady ? (
            <SectionForm
              key={editing?.id ?? 'new-section'}
              editing={editing}
              panoramaUrl={editingPanorama.data?.image_url ?? ''}
              onDone={closeForm}
            />
          ) : editingPanorama.isError ? (
            <div className="admin-form">
              <p className="admin-status admin-status--error" role="alert">
                Couldn’t load this section’s photo. Retry before editing so it isn’t lost.
              </p>
              <div className="admin-form__actions">
                <Button variant="primary" onClick={() => void editingPanorama.refetch()}>
                  Retry
                </Button>
                <Button variant="secondary" onClick={closeForm}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Skeleton width="100%" height={120} radius="var(--radius-md)" />
          )}
        </Card>
      )}

      <SectionStates
        isPending={sections.isPending}
        isError={sections.isError}
        onRetry={() => void sections.refetch()}
      >
        {sectionList.length === 0 ? (
          <p className="admin-empty" role="status">
            No locker sections yet — add the first one above.
          </p>
        ) : (
          <div className="admin-groups">
            {groups.map((g) => (
              <div key={g.key} className="admin-group">
                <h3 className="admin-group-title">
                  {g.label} <span className="admin-row__sub">({g.items.length})</span>
                </h3>
                {g.items.length === 0 ? (
                  <p className="admin-empty admin-group__empty" role="status">
                    No sections in this block yet.
                  </p>
                ) : (
                  <ul className="admin-list">{g.items.map(renderSection)}</ul>
                )}
              </div>
            ))}
          </div>
        )}
        {remove.isError && (
          <p className="admin-status admin-status--error" role="alert">
            Couldn&rsquo;t delete: {errorMessage(remove.error)}
          </p>
        )}
      </SectionStates>

      {tagging && (
        <Suspense fallback={null}>
          <LockerMapTagger onClose={() => setTagging(false)} />
        </Suspense>
      )}
    </div>
  );
}
