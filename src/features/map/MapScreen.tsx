import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion } from 'framer-motion';
import { SearchInput } from '../../components/SearchInput';
import { MapControls } from './MapControls';
import { fadeUpItem, staggerContainer } from '../../lib/motion';
import './MapScreen.css';

/** The campus map raster (owner-supplied). The Phase-05 SVG building overlay layers on top of this
 * same Leaflet coordinate system later. */
const MAP_IMAGE_URL = `${import.meta.env.BASE_URL}campus-map.webp`;

type MapStatus = 'loading' | 'ready' | 'missing';

/**
 * Map screen: Leaflet (CRS.Simple) hosting the campus image as an overlay — pinch-zoom + pan, with
 * bounds locked to the image. Search + Level/Period chrome floats above. If the image isn't in the
 * deploy yet, a friendly placeholder shows instead of a broken map.
 */
export function MapScreen() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<MapStatus>('loading');

  useEffect(() => {
    let map: L.Map | null = null;
    let cancelled = false;

    // Probe the image first so bounds come from its real pixel size (works for any future image).
    const img = new Image();
    img.onload = () => {
      if (cancelled || !containerRef.current) return;
      const bounds = L.latLngBounds([
        [0, 0],
        [img.naturalHeight, img.naturalWidth],
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
