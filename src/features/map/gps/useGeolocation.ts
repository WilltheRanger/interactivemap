import { useCallback, useEffect, useRef, useState } from 'react';
import { GpsKalman } from './gpsKalman';

export type GeoStatus = 'idle' | 'locating' | 'active' | 'denied' | 'unavailable';

/** A smoothed location fix (geographic), the Kalman-filtered output the map dot follows. */
export interface GeoFix {
  latitude: number;
  longitude: number;
  /** Filtered uncertainty in metres — drives the accuracy circle. */
  accuracy: number;
}

export interface GeolocationState {
  status: GeoStatus;
  position: GeoFix | null;
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
 * watchPosition wrapper — continuous tracking, started only on demand (never on mount). Each raw fix
 * is run through an accuracy-weighted Kalman filter (gpsKalman.ts) so the reported `position` is
 * smoothed and de-jumped before the map ever sees it; the UI then only has to ease toward it. Surfaces
 * the permission-denied / unavailable states the UI needs and always clears the watch on stop/unmount.
 */
export function useGeolocation(): GeolocationState {
  const [status, setStatus] = useState<GeoStatus>('idle');
  const [position, setPosition] = useState<GeoFix | null>(null);
  const watchRef = useRef<number | null>(null);
  const filterRef = useRef<GpsKalman>(new GpsKalman());

  const clearWatch = useCallback(() => {
    if (watchRef.current != null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    clearWatch();
    filterRef.current.reset();
    setStatus('idle');
    setPosition(null);
  }, [clearWatch]);

  const start = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('unavailable');
      return;
    }
    clearWatch();
    filterRef.current.reset();
    setStatus('locating');
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const est = filterRef.current.update({
          lat: latitude,
          lng: longitude,
          accuracy,
          timestamp: pos.timestamp,
        });
        setPosition({ latitude: est.lat, longitude: est.lng, accuracy: est.accuracy });
        setStatus('active');
      },
      (err) => {
        // Permission denied won't recover — stop and surface it.
        if (err.code === err.PERMISSION_DENIED) {
          clearWatch();
          filterRef.current.reset();
          setPosition(null);
          setStatus('denied');
          return;
        }
        // Transient errors (timeout / position temporarily unavailable) are common near buildings.
        // watchPosition keeps retrying, so DON'T tear it down or drop the last fix — that made the
        // dot vanish and flicker on a brief hiccup. Keep showing the last position; only fall back to
        // "unavailable" if we never got a fix in the first place.
        setStatus((s) => (s === 'active' ? 'active' : 'unavailable'));
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
