import { useQuery } from '@tanstack/react-query';
import { fetchBellFeed } from '../lib/bellFeed';

/**
 * Today's bell schedule via the proxy. Only pathwaysAcademy/rallyScheduleB affect what the feed
 * returns, so the query key is scoped to those two — toggling a period or reminder setting won't
 * refetch. Fresh-ish (the day's variant rarely changes mid-day) but refetchable. The schedule screen
 * falls back to the bundled times when this errors, so a failure never leaves a blank screen. Pass
 * enabled=false to skip the fetch entirely (used by the background notifier when reminders are off).
 */
export function useBellFeed(
  settings: { pathwaysAcademy?: boolean; rallyScheduleB?: boolean } = {},
  enabled = true,
) {
  const params = {
    pathwaysAcademy: !!settings.pathwaysAcademy,
    rallyScheduleB: !!settings.rallyScheduleB,
  };
  return useQuery({
    queryKey: ['bellFeed', params],
    queryFn: () => fetchBellFeed(params),
    staleTime: 5 * 60 * 1000,
    retry: 1,
    enabled,
  });
}
