/** A student's 4-year plan — personal data, localStorage only (never Supabase). */

export type Grade = 9 | 10 | 11 | 12;
export type Semester = 'fall' | 'spring';

export const GRADES: Grade[] = [9, 10, 11, 12];
export const SEMESTERS: Semester[] = ['fall', 'spring'];

/** course ids (from the Supabase `courses` table) placed in each grade/semester cell. */
export type FourYearPlanGrades = Record<Grade, Record<Semester, string[]>>;

export interface FourYearPlan {
  version: 1;
  four_year_plan: FourYearPlanGrades;
  current_grade: Grade;
}
