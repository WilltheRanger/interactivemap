import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus } from 'lucide-react';
import { Button, Card } from '../../components';
import { useBuildings, useRooms, useTeachers } from '../../data/hooks';
import type { Room, Teacher } from '../../lib/refData';
import { getSupabase } from '../../lib/supabase';
import { ConfirmDeleteButton, Field, MutationStatus, SectionStates } from './shared';
import { slugify } from './slugify';

/* ── Rooms ─────────────────────────────────────────────────────────────────── */

interface RoomFormState {
  id: string;
  building_id: string;
  label: string;
  teacher_id: string;
}

function RoomForm({ editing, onDone }: { editing: Room | null; onDone: () => void }) {
  const queryClient = useQueryClient();
  const buildings = useBuildings();
  const teachers = useTeachers();
  const [form, setForm] = useState<RoomFormState>({
    id: editing?.id ?? '',
    building_id: editing?.building_id ?? '',
    label: editing?.label ?? '',
    teacher_id: editing?.teacher_id ?? '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof RoomFormState, string>>>({});
  const [saved, setSaved] = useState(false);

  const save = useMutation({
    mutationFn: async () => {
      const row = {
        id: form.id.trim(),
        building_id: form.building_id,
        label: form.label.trim() || form.id.trim(),
        teacher_id: form.teacher_id || null,
      };
      const supabase = getSupabase();
      const query = editing
        ? supabase.from('rooms').update(row).eq('id', editing.id)
        : supabase.from('rooms').insert(row);
      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['rooms'] });
      setSaved(true);
      if (!editing) setForm({ id: '', building_id: form.building_id, label: '', teacher_id: '' });
      onDone();
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!form.id.trim()) next.id = 'Room number is required.';
    if (!form.building_id) next.building_id = 'Pick a building.';
    setErrors(next);
    if (Object.keys(next).length === 0) save.mutate();
  };

  return (
    <form className="admin-form" onSubmit={submit} noValidate>
      <h3 className="admin-form__title">{editing ? `Edit room ${editing.id}` : 'New room'}</h3>
      <div className="admin-form__grid">
        <Field label="Room number" error={errors.id}>
          <input
            className="admin-input"
            type="text"
            value={form.id}
            disabled={!!editing}
            onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
            aria-invalid={!!errors.id}
          />
        </Field>
        <Field label="Building" error={errors.building_id}>
          <select
            className="admin-input"
            value={form.building_id}
            onChange={(e) => setForm((f) => ({ ...f, building_id: e.target.value }))}
            aria-invalid={!!errors.building_id}
          >
            <option value="">Choose…</option>
            {(buildings.data ?? []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Display label (optional)">
          <input
            className="admin-input"
            type="text"
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
          />
        </Field>
        <Field label="Teacher (optional)">
          <select
            className="admin-input"
            value={form.teacher_id}
            onChange={(e) => setForm((f) => ({ ...f, teacher_id: e.target.value }))}
          >
            <option value="">None</option>
            {(teachers.data ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <MutationStatus error={save.isError ? save.error : null} saved={saved && !save.isPending} />
      <div className="admin-form__actions">
        <Button type="submit" variant="primary" disabled={save.isPending}>
          {save.isPending ? 'Saving…' : editing ? 'Save changes' : 'Add room'}
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

/* ── Teachers ──────────────────────────────────────────────────────────────── */

function TeacherForm({ editing, onDone }: { editing: Teacher | null; onDone: () => void }) {
  const queryClient = useQueryClient();
  const rooms = useRooms();
  const [name, setName] = useState(editing?.name ?? '');
  const [homeRoom, setHomeRoom] = useState(editing?.home_room_id ?? '');
  const [nameError, setNameError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const save = useMutation({
    mutationFn: async () => {
      const supabase = getSupabase();
      const row = { name: name.trim(), home_room_id: homeRoom || null };
      const query = editing
        ? supabase.from('teachers').update(row).eq('id', editing.id)
        : supabase.from('teachers').insert({ ...row, id: `t-${slugify(name)}` });
      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['teachers'] });
      setSaved(true);
      if (!editing) {
        setName('');
        setHomeRoom('');
      }
      onDone();
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const err = name.trim() ? null : 'Name is required.';
    setNameError(err);
    if (!err) save.mutate();
  };

  return (
    <form className="admin-form" onSubmit={submit} noValidate>
      <h3 className="admin-form__title">{editing ? `Edit ${editing.name}` : 'New teacher'}</h3>
      <div className="admin-form__grid">
        <Field label="Name" error={nameError ?? undefined}>
          <input
            className="admin-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={!!nameError}
          />
        </Field>
        <Field label="Home room (optional)">
          <select
            className="admin-input"
            value={homeRoom}
            onChange={(e) => setHomeRoom(e.target.value)}
          >
            <option value="">None</option>
            {(rooms.data ?? []).map((r) => (
              <option key={r.id} value={r.id}>
                {r.label ?? r.id}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <MutationStatus error={save.isError ? save.error : null} saved={saved && !save.isPending} />
      <div className="admin-form__actions">
        <Button type="submit" variant="primary" disabled={save.isPending}>
          {save.isPending ? 'Saving…' : editing ? 'Save changes' : 'Add teacher'}
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

/* ── Section ───────────────────────────────────────────────────────────────── */

/**
 * Rooms & Teachers tab. Current data is placeholder (Phase 02 seed) — the owner supplies the
 * real room→teacher directory later; this UI is how it gets entered without touching code.
 */
export function RoomsTeachersAdmin() {
  const rooms = useRooms();
  const teachers = useTeachers();
  const buildings = useBuildings();
  const queryClient = useQueryClient();
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [showTeacherForm, setShowTeacherForm] = useState(false);

  const teacherById = new Map((teachers.data ?? []).map((t) => [t.id, t]));
  const buildingById = new Map((buildings.data ?? []).map((b) => [b.id, b]));

  const removeRoom = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await getSupabase().from('rooms').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['rooms'] }),
  });
  const removeTeacher = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await getSupabase().from('teachers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['teachers'] }),
  });

  return (
    <div className="admin-body">
      <p className="admin-note" role="note">
        The rooms and teachers below are placeholder data until the real directory is supplied —
        manage them here once it is.
      </p>

      <div className="admin-subsection__head">
        <h2 className="admin-section-title">Rooms</h2>
        {!showRoomForm && !editingRoom && (
          <Button
            variant="secondary"
            icon={<Plus size={16} />}
            onClick={() => setShowRoomForm(true)}
          >
            Add room
          </Button>
        )}
      </div>
      {(showRoomForm || editingRoom) && (
        <Card>
          <RoomForm
            key={editingRoom?.id ?? 'new-room'}
            editing={editingRoom}
            onDone={() => {
              setEditingRoom(null);
              setShowRoomForm(false);
            }}
          />
        </Card>
      )}
      <SectionStates
        isPending={rooms.isPending}
        isError={rooms.isError}
        onRetry={() => void rooms.refetch()}
      >
        {rooms.data?.length === 0 ? (
          <p className="admin-empty" role="status">
            No rooms yet — add the first one above.
          </p>
        ) : (
          <ul className="admin-list">
            {(rooms.data ?? []).map((r) => (
              <li key={r.id} className="admin-row">
                <div className="admin-row__text">
                  <span className="admin-row__title">{r.label ?? r.id}</span>
                  <span className="admin-row__sub">
                    {buildingById.get(r.building_id)?.label ?? r.building_id}
                    {r.teacher_id && ` · ${teacherById.get(r.teacher_id)?.name ?? r.teacher_id}`}
                  </span>
                </div>
                <div className="admin-row__actions">
                  <Button
                    variant="secondary"
                    icon={<Pencil size={16} />}
                    onClick={() => setEditingRoom(r)}
                    aria-label={`Edit room ${r.id}`}
                  >
                    Edit
                  </Button>
                  <ConfirmDeleteButton
                    label={`room ${r.id}`}
                    pending={removeRoom.isPending && removeRoom.variables === r.id}
                    onConfirm={() => removeRoom.mutate(r.id)}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
        {removeRoom.isError && (
          <p className="admin-status admin-status--error" role="alert">
            Couldn&rsquo;t delete:{' '}
            {removeRoom.error instanceof Error ? removeRoom.error.message : 'unknown error'}
          </p>
        )}
      </SectionStates>

      <div className="admin-subsection__head">
        <h2 className="admin-section-title">Teachers</h2>
        {!showTeacherForm && !editingTeacher && (
          <Button
            variant="secondary"
            icon={<Plus size={16} />}
            onClick={() => setShowTeacherForm(true)}
          >
            Add teacher
          </Button>
        )}
      </div>
      {(showTeacherForm || editingTeacher) && (
        <Card>
          <TeacherForm
            key={editingTeacher?.id ?? 'new-teacher'}
            editing={editingTeacher}
            onDone={() => {
              setEditingTeacher(null);
              setShowTeacherForm(false);
            }}
          />
        </Card>
      )}
      <SectionStates
        isPending={teachers.isPending}
        isError={teachers.isError}
        onRetry={() => void teachers.refetch()}
      >
        {teachers.data?.length === 0 ? (
          <p className="admin-empty" role="status">
            No teachers yet — add the first one above.
          </p>
        ) : (
          <ul className="admin-list">
            {(teachers.data ?? []).map((t) => (
              <li key={t.id} className="admin-row">
                <div className="admin-row__text">
                  <span className="admin-row__title">{t.name}</span>
                  <span className="admin-row__sub">
                    {t.home_room_id ? `Home room ${t.home_room_id}` : 'No home room'}
                  </span>
                </div>
                <div className="admin-row__actions">
                  <Button
                    variant="secondary"
                    icon={<Pencil size={16} />}
                    onClick={() => setEditingTeacher(t)}
                    aria-label={`Edit ${t.name}`}
                  >
                    Edit
                  </Button>
                  <ConfirmDeleteButton
                    label={t.name}
                    pending={removeTeacher.isPending && removeTeacher.variables === t.id}
                    onConfirm={() => removeTeacher.mutate(t.id)}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
        {removeTeacher.isError && (
          <p className="admin-status admin-status--error" role="alert">
            Couldn&rsquo;t delete:{' '}
            {removeTeacher.error instanceof Error ? removeTeacher.error.message : 'unknown error'}
          </p>
        )}
      </SectionStates>
    </div>
  );
}
