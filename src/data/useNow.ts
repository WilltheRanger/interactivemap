import { useEffect, useState } from 'react';

/**
 * A ticking clock for live countdowns. Re-renders the caller on each interval (default 1s). The
 * schedule view is small, so a per-second re-render is cheap; the interval is cleared on unmount.
 */
export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
