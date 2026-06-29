/**
 * Credit-tracker engine: given a student's 4-year plan, the course catalog, and the requirement
 * rows, compute per-subject-area progress and an overall status for each pathway
 * (graduation / UC / Brahma Tech). Pure functions — unit-tested, no React or network.
 */
import type { Course, GraduationRequirement } from './refData';
import { GRADES, SEMESTERS, type FourYearPlanGrades } from '../types/fourYearPlan';

export type Pathway = 'graduation' | 'uc' | 'brahma_tech';
export type PathwayStatus = 'on_track' | 'at_risk' | 'not_on_track';

export interface SubjectProgress {
  subjectArea: string;
  planned: number;
  required: number;
  met: boolean;
  /** Whether this requirement row is a clearly-labeled placeholder (notes start with PLACEHOLDER). */
  placeholder: boolean;
}

export interface PathwaySummary {
  pathway: Pathway;
  subjects: SubjectProgress[];
  plannedTotal: number;
  requiredTotal: number;
  status: PathwayStatus;
  /** True when this pathway's requirement data is placeholder (so the UI can flag it). */
  placeholder: boolean;
  /** True when the pathway has no requirement rows at all (awaiting data). */
  missing: boolean;
}

/** Flatten a plan into the list of course ids placed anywhere in it. */
export function plannedCourseIds(plan: FourYearPlanGrades): string[] {
  const ids: string[] = [];
  for (const g of GRADES) for (const sem of SEMESTERS) ids.push(...plan[g][sem]);
  return ids;
}

/** Count how many of the 8 semesters have at least one course. */
export function filledSemesterCount(plan: FourYearPlanGrades): number {
  let n = 0;
  for (const g of GRADES) for (const sem of SEMESTERS) if (plan[g][sem].length > 0) n++;
  return n;
}

export const TOTAL_SEMESTERS = 8;

const isPlaceholder = (notes: string | null) =>
  !!notes && notes.trim().toUpperCase().startsWith('PLACEHOLDER');

/**
 * Sum planned credits per subject area for one pathway. For UC, only UC-approved courses count
 * toward UC subject areas (an a–g course); graduation/brahma_tech count every planned course in
 * the area. A year-long (10-credit) course spans both terms of a grade, so it's counted ONCE per
 * grade — its full credit value — rather than double-counted for Fall and Spring.
 */
function plannedByArea(
  pathway: Pathway,
  plan: FourYearPlanGrades,
  courseById: Map<string, Course>,
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const g of GRADES) {
    const seenThisGrade = new Set<string>();
    for (const sem of SEMESTERS) {
      for (const id of plan[g][sem]) {
        if (seenThisGrade.has(id)) continue; // year-long course in both terms → count once per grade
        seenThisGrade.add(id);
        const course = courseById.get(id);
        if (!course) continue;
        if (pathway === 'uc' && !course.satisfies_uc) continue;
        if (pathway === 'brahma_tech' && !course.satisfies_brahma_tech) continue;
        totals.set(course.subject_area, (totals.get(course.subject_area) ?? 0) + course.credits);
      }
    }
  }
  return totals;
}

export function summarizePathway(
  pathway: Pathway,
  plan: FourYearPlanGrades,
  courses: Course[],
  requirements: GraduationRequirement[],
): PathwaySummary {
  const reqs = requirements.filter((r) => r.pathway === pathway);
  const courseById = new Map(courses.map((c) => [c.id, c]));
  const planned = plannedByArea(pathway, plan, courseById);

  const subjects: SubjectProgress[] = reqs
    .slice()
    .sort((a, b) => a.subject_area.localeCompare(b.subject_area))
    .map((r) => {
      const have = planned.get(r.subject_area) ?? 0;
      return {
        subjectArea: r.subject_area,
        planned: have,
        required: r.credits_required,
        met: have >= r.credits_required,
        placeholder: isPlaceholder(r.notes),
      };
    });

  const requiredTotal = subjects.reduce((s, x) => s + x.required, 0);
  const plannedTotal = subjects.reduce((s, x) => s + Math.min(x.planned, x.required), 0);
  const placeholder = reqs.length > 0 && reqs.every((r) => isPlaceholder(r.notes));
  const missing = reqs.length === 0;

  let status: PathwayStatus;
  if (missing) {
    status = 'not_on_track';
  } else if (subjects.every((s) => s.met)) {
    status = 'on_track';
  } else if (subjects.some((s) => s.met) || plannedTotal > 0) {
    status = 'at_risk';
  } else {
    status = 'not_on_track';
  }

  return { pathway, subjects, plannedTotal, requiredTotal, status, placeholder, missing };
}

export function summarizeAllPathways(
  plan: FourYearPlanGrades,
  courses: Course[],
  requirements: GraduationRequirement[],
): Record<Pathway, PathwaySummary> {
  return {
    graduation: summarizePathway('graduation', plan, courses, requirements),
    uc: summarizePathway('uc', plan, courses, requirements),
    brahma_tech: summarizePathway('brahma_tech', plan, courses, requirements),
  };
}
