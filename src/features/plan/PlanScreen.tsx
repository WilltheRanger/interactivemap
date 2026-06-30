import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CalendarDays, CalendarRange, Check, Plus, X } from 'lucide-react';
import { Button, SearchInput, Skeleton } from '../../components';
import { Segmented, type SegmentedOption } from '../account/Segmented';
import { useCourses, useGraduationRequirements } from '../../data/hooks';
import { useFourYearPlan } from '../../data/useFourYearPlan';
import {
  addCourseToPlan,
  addYearCourse,
  removeCourseFromPlan,
  removeYearCourse,
  setCurrentGrade,
} from '../../lib/fourYearPlanStore';
import { summarizeAllPathways, type PathwaySummary } from '../../lib/creditPlan';
import type { Course } from '../../lib/refData';
import { GRADES, type Grade, type Semester } from '../../types/fourYearPlan';
import { fadeUpItem, staggerContainer } from '../../lib/motion';
import './PlanScreen.css';

const SEMESTER_LABEL: Record<Semester, string> = { fall: 'Fall', spring: 'Spring' };
const PATHWAY_LABEL = {
  graduation: 'Graduation',
  uc: 'UC Eligibility',
  brahma_tech: 'Brahma Tech',
};
/** Grade selector options (Segmented needs string values; we map back to the numeric Grade). */
const GRADE_OPTIONS: SegmentedOption<string>[] = GRADES.map((g) => ({
  value: String(g),
  label: `${g}th`,
}));

const DISCLAIMER =
  'This tool is for planning purposes only. Credit requirements may change. Always verify with your counselor before making academic decisions.';

/** A 10-credit course runs the full year; a 5-credit course is a single semester. */
function isYearCourse(course: Course): boolean {
  return course.credits >= 10;
}

const sumCredits = (ids: string[], courseById: Map<string, Course>): number =>
  ids.reduce((total, id) => total + (courseById.get(id)?.credits ?? 0), 0);

