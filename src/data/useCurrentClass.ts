import { useBellFeed } from './useBellFeed';
import { useBellSettings } from './useBellSettings';
import { useNow } from './useNow';
import { useSchedule } from './usePersonal';
import { computeTimings, findVariant, periodIdForBellKey } from '../lib/bellSchedule';
import type { ScheduleEntry } from '../types/personal';

export interface CurrentClass {
  /** The student's saved period id ("0".."6"). */
  periodId: string;
  /** Display label for the class (the saved class_label, or the period name as a fallback). */
  label: string;
  entry: ScheduleEntry;
}

/**
 * The class the student is in *right now*, from the live bell schedule + their saved classes — what
 * the map uses to highlight where they should be. Live data only (never the offline fallback, so it
 * can't point at the wrong room on a special day); null between classes, with no schedule, or when
 * the feed is unavailable. Skips the feed fetch entirely when no classes are saved.
 */
export function useCurrentClass(): CurrentClass | null {
  const settings = useBellSettings();
  const schedule = useSchedule();
  const hasSchedule = Object.keys(schedule).length > 0;
  const feed = useBellFeed(settings, hasSchedule);
  const now = useNow(30_000);

  const feedData = feed.data;
  if (!hasSchedule || !feedData) return null;
  const variant = findVariant(feedData.schedules, feedData.todayKey);
  if (!variant) return null;

  for (const timing of computeTimings(variant, now)) {
    if (!timing.active) continue;
    const periodId = periodIdForBellKey(timing.period.key);
    if (!periodId) continue;
    const entry = schedule[periodId];
    if (entry) return { periodId, label: entry.class_label || timing.period.print, entry };
  }
  return null;
}
