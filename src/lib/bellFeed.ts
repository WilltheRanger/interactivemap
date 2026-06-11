/**
 * Bell-schedule network layer — calls our `bell-schedule` Supabase Edge Function, which proxies the
 * teacher's mrwai.com feed server-side. The proxy exists so a browser can read the data at all: the
 * feed only ever served a native app and sends no CORS headers, so a direct fetch from the web app
 * would be blocked. Settings toggles ride along as the body (forwarded to the upstream as the query
 * params the feed expects).
 */
import { getSupabase } from './supabase';
import type { BellFeed } from './bellSchedule';

export interface BellFeedSettings {
  pathwaysAcademy?: boolean;
  rallyScheduleB?: boolean;
  period0?: boolean;
  period1a?: boolean;
  period6a?: boolean;
}

export async function fetchBellFeed(settings: BellFeedSettings = {}): Promise<BellFeed> {
  const { data, error } = await getSupabase().functions.invoke<BellFeed>('bell-schedule', {
    body: settings,
  });
  if (error) throw error;
  if (!data || !Array.isArray(data.schedules)) {
    throw new Error('Bell schedule feed returned an unexpected shape');
  }
  return data;
}
