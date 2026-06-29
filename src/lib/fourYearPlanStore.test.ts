import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  PLAN_STORAGE_KEY,
  addCourseToPlan,
  addYearCourse,
  clearPlan,
  copyFallToSpring,
  getPlanSnapshot,
  migratePlan,
  removeCourseFromPlan,
  removeYearCourse,
  setCurrentGrade,
  subscribePlan,
} from './fourYearPlanStore';

beforeEach(() => {
  localStorage.clear();
  clearPlan();
});
afterEach(() => {
  localStorage.clear();
});

describe('migratePlan', () => {
  it('returns an empty default for non-objects / unknown version', () => {
    for (const raw of [null, undefined, 'nope', 42, [], { version: 0 }, { version: 2 }]) {
      const p = migratePlan(raw);
      expect(p.version).toBe(1);
      expect(p.current_grade).toBe(9);
      expect(p.four_year_plan[9]).toEqual({ fall: [], spring: [] });
    }
  });

  it('keeps valid placements and drops non-string ids', () => {
    const p = migratePlan({
      version: 1,
      current_grade: 11,
      four_year_plan: {
        '9': { fall: ['a', 'b', 3], spring: ['c'] },
        '11': { fall: ['d'], spring: [] },
      },
    });
    expect(p.four_year_plan[9].fall).toEqual(['a', 'b']);
    expect(p.four_year_plan[9].spring).toEqual(['c']);
    expect(p.four_year_plan[11].fall).toEqual(['d']);
    expect(p.current_grade).toBe(11);
  });

  it('defaults an invalid current_grade to 9', () => {
    expect(migratePlan({ version: 1, current_grade: 13, four_year_plan: {} }).current_grade).toBe(
      9,
    );
  });
});

describe('plan mutations', () => {
  it('adds and removes courses per cell, de-duping within a cell', () => {
    addCourseToPlan(9, 'fall', 'eng1');
    addCourseToPlan(9, 'fall', 'eng1'); // dup → ignored
    addCourseToPlan(9, 'fall', 'math1');
    expect(getPlanSnapshot().four_year_plan[9].fall).toEqual(['eng1', 'math1']);

    removeCourseFromPlan(9, 'fall', 'eng1');
    expect(getPlanSnapshot().four_year_plan[9].fall).toEqual(['math1']);
  });

  it('allows the same course in both Fall and Spring (year-long classes)', () => {
    addCourseToPlan(10, 'fall', 'bio');
    addCourseToPlan(10, 'spring', 'bio');
    expect(getPlanSnapshot().four_year_plan[10].fall).toEqual(['bio']);
    expect(getPlanSnapshot().four_year_plan[10].spring).toEqual(['bio']);
  });

  it('addYearCourse places a year-long course in both terms (no dups)', () => {
    addYearCourse(11, 'apush');
    addYearCourse(11, 'apush'); // dup → ignored in both terms
    expect(getPlanSnapshot().four_year_plan[11].fall).toEqual(['apush']);
    expect(getPlanSnapshot().four_year_plan[11].spring).toEqual(['apush']);
  });

  it('removeYearCourse clears the course from both terms', () => {
    addYearCourse(11, 'apush');
    addCourseToPlan(11, 'fall', 'pe'); // a semester course stays put
    removeYearCourse(11, 'apush');
    expect(getPlanSnapshot().four_year_plan[11].fall).toEqual(['pe']);
    expect(getPlanSnapshot().four_year_plan[11].spring).toEqual([]);
  });

  it('setCurrentGrade updates the focused year', () => {
    setCurrentGrade(12);
    expect(getPlanSnapshot().current_grade).toBe(12);
  });

  it('persists under the namespaced key', () => {
    addCourseToPlan(9, 'fall', 'eng1');
    const raw = localStorage.getItem(PLAN_STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw as string).four_year_plan[9].fall).toEqual(['eng1']);
  });
});

describe('copyFallToSpring', () => {
  it('copies Fall courses into an empty Spring, leaving Fall untouched', () => {
    addCourseToPlan(9, 'fall', 'a');
    addCourseToPlan(9, 'fall', 'b');
    copyFallToSpring(9);
    expect(getPlanSnapshot().four_year_plan[9].spring).toEqual(['a', 'b']);
    expect(getPlanSnapshot().four_year_plan[9].fall).toEqual(['a', 'b']);
  });

  it('merges without duplicating existing Spring courses', () => {
    addCourseToPlan(9, 'fall', 'a');
    addCourseToPlan(9, 'fall', 'b');
    addCourseToPlan(9, 'spring', 'b'); // already in spring
    addCourseToPlan(9, 'spring', 'z'); // spring-only elective
    copyFallToSpring(9);
    expect(getPlanSnapshot().four_year_plan[9].spring).toEqual(['b', 'z', 'a']);
  });

  it('is a no-op when Fall is empty', () => {
    addCourseToPlan(9, 'spring', 'z');
    copyFallToSpring(9);
    expect(getPlanSnapshot().four_year_plan[9].spring).toEqual(['z']);
  });

  it('notifies subscribers', () => {
    addCourseToPlan(9, 'fall', 'a');
    let calls = 0;
    const unsubscribe = subscribePlan(() => {
      calls += 1;
    });
    copyFallToSpring(9);
    expect(calls).toBe(1);
    unsubscribe();
  });
});
