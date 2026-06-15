import { useCallback, useEffect, useRef, useState } from 'react';

interface OrientationEventIOS extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
}
type DeviceOrientationCtor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>;
};

export interface DeviceHeading {
  /** Compass heading in degrees clockwise from true north, or null when unavailable. */
  heading: number | null;
  /** Begin listening (must be called from a user gesture — iOS prompts for permission). */
  enable: () => void;
  stop: () => void;
}

/**
 * Best-effort device compass heading for the "facing" indicator. iOS exposes webkitCompassHeading
 * (and needs a gesture-triggered permission prompt); Android uses absolute deviceorientation alpha.
 * Degrades to null where the sensor or permission isn't available — the dot just shows without a cone.
 */
export function useDeviceHeading(): DeviceHeading {
  const [heading, setHeading] = useState<number | null>(null);
  const eventNameRef = useRef<string | null>(null);

  const onOrientation = useCallback((event: Event) => {
    const e = event as OrientationEventIOS;
    let h: number | null = null;
    if (typeof e.webkitCompassHeading === 'number' && !Number.isNaN(e.webkitCompassHeading)) {
      h = e.webkitCompassHeading; // iOS: already a true compass heading
    } else if (e.absolute && typeof e.alpha === 'number') {
      h = 360 - e.alpha; // Android absolute → compass heading
    }
    if (h != null && !Number.isNaN(h)) setHeading(((h % 360) + 360) % 360);
  }, []);

  const stop = useCallback(() => {
    if (eventNameRef.current) {
      window.removeEventListener(eventNameRef.current, onOrientation);
      eventNameRef.current = null;
    }
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
