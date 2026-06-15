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
 * Reject the jumpy fixes: watchPosition mixes precise GPS readings with coarse wifi/cell ones, and a
 * lone bad fix teleports the dot across campus. Keep a newer fix only if it's at least as accurate,
 * the previous one is stale, or it's only slightly less accurate (normal movement) — drop a
 * newer-but-much-worse reading. (The classic Android "isBetterLocation" heuristic.)
 */
const STALE_MS = 15_000;
const WORSE_ACCURACY_M = 30;

function isBetterFix(next: GeolocationPosition, prev: GeolocationPosition | null): boolean {
  if (!prev) return true;
  const timeDelta = next.timestamp - prev.timestamp;
  if (timeDelta <= 0) return false;
  if (timeDelta > STALE_MS) return true;
  const accuracyDelta = next.coords.accuracy - prev.coords.accuracy;
  if (accuracyDelta <= 0) return true;
  return accuracyDelta < WORSE_ACCURACY_M;
}

/**
 * watchPosition wrapper — continuous tracking, started only on demand (never on mount). Surfaces the
 * permission-denied / unavailable states the UI needs, filters jumpy fixes, and always clears the
 * watch on stop/unmount.
 */
export function useGeolocation(): GeolocationState {
  const [status, setStatus] = useState<GeoStatus>('idle');
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const watchRef = useRef<number | null>(null);
  const lastFixRef = useRef<GeolocationPosition | null>(null);

  const clearWatch = useCallback(() => {
    if (watchRef.current != null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    clearWatch();
    lastFixRef.current = null;
    setStatus('idle');
    setPosition(null);
  }, [clearWatch]);

  const start = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('unavailable');
      return;
    }
    clearWatch();
    lastFixRef.current = null;
    setStatus('locating');
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        // Always 'active' once a fix arrives, but only move the dot for a fix worth trusting.
        if (isBetterFix(pos, lastFixRef.current)) {
          lastFixRef.current = pos;
          setPosition(pos);
        }
        setStatus('active');
      },
      (err) => {
        clearWatch();
        lastFixRef.current = null;
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
