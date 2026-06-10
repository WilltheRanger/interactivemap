import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { SearchInput } from '../../components/SearchInput';
import { MapControls } from './MapControls';
import { fadeUpItem, staggerContainer } from '../../lib/motion';
import { BUILDING_LABELS } from './buildingLabels';
import './MapScreen.css';

/** Owner-supplied campus plan (Figma export): one SVG, each room a named shape (id = room number). */
const MAP_SVG_URL = `${import.meta.env.BASE_URL}campus-upper.svg`;

type MapStatus = 'loading' | 'ready' | 'missing';

interface RoomSelection {
  /** Shape id — a room number ("461") or a place name ("aquatics-center"). */
  id: string;
  title: string;
  building: string;
}

/**
 * Map screen: Leaflet (CRS.Simple) hosting the campus plan SVG at Google-Maps-style "cover" zoom.
 * Every room is its own SVG shape, so each one is directly tappable — tapping highlights it and
 * opens a detail card (room number + building). Vector, so it stays crisp and themes for dark mode.
 */
export function MapScreen() {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [status, setStatus] = useState<MapStatus>('loading');
  const [selected, setSelected] = useState<RoomSelection | null>(null);

  const clearSelection = () => {
    svgRef.current
      ?.querySelectorAll('.is-selected')
      .forEach((s) => s.classList.remove('is-selected'));
    setSelected(null);
  };

  useEffect(() => {
    let map: L.Map | null = null;
    let cancelled = false;

    fetch(MAP_SVG_URL)
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error('missing'))))
      .then((svgText) => {
        if (cancelled || !containerRef.current) return;
        const svg = new DOMParser().parseFromString(svgText, 'image/svg+xml')
          .documentElement as unknown as SVGSVGElement;
        if (svg.nodeName !== 'svg') {
          setStatus('missing');
          return;
        }
        svgRef.current = svg;

        const vb = (svg.getAttribute('viewBox') ?? '0 0 1382 863').split(/\s+/).map(Number);
        const w = vb[2];
        const h = vb[3];
        const bounds = L.latLngBounds([
          [0, 0],
          [h, w],
        ]);

        const localMap = L.map(containerRef.current, {
          crs: L.CRS.Simple,
          attributionControl: false,
          zoomControl: false,
          maxZoom: 3,
          zoomSnap: 0.25,
          zoomDelta: 0.5,
          maxBounds: bounds,
          maxBoundsViscosity: 1,
        });
        map = localMap;

        svg.removeAttribute('width');
        svg.removeAttribute('height');
        svg.classList.add('campus-svg');
        L.svgOverlay(svg, bounds, { interactive: false }).addTo(localMap);

        // Each room shape becomes a tappable button. click (not mousedown) → so dragging still pans.
        svg.querySelectorAll<SVGElement>('rect[id], path[id]').forEach((shape) => {
          shape.classList.add('campus-room');
          shape.addEventListener('click', (event) => {
            event.stopPropagation();
            svg.querySelectorAll('.is-selected').forEach((s) => s.classList.remove('is-selected'));
            shape.classList.add('is-selected');
            const id = shape.getAttribute('id') ?? '';
            const group = shape.closest('g[id]');
            const gid = group?.getAttribute('id');
            if (gid && gid !== 'Upper') {
              setSelected({ id, title: `Room ${id}`, building: BUILDING_LABELS[gid] ?? gid });
            } else {
              setSelected({ id, title: BUILDING_LABELS[id] ?? id, building: '' });
            }
          });
        });
        localMap.on('click', () => clearSelection());

        const applyCoverZoom = (recenter: boolean) => {
          const coverZoom = localMap.getBoundsZoom(bounds, true);
          localMap.setMinZoom(coverZoom);
          if (recenter) localMap.setView(bounds.getCenter(), coverZoom);
          else if (localMap.getZoom() < coverZoom) localMap.setZoom(coverZoom);
        };
        applyCoverZoom(true);
        localMap.on('resize', () => applyCoverZoom(false));
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('missing');
      });

    return () => {
      cancelled = true;
      svgRef.current = null;
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
          aria-label={selected.title}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="map-screen__detail-text">
            <p className="map-screen__detail-title">{selected.title}</p>
            {selected.building && <p className="map-screen__detail-sub">{selected.building}</p>}
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
              : 'The campus map isn’t available yet — check back soon.'}
          </p>
        </div>
      )}
    </div>
  );
}
