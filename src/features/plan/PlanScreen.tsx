import { useMemo, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Check, CheckCircle2, Copy, Plus, X, XCircle } from 'lucide-react';
import { Button, SearchInput, Skeleton } from '../../components';
import { Segmented, type SegmentedOption } from '../account/Segmented';
import { useCourses, useGraduationRequirements } from '../../data/hooks';
import { useFourYearPlan } from '../../data/useFourYearPlan';
import {
  addCourseToPlan,
  copyFallToSpring,
  removeCourseFromPlan,
  setCurrentGrade,
} from '../../lib/fourYearPlanStore';
import {
  filledSemesterCount,
  summarizeAllPathways,
  TOTAL_SEMESTERS,
  type PathwayStatus,
  type PathwaySummary,
} from '../../lib/creditPlan';
import type { Course } from '../../lib/refData';
import { GRADES, SEMESTERS, type Grade, type Semester } from '../../types/fourYearPlan';
import { fadeUpItem, staggerContainer } from '../../lib/motion';
import './PlanScreen.css';

const SEMESTER_LABEL: Record<Semester, string> = { fall: 'Fall', spring: 'Spring' };
const PATHWAY_LABEL = {
  graduation: 'Graduation',
  uc: 'UC Eligibility',
  brahma_tech: 'Brahma Tech',
};
const STATUS_TEXT: Record<PathwayStatus, string> = {
  on_track: 'On track',
  at_risk: 'At risk',
  not_on_track: 'Not on track',
};
const STATUS_ICON: Record<PathwayStatus, ReactNode> = {
  on_track: <CheckCircle2 size={14} aria-hidden="true" />,
  at_risk: <AlertTriangle size={14} aria-hidden="true" />,
  not_on_track: <XCircle size={14} aria-hidden="true" />,
};

/** Grade selector options (Segmented needs string values; we map back to the numeric Grade). */
const GRADE_OPTIONS: SegmentedOption<string>[] = GRADES.map((g) => ({
  value: String(g),
  label: `${g}th`,
}));

const DISCLAIMER =
  'This tool is for planning purposes only. Credit requirements may change. Always verify with your counselor before making academic decisions.';

