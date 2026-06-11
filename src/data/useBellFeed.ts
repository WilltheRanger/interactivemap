import { useQuery } from '@tanstack/react-query';
import { fetchBellFeed, type BellFeedSettings } from '../lib/bellFeed';

/**
 * Today's bell schedule via the proxy. Fresh-ish (the day's variant rarely changes mid-day) but
 * refetchable so a student can pull the latest after a special-day change. The schedule screen falls
 * back to the bundled Regular times when this errors, so a failure never leaves a blank screen.
 */
export function useBellFeed(settings: BellFeedSettings = {}) {
  return useQuery({
    queryKey: ['bellFeed', settings],
    queryFn: () => fetchBellFeed(settings),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
