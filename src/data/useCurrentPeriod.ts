import { useBellFeed } from './useBellFeed';
import { useBellSettings } from './useBellSettings';
import { useNow } from './useNow';
import { useSchedule } from './usePersonal';
import { computeTimings, findVariant, periodIdForBellKey } from '../lib/bellSchedule';
import type { ScheduleEntry } from '../types/personal';

export interface CurrentPeriod {
  /** Bell key of the in-session period ("3", "lunch", "6A"…). */
  periodKey: string;
  /** Display name, e.g. "Period 3" or "Lunch". */
  periodLabel: string;
  /** End time in minutes since midnight — drives the live countdown. */
  endMinutes: number;
  /** The student's saved class for this period, if any (class periods only). */
  entry: ScheduleEntry | null;
  classLabel: string | null;
}

/**
 * The period in session *right now*, from the live bell schedule — the home screen's "school is
 * live" status: what period it is, how much time is left, and (if the student has it) which class.
 * Live data only (never the offline fallback, so it can't be wrong on a special day); null between
 * periods, when there's no school, or when the feed is unavailable. Prefers an active period the
 * student has a class in (so overlaps like 6/6A resolve to the one that's theirs).
 */
export function useCurrentPeriod(): CurrentPeriod | null {
  const settings = useBellSettings();
  const schedule = useSchedule();
  const feed = useBellFeed(settings);
  const now = useNow(30_000);

  const feedData = feed.data;
  if (!feedData) return null;
  const variant = findVariant(feedData.schedules, feedData.todayKey);
  if (!variant) return null;

  const active = computeTimings(variant, now).filter((t) => t.active);
  if (active.length === 0) return null;

  const chosen =
    active.find((t) => {
      const id = periodIdForBellKey(t.period.key);
      return id ? !!schedule[id] : false;
    }) ?? active[0];

  const periodId = periodIdForBellKey(chosen.period.key);
  const entry = periodId ? (schedule[periodId] ?? null) : null;
  return {
    periodKey: chosen.period.key,
    periodLabel: chosen.period.print,
    endMinutes: chosen.endMinutes,
    entry,
    classLabel: entry?.class_label || null,
  };
}