/** Searchable add-course control for one grade/semester cell. */
function AddCourse({
  grade,
  semester,
  courses,
  placed,
}: {
  grade: Grade;
  semester: Semester;
  courses: Course[];
  placed: Set<string>;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const matches = useMemo(() => {
    return courses
      .filter((c) => c.grade_levels?.includes(grade) ?? true)
      .filter((c) => !placed.has(c.id))
      .filter(
        (c) => !q || c.name.toLowerCase().includes(q) || c.subject_area.toLowerCase().includes(q),
      )
      .slice(0, 30);
  }, [courses, grade, placed, q]);

  if (!open) {
    return (
      <Button variant="secondary" icon={<Plus size={16} />} onClick={() => setOpen(true)}>
        Add course
      </Button>
    );
  }

  return (
    <div className="plan-picker">
      <SearchInput
        placeholder="Search courses…"
        aria-label={`Search courses for grade ${grade} ${SEMESTER_LABEL[semester]}`}
        value={query}
        autoFocus
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="plan-picker__options" role="listbox">
        {matches.length === 0 && <p className="plan-picker__note">No courses match.</p>}
        {matches.map((c) => (
          <button
            key={c.id}
            type="button"
            role="option"
            aria-selected="false"
            className="plan-picker__option"
            onClick={() => {
              addCourseToPlan(grade, semester, c.id);
              setQuery('');
              setOpen(false);
            }}
          >
            <span className="plan-picker__option-name">{c.name}</span>
            <span className="plan-picker__option-meta">
              {c.subject_area} · {c.credits} cr{c.satisfies_uc ? ' · UC' : ''}
            </span>
          </button>
        ))}
      </div>
      <Button variant="secondary" onClick={() => setOpen(false)}>
        Cancel
      </Button>
    </div>
  );
}

/** One semester card (Fall or Spring) for the selected grade. */
function TermCard({
  grade,
  semester,
  ids,
  fallIds,
  courses,
  courseById,
}: {
  grade: Grade;
  semester: Semester;
  ids: string[];
  fallIds: string[];
  courses: Course[];
  courseById: Map<string, Course>;
}) {
  const credits = ids.reduce((sum, id) => sum + (courseById.get(id)?.credits ?? 0), 0);
  const placedHere = useMemo(() => new Set(ids), [ids]);
  // Offer "Same as Fall" on Spring until Spring already mirrors every Fall course.
  const offerCopy =
    semester === 'spring' && fallIds.length > 0 && !fallIds.every((id) => ids.includes(id));

  return (
    <motion.div className="plan-term" variants={fadeUpItem}>
      <div className="plan-term__head">
        <h3 className="plan-term__title">{SEMESTER_LABEL[semester]}</h3>
        <span className="plan-term__credits">{credits} cr</span>
      </div>

      {ids.length > 0 ? (
        <ul className="plan-term__courses">
          {ids.map((id) => {
            const c = courseById.get(id);
            return (
              <li key={id} className="plan-course">
                <span className="plan-course__text">
                  <span className="plan-course__name">{c?.name ?? 'Unknown course'}</span>
                  <span className="plan-course__meta">
                    {c ? `${c.subject_area} · ${c.credits} cr` : 'Not in catalog'}
                    {c?.satisfies_uc ? ' · UC' : ''}
                  </span>
                </span>
                <button
                  type="button"
                  className="plan-course__remove"
                  aria-label={`Remove ${c?.name ?? 'course'} from ${SEMESTER_LABEL[semester]}`}
                  onClick={() => removeCourseFromPlan(grade, semester, id)}
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="plan-term__empty">No classes added yet.</p>
      )}

      {offerCopy && (
        <Button
          variant="secondary"
          icon={<Copy size={16} />}
          onClick={() => copyFallToSpring(grade)}
        >
          Same as Fall
        </Button>
      )}

      <AddCourse grade={grade} semester={semester} courses={courses} placed={placedHere} />
    </motion.div>
  );
}

function PathwayCard({ summary }: { summary: PathwaySummary }) {
  const pct =
    summary.requiredTotal > 0
      ? Math.round((summary.plannedTotal / summary.requiredTotal) * 100)
      : 0;
  return (
    <div className={`plan-pathway plan-pathway--${summary.status}`}>
      <div className="plan-pathway__head">
        <span className="plan-pathway__name">{PATHWAY_LABEL[summary.pathway]}</span>
        <span className="plan-pathway__status">
          {STATUS_ICON[summary.status]}
          {STATUS_TEXT[summary.status]}
        </span>
      </div>
      <div className="plan-pathway__track" aria-hidden="true">
        <div className="plan-pathway__fill" style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      {summary.missing ? (
        <p className="plan-pathway__note">Requirements not available yet.</p>
      ) : (
        <>
          {summary.placeholder && (
            <p className="plan-pathway__note plan-pathway__note--warn">
              <AlertTriangle size={13} aria-hidden="true" /> Placeholder requirements — not real
              yet.
            </p>
          )}
          <ul className="plan-pathway__subjects">
            {summary.subjects.map((s) => (
              <li key={s.subjectArea} className={s.met ? 'is-met' : ''}>
                {s.met && <Check size={13} aria-hidden="true" />}
                <span>{s.subjectArea}</span>
                <span className="plan-pathway__subject-credits">
                  {s.planned}/{s.required}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/**
 * 4-Year Plan + Credit Tracker body. Pick a grade (9–12), add courses to its Fall/Spring cards — or
 * reuse Fall for Spring with "Same as Fall" — and a live summary computes Graduation / UC / Brahma
 * Tech progress. The personal plan persists to localStorage only; requirement data is partly
 * placeholder (see the warnings). Rendered inside the combined Schedule screen's "4-Year Plan" tab,
 * which supplies the screen chrome — so this returns just the body.
 */
export function PlanBody() {
  const courses = useCourses();
  const requirements = useGraduationRequirements();
  const plan = useFourYearPlan();

  const isPending = courses.isPending || requirements.isPending;
  const isError = courses.isError || requirements.isError;

  const courseById = useMemo(
    () => new Map((courses.data ?? []).map((c) => [c.id, c])),
    [courses.data],
  );

  const summaries = useMemo(
    () => summarizeAllPathways(plan.four_year_plan, courses.data ?? [], requirements.data ?? []),
    [plan, courses.data, requirements.data],
  );

  const grade = plan.current_grade;
  const fallIds = plan.four_year_plan[grade].fall;
  const springIds = plan.four_year_plan[grade].spring;
  const yearEmpty = fallIds.length === 0 && springIds.length === 0;

  const filled = filledSemesterCount(plan.four_year_plan);
  const isEmpty = filled === 0;

  return (
    <>
      <p className="plan-disclaimer" role="note">
        {DISCLAIMER}
      </p>

      <div className="screen__body">
        {isPending && (
          <div className="plan-loading" aria-busy="true" role="status" aria-label="Loading courses">
            <Skeleton height={48} radius="var(--radius-pill)" />
            <Skeleton height={160} radius="var(--radius-lg)" />
            <Skeleton height={160} radius="var(--radius-lg)" />
          </div>
        )}

        {!isPending && isError && (
          <div className="ann-panel ann-panel--error" role="alert">
            <p className="ann-panel__title">Couldn&rsquo;t load the course catalog</p>
            <p>Check your connection and try again.</p>
            <Button
              variant="primary"
              onClick={() => {
                void courses.refetch();
                void requirements.refetch();
              }}
            >
              Try again
            </Button>
          </div>
        )}

        {!isPending && !isError && (
          <>
            <div className="plan-year">
              <Segmented
                ariaLabel="School year"
                layoutId="plan-grade-seg"
                value={String(grade)}
                options={GRADE_OPTIONS}
                onChange={(v) => setCurrentGrade(Number(v) as Grade)}
              />
            </div>

            {yearEmpty && (
              <p className="plan-hint" role="status">
                Add your Fall classes, then tap <strong>Same as Fall</strong> to reuse them for
                Spring.
              </p>
            )}

            <motion.div
              key={grade}
              className="plan-terms"
              variants={staggerContainer}
              initial="hidden"
              animate="show"
            >
              {SEMESTERS.map((semester) => (
                <TermCard
                  key={semester}
                  grade={grade}
                  semester={semester}
                  ids={semester === 'fall' ? fallIds : springIds}
                  fallIds={fallIds}
                  courses={courses.data ?? []}
                  courseById={courseById}
                />
              ))}
            </motion.div>

            <h2 className="plan-section-title">Progress</h2>
            {filled < TOTAL_SEMESTERS && !isEmpty && (
              <p className="plan-incomplete" role="status">
                <AlertTriangle size={14} aria-hidden="true" /> {filled} of {TOTAL_SEMESTERS}{' '}
                semesters planned — fill the rest for a complete picture.
              </p>
            )}
            <div className="plan-pathways">
              <PathwayCard summary={summaries.graduation} />
              <PathwayCard summary={summaries.uc} />
              <PathwayCard summary={summaries.brahma_tech} />
            </div>
          </>
        )}
      </div>
    </>
  );
}
