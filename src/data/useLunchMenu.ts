import { useQuery } from '@tanstack/react-query';
import { fetchLunchMenu } from '../lib/lunchFeed';

/**
 * The month's lunch menu via the proxy, keyed by year/month (one fetch covers every day in the
 * month; the card picks out today). Cached generously — the menu changes at most daily.
 */
export function useLunchMenu(year: number, month: number) {
  return useQuery({
    queryKey: ['lunchMenu', year, month],
    queryFn: () => fetchLunchMenu(year, month),
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });
}
