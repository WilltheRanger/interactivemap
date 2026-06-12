/**
 * Bell-schedule engine — pure, no network. Adapts the DBHS "Brahma Bells" data model (the teacher's
 * mrwai.com feed) to this app: parse the military start/end times, work out which period(s) are live
 * right now (periods can overlap — e.g. 6 and 6A — so this returns all that are in session), and the
 * seconds left in each. Network + the proxy live in bellFeed.ts; the UI in features/schedule.
 */

/** One row of a schedule variant, shaped like the feed's JSON. */
export interface BellPeriodRaw {
  key: string; // "1", "1A", "6A", "brunch", "lunch", "collaboration"…
  print: string; // "Period 1", "Brunch"
  start: string; // military, "0830"
  end: string; // military, "0926"
  startPrint: string; // "08:30"
  endPrint: string; // "09:26"
  length?: string; // minutes, as a string
}

/** A named schedule (Regular, Late Start, Minimum, Rally…). */
export interface BellScheduleVariant {
  key: string; // "Regular"
  print: string; // "Regular Schedule"
  schedule: BellPeriodRaw[];
}

/** What the proxy returns: today's variant key + every variant. */
export interface BellFeed {
  todayKey: string; // "Regular", or "" / "None" when there's no school
  schedules: BellScheduleVariant[];
  fetchedAt?: string;
}

/** Bell period key → this app's saved-schedule period id ("0".."6"). 1A/6A are alternates of 1/6. */
const PERIOD_KEY_TO_ID: Record<string, string> = {
  '0': '0',
  '1A': '1',
  '1': '1',
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  '6A': '6',
};

/** The student's period id a bell row maps to, or null for non-class rows (brunch/lunch/rally…). */
export function periodIdForBellKey(key: string): string | null {
  return PERIOD_KEY_TO_ID[key] ?? null;
}

/** A class period (maps to a saved class) vs. a break/event row. */
export function isClassPeriod(key: string): boolean {
  return periodIdForBellKey(key) != null;
}

/** "0830" → minutes since midnight (510). Returns null on malformed input (kept out of the day). */
export function militaryToMinutes(mil: string): number | null {
  const trimmed = (mil ?? '').trim();
  if (!/^\d{3,4}$/.test(trimmed)) return null;
  const padded = trimmed.padStart(4, '0');
  const h = Number(padded.slice(0, 2));
  const m = Number(padded.slice(2));
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

/** Local seconds since midnight for `date` — the basis for "is this period live" + the countdown. */
export function secondsSinceMidnight(date: Date): number {
  return date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
}

export interface PeriodTiming {
  period: BellPeriodRaw;
  startMinutes: number;
  endMinutes: number;
  /** In session right now (start ≤ now < end). */
  active: boolean;
  /** Seconds until this period ends when active, else null. */
  secondsRemaining: number | null;
}

/** Per-row timing for a variant at instant `now`. Overlapping periods can each be active. */
export function computeTimings(variant: BellScheduleVariant | null, now: Date): PeriodTiming[] {
  if (!variant) return [];
  const nowSec = secondsSinceMidnight(now);
  return variant.schedule.map((period) => {
    const startMinutes = militaryToMinutes(period.start);
    const endMinutes = militaryToMinutes(period.end);
    const startSec = startMinutes == null ? null : startMinutes * 60;
    const endSec = endMinutes == null ? null : endMinutes * 60;
    const active = startSec != null && endSec != null && nowSec >= startSec && nowSec < endSec;
    return {
      period,
      startMinutes: startMinutes ?? 0,
      endMinutes: endMinutes ?? 0,
      active,
      secondsRemaining: active && endSec != null ? endSec - nowSec : null,
    };
  });
}

/** Find a variant by key (case-insensitive), or null. */
export function findVariant(
  schedules: BellScheduleVariant[],
  key: string | null | undefined,
): BellScheduleVariant | null {
  if (!key) return null;
  const k = key.trim().toLowerCase();
  return schedules.find((s) => s.key.toLowerCase() === k) ?? null;
}

/**
 * Seconds → "1h 05m 13s", hiding the hours when under an hour ("22m 13s"). Minutes/seconds pad to
 * two digits once a larger unit is shown, matching the teacher's spec.
 */
export function formatRemaining(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (h > 0) return `${h}h ${pad(m)}m ${pad(sec)}s`;
  return `${m}m ${pad(sec)}s`;
}

export interface BellReminder {
  /** Period key the reminder is for (also used as a notification tag to de-dupe). */
  key: string;
  /** When to fire, epoch ms. */
  fireAt: number;
  title: string;
  body: string;
}

/**
 * Plan end-of-period reminders for today: `warningMinutes` before each period the student has a
 * class in ends. Only future fire times (relative to `now`) are returned, so it's safe to re-run on
 * every settings/schedule change. Pure — the hook turns these into timers + Notifications.
 */
export function planReminders(
  variant: BellScheduleVariant,
  warningMinutes: number,
  classLabelFor: (periodKey: string) => string | null,
  now: Date,
): BellReminder[] {
  const reminders: BellReminder[] = [];
  const nowMs = now.getTime();
  for (const period of variant.schedule) {
    const label = classLabelFor(period.key);
    if (!label) continue; // only periods the student actually has a class in
    const endMinutes = militaryToMinutes(period.end);
    if (endMinutes == null) continue;
    const fire = new Date(now);
    fire.setHours(0, endMinutes - warningMinutes, 0, 0);
    const fireAt = fire.getTime();
    if (fireAt <= nowMs) continue; // already passed today
    reminders.push({
      key: period.key,
      fireAt,
      title: label,
      body: `${warningMinutes} min left in ${period.print}`,
    });
  }
  return reminders;
}
