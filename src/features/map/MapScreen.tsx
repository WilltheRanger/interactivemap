import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion } from 'framer-motion';
import { Check, Copy, Download, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
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
/** Edit mode: every shape stays visible so misplaced boxes are findable. */
const SHAPE_EDIT: L.PathOptions = {
  stroke: true,
  color: '#582c83',
  weight: 2,
  fill: true,
  fillColor: '#582c83',
  fillOpacity: 0.15,
};

// Generous handle sizes — these get dragged with thumbs on a phone.
const vertexIcon = L.divIcon({
  className: 'map-edit-vertex',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});
const moveIcon = L.divIcon({
  className: 'map-edit-move',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

/**
 * Map screen: Leaflet (CRS.Simple) hosting the campus image at Google-Maps-style "cover" zoom,
 * with tappable building polygons over it (campusShapes.ts). Tapping a building highlights it and
 * opens a detail card with its name + room numbers from the official campus map.
 *
 * Owner tooling: open /map?edit for shape-editing mode — drag corner dots to reshape a building,
 * the square handle to move it, then Copy/Download the adjusted layout (JSON) and send it back so
 * it can be baked into campusShapes.ts.
 */
export function MapScreen() {
  const containerRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef(new Map<string, L.Polygon>());
  const exportRef = useRef<(() => string) | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const editMode = searchParams.has('edit');
  const [status, setStatus] = useState<MapStatus>('loading');
  const [selected, setSelected] = useState<CampusShape | null>(null);
  const [exportState, setExportState] = useState<'idle' | 'copied'>('idle');

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
      const localMap = L.map(containerRef.current, {
        crs: L.CRS.Simple,
        attributionControl: false,
        zoomControl: false, // pinch / double-tap zoom; on-screen controls come with Phase 05 polish
        maxZoom: 1, // zoom 0 = 1 image px : 1 screen px; 1 = 2x
        zoomSnap: 0.25,
        zoomDelta: 0.5,
        maxBounds: bounds,
        maxBoundsViscosity: 1, // solid edges — no rubber-banding into the void
      });
      map = localMap;
      L.imageOverlay(MAP_IMAGE_URL, bounds).addTo(localMap);

      // ── Edit-mode plumbing ────────────────────────────────────────────────────
      interface EditState {
        polygon: L.Polygon;
        ring: L.LatLng[];
        vertexMarkers: L.Marker[];
        moveHandle: L.Marker;
      }
      let editState: EditState | null = null;
      const centerOf = (ring: L.LatLng[]) => L.latLngBounds(ring).getCenter();
      const clearEdit = () => {
        if (!editState) return;
        for (const m of editState.vertexMarkers) m.remove();
        editState.moveHandle.remove();
        editState = null;
      };
      /** Push the current ring to the polygon + every handle. */
      const syncEdit = (st: EditState) => {
        st.polygon.setLatLngs([st.ring]);
        st.ring.forEach((latlng, i) => st.vertexMarkers[i].setLatLng(latlng));
        st.moveHandle.setLatLng(centerOf(st.ring));
      };

      /** Select a shape for editing: corner dots reshape it; the box itself (or the gold square)
       * drags to move it. */
      const selectForEdit = (polygon: L.Polygon): EditState => {
        if (editState?.polygon === polygon) return editState;
        clearEdit();
        const ring = (polygon.getLatLngs()[0] as L.LatLng[]).slice();

        const vertexMarkers = ring.map((latlng, i) => {
          const marker = L.marker(latlng, {
            draggable: true,
            icon: vertexIcon,
            autoPan: true, // keep dragging when the handle reaches the screen edge
          }).addTo(localMap);
          marker.on('drag', () => {
            if (!editState) return;
            editState.ring[i] = marker.getLatLng();
            editState.polygon.setLatLngs([editState.ring]);
          });
          marker.on('dragend', () => {
            if (editState) editState.moveHandle.setLatLng(centerOf(editState.ring));
          });
          return marker;
        });

        const moveHandle = L.marker(centerOf(ring), {
          draggable: true,
          icon: moveIcon,
          autoPan: true,
        }).addTo(localMap);
        let prev = centerOf(ring);
        moveHandle.on('dragstart', () => {
          prev = moveHandle.getLatLng();
        });
        moveHandle.on('drag', () => {
          if (!editState) return;
          const cur = moveHandle.getLatLng();
          const dLat = cur.lat - prev.lat;
          const dLng = cur.lng - prev.lng;
          editState.ring = editState.ring.map((ll) => L.latLng(ll.lat + dLat, ll.lng + dLng));
          editState.ring.forEach((ll, i) => vertexMarkers[i].setLatLng(ll));
          editState.polygon.setLatLngs([editState.ring]);
          prev = cur;
        });

        editState = { polygon, ring, vertexMarkers, moveHandle };
        return editState;
      };

      /** Direct box dragging — press a shape and move it; no pre-selection or handles needed.
       * Document-level pointer listeners so the drag never sticks if the finger leaves the map. */
      const startBoxDrag = (polygon: L.Polygon, startLatLng: L.LatLng) => {
        const st = selectForEdit(polygon);
        const baseRing = st.ring.slice();
        localMap.dragging.disable();
        const onMove = (ev: PointerEvent) => {
          if (!editState) return;
          const ll = localMap.mouseEventToLatLng(ev as unknown as MouseEvent);
          const dLat = ll.lat - startLatLng.lat;
          const dLng = ll.lng - startLatLng.lng;
          editState.ring = baseRing.map((p) => L.latLng(p.lat + dLat, p.lng + dLng));
          syncEdit(editState);
        };
        const onUp = () => {
          document.removeEventListener('pointermove', onMove);
          document.removeEventListener('pointerup', onUp);
          document.removeEventListener('pointercancel', onUp);
          localMap.dragging.enable();
        };
        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
        document.addEventListener('pointercancel', onUp);
      };

      // Serialize the CURRENT on-map shapes back to fractional coords for campusShapes.ts.
      exportRef.current = () => {
        const data = CAMPUS_SHAPES.map((shape) => {
          const polygon = layers.get(shape.id);
          const ring = (polygon?.getLatLngs()[0] ?? []) as L.LatLng[];
          return {
            id: shape.id,
            label: shape.label,
            ...(shape.rooms ? { rooms: shape.rooms } : {}),
            poly: ring.map((ll) => [
              Number((ll.lng / w).toFixed(4)),
              Number((1 - ll.lat / h).toFixed(4)),
            ]),
          };
        });
        return JSON.stringify(data, null, 2);
      };

      // ── Shapes (fractions of the image → CRS.Simple coords; y is flipped) ─────
      layers.clear();
      for (const shape of CAMPUS_SHAPES) {
        const latlngs = shape.poly.map(([fx, fy]) => [h * (1 - fy), w * fx] as L.LatLngTuple);
        const polygon = L.polygon(latlngs, editMode ? SHAPE_EDIT : SHAPE_IDLE).addTo(localMap);
        if (editMode) {
          polygon.bindTooltip(shape.id, {
            permanent: true,
            direction: 'center',
            className: 'map-edit-tip',
          });
          // Press-and-drag moves the box directly (the natural gesture); handles appear too.
          polygon.on('mousedown', (e) => {
            L.DomEvent.stop(e.originalEvent ?? e);
            startBoxDrag(polygon, e.latlng);
          });
          polygon.on('click', (e) => {
            L.DomEvent.stop(e.originalEvent ?? e);
          });
        } else {
          polygon.on('click', (e) => {
            L.DomEvent.stop(e.originalEvent ?? e);
            for (const layer of layers.values()) layer.setStyle(SHAPE_IDLE);
            polygon.setStyle(SHAPE_SELECTED);
            setSelected(shape);
          });
        }
        layers.set(shape.id, polygon);
      }
      // Tapping the bare map clears selection / handles (shape taps stop propagation above).
      localMap.on('click', () => (editMode ? clearEdit() : clearSelection()));

      // Google-Maps feel: start at "cover" (the image fills the whole viewport, pan for the rest)
      // and make that the zoom floor so empty space can never show. Recomputed on resize/rotation.
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
      exportRef.current = null;
      map?.remove();
    };
  }, [editMode]);

  const downloadLayout = (text: string) => {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'campus-shapes.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    const text = exportRef.current?.();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setExportState('copied');
      setTimeout(() => setExportState('idle'), 2000);
    } catch {
      downloadLayout(text); // clipboard blocked → fall back to a file download
    }
  };

  return (
    <div className="map-screen">
      {!editMode && (
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
      )}

      <div ref={containerRef} className="map-screen__canvas" aria-label="Campus map" />

      {editMode && (
        <div className="map-screen__editbar" role="toolbar" aria-label="Shape editing">
          <p className="map-screen__editbar-text">
            <strong>Edit mode.</strong> Drag a box to move it; drag its corner dots to resize. Then
            Copy layout and send it in.
          </p>
          <div className="map-screen__editbar-actions">
            <button type="button" className="map-screen__editbtn" onClick={handleCopy}>
              {exportState === 'copied' ? (
                <>
                  <Check size={16} aria-hidden="true" /> Copied
                </>
              ) : (
                <>
                  <Copy size={16} aria-hidden="true" /> Copy layout
                </>
              )}
            </button>
            <button
              type="button"
              className="map-screen__editbtn map-screen__editbtn--secondary"
              onClick={() => {
                const text = exportRef.current?.();
                if (text) downloadLayout(text);
              }}
            >
              <Download size={16} aria-hidden="true" /> Download
            </button>
            <button
              type="button"
              className="map-screen__editbtn map-screen__editbtn--secondary"
              onClick={() => setSearchParams({})}
            >
              <X size={16} aria-hidden="true" /> Exit
            </button>
          </div>
        </div>
      )}

      {!editMode && selected && (
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