/** Searchable add-course control. `filter` scopes it to year-long or semester courses. */
function AddCourse({
  grade,
  courses,
  placed,
  filter,
  onPick,
  buttonLabel,
  searchLabel,
}: {
  grade: Grade;
  courses: Course[];
  placed: Set<string>;
  filter: (c: Course) => boolean;
  onPick: (id: string) => void;
  buttonLabel: string;
  searchLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const matches = useMemo(() => {
    return courses
      .filter((c) => c.grade_levels?.includes(grade) ?? true)
      .filter((c) => !placed.has(c.id))
      .filter(filter)
      .filter(
        (c) => !q || c.name.toLowerCase().includes(q) || c.subject_area.toLowerCase().includes(q),
      )
      .slice(0, 30);
  }, [courses, grade, placed, filter, q]);

  if (!open) {
    return (
      <Button variant="secondary" icon={<Plus size={16} />} onClick={() => setOpen(true)}>
        {buttonLabel}
      </Button>
    );
  }

  return (
    <div className="plan-picker">
      <SearchInput
        placeholder="Search courses…"
        aria-label={searchLabel}
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
              onPick(c.id);
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

/** One course chip with its meta line and a remove button. */
function CourseRow({
  course,
  onRemove,
  removeLabel,
}: {
  course: Course | undefined;
  onRemove: () => void;
  removeLabel: string;
}) {
  return (
    <li className="plan-course">
      <span className="plan-course__text">
        <span className="plan-course__name">{course?.name ?? 'Unknown course'}</span>
        <span className="plan-course__meta">
          {course ? `${course.subject_area} · ${course.credits} cr` : 'Not in catalog'}
          {course?.satisfies_uc ? ' · UC' : ''}
        </span>
      </span>
      <button type="button" className="plan-course__remove" aria-label={removeLabel} onClick={onRemove}>
        <X size={16} aria-hidden="true" />
      </button>
    </li>
  );
}

/** A single semester column (Fall or Spring) for 5-credit courses. */
function SemesterGroup({
  grade,
  semester,
  ids,
  courses,
  courseById,
  placed,
}: {
  grade: Grade;
  semester: Semester;
  ids: string[];
  courses: Course[];
  courseById: Map<string, Course>;
  placed: Set<string>;
}) {
  return (
    <div className="plan-sem">
      <div className="plan-sem__head">
        <span className="plan-sem__label">{SEMESTER_LABEL[semester]}</span>
        <span className="plan-sem__credits">{sumCredits(ids, courseById)} cr</span>
      </div>
      {ids.length > 0 ? (
        <ul className="plan-term__courses">
          {ids.map((id) => (
            <CourseRow
              key={id}
              course={courseById.get(id)}
              onRemove={() => removeCourseFromPlan(grade, semester, id)}
              removeLabel={`Remove ${courseById.get(id)?.name ?? 'course'} from ${SEMESTER_LABEL[semester]}`}
            />
          ))}
        </ul>
      ) : (
        <p className="plan-term__empty">No {SEMESTER_LABEL[semester]} classes yet.</p>
      )}
      <AddCourse
        grade={grade}
        courses={courses}
        placed={placed}
        filter={(c) => !isYearCourse(c)}
        onPick={(id) => addCourseToPlan(grade, semester, id)}
        buttonLabel={`Add ${SEMESTER_LABEL[semester]} class`}
        searchLabel={`Search semester courses for ${SEMESTER_LABEL[semester]}`}
      />
    </div>
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
      </div>
      <div className="plan-pathway__track" aria-hidden="true">
        <div className="plan-pathway__fill" style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      {summary.missing ? (
        <p className="plan-pathway__note">Requirements not available yet.</p>
      ) : (
        <>
          <p className="plan-pathway__total">
            {summary.plannedTotal} of {summary.requiredTotal} credits planned
          </p>
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
 * 4-Year Plan + Credit Tracker body. Pick a grade (9–12), then add classes split by length: year-long
 * classes (10 credits, the bulk of a schedule) and single-semester classes (5 credits, placed in Fall
 * or Spring). A live summary computes Graduation / UC / Brahma Tech progress, counting each year-long
 * course once. The personal plan persists to localStorage only; requirement data is partly placeholder
 * (see the warnings). Rendered inside the combined Schedule screen's "4-Year Plan" tab.
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

  // Split the grade's stored Fall/Spring placements into year-long vs single-semester for display.
  // Length is read from the course's credits (a year course is stored in both terms); courses missing
  // from the catalog fall back to "year" only when they sit in both terms.
  const { yearIds, fallOnly, springOnly } = useMemo(() => {
    const seen = new Set<string>();
    const yearIds: string[] = [];
    const fallOnly: string[] = [];
    const springOnly: string[] = [];
    for (const id of [...fallIds, ...springIds]) {
      if (seen.has(id)) continue;
      seen.add(id);
      const c = courseById.get(id);
      const yearLong = c ? isYearCourse(c) : fallIds.includes(id) && springIds.includes(id);
      if (yearLong) yearIds.push(id);
      else if (fallIds.includes(id)) fallOnly.push(id);
      else springOnly.push(id);
    }
    return { yearIds, fallOnly, springOnly };
  }, [fallIds, springIds, courseById]);

  const placed = useMemo(() => new Set([...fallIds, ...springIds]), [fallIds, springIds]);
  const gradeCredits = sumCredits([...yearIds, ...fallOnly, ...springOnly], courseById);
  const yearEmpty = placed.size === 0;

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
              <span className="plan-year__credits">{gradeCredits} cr planned</span>
            </div>

            {yearEmpty && (
              <p className="plan-hint" role="status">
                Add this year&rsquo;s classes. <strong>Year-long</strong> classes are 10 credits;{' '}
                <strong>semester</strong> classes are 5.
              </p>
            )}

            <motion.div
              key={grade}
              className="plan-terms"
              variants={staggerContainer}
              initial="hidden"
              animate="show"
            >
              <motion.div className="plan-term" variants={fadeUpItem}>
                <div className="plan-term__head">
                  <h3 className="plan-term__title">
                    <CalendarRange size={16} aria-hidden="true" /> Year-long classes
                  </h3>
                  <span className="plan-term__credits">{sumCredits(yearIds, courseById)} cr</span>
                </div>
                {yearIds.length > 0 ? (
                  <ul className="plan-term__courses">
                    {yearIds.map((id) => (
                      <CourseRow
                        key={id}
                        course={courseById.get(id)}
                        onRemove={() => removeYearCourse(grade, id)}
                        removeLabel={`Remove ${courseById.get(id)?.name ?? 'course'}`}
                      />
                    ))}
                  </ul>
                ) : (
                  <p className="plan-term__empty">No year-long classes yet.</p>
                )}
                <AddCourse
                  grade={grade}
                  courses={courses.data ?? []}
                  placed={placed}
                  filter={isYearCourse}
                  onPick={(id) => addYearCourse(grade, id)}
                  buttonLabel="Add year-long class"
                  searchLabel="Search year-long courses"
                />
              </motion.div>

              <motion.div className="plan-term" variants={fadeUpItem}>
                <div className="plan-term__head">
                  <h3 className="plan-term__title">
                    <CalendarDays size={16} aria-hidden="true" /> Semester classes
                  </h3>
                  <span className="plan-term__credits">
                    {sumCredits([...fallOnly, ...springOnly], courseById)} cr
                  </span>
                </div>
                <div className="plan-sems">
                  <SemesterGroup
                    grade={grade}
                    semester="fall"
                    ids={fallOnly}
                    courses={courses.data ?? []}
                    courseById={courseById}
                    placed={placed}
                  />
                  <SemesterGroup
                    grade={grade}
                    semester="spring"
                    ids={springOnly}
                    courses={courses.data ?? []}
                    courseById={courseById}
                    placed={placed}
                  />
                </div>
              </motion.div>
            </motion.div>

            <h2 className="plan-section-title">Progress</h2>
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
