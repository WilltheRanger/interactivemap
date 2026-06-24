/**
 * Lunch-menu network layer — calls our `school-menu` Supabase Edge Function, which proxies the public
 * My School Menus feed server-side (the feed sends no CORS headers, so a browser can't read it
 * directly). The client passes the local year/month so the right month is fetched regardless of the
 * edge runtime's timezone.
 */
import { getSupabase } from './supabase';
import type { LunchFeed } from './lunchMenu';

export async function fetchLunchMenu(year: number, month: number): Promise<LunchFeed> {
  const { data, error } = await getSupabase().functions.invoke<LunchFeed>('school-menu', {
    body: { year, month },
  });
  if (error) throw error;
  if (!data || typeof data.days !== 'object' || data.days === null) {
    throw new Error('Lunch menu feed returned an unexpected shape');
  }
  return data;
}
