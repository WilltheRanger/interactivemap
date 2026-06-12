import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion } from 'framer-motion';
import { MapPin, User, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { SearchInput } from '../../components/SearchInput';
import { useRoomWithTeacher } from '../../data/hooks';
import { useCurrentClass } from '../../data/useCurrentClass';
import { useResolvedEntry } from '../schedule/resolveEntry';
import { MapControls } from './MapControls';
import { fadeUpItem, staggerContainer } from '../../lib/motion';
import { BUILDING_LABELS } from './buildingLabels';
import {
  CAMPUS_LEVELS,
  GROUP_ADJUST,
  isWrapperGroupId,
  loadAllCampusRooms,
  type CampusLevel,
  type CampusRoom,
} from './campusGeo';
import './MapScreen.css';

type MapStatus = 'loading' | 'ready' | 'missing';

interface RoomSelection {
  id: string;
  title: string;
  building: string;
  /** Shape id to resolve against the `rooms` table for a teacher — null for whole-building groups. */
  lookupId: string | null;
}

const MAX_SEARCH_RESULTS = 8;

/** Display title for a shape id ("461" → "Room 461", "RR_2" → "Restroom", names pass through). */
function roomTitle(id: string): string {
  if (/^RR(_\d+)?$/.test(id)) return 'Restroom';
  if (/^\d/.test(id)) return `Room ${id}`;
  return BUILDING_LABELS[id] ?? id;
}

/**
 * Map screen: per-level campus illustration (raster underlay) with the traced plan SVG aligned
 * invisibly on top — every named room shape is directly tappable (highlight + detail card).
 * The Level control switches between the upper and lower campus; the search bar finds rooms on
 * either level and jumps to them (also via /map?room=ID from other screens).
 */
export function MapScreen() {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const selectByIdRef = useRef<((roomId: string) => boolean) | null>(null);
  /** Room to select once the (possibly newly switched) level finishes loading. */
  const pendingRoomRef = useRef<string | null>(null);
  const [searchParams] = useSearchParams();
  const [level, setLevel] = useState<CampusLevel>('upper');
  // Status is stored with the level it belongs to, so switching levels *derives* a fresh
  // 'loading' without a synchronous state reset inside the setup effect.
  const [mapState, setMapState] = useState<{ level: CampusLevel; status: MapStatus }>({
    level: 'upper',
    status: 'loading',
  });
  const status: MapStatus = mapState.level === level ? mapState.status : 'loading';
  const [selected, setSelected] = useState<RoomSelection | null>(null);
  const [rooms, setRooms] = useState<CampusRoom[] | null>(null);
  const [query, setQuery] = useState('');

  const clearSelection = () => {
    svgRef.current
      ?.querySelectorAll('.is-selected')
      .forEach((s) => s.classList.remove('is-selected'));
    setSelected(null);
  };

  // Search index: every room on both levels (independent of which level is showing).
  useEffect(() => {
    let cancelled = false;
    loadAllCampusRooms()
      .then((all) => {
        if (!cancelled) setRooms(all);
      })
      .catch(() => {
        if (!cancelled) setRooms([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const config = CAMPUS_LEVELS[level];
    let map: L.Map | null = null;
    let cancelled = false;

    fetch(config.svgUrl)
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error('missing'))))
      .then((svgText) => {
        if (cancelled || !containerRef.current) return;
        const svg = new DOMParser().parseFromString(svgText, 'image/svg+xml')
          .documentElement as unknown as SVGSVGElement;
        if (svg.nodeName !== 'svg') {
          setMapState({ level, status: 'missing' });
          return;
        }
        svgRef.current = svg;

        const { w: W, h: H } = config.imageSize;
        const { ax, sx, ay, sy } = config.svgToImage;
        const vb = (svg.getAttribute('viewBox') ?? `0 0 ${W} ${H}`).split(/\s+/).map(Number);
        const imageBounds = L.latLngBounds([
          [0, 0],
          [H, W],
        ]);
        // The traced frame and the illustration share a plan — place the SVG at its fitted position.
        const svgBounds = L.latLngBounds([
          [H - (ay + sy * vb[3]), ax],
          [H - ay, ax + sx * vb[2]],
        ]);

        const localMap = L.map(containerRef.current, {
          crs: L.CRS.Simple,
          attributionControl: false,
          zoomControl: false,
          maxZoom: 3, // small source images: enough to tap rooms; SVG highlights stay crisp
          zoomSnap: 0.25,
          zoomDelta: 0.5,
          maxBounds: imageBounds,
          maxBoundsViscosity: 1,
        });
        map = localMap;

        L.imageOverlay(config.imageUrl, imageBounds).addTo(localMap);
        svg.removeAttribute('width');
        svg.removeAttribute('height');
        svg.classList.add('campus-svg');
        // Per-building calibration seam: nudge a group onto its illustrated building if needed.
        for (const [gid, { dx, dy }] of Object.entries(GROUP_ADJUST)) {
          const el = svg.querySelector(`[id="${gid}"]`);
          if (el instanceof SVGGraphicsElement) {
            el.setAttribute('transform', `translate(${dx},${dy})`);
          }
        }
        L.svgOverlay(svg, svgBounds, { interactive: false }).addTo(localMap);

        const selectShapeEl = (shape: SVGGraphicsElement) => {
          svg.querySelectorAll('.is-selected').forEach((s) => s.classList.remove('is-selected'));
          shape.classList.add('is-selected');
          const id = shape.getAttribute('id') ?? '';
          if (shape.tagName === 'g') {
            // A whole building group — no single teacher to resolve.
            setSelected({ id, title: BUILDING_LABELS[id] ?? id, building: '', lookupId: null });
            return;
          }
          const gid = shape.closest('g[id]')?.getAttribute('id');
          if (!isWrapperGroupId(gid)) {
            setSelected({
              id,
              title: roomTitle(id),
              building: BUILDING_LABELS[gid as string] ?? (gid as string),
              lookupId: id,
            });
          } else {
            setSelected({
              id,
              title: roomTitle(id),
              building: `${config.label} campus`,
              lookupId: id,
            });
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

        // Search / ?room= → select a room by id and zoom to it with some context around it.
        selectByIdRef.current = (roomId: string) => {
          const el = svg.querySelector(`[id="${roomId.replace(/"/g, '')}"]`);
          if (!(el instanceof SVGGraphicsElement)) return false;
          selectShapeEl(el);
          // getBBox excludes the element's own/ancestor transforms — add the calibration nudge.
          const owner =
            el.tagName === 'g'
              ? el.getAttribute('id')
              : (el.closest('g[id]')?.getAttribute('id') ?? el.getAttribute('id'));
          const { dx, dy } = GROUP_ADJUST[owner ?? ''] ?? { dx: 0, dy: 0 };
          const b = el.getBBox();
          const roomBounds = L.latLngBounds([
            [H - (ay + sy * (b.y + dy + b.height)), ax + sx * (b.x + dx)],
            [H - (ay + sy * (b.y + dy)), ax + sx * (b.x + dx + b.width)],
          ]);
          localMap.fitBounds(roomBounds.pad(3), { maxZoom: 2 });
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
        setMapState({ level, status: 'ready' });

        // A search hit / ?room= jump that switched levels lands here once the level is up.
        if (pendingRoomRef.current) {
          const pending = pendingRoomRef.current;
          pendingRoomRef.current = null;
          selectByIdRef.current?.(pending);
        }
      })
      .catch(() => {
        if (!cancelled) setMapState({ level, status: 'missing' });
      });

    return () => {
      cancelled = true;
      svgRef.current = null;
      selectByIdRef.current = null;
      map?.remove();
    };
  }, [level]);

  /** Jump to a room, switching levels first when needed. */
  const jumpToRoom = (room: CampusRoom) => {
    setQuery('');
    if (room.level === level) {
      selectByIdRef.current?.(room.id);
    } else {
      pendingRoomRef.current = room.id;
      setLevel(room.level);
    }
  };

  // Apply ?room=ID once the map + room index are ready (the room may be on either level).
  // Deferred a tick so a needed level switch isn't a synchronous set-state-in-effect.
  useEffect(() => {
    if (status !== 'ready' || !rooms) return;
    const roomId = searchParams.get('room');
    if (!roomId) return;
    const room = rooms.find((r) => r.id.toLowerCase() === roomId.toLowerCase());
    if (!room) return;
    const t = setTimeout(() => {
      if (room.level === level) {
        selectByIdRef.current?.(room.id);
      } else {
        pendingRoomRef.current = room.id;
        setLevel(room.level);
      }
    }, 0);
    return () => clearTimeout(t);
  }, [status, searchParams, rooms, level]);

  // Resolve a tapped room to its teacher (rooms.id == the SVG shape id). Returns null where the
  // room isn't in the directory yet — the card just omits the teacher line, never errors.
  const roomLookup = useRoomWithTeacher(selected?.lookupId ?? null);
  const teacherName = roomLookup.data?.teacher?.name ?? null;

  // "Where should I be now?" — the live current class → its room (rooms.id == a map shape id),
  // matched against the room index to find which level it's on. Null until both resolve.
  const currentClass = useCurrentClass();
  const currentResolved = useResolvedEntry(currentClass?.entry ?? null);
  const currentRoomId = currentResolved.data?.room?.id ?? null;
  const currentRoom = useMemo(
    () =>
      currentRoomId && rooms
        ? (rooms.find((r) => r.id.toLowerCase() === currentRoomId.toLowerCase()) ?? null)
        : null,
    [currentRoomId, rooms],
  );

  // Auto-locate the current class once when the map is ready — unless a ?room= deep link takes over.
  const autoLocatedRef = useRef(false);
  useEffect(() => {
    if (autoLocatedRef.current) return;
    if (status !== 'ready' || !currentRoom || searchParams.get('room')) return;
    autoLocatedRef.current = true;
    const t = setTimeout(() => {
      if (currentRoom.level === level) {
        selectByIdRef.current?.(currentRoom.id);
      } else {
        pendingRoomRef.current = currentRoom.id;
        setLevel(currentRoom.level);
      }
    }, 0);
    return () => clearTimeout(t);
  }, [status, currentRoom, searchParams, level]);

  const q = query.trim().toLowerCase();
  const results = q
    ? (rooms ?? [])
        .filter(
          (room) =>
            room.id.toLowerCase().includes(q) ||
            roomTitle(room.id).toLowerCase().includes(q) ||
            (BUILDING_LABELS[room.buildingId] ?? '').toLowerCase().includes(q),
        )
        .slice(0, MAX_SEARCH_RESULTS)
    : [];

  return (
    <div className="map-screen">
      <motion.div
        className="map-screen__top"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        <motion.div className="map-screen__controls" variants={fadeUpItem}>
          <div className="map-screen__search">
            <SearchInput
              placeholder="Search rooms…"
              aria-label="Search rooms"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {q && (
              <div className="map-screen__results" role="listbox" aria-label="Room results">
                {rooms === null && <p className="map-screen__results-note">Loading rooms…</p>}
                {rooms !== null && results.length === 0 && (
                  <p className="map-screen__results-note">No rooms match “{query.trim()}”.</p>
                )}
                {results.map((room) => {
                  const building =
                    room.buildingId !== room.id
                      ? (BUILDING_LABELS[room.buildingId] ?? room.buildingId)
                      : null;
                  const where = `${CAMPUS_LEVELS[room.level].label} campus`;
                  return (
                    <button
                      key={`${room.level}-${room.id}`}
                      type="button"
                      role="option"
                      aria-selected="false"
                      className="map-screen__result"
                      onClick={() => jumpToRoom(room)}
                    >
                      <span className="map-screen__result-title">{roomTitle(room.id)}</span>
                      <span className="map-screen__result-sub">
                        {building ? `${building} · ${where}` : where}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <MapControls
            level={level}
            onSelectLevel={(next) => {
              if (next === level) return;
              clearSelection();
              setLevel(next);
            }}
          />
        </motion.div>

        {currentClass &&
          (currentRoom ? (
            <motion.button
              type="button"
              className="map-screen__nowbar map-screen__nowbar--btn"
              variants={fadeUpItem}
              onClick={() => jumpToRoom(currentRoom)}
            >
              <MapPin size={16} aria-hidden="true" className="map-screen__nowbar-pin" />
              <span className="map-screen__nowbar-text">
                <span className="map-screen__nowbar-label">Class now</span>
                <span className="map-screen__nowbar-class">{currentClass.label}</span>
              </span>
              <span className="map-screen__nowbar-cta">Locate</span>
            </motion.button>
          ) : (
            <motion.div className="map-screen__nowbar" variants={fadeUpItem}>
              <MapPin size={16} aria-hidden="true" className="map-screen__nowbar-pin" />
              <span className="map-screen__nowbar-text">
                <span className="map-screen__nowbar-label">Class now</span>
                <span className="map-screen__nowbar-class">{currentClass.label}</span>
              </span>
              <span className="map-screen__nowbar-tbd">
                {currentResolved.isPending ? 'Locating…' : 'Room TBD'}
              </span>
            </motion.div>
          ))}
      </motion.div>

      <div ref={containerRef} key={level} className="map-screen__canvas" aria-label="Campus map" />

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
            {teacherName && (
              <p className="map-screen__detail-teacher">
                <User size={14} aria-hidden="true" />
                {teacherName}
              </p>
            )}
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
