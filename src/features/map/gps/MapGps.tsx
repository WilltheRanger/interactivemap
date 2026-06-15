import { useEffect, useRef } from 'react';
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

/**
 * "You Are Here" — a user-initiated GPS dot (with a facing cone) + accuracy circle on the 2D map.
 * Self-contained: owns its geolocation + compass lifecycles and its Leaflet layers, adding/removing
 * them on the map passed in. Deleting this folder + its one line in MapScreen removes the feature
 * with no other side effects.
 */
export function MapGps({ map, imageSize }: MapGpsProps) {
  const { status, position, active, start, stop } = useGeolocation();
  const { heading, enable: enableHeading, stop: stopHeading } = useDeviceHeading();
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  // Place / update the dot + accuracy circle while a fix is available.
  useEffect(() => {
    const remove = () => {
      markerRef.current?.remove();
      markerRef.current = null;
      circleRef.current?.remove();
      circleRef.current = null;
    };
    if (!map || status !== 'active' || !position) {
      remove();
      return;
    }
    const { latitude, longitude, accuracy } = position.coords;
    const { latlng } = gpsToMapPoint(latitude, longitude, imageSize);
    const radius = accuracyToMapRadius(latitude, longitude, accuracy);
    if (markerRef.current && circleRef.current) {
      markerRef.current.setLatLng(latlng);
      circleRef.current.setLatLng(latlng);
      circleRef.current.setRadius(radius);
    } else {
      circleRef.current = L.circle(latlng, {
        radius,
        interactive: false,
        color: '#582c83',
        weight: 1,
        fillColor: '#582c83',
        fillOpacity: 0.12,
      }).addTo(map);
      markerRef.current = L.marker(latlng, {
        icon: DOT_ICON,
        interactive: false,
        keyboard: false,
        zIndexOffset: 1000,
      }).addTo(map);
    }
    return remove;
  }, [map, status, position, imageSize]);

  // Rotate the facing cone to the compass heading (mapped into this rotated map's frame).
  useEffect(() => {
    const el = markerRef.current?.getElement();
    if (!el) return;
    if (heading != null && status === 'active' && position) {
      const rot = headingToMapRotation(position.coords.latitude, heading);
      el.style.setProperty('--gps-heading', `${rot}deg`);
      el.classList.add('has-heading');
    } else {
      el.classList.remove('has-heading');
    }
  }, [heading, position, status]);

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
