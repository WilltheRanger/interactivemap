/**
 * Period model (06.1) — the ordered slots that drive the schedule form, one row per period.
 * REAL structure per the owner: periods 0–6, where Period 0 is the optional zero/early period —
 * not every student has one. Every row is skippable by design (empty = no class that period), so
 * Period 0 simply carries an "(optional)" label rather than a separate none control.
 */
export interface Period {
  id: string;
  label: string;
}

export const PERIODS: Period[] = [
  { id: '0', label: 'Period 0 (optional)' },
  ...Array.from({ length: 6 }, (_, i) => ({ id: String(i + 1), label: `Period ${i + 1}` })),
];
