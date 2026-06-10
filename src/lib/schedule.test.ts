import { describe, expect, it } from 'vitest';
import { sectionToEntry } from './schedule';
import type { CourseSection } from './refData';

const teacher = {
  id: 't-1',
  name: 'Placeholder Teacher One',
  home_room_id: 'a-101',
  created_at: '',
};
const room = {
  id: 'a-101',
  building_id: 'bldg-a',
  label: 'A-101',
  teacher_id: 't-1',
  created_at: '',
};

function section(overrides: Partial<CourseSection>): CourseSection {
  return {
    id: 'ms-1',
    course: 'Placeholder Algebra',
    period: '3',
    teacher: null,
    room: null,
    ...overrides,
  };
}

describe('sectionToEntry', () => {
  it('stores the teacher id when the section has a teacher (join-key rule)', () => {
    expect(sectionToEntry(section({ teacher, room }))).toEqual({
      kind: 'teacher',
      teacher_id: 't-1',
      class_label: 'Placeholder Algebra',
    });
  });

  it('falls back to the room id when the section has no teacher', () => {
    expect(sectionToEntry(section({ room }))).toEqual({
      kind: 'room',
      room_id: 'a-101',
      class_label: 'Placeholder Algebra',
    });
  });

  it('returns null when the section has neither (never resolves by course+period)', () => {
    expect(sectionToEntry(section({}))).toBeNull();
  });

  it('uses the course name only as the display label', () => {
    const entry = sectionToEntry(section({ teacher }));
    expect(entry?.class_label).toBe('Placeholder Algebra');
  });
});
