import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus } from 'lucide-react';
import { Button, Card, SearchInput } from '../../components';
import { useCourses, useGraduationRequirements } from '../../data/hooks';
import type { Course, GraduationRequirement } from '../../lib/refData';
import { getSupabase } from '../../lib/supabase';
import { GRADES } from '../../types/fourYearPlan';
import { ConfirmDeleteButton, Field, MutationStatus, SectionStates } from './shared';

const PATHWAYS = ['graduation', 'uc', 'brahma_tech'] as const;
const PATHWAY_LABEL = { graduation: 'Graduation', uc: 'UC (a–g)', brahma_tech: 'Brahma Tech' };

/* ── Course form ───────────────────────────────────────────────────────────── */

interface CourseFormState {
  name: string;
  subject_area: string;
  credits: string;
  satisfies_uc: boolean;
  satisfies_brahma_tech: boolean;
  grades: number[];
}

function CourseForm({
  editing,
  subjectAreas,
  onDone,
}: {
  editing: Course | null;
  subjectAreas: string[];
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CourseFormState>({
    name: editing?.name ?? '',
    subject_area: editing?.subject_area ?? subjectAreas[0] ?? '',
    credits: editing ? String(editing.credits) : '10',
    satisfies_uc: editing?.satisfies_uc ?? false,
    satisfies_brahma_tech: editing?.satisfies_brahma_tech ?? false,
    grades: editing?.grade_levels ?? [9, 10, 11, 12],
  });
  const [errors, setErrors] = useState<{ name?: string; credits?: string; grades?: string }>({});
  const [saved, setSaved] = useState(false);

  const save = useMutation({
    mutationFn: async () => {
      const row = {
        name: form.name.trim(),
        subject_area: form.subject_area,
        credits: Number(form.credits),
        satisfies_uc: form.satisfies_uc,
        satisfies_brahma_tech: form.satisfies_brahma_tech,
        grade_levels: [...form.grades].sort((a, b) => a - b),
      };
      const supabase = getSupabase();
      const query = editing
        ? supabase.from('courses').update(row).eq('id', editing.id)
        : supabase.from('courses').insert(row);
      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['courses'] });
      setSaved(true);
      onDone();
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!form.name.trim()) next.name = 'Course name is required.';
    if (!form.credits.trim() || Number(form.credits) <= 0) next.credits = 'Credits must be > 0.';
    if (form.grades.length === 0) next.grades = 'Pick at least one grade.';
    setErrors(next);
    if (Object.keys(next).length === 0) save.mutate();
  };

  const toggleGrade = (g: number) =>
    setForm((f) => ({
      ...f,
      grades: f.grades.includes(g) ? f.grades.filter((x) => x !== g) : [...f.grades, g],
    }));

  return (
    <form className="admin-form" onSubmit={submit} noValidate>
      <h3 className="admin-form__title">{editing ? `Edit ${editing.name}` : 'New course'}</h3>
      <div className="admin-form__grid">
        <Field label="Name" error={errors.name}>
          <input
            className="admin-input"
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            aria-invalid={!!errors.name}
          />
        </Field>
        <Field label="Subject area">
          <select
            className="admin-input"
            value={form.subject_area}
            onChange={(e) => setForm((f) => ({ ...f, subject_area: e.target.value }))}
          >
            {subjectAreas.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Credits" error={errors.credits}>
          <input
            className="admin-input"
            type="number"
            min={1}
            step={5}
            value={form.credits}
            onChange={(e) => setForm((f) => ({ ...f, credits: e.target.value }))}
            aria-invalid={!!errors.credits}
          />
        </Field>
      </div>
      <div className="admin-form__checks">
        <label className="admin-toggle">
          <input
            type="checkbox"
            checked={form.satisfies_uc}
            onChange={(e) => setForm((f) => ({ ...f, satisfies_uc: e.target.checked }))}
          />
          <span>UC-approved (a–g)</span>
        </label>
        <label className="admin-toggle">
          <input
            type="checkbox"
            checked={form.satisfies_brahma_tech}
            onChange={(e) => setForm((f) => ({ ...f, satisfies_brahma_tech: e.target.checked }))}
          />
          <span>Counts toward Brahma Tech</span>
        </label>
      </div>
      <Field label="Grade levels" error={errors.grades}>
        <div className="admin-form__checks">
          {GRADES.map((g) => (
            <label key={g} className="admin-toggle">
              <input
                type="checkbox"
                checked={form.grades.includes(g)}
                onChange={() => toggleGrade(g)}
              />
              <span>Grade {g}</span>
            </label>
          ))}
        </div>
      </Field>
      <MutationStatus error={save.isError ? save.error : null} saved={saved && !save.isPending} />
      <div className="admin-form__actions">
        <Button type="submit" variant="primary" disabled={save.isPending}>
          {save.isPending ? 'Saving…' : editing ? 'Save changes' : 'Add course'}
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

/* ── Requirement row (inline edit) ─────────────────────────────────────────── */

function RequirementRow({ req }: { req: GraduationRequirement }) {
  const queryClient = useQueryClient();
  const [credits, setCredits] = useState(String(req.credits_required));
  const [notes, setNotes] = useState(req.notes ?? '');
  const [saved, setSaved] = useState(false);
  const dirty = credits !== String(req.credits_required) || notes !== (req.notes ?? '');

  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: ['graduationRequirements'] });
  const save = useMutation({
    mutationFn: async () => {
      const n = Number(credits);
      if (!credits.trim() || n < 0) throw new Error('Credits must be a non-negative number.');
      const { error } = await getSupabase()
        .from('graduation_requirements')
        .update({ credits_required: n, notes: notes.trim() || null })
        .eq('id', req.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      setSaved(true);
    },
  });
  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await getSupabase()
        .from('graduation_requirements')
        .delete()
        .eq('id', req.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return (
    <li className="admin-row admin-row--stacked">
      <div className="admin-row__main">
        <div className="admin-row__text">
          <span className="admin-row__title">{req.subject_area}</span>
          <input
            className="admin-input admin-req__notes"
            type="text"
            aria-label={`Notes for ${req.subject_area}`}
            placeholder="Notes (conditions, alternatives…)"
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setSaved(false);
            }}
          />
        </div>
        <div className="admin-row__actions">
          <input
            className="admin-input admin-req__credits"
            type="number"
            min={0}
            step={5}
            aria-label={`Credits required for ${req.subject_area}`}
            value={credits}
            onChange={(e) => {
              setCredits(e.target.value);
              setSaved(false);
            }}
          />
          <Button
            type="button"
            variant="primary"
            disabled={!dirty || save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending ? 'Saving…' : 'Save'}
          </Button>
          <ConfirmDeleteButton
            label={req.subject_area}
            pending={remove.isPending}
            onConfirm={() => remove.mutate()}
          />
        </div>
      </div>
      <MutationStatus
        error={save.isError ? save.error : remove.isError ? remove.error : null}
        saved={saved && !dirty}
      />
    </li>
  );
}

function AddRequirement({ pathway, subjectAreas }: { pathway: string; subjectAreas: string[] }) {
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState(subjectAreas[0] ?? '');
  const add = useMutation({
    mutationFn: async () => {
      const { error } = await getSupabase()
        .from('graduation_requirements')
        .insert({ pathway, subject_area: subject, credits_required: 10, notes: null });
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['graduationRequirements'] }),
  });
  return (
    <div className="admin-form__actions">
      <select
        className="admin-input"
        aria-label={`Subject area to add to ${pathway}`}
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
      >
        {subjectAreas.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <Button
        variant="secondary"
        icon={<Plus size={16} />}
        disabled={add.isPending}
        onClick={() => add.mutate()}
      >
        {add.isPending ? 'Adding…' : 'Add subject'}
      </Button>
      {add.isError && (
        <p className="admin-status admin-status--error" role="alert">
          {add.error instanceof Error ? add.error.message : 'Couldn’t add.'}
        </p>
      )}
    </div>
  );
}

/* ── Section ───────────────────────────────────────────────────────────────── */

/** Courses & Requirements tab — the 4-year-plan reference data. */
export function CoursesAdmin() {
  const courses = useCourses();
  const requirements = useGraduationRequirements();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Course | null>(null);
  const [showForm, setShowForm] = useState(false);

  const subjectAreas = useMemo(() => {
    const set = new Set((courses.data ?? []).map((c) => c.subject_area));
    (requirements.data ?? []).forEach((r) => set.add(r.subject_area));
    return [...set].sort();
  }, [courses.data, requirements.data]);

  const q = query.trim().toLowerCase();
  const filtered = (courses.data ?? []).filter(
    (c) => !q || c.name.toLowerCase().includes(q) || c.subject_area.toLowerCase().includes(q),
  );

  const removeCourse = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await getSupabase().from('courses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['courses'] }),
  });

  return (
    <div className="admin-body">
      <div className="admin-subsection__head">
        <h2 className="admin-section-title">Courses ({courses.data?.length ?? '…'})</h2>
        {!showForm && !editing && (
          <Button variant="secondary" icon={<Plus size={16} />} onClick={() => setShowForm(true)}>
            Add course
          </Button>
        )}
      </div>
      {(showForm || editing) && (
        <Card>
          <CourseForm
            key={editing?.id ?? 'new-course'}
            editing={editing}
            subjectAreas={subjectAreas}
            onDone={() => {
              setEditing(null);
              setShowForm(false);
            }}
          />
        </Card>
      )}
      <SearchInput
        placeholder="Filter courses…"
        aria-label="Filter courses"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <SectionStates
        isPending={courses.isPending}
        isError={courses.isError}
        onRetry={() => void courses.refetch()}
      >
        {filtered.length === 0 ? (
          <p className="admin-empty" role="status">
            {q
              ? `No courses match “${query.trim()}”.`
              : 'No courses yet — add the first one above.'}
          </p>
        ) : (
          <ul className="admin-list">
            {filtered.slice(0, 40).map((c) => (
              <li key={c.id} className="admin-row">
                <div className="admin-row__text">
                  <span className="admin-row__title">{c.name}</span>
                  <span className="admin-row__sub">
                    {c.subject_area} · {c.credits} cr · grades {(c.grade_levels ?? []).join(', ')}
                    {c.satisfies_uc ? ' · UC' : ''}
                    {c.satisfies_brahma_tech ? ' · Brahma Tech' : ''}
                  </span>
                </div>
                <div className="admin-row__actions">
                  <Button
                    variant="secondary"
                    icon={<Pencil size={16} />}
                    onClick={() => setEditing(c)}
                    aria-label={`Edit ${c.name}`}
                  >
                    Edit
                  </Button>
                  <ConfirmDeleteButton
                    label={c.name}
                    pending={removeCourse.isPending && removeCourse.variables === c.id}
                    onConfirm={() => removeCourse.mutate(c.id)}
                  />
                </div>
              </li>
            ))}
            {filtered.length > 40 && (
              <li className="admin-empty">Showing 40 of {filtered.length} — refine the filter.</li>
            )}
          </ul>
        )}
        {removeCourse.isError && (
          <p className="admin-status admin-status--error" role="alert">
            Couldn&rsquo;t delete:{' '}
            {removeCourse.error instanceof Error ? removeCourse.error.message : 'unknown error'}
          </p>
        )}
      </SectionStates>

      <h2 className="admin-section-title">Requirements</h2>
      <SectionStates
        isPending={requirements.isPending}
        isError={requirements.isError}
        onRetry={() => void requirements.refetch()}
      >
        {PATHWAYS.map((p) => {
          const rows = (requirements.data ?? []).filter((r) => r.pathway === p);
          return (
            <div key={p} className="admin-req-group">
              <h3 className="admin-req-group__title">{PATHWAY_LABEL[p]}</h3>
              {rows.length === 0 ? (
                <p className="admin-empty" role="status">
                  No requirements for this pathway yet.
                </p>
              ) : (
                <ul className="admin-list admin-list--compact">
                  {rows.map((r) => (
                    <RequirementRow key={r.id} req={r} />
                  ))}
                </ul>
              )}
              <AddRequirement pathway={p} subjectAreas={subjectAreas} />
            </div>
          );
        })}
      </SectionStates>
    </div>
  );
}
