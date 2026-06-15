import { useCallback, useEffect, useRef } from 'react';
import L from 'leaflet';
import { LocateFixed } from 'lucide-react';
import { Button } from '../../../components';
import { useGeolocation } from './useGeolocation';
import { useDeviceHeading } from './useDeviceHeading';
import { accuracyToMapRadius, gpsToMapPoint, headingToMapRotation, type ImageSize } from './georef';
import './MapGps.css';

interface MapGpsProps {
  /** The live Leaflet map for the displayed level (null briefly while a level reloads). */
  map: L.Map | null;
  imageSize: ImageSize;
}

const DOT_ICON = L.divIcon({
  className: 'gps-dot-icon',
  html:
    '<span class="gps-dot__heading"><span class="gps-dot__cone"></span></span>' +
    '<span class="gps-dot__pulse"></span><span class="gps-dot__core"></span>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

// Smoothing time constant: the dot eases ~95% of the way to a new fix in ~3× this (≈0.9s).
const SMOOTH_TAU_MS = 300;

/**
 * "You Are Here" — a user-initiated GPS dot (with a facing cone) + accuracy circle on the 2D map.
 * The dot is tweened toward each new fix on a rAF loop (Google-Maps-style) so movement glides instead
 * of stepping; the loop sleeps once settled (battery). Self-contained: owns its geolocation + compass
 * lifecycles and its Leaflet layers. Deleting this folder + its one line in MapScreen removes it
 * cleanly.
 */
export function MapGps({ map, imageSize }: MapGpsProps) {
  const { status, position, active, start, stop } = useGeolocation();
  const { heading, enable: enableHeading, stop: stopHeading } = useDeviceHeading();

  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const markerMapRef = useRef<L.Map | null>(null);
  const targetRef = useRef<L.LatLng | null>(null);
  const shownRef = useRef<L.LatLng | null>(null);
  const targetRadiusRef = useRef(0);
  const shownRadiusRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef(0);

  // The rAF tween lives in a ref so it can re-schedule itself (a plain self-referencing useCallback
  // isn't allowed). Reads only refs, so it's set up once.
  const tickRef = useRef<(ts: number) => void>(() => {});
  useEffect(() => {
    tickRef.current = (ts: number) => {
      const marker = markerRef.current;
      const target = targetRef.current;
      const shown = shownRef.current;
      if (!marker || !target || !shown) {
        rafRef.current = null;
        return;
      }
      const dt = lastTsRef.current ? Math.min(ts - lastTsRef.current, 100) : 16;
      lastTsRef.current = ts;
      const k = 1 - Math.exp(-dt / SMOOTH_TAU_MS);
      const lat = shown.lat + (target.lat - shown.lat) * k;
      const lng = shown.lng + (target.lng - shown.lng) * k;
      const radius =
        shownRadiusRef.current + (targetRadiusRef.current - shownRadiusRef.current) * k;
      const next = L.latLng(lat, lng);
      shownRef.current = next;
      shownRadiusRef.current = radius;
      marker.setLatLng(next);
      circleRef.current?.setLatLng(next);
      circleRef.current?.setRadius(radius);

      const settled =
        Math.hypot(target.lat - lat, target.lng - lng) < 0.3 &&
        Math.abs(targetRadiusRef.current - radius) < 0.5;
      if (settled) {
        marker.setLatLng(target);
        circleRef.current?.setLatLng(target);
        circleRef.current?.setRadius(targetRadiusRef.current);
        shownRef.current = target;
        shownRadiusRef.current = targetRadiusRef.current;
        rafRef.current = null;
        lastTsRef.current = 0;
      } else {
        rafRef.current = requestAnimationFrame(tickRef.current);
      }
    };
  }, []);

  const startLoop = useCallback(() => {
    if (rafRef.current == null) {
      lastTsRef.current = 0;
      rafRef.current = requestAnimationFrame(tickRef.current);
    }
  }, []);

  const teardown = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    markerRef.current?.remove();
    circleRef.current?.remove();
    markerRef.current = null;
    circleRef.current = null;
    markerMapRef.current = null;
    targetRef.current = null;
    shownRef.current = null;
  }, []);

  // Track each new fix as a target; create the dot once, then ease toward subsequent fixes.
  useEffect(() => {
    if (!map || status !== 'active' || !position) {
      teardown();
      return;
    }
    // Recreate if the level (map instance) changed under us.
    if (markerRef.current && markerMapRef.current !== map) teardown();

    const { latitude, longitude, accuracy } = position.coords;
    const { latlng } = gpsToMapPoint(latitude, longitude, imageSize);
    const target = L.latLng(latlng[0], latlng[1]);
    const radius = accuracyToMapRadius(latitude, longitude, accuracy);
    targetRef.current = target;
    targetRadiusRef.current = radius;

    if (!markerRef.current) {
      shownRef.current = target;
      shownRadiusRef.current = radius;
      circleRef.current = L.circle(target, {
        radius,
        interactive: false,
        color: '#582c83',
        weight: 1,
        fillColor: '#582c83',
        fillOpacity: 0.12,
      }).addTo(map);
      markerRef.current = L.marker(target, {
        icon: DOT_ICON,
        interactive: false,
        keyboard: false,
        zIndexOffset: 1000,
      }).addTo(map);
      markerMapRef.current = map;
    } else {
      startLoop(); // glide toward the new fix
    }
  }, [map, status, position, imageSize, startLoop, teardown]);

  // Rotate the facing cone to the compass heading (mapped into this rotated map's frame).
  useEffect(() => {
    const el = markerRef.current?.getElement();
    if (!el) return;
    if (heading != null && status === 'active' && position) {
      el.style.setProperty(
        '--gps-heading',
        `${headingToMapRotation(position.coords.latitude, heading)}deg`,
      );
      el.classList.add('has-heading');
    } else {
      el.classList.remove('has-heading');
    }
  }, [heading, position, status]);

  useEffect(() => teardown, [teardown]); // tidy up on unmount

  const offCampus =
    status === 'active' && position
      ? !gpsToMapPoint(position.coords.latitude, position.coords.longitude, imageSize).onMap
      : false;

  const toggle = () => {
    if (active) {
      stop();
      stopHeading();
    } else {
      start();
      enableHeading();
    }
  };

  return (
    <div className="map-gps">
      {status === 'denied' && (
        <p className="map-gps__msg" role="alert">
          Location access was denied. Enable it in your browser settings to use this feature.
        </p>
      )}
      {status === 'unavailable' && (
        <p className="map-gps__msg" role="alert">
          Couldn&rsquo;t get your location. Check your connection and try again.
        </p>
      )}
      {offCampus && (
        <p className="map-gps__msg" role="status">
          You appear to be off campus.
        </p>
      )}
      <Button
        variant={active ? 'primary' : 'secondary'}
        icon={<LocateFixed size={16} />}
        onClick={toggle}
        aria-pressed={active}
      >
        {status === 'locating' ? 'Locating…' : active ? 'Stop' : 'Find Me'}
      </Button>
    </div>
  );
}
