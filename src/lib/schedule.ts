/**
 * Pure schedule-entry helpers (no network). The join-key hard rule is encoded here: a picked
 * master-schedule section is stored as its TEACHER id (or its room when the row has no teacher) —
 * never as (course, period). The course name becomes the display-only class_label.
 */
import type { CourseSection } from './refData';
import type { ScheduleEntry } from '../types/personal';

export function sectionToEntry(section: CourseSection): ScheduleEntry | null {
  if (section.teacher) {
    return { kind: 'teacher', teacher_id: section.teacher.id, class_label: section.course };
  }
  if (section.room) {
    return { kind: 'room', room_id: section.room.id, class_label: section.course };
  }
  return null;
}
