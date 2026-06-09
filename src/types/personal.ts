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

export interface Personal {
  version: 1;
  schedule: Schedule;
  my_locker: number | null;
}
