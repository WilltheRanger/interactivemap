import { useCallback, useEffect, useRef, useState } from 'react';

interface OrientationEventIOS extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
}
type DeviceOrientationCtor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>;
};

export interface DeviceHeading {
  /** Smoothed compass heading in degrees clockwise from true north, or null when unavailable. */
  heading: number | null;
  /** Begin listening (must be called from a user gesture — iOS prompts for permission). */
  enable: () => void;
  stop: () => void;
}

// Circular low-pass on the (noisy) compass, and a small dead-band so we don't re-render on every
// micro-wiggle. The facing cone also CSS-transitions, so the two together make it glide.
const HEADING_ALPHA = 0.2;
const HEADING_EPSILON_DEG = 0.75;

/** Shortest signed angle from a to b, in degrees (−180…180]. */
function angleDelta(a: number, b: number): number {
  return ((b - a + 540) % 360) - 180;
}

/**
 * Best-effort device compass heading for the "facing" indicator. iOS exposes webkitCompassHeading
 * (and needs a gesture-triggered permission prompt); Android uses absolute deviceorientation alpha.
 * Degrades to null where the sensor or permission isn't available — the dot just shows without a cone.
 */
export function useDeviceHeading(): DeviceHeading {
  const [heading, setHeading] = useState<number | null>(null);
  const eventNameRef = useRef<string | null>(null);
  const smoothedRef = useRef<number | null>(null);
  const emittedRef = useRef<number | null>(null);

  const onOrientation = useCallback((event: Event) => {
    const e = event as OrientationEventIOS;
    let raw: number | null = null;
    if (typeof e.webkitCompassHeading === 'number' && !Number.isNaN(e.webkitCompassHeading)) {
      raw = e.webkitCompassHeading; // iOS: already a true compass heading
    } else if (e.absolute && typeof e.alpha === 'number') {
      raw = 360 - e.alpha; // Android absolute → compass heading
    }
    if (raw == null || Number.isNaN(raw)) return;
    raw = ((raw % 360) + 360) % 360;

    // Ease toward the new reading along the shortest arc.
    const prev = smoothedRef.current;
    const next =
      prev == null ? raw : (((prev + HEADING_ALPHA * angleDelta(prev, raw)) % 360) + 360) % 360;
    smoothedRef.current = next;

    // Only re-render when the smoothed heading has actually moved a hair.
    const emitted = emittedRef.current;
    if (emitted == null || Math.abs(angleDelta(emitted, next)) > HEADING_EPSILON_DEG) {
      emittedRef.current = next;
      setHeading(next);
    }
  }, []);

  const stop = useCallback(() => {
    if (eventNameRef.current) {
      window.removeEventListener(eventNameRef.current, onOrientation);
      eventNameRef.current = null;
    }
    smoothedRef.current = null;
    emittedRef.current = null;
    setHeading(null);
  }, [onOrientation]);

  const enable = useCallback(() => {
    if (
      eventNameRef.current ||
      typeof window === 'undefined' ||
      !('DeviceOrientationEvent' in window)
    ) {
      return;
    }
    const listen = () => {
      const name =
        'ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation';
      window.addEventListener(name, onOrientation);
      eventNameRef.current = name;
    };
    const ctor = window.DeviceOrientationEvent as DeviceOrientationCtor;
    if (typeof ctor.requestPermission === 'function') {
      // Called within the Find Me tap, so this counts as a user gesture (required on iOS).
      ctor
        .requestPermission()
        .then((res) => {
          if (res === 'granted') listen();
        })
        .catch(() => {
          /* denied / unsupported — no cone, no error surfaced */
        });
    } else {
      listen();
    }
  }, [onOrientation]);

  useEffect(() => stop, [stop]); // remove the listener on unmount

  return { heading, enable, stop };
}
