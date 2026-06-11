import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Check, Plus, X } from 'lucide-react';
import { Button, SearchInput, Skeleton } from '../../components';
import { useCourses, useGraduationRequirements } from '../../data/hooks';
import { useFourYearPlan } from '../../data/useFourYearPlan';
import { addCourseToPlan, removeCourseFromPlan } from '../../lib/fourYearPlanStore';
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
const STATUS_ICON: Record<PathwayStatus, string> = {
  on_track: '✓',
  at_risk: '⚠',
  not_on_track: '✗',
};

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
      <button type="button" className="plan-cell__add" onClick={() => setOpen(true)}>
        <Plus size={16} aria-hidden="true" /> Add course
      </button>
    );
  }

  return (
    <div className="plan-cell__picker">
      <SearchInput
        placeholder="Search courses…"
        aria-label={`Search courses for grade ${grade} ${SEMESTER_LABEL[semester]}`}
        value={query}
        autoFocus
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="plan-cell__options" role="listbox">
        {matches.length === 0 && <p className="plan-cell__note">No courses match.</p>}
        {matches.map((c) => (
          <button
            key={c.id}
            type="button"
            role="option"
            aria-selected="false"
            className="plan-cell__option"
            onClick={() => {
              addCourseToPlan(grade, semester, c.id);
              setQuery('');
              setOpen(false);
            }}
          >
            <span className="plan-cell__option-name">{c.name}</span>
            <span className="plan-cell__option-meta">
              {c.subject_area} · {c.credits} cr{c.satisfies_uc ? ' · UC' : ''}
            </span>
          </button>
        ))}
      </div>
      <button type="button" className="plan-cell__cancel" onClick={() => setOpen(false)}>
        Cancel
      </button>
    </div>
  );
}

function PathwayBar({ summary }: { summary: PathwaySummary }) {
  const pct =
    summary.requiredTotal > 0
      ? Math.round((summary.plannedTotal / summary.requiredTotal) * 100)
      : 0;
  return (
    <div className={`plan-pathway plan-pathway--${summary.status}`}>
      <div className="plan-pathway__head">
        <span className="plan-pathway__name">{PATHWAY_LABEL[summary.pathway]}</span>
        <span className="plan-pathway__status">
          {STATUS_ICON[summary.status]} {STATUS_TEXT[summary.status]}
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
 * 4-Year Plan + Credit Tracker. A grid (grades 9–12 × Fall/Spring) where the student adds courses
 * from the catalog; a live summary computes Graduation / UC / Brahma Tech progress. Personal plan
 * persists to localStorage only. Requirement data is partly placeholder (see the warnings).
 */
export function PlanScreen() {
  const courses = useCourses();
  const requirements = useGraduationRequirements();
  const plan = useFourYearPlan();

  const isPending = courses.isPending || requirements.isPending;
  const isError = courses.isError || requirements.isError;

  const courseById = useMemo(
    () => new Map((courses.data ?? []).map((c) => [c.id, c])),
    [courses.data],
  );
  const placedIds = useMemo(() => {
    const set = new Set<string>();
    for (const g of GRADES)
      for (const s of SEMESTERS) plan.four_year_plan[g][s].forEach((id) => set.add(id));
    return set;
  }, [plan]);

  const summaries = useMemo(
    () => summarizeAllPathways(plan.four_year_plan, courses.data ?? [], requirements.data ?? []),
    [plan, courses.data, requirements.data],
  );

  const filled = filledSemesterCount(plan.four_year_plan);
  const isEmpty = filled === 0;

  return (
    <section className="screen plan" aria-labelledby="plan-title">
      <h1 id="plan-title" className="screen__title">
        4-Year Plan
      </h1>
      <p className="screen__sub">Map your classes and track credits toward each pathway.</p>

      <p className="plan-disclaimer" role="note">
        {DISCLAIMER}
      </p>

      <div className="screen__body">
        {isPending && (
          <div className="plan-loading" aria-busy="true" role="status" aria-label="Loading courses">
            <Skeleton height={180} radius="var(--radius-lg)" />
            <Skeleton height={120} radius="var(--radius-lg)" />
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
          <div className="plan-layout">
            <motion.div
              className="plan-grid"
              variants={staggerContainer}
              initial="hidden"
              animate="show"
            >
              {isEmpty && (
                <p className="plan-empty" role="status">
                  Your plan is empty. Pick a semester below and add your first course to get
                  started.
                </p>
              )}
              {GRADES.map((grade) => (
                <motion.div key={grade} className="plan-grade" variants={fadeUpItem}>
                  <h2 className="plan-grade__title">Grade {grade}</h2>
                  <div className="plan-grade__cells">
                    {SEMESTERS.map((semester) => {
                      const ids = plan.four_year_plan[grade][semester];
                      const cellCredits = ids.reduce(
                        (sum, id) => sum + (courseById.get(id)?.credits ?? 0),
                        0,
                      );
                      return (
                        <div key={semester} className="plan-cell">
                          <div className="plan-cell__head">
                            <span>{SEMESTER_LABEL[semester]}</span>
                            <span className="plan-cell__credits">{cellCredits} cr</span>
                          </div>
                          <ul className="plan-cell__courses">
                            {ids.map((id) => {
                              const c = courseById.get(id);
                              return (
                                <li key={id} className="plan-cell__course">
                                  <span className="plan-cell__course-name">
                                    {c?.name ?? 'Unknown course'}
                                    <span className="plan-cell__course-cr">
                                      {c ? `${c.credits} cr` : ''}
                                    </span>
                                  </span>
                                  <button
                                    type="button"
                                    className="plan-cell__remove"
                                    aria-label={`Remove ${c?.name ?? 'course'}`}
                                    onClick={() => removeCourseFromPlan(grade, semester, id)}
                                  >
                                    <X size={14} aria-hidden="true" />
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                          <AddCourse
                            grade={grade}
                            semester={semester}
                            courses={courses.data ?? []}
                            placed={placedIds}
                          />
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              ))}
            </motion.div>

            <aside className="plan-summary" aria-label="Credit summary">
              <h2 className="plan-summary__title">Progress</h2>
              {filled < TOTAL_SEMESTERS && !isEmpty && (
                <p className="plan-summary__incomplete" role="status">
                  <AlertTriangle size={14} aria-hidden="true" /> {filled} of {TOTAL_SEMESTERS}{' '}
                  semesters planned — fill the rest for a complete picture.
                </p>
              )}
              <PathwayBar summary={summaries.graduation} />
              <PathwayBar summary={summaries.uc} />
              <PathwayBar summary={summaries.brahma_tech} />
            </aside>
          </div>
        )}
      </div>
    </section>
  );
}
