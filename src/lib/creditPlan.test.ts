import { describe, expect, it } from 'vitest';
import {
  filledSemesterCount,
  plannedCourseIds,
  summarizePathway,
  TOTAL_SEMESTERS,
} from './creditPlan';
import type { Course, GraduationRequirement } from './refData';
import { GRADES, type FourYearPlanGrades } from '../types/fourYearPlan';

function emptyPlan(): FourYearPlanGrades {
  return Object.fromEntries(
    GRADES.map((g) => [g, { fall: [], spring: [] }]),
  ) as unknown as FourYearPlanGrades;
}

const course = (over: Partial<Course> & { id: string }): Course => ({
  created_at: '',
  credits: 10,
  grade_levels: [9, 10, 11, 12],
  name: over.id,
  satisfies_brahma_tech: false,
  satisfies_uc: false,
  subject_area: 'English',
  ...over,
});

const req = (over: Partial<GraduationRequirement>): GraduationRequirement => ({
  created_at: '',
  credits_required: 10,
  id: Math.random().toString(),
  notes: null,
  pathway: 'uc',
  subject_area: 'English',
  ...over,
});

describe('plannedCourseIds / filledSemesterCount', () => {
  it('flattens all placements and counts filled semesters', () => {
    const plan = emptyPlan();
    plan[9].fall = ['a', 'b'];
    plan[11].spring = ['c'];
    expect(plannedCourseIds(plan).sort()).toEqual(['a', 'b', 'c']);
    expect(filledSemesterCount(plan)).toBe(2);
    expect(TOTAL_SEMESTERS).toBe(8);
  });
});

describe('summarizePathway — UC', () => {
  const courses = [
    course({ id: 'eng1', subject_area: 'English', satisfies_uc: true, credits: 10 }),
    course({ id: 'eng2', subject_area: 'English', satisfies_uc: true, credits: 10 }),
    course({ id: 'pe1', subject_area: 'Physical Education', satisfies_uc: false, credits: 10 }),
  ];
  const requirements = [
    req({ pathway: 'uc', subject_area: 'English', credits_required: 40 }),
    req({ pathway: 'uc', subject_area: 'Mathematics', credits_required: 30 }),
  ];

  it('only counts UC-approved courses toward UC areas', () => {
    const plan = emptyPlan();
    plan[9].fall = ['eng1', 'pe1']; // pe1 is not UC-approved → ignored
    const s = summarizePathway('uc', plan, courses, requirements);
    const english = s.subjects.find((x) => x.subjectArea === 'English');
    expect(english?.planned).toBe(10);
    expect(english?.met).toBe(false);
    expect(s.status).toBe('at_risk'); // some progress, not all met
  });

  it('reports on_track only when every area is met', () => {
    const plan = emptyPlan();
    plan[9].fall = ['eng1'];
    plan[9].spring = ['eng2'];
    plan[10].fall = ['eng1']; // 30 english… still < 40, and math 0
    const s = summarizePathway('uc', plan, courses, requirements);
    expect(s.status).toBe('at_risk');
  });

  it('counts a year-long course once even when placed in both terms', () => {
    // A 10-credit year course spans Fall + Spring of a grade; it must total 10, not 20.
    const plan = emptyPlan();
    plan[9].fall = ['eng1'];
    plan[9].spring = ['eng1'];
    const s = summarizePathway('uc', plan, courses, requirements);
    expect(s.subjects.find((x) => x.subjectArea === 'English')?.planned).toBe(10);
  });

  it('not_on_track when nothing applies', () => {
    const plan = emptyPlan();
    plan[9].fall = ['pe1'];
    const s = summarizePathway('uc', plan, courses, requirements);
    expect(s.status).toBe('not_on_track');
  });
});

describe('summarizePathway — placeholder + missing', () => {
  it('flags a pathway whose requirements are all placeholders', () => {
    const courses = [course({ id: 'x', subject_area: 'English' })];
    const requirements = [
      req({ pathway: 'graduation', subject_area: 'English', notes: 'PLACEHOLDER — supply real' }),
    ];
    const s = summarizePathway('graduation', emptyPlan(), courses, requirements);
    expect(s.placeholder).toBe(true);
    expect(s.subjects[0].placeholder).toBe(true);
  });

  it('marks a pathway with no requirement rows as missing', () => {
    const s = summarizePathway('brahma_tech', emptyPlan(), [], []);
    expect(s.missing).toBe(true);
    expect(s.status).toBe('not_on_track');
  });
});

describe('summarizePathway — Brahma Tech filtering', () => {
  it('counts only brahma-tech courses', () => {
    const courses = [
      course({ id: 'bt', subject_area: 'Career/Technical Elective', satisfies_brahma_tech: true }),
      course({
        id: 'eng',
        subject_area: 'Career/Technical Elective',
        satisfies_brahma_tech: false,
      }),
    ];
    const requirements = [
      req({
        pathway: 'brahma_tech',
        subject_area: 'Career/Technical Elective',
        credits_required: 10,
      }),
    ];
    const plan = emptyPlan();
    plan[9].fall = ['bt', 'eng'];
    const s = summarizePathway('brahma_tech', plan, courses, requirements);
    expect(s.subjects[0].planned).toBe(10); // only bt
    expect(s.status).toBe('on_track');
  });
});
