/**
 * Personal (on-device) data shapes. These live ONLY in localStorage — never server-side, never
 * tied to the signed-in identity (CLAUDE.md hard rule / privacy line).
 *
 * The join key is the teacher or room id; `class_label` is a display label only and is never used
 * to resolve a location.
 */
export type ScheduleEntry =
  | { kind: 'teacher'; teacher_id: string; class_label: string }
  | { kind: 'room'; room_id: string; class_label: string };

/** period id (e.g. "1", "2", … defined in src/data/periods.ts) -> the chosen section */
export type Schedule = Record<string, ScheduleEntry>;

/**
 * A saved locker: the block it lives in (`block_id`, a `locker_sections` row id — the join key) plus
 * the number within that block. The school's locker numbers repeat across blocks, so the block id is
 * required to resolve a locker unambiguously; the number alone is not enough.
 */
export interface MyLocker {
  block_id: string;
  number: number;
}

export interface Personal {
  version: 2;
  schedule: Schedule;
  my_locker: MyLocker | null;
}
