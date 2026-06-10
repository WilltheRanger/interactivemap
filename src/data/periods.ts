/**
 * Period model (06.1) — the ordered slots that drive the schedule form, one row per period.
 * PLACEHOLDER structure (Periods 1–7): confirm the real period structure with the owner before
 * launch. Bell *times* (intake E) stay optional — the passive schedule never shows them.
 */
export interface Period {
  id: string;
  label: string;
}

export const PERIODS: Period[] = Array.from({ length: 7 }, (_, i) => ({
  id: String(i + 1),
  label: `Period ${i + 1}`,
}));
