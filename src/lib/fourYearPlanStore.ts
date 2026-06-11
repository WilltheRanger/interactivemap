/**
 * 4-year plan store — the student's planned courses per grade/semester + current grade,
 * persisted ONLY to localStorage (privacy hard rule: never Supabase, never tied to the Google
 * identity). Same external-store shape as personalStore so React reads it via useSyncExternalStore
 * and other tabs stay in sync.
 */
import {
  GRADES,
  SEMESTERS,
  type FourYearPlan,
  type FourYearPlanGrades,
  type Grade,
  type Semester,
} from '../types/fourYearPlan';

export const PLAN_STORAGE_KEY = 'dbhs-wayfinder:plan:v1';

function emptyGrades(): FourYearPlanGrades {
  return Object.fromEntries(
    GRADES.map((g) => [g, { fall: [], spring: [] }]),
  ) as unknown as FourYearPlanGrades;
}

function defaultPlan(): FourYearPlan {
  return { version: 1, four_year_plan: emptyGrades(), current_grade: 9 };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function isGrade(v: unknown): v is Grade {
  return v === 9 || v === 10 || v === 11 || v === 12;
}

/** Normalize any stored/unknown blob into a valid plan; bad fields degrade to safe defaults. */
export function migratePlan(raw: unknown): FourYearPlan {
  if (!isRecord(raw) || raw.version !== 1) return defaultPlan();
  const grades = emptyGrades();
  if (isRecord(raw.four_year_plan)) {
    for (const g of GRADES) {
      const cell = (raw.four_year_plan as Record<string, unknown>)[String(g)];
      if (!isRecord(cell)) continue;
      for (const sem of SEMESTERS) {
        const ids = (cell as Record<string, unknown>)[sem];
        if (Array.isArray(ids))
          grades[g][sem] = ids.filter((id): id is string => typeof id === 'string');
      }
    }
  }
  const current_grade = isGrade(raw.current_grade) ? raw.current_grade : 9;
  return { version: 1, four_year_plan: grades, current_grade };
}

function loadFromStorage(): FourYearPlan {
  try {
    const raw = localStorage.getItem(PLAN_STORAGE_KEY);
    return raw == null ? defaultPlan() : migratePlan(JSON.parse(raw) as unknown);
  } catch {
    return defaultPlan();
  }
}

let current: FourYearPlan = loadFromStorage();
const listeners = new Set<() => void>();

function persist(next: FourYearPlan): void {
  current = next;
  try {
    localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore quota / unavailable storage; in-memory state still updates
  }
  for (const l of listeners) l();
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== PLAN_STORAGE_KEY) return;
    current = event.newValue == null ? defaultPlan() : migratePlan(safeJson(event.newValue));
    for (const l of listeners) l();
  });
}

// ── External-store API ─────────────────────────────────────────────────────────
export function subscribePlan(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getPlanSnapshot(): FourYearPlan {
  return current;
}

// ── Mutations ────────────────────────────────────────────────────────────────────
export function addCourseToPlan(grade: Grade, semester: Semester, courseId: string): void {
  const cell = current.four_year_plan[grade][semester];
  if (cell.includes(courseId)) return;
  const grades = structuredClonePlan(current.four_year_plan);
  grades[grade][semester] = [...cell, courseId];
  persist({ ...current, four_year_plan: grades });
}

export function removeCourseFromPlan(grade: Grade, semester: Semester, courseId: string): void {
  const grades = structuredClonePlan(current.four_year_plan);
  grades[grade][semester] = grades[grade][semester].filter((id) => id !== courseId);
  persist({ ...current, four_year_plan: grades });
}

export function setCurrentGrade(grade: Grade): void {
  persist({ ...current, current_grade: grade });
}

export function clearPlan(): void {
  persist(defaultPlan());
}

function structuredClonePlan(grades: FourYearPlanGrades): FourYearPlanGrades {
  return Object.fromEntries(
    GRADES.map((g) => [g, { fall: [...grades[g].fall], spring: [...grades[g].spring] }]),
  ) as unknown as FourYearPlanGrades;
}
