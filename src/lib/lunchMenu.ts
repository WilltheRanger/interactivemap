/**
 * Lunch-menu types + pure helpers (no network — see lunchFeed.ts for the proxy call). The feed is the
 * month's per-day menu keyed by local date; the card reads "today" out of it.
 */
export interface LunchFeed {
  menuId: number;
  year: number;
  month: number;
  /** "YYYY-MM-DD" → ordered item names served that day (school days only). */
  days: Record<string, string[]>;
  fetchedAt?: string;
}

/**
 * Local YYYY-MM-DD for a date — NOT toISOString(), which is UTC and would roll to "tomorrow" on a
 * Pacific evening and show the wrong day's lunch.
 */
export function localDateKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Items served on `dateKey`, or [] when nothing is scheduled (weekend / holiday / summer). */
export function lunchForDate(feed: LunchFeed | undefined, dateKey: string): string[] {
  return feed?.days[dateKey] ?? [];
}
