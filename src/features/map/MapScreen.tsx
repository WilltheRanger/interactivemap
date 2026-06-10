import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { SearchInput } from '../../components/SearchInput';
import { MapControls } from './MapControls';
import { fadeUpItem, staggerContainer } from '../../lib/motion';
import { BUILDING_LABELS } from './buildingLabels';
import { IMAGE_SIZE, MAP_IMAGE_URL, MAP_SVG_URL, SVG_TO_IMAGE } from './campusGeo';
import './MapScreen.css';

type MapStatus = 'loading' | 'ready' | 'missing';

interface RoomSelection {
  id: string;
  title: string;
  building: string;
}

/**
 * Map screen: the campus illustration (raster underlay) with the owner's traced plan SVG aligned on
 * top — every named room shape is directly tappable (highlight + detail card). Supports /map?room=ID
 * so Find results can jump straight to a room. Google-Maps-style cover zoom over the full image.
 */
export function MapScreen() {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const selectByIdRef = useRef<((roomId: string) => boolean) | null>(null);
  const [searchParams] = useSearchParams();
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

        const { w: W, h: H } = IMAGE_SIZE;
        const { ax, sx, ay, sy } = SVG_TO_IMAGE;
        const vb = (svg.getAttribute('viewBox') ?? '0 0 1382 863').split(/\s+/).map(Number);
        const imageBounds = L.latLngBounds([
          [0, 0],
          [H, W],
        ]);
        // The traced frame is a crop of the illustration — place the SVG at its aligned position.
        const svgBounds = L.latLngBounds([
          [H - (ay + sy * vb[3]), ax],
          [H - ay, ax + sx * vb[2]],
        ]);

        const localMap = L.map(containerRef.current, {
          crs: L.CRS.Simple,
          attributionControl: false,
          zoomControl: false,
          maxZoom: 2, // enough to tap small rooms; SVG stays crisp, raster softens acceptably
          zoomSnap: 0.25,
          zoomDelta: 0.5,
          maxBounds: imageBounds,
          maxBoundsViscosity: 1,
        });
        map = localMap;

        L.imageOverlay(MAP_IMAGE_URL, imageBounds).addTo(localMap);
        svg.removeAttribute('width');
        svg.removeAttribute('height');
        svg.classList.add('campus-svg');
        L.svgOverlay(svg, svgBounds, { interactive: false }).addTo(localMap);

        const selectShapeEl = (shape: SVGGraphicsElement) => {
          svg.querySelectorAll('.is-selected').forEach((s) => s.classList.remove('is-selected'));
          shape.classList.add('is-selected');
          const id = shape.getAttribute('id') ?? '';
          if (shape.tagName === 'g') {
            // A whole building group (from a Find "Buildings" result).
            setSelected({ id, title: BUILDING_LABELS[id] ?? id, building: '' });
            return;
          }
          const gid = shape.closest('g[id]')?.getAttribute('id');
          if (gid && gid !== 'Upper') {
            setSelected({ id, title: `Room ${id}`, building: BUILDING_LABELS[gid] ?? gid });
          } else {
            setSelected({ id, title: BUILDING_LABELS[id] ?? id, building: '' });
          }
        };

        // Each room shape becomes a tappable button (click, not mousedown — dragging still pans).
        svg.querySelectorAll<SVGGraphicsElement>('rect[id], path[id]').forEach((shape) => {
          shape.classList.add('campus-room');
          shape.addEventListener('click', (event) => {
            event.stopPropagation();
            selectShapeEl(shape);
          });
        });
        localMap.on('click', () => clearSelection());

        // Find → map: select a room by id and zoom to it with some context around it.
        selectByIdRef.current = (roomId: string) => {
          const el = svg.querySelector(`[id="${roomId.replace(/"/g, '')}"]`);
          if (!(el instanceof SVGGraphicsElement)) return false;
          selectShapeEl(el);
          const b = el.getBBox();
          const roomBounds = L.latLngBounds([
            [H - (ay + sy * (b.y + b.height)), ax + sx * b.x],
            [H - (ay + sy * b.y), ax + sx * (b.x + b.width)],
          ]);
          localMap.fitBounds(roomBounds.pad(3), { maxZoom: 1.5 });
          return true;
        };

        const applyCoverZoom = (recenter: boolean) => {
          const coverZoom = localMap.getBoundsZoom(imageBounds, true);
          localMap.setMinZoom(coverZoom);
          if (recenter) localMap.setView(imageBounds.getCenter(), coverZoom);
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
      selectByIdRef.current = null;
      map?.remove();
    };
  }, []);

  // Apply ?room=ID once the map is ready (and whenever the param changes while mounted).
  useEffect(() => {
    if (status !== 'ready') return;
    const room = searchParams.get('room');
    if (room) selectByIdRef.current?.(room);
  }, [status, searchParams]);

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
