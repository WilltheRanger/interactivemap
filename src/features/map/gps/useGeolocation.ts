import { useCallback, useEffect, useRef, useState } from 'react';

export type GeoStatus = 'idle' | 'locating' | 'active' | 'denied' | 'unavailable';

export interface GeolocationState {
  status: GeoStatus;
  position: GeolocationPosition | null;
  /** True while a watch is running (locating or actively tracking). */
  active: boolean;
  start: () => void;
  stop: () => void;
}

// Battery-aware: high accuracy for an outdoor campus, but reuse a recent fix and cap the wait.
const WATCH_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 10_000,
  timeout: 20_000,
};

/**
 * watchPosition wrapper — continuous tracking, started only on demand (never on mount). Surfaces the
 * permission-denied / unavailable states the UI needs, and always clears the watch on stop/unmount.
 */
export function useGeolocation(): GeolocationState {
  const [status, setStatus] = useState<GeoStatus>('idle');
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const watchRef = useRef<number | null>(null);

  const clearWatch = useCallback(() => {
    if (watchRef.current != null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    clearWatch();
    setStatus('idle');
    setPosition(null);
  }, [clearWatch]);

  const start = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('unavailable');
      return;
    }
    clearWatch();
    setStatus('locating');
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition(pos);
        setStatus('active');
      },
      (err) => {
        clearWatch();
        setPosition(null);
        setStatus(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable');
      },
      WATCH_OPTIONS,
    );
  }, [clearWatch]);

  useEffect(() => clearWatch, [clearWatch]); // clear the watch if the component unmounts

  return {
    status,
    position,
    active: status === 'locating' || status === 'active',
    start,
    stop,
  };
}
