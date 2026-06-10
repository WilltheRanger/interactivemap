import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { SearchInput } from '../../components/SearchInput';
import { MapControls } from './MapControls';
import { fadeUpItem, staggerContainer } from '../../lib/motion';
import { CAMPUS_SHAPES, type CampusShape } from './campusShapes';
import './MapScreen.css';

/** The campus map raster (owner-supplied flat plan). The clickable shapes in campusShapes.ts are
 * traced as fractions of this image, so an image swap keeps them roughly aligned. */
const MAP_IMAGE_URL = `${import.meta.env.BASE_URL}campus-map.webp`;

type MapStatus = 'loading' | 'ready' | 'missing';

const SHAPE_IDLE: L.PathOptions = { stroke: false, fill: true, fillOpacity: 0 };
const SHAPE_SELECTED: L.PathOptions = {
  stroke: true,
  color: '#f4b41a',
  weight: 3,
  fill: true,
  fillColor: '#582c83',
  fillOpacity: 0.22,
};

/**
 * Map screen: Leaflet (CRS.Simple) hosting the campus image at Google-Maps-style "cover" zoom,
 * with invisible tappable building polygons over it (campusShapes.ts). Tapping a building
 * highlights it and opens a detail card with its name + room numbers from the official campus map.
 */
export function MapScreen() {
  const containerRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef(new Map<string, L.Polygon>());
  const [status, setStatus] = useState<MapStatus>('loading');
  const [selected, setSelected] = useState<CampusShape | null>(null);

  const clearSelection = () => {
    for (const layer of layersRef.current.values()) layer.setStyle(SHAPE_IDLE);
    setSelected(null);
  };

  useEffect(() => {
    const layers = layersRef.current;
    let map: L.Map | null = null;
    let cancelled = false;

    // Probe the image first so bounds come from its real pixel size (works for any future image).
    const img = new Image();
    img.onload = () => {
      if (cancelled || !containerRef.current) return;
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const bounds = L.latLngBounds([
        [0, 0],
        [h, w],
      ]);
      map = L.map(containerRef.current, {
        crs: L.CRS.Simple,
        attributionControl: false,
        zoomControl: false, // pinch / double-tap zoom; on-screen controls come with Phase 05 polish
        maxZoom: 1, // zoom 0 = 1 image px : 1 screen px; 1 = 2x
        zoomSnap: 0.25,
        zoomDelta: 0.5,
        maxBounds: bounds,
        maxBoundsViscosity: 1, // solid edges — no rubber-banding into the void
      });
      L.imageOverlay(MAP_IMAGE_URL, bounds).addTo(map);

      // Tappable building shapes (fractions of the image → CRS.Simple coords; y is flipped).
      layers.clear();
      for (const shape of CAMPUS_SHAPES) {
        const latlngs = shape.poly.map(([fx, fy]) => [h * (1 - fy), w * fx] as L.LatLngTuple);
        const polygon = L.polygon(latlngs, SHAPE_IDLE).addTo(map);
        polygon.on('click', (e) => {
          L.DomEvent.stop(e.originalEvent ?? e);
          for (const layer of layers.values()) layer.setStyle(SHAPE_IDLE);
          polygon.setStyle(SHAPE_SELECTED);
          setSelected(shape);
        });
        layers.set(shape.id, polygon);
      }
      // Tapping the bare map clears the selection (building taps stop propagation above).
      map.on('click', () => clearSelection());

      // Google-Maps feel: start at "cover" (the image fills the whole viewport, pan for the rest)
      // and make that the zoom floor so empty space can never show. Recomputed on resize/rotation.
      const localMap = map;
      const applyCoverZoom = (recenter: boolean) => {
        const coverZoom = localMap.getBoundsZoom(bounds, true);
        localMap.setMinZoom(coverZoom);
        if (recenter) localMap.setView(bounds.getCenter(), coverZoom);
        else if (localMap.getZoom() < coverZoom) localMap.setZoom(coverZoom);
      };
      applyCoverZoom(true);
      localMap.on('resize', () => applyCoverZoom(false));
      setStatus('ready');
    };
    img.onerror = () => {
      if (!cancelled) setStatus('missing');
    };
    img.src = MAP_IMAGE_URL;

    return () => {
      cancelled = true;
      layers.clear();
      map?.remove();
    };
  }, []);

  return (
    <div className="map-screen">
      <motion.div
        className="map-screen__top"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        <motion.div className="map-screen__search" variants={fadeUpItem}>
          <SearchInput
            placeholder="Search rooms, buildings, or locations…"
            aria-label="Search rooms, buildings, or locations"
          />
        </motion.div>
        <motion.div variants={fadeUpItem}>
          <MapControls level="1" period="3" />
        </motion.div>
      </motion.div>

      <div ref={containerRef} className="map-screen__canvas" aria-label="Campus map" />

      {selected && (
        <motion.div
          className="map-screen__detail"
          role="dialog"
          aria-label={selected.label}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="map-screen__detail-text">
            <p className="map-screen__detail-title">{selected.label}</p>
            {selected.rooms && <p className="map-screen__detail-sub">{selected.rooms}</p>}
          </div>
          <button
            type="button"
            className="map-screen__detail-close"
            aria-label="Close"
            onClick={clearSelection}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </motion.div>
      )}

      {status !== 'ready' && (
        <div className="map-screen__overlay" role="status">
          <p className="map-screen__placeholder">
            {status === 'loading'
              ? 'Loading the campus map…'
              : 'The campus map image isn’t available yet — check back soon.'}
          </p>
        </div>
      )}
    </div>
  );
}
