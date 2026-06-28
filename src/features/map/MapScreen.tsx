import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion } from 'framer-motion';
import { Camera, MapPin, Timer, User, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { SearchInput } from '../../components/SearchInput';
import {
  useLockerBlocks,
  useLockerSections,
  usePanorama,
  useRoomWithTeacher,
  useSignedPanoramaUrl,
} from '../../data/hooks';
import type { LockerSection } from '../../lib/refData';
import { useCurrentPeriod, type CurrentPeriod } from '../../data/useCurrentPeriod';
import { useNow } from '../../data/useNow';
import { useResolvedEntry } from '../schedule/resolveEntry';
import { formatRemaining, secondsSinceMidnight } from '../../lib/bellSchedule';
import { MapControls } from './MapControls';
import { MapGps } from './gps/MapGps';
import { fadeUpItem, staggerContainer } from '../../lib/motion';
import { BUILDING_LABELS } from './buildingLabels';
import {
  CAMPUS_LEVELS,
  GROUP_ADJUST,
  isInLockerGroup,
  isWrapperGroupId,
  loadAllCampusRooms,
  type CampusLevel,
  type CampusRoom,
} from './campusGeo';
import './MapScreen.css';

// The 360° viewer (Pannellum + the large image) is code-split — it loads only when a student opens a
// locker bank's panorama from the map. Shares the chunk with the Lockers screen's viewer.
const PanoramaViewer = lazy(() => import('../locker/PanoramaViewer'));

type MapStatus = 'loading' | 'ready' | 'missing';

interface RoomSelection {
  id: string;
  title: string;
  building: string;
  /** Shape id to resolve against the `rooms` table for a teacher — null for whole-building groups. */
  lookupId: string | null;
  /** Locker banks only: the tapped shape's id, resolved against locker_sections.map_shape_ids → the
   *  section (range) it belongs to, for its range + block label + panorama. */
  lockerShapeId?: string | null;
}

const MAX_SEARCH_RESULTS = 8;

/** Locker-overlay placement: image px = a + s·svgCoord, per axis (see CAMPUS_LEVELS.lockerSvgToImage). */
type LockerTransform = { ax: number; sx: number; ay: number; sy: number };

/** Leaflet bounds that place a locker SVG (viewBox [vw,vh]) on the image via the transform. */
function lockerBounds(t: LockerTransform, vw: number, vh: number, H: number) {
  return L.latLngBounds([
    [H - (t.ay + t.sy * vh), t.ax],
    [H - t.ay, t.ax + t.sx * vw],
  ]);
}

/** Display title for a shape id ("461" → "Room 461", "RR_2" → "Restroom", names pass through). */
function roomTitle(id: string): string {
  if (/^RR(_\d+)?$/.test(id)) return 'Restroom';
  if (/^\d/.test(id)) return `Room ${id}`;
  return BUILDING_LABELS[id] ?? id;
}

/** Fallback label for a locker shape that isn't assigned to a section yet — derived from its own id
 *  (a number range like "001-060"). Once tagged, the card shows the section's range + block instead. */
function lockerTitle(id: string): string {
  const m = id.match(/^(\d+)\s*-\s*(\d+)/);
  return m ? `Lockers ${parseInt(m[1], 10)}–${parseInt(m[2], 10)}` : 'Lockers';
}

/** Display name for a section (range): its label ("001–069"), falling back to its number range. */
function sectionRangeLabel(s: LockerSection): string {
  return s.label?.trim() || `Lockers ${s.number_start}–${s.number_end}`;
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
  // Exposed so the self-contained GPS layer can draw on the live Leaflet map (see <MapGps/>).
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [query, setQuery] = useState('');
  // A tapped locker bank's 360° panorama (opened from its detail card), when one exists.
  const [panoOpen, setPanoOpen] = useState(false);

  // Locker-overlay calibration (dev tool). The locker SVGs are from a separate artboard, so their
  // placement is tuned by eye: open /map?calibrate=1 for an on-screen panel that nudges the transform
  // live (setBounds, no reload). Paste the values into CAMPUS_LEVELS.lockerSvgToImage to bake them in.
  const lockerLayerRef = useRef<L.SVGOverlay | null>(null);
  const lockerVbRef = useRef<[number, number]>([0, 0]);
  const [lockerT, setLockerT] = useState<LockerTransform | null>(null);
  const [lockerAnchor, setLockerAnchor] = useState<[number, number]>([0, 0]);
  // Dev-only: gated behind import.meta.env.DEV so ?calibrate=1 can't open the panel in production.
  const calibrating =
    import.meta.env.DEV && new URLSearchParams(window.location.search).get('calibrate') === '1';

  // Locker sections + blocks power both the tap-to-resolve index and the ?section= deep link below.
  const lockerSections = useLockerSections();
  const lockerBlocks = useLockerBlocks();

  const clearSelection = () => {
    svgRef.current
      ?.querySelectorAll('.is-selected')
      .forEach((s) => s.classList.remove('is-selected'));
    setSelected(null);
    setPanoOpen(false);
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
          // Floor low enough that getBoundsZoom() can return the true (negative) cover zoom for a large
          // illustration — it clamps its result to [minZoom, maxZoom]. Without this, a big image (e.g. the
          // hi-res lower art) clamps to 0 and renders at 1:1, far too zoomed in. applyCoverZoom() tightens
          // minZoom to the real per-level cover zoom right after, so this is only a computation floor.
          minZoom: -5,
          zoomSnap: 0.25,
          zoomDelta: 0.5,
          maxBounds: imageBounds,
          maxBoundsViscosity: 1,
        });
        map = localMap;
        setMapInstance(localMap);

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
        // Combined-mode lockers live inside this SVG's locker group. They get the .campus-locker class
        // below (invisible at rest, but tappable) — wired alongside the room shapes.
        const lockerGroupId = config.lockerGroupId;
        L.svgOverlay(svg, svgBounds, { interactive: false }).addTo(localMap);

        // Fitted-mode levels keep a *separate* visible locker overlay: an SVG of the locker banks
        // traced on a different artboard, so it gets its own placement transform — seeded here, then
        // tunable live (see the calibration panel + the [lockerT] effect). Non-interactive so room
        // taps pass through. Combined-mode levels (lockerGroupId set) skip this entirely.
        if (!lockerGroupId && config.lockerSvgUrl && config.lockerSvgToImage) {
          const params = new URLSearchParams(window.location.search);
          const override = (key: string, fallback: number) => {
            const value = Number(params.get(key));
            return params.has(key) && Number.isFinite(value) ? value : fallback;
          };
          const base = config.lockerSvgToImage;
          const seedT: LockerTransform = {
            ax: override('lax', base.ax),
            sx: override('lsx', base.sx),
            ay: override('lay', base.ay),
            sy: override('lsy', base.sy),
          };
          fetch(config.lockerSvgUrl)
            .then((res) => (res.ok ? res.text() : Promise.reject(new Error('no lockers'))))
            .then((lockerText) => {
              if (cancelled) return;
              const lockerSvg = new DOMParser().parseFromString(lockerText, 'image/svg+xml')
                .documentElement as unknown as SVGSVGElement;
              if (lockerSvg.nodeName !== 'svg') return;
              lockerSvg.removeAttribute('width');
              lockerSvg.removeAttribute('height');
              // The fitted bounds can have a different aspect than the locker viewBox, so stretch the
              // SVG to fill them exactly (otherwise Leaflet would letterbox and the fit wouldn't apply).
              lockerSvg.setAttribute('preserveAspectRatio', 'none');
              lockerSvg.classList.add('locker-svg');
              const lvb = (lockerSvg.getAttribute('viewBox') ?? `0 0 ${W} ${H}`)
                .split(/\s+/)
                .map(Number);
              lockerVbRef.current = [lvb[2], lvb[3]];
              lockerLayerRef.current = L.svgOverlay(
                lockerSvg,
                lockerBounds(seedT, lvb[2], lvb[3], H),
                { interactive: false },
              ).addTo(localMap);
              // Anchor for "scale in place" calibration: the locker cluster's centre (bbox once it's
              // in the DOM, else the viewBox centre).
              let cx = lvb[2] / 2;
              let cy = lvb[3] / 2;
              try {
                const bb = lockerSvg.getBBox();
                if (bb.width && bb.height) {
                  cx = bb.x + bb.width / 2;
                  cy = bb.y + bb.height / 2;
                }
              } catch {
                // getBBox can throw if not yet laid out — the viewBox centre fallback is fine.
              }
              setLockerAnchor([cx, cy]);
              setLockerT(seedT); // mirror into state so the calibration panel starts from the seed
            })
            .catch(() => {
              // Lockers are an optional overlay — ignore if the file is missing or fails to parse.
            });
        }

        const selectShapeEl = (shape: SVGGraphicsElement) => {
          svg.querySelectorAll('.is-selected').forEach((s) => s.classList.remove('is-selected'));
          shape.classList.add('is-selected');
          const id = shape.getAttribute('id') ?? '';
          // A locker bank: invisible until tapped. Its id is a number range; show that + its building.
          // No teacher to resolve (lookupId null).
          if (isInLockerGroup(shape, lockerGroupId)) {
            // Resolution (range + block + panorama) happens reactively in render from the shape→section
            // index; the title/building here are only fallbacks for an as-yet-untagged shape.
            setSelected({
              id,
              title: lockerTitle(id),
              building: '',
              lookupId: null,
              lockerShapeId: id,
            });
            return;
          }
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

        // Each shape becomes a tappable button (click, not mousedown — dragging still pans). Rooms get
        // .campus-room; locker banks get .campus-locker (invisible at rest, gold highlight on select).
        svg.querySelectorAll<SVGGraphicsElement>('rect[id], path[id]').forEach((shape) => {
          shape.classList.add(isInLockerGroup(shape, lockerGroupId) ? 'campus-locker' : 'campus-room');
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
      lockerLayerRef.current = null; // removed with the map below
      map?.remove();
      setMapInstance(null);
    };
  }, [level]);

  // Calibration: reposition the locker overlay live as the panel edits the transform (no reload).
  useEffect(() => {
    const layer = lockerLayerRef.current;
    if (!layer || !lockerT) return;
    const [vw, vh] = lockerVbRef.current;
    layer.setBounds(lockerBounds(lockerT, vw, vh, CAMPUS_LEVELS[level].imageSize.h));
  }, [lockerT, level]);

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

  // Apply ?section=ID (from the locker finder's "Show on map") → highlight that section's shape on the
  // map and jump to it. Lockers are upper-only, so switch to upper if needed.
  useEffect(() => {
    if (status !== 'ready') return;
    const sectionId = searchParams.get('section');
    if (!sectionId) return;
    const section = (lockerSections.data ?? []).find((s) => s.id === sectionId);
    const shapeId = section?.map_shape_ids?.[0];
    if (!shapeId) return;
    const t = setTimeout(() => {
      if (level === 'upper') {
        selectByIdRef.current?.(shapeId);
      } else {
        pendingRoomRef.current = shapeId;
        setLevel('upper');
      }
    }, 0);
    return () => clearTimeout(t);
  }, [status, searchParams, lockerSections.data, level]);

  // Resolve a tapped room to its teacher (rooms.id == the SVG shape id). Returns null where the
  // room isn't in the directory yet — the card just omits the teacher line, never errors.
  const roomLookup = useRoomWithTeacher(selected?.lookupId ?? null);
  const teacherName = roomLookup.data?.teacher?.name ?? null;

  // Resolve a tapped locker bank → its section (the range that owns this map shape) → range + block
  // label + 360° panorama. Built from the section list's `map_shape_ids` (assigned via the admin "Tag
  // lockers on map" tool). An untagged shape resolves to nothing — card shows a plain fallback, no 360.
  const { shapeToSection, blockLabelById } = useMemo(() => {
    const shapeToSection = new Map<string, LockerSection>();
    for (const s of lockerSections.data ?? []) {
      for (const shapeId of s.map_shape_ids ?? []) shapeToSection.set(shapeId, s);
    }
    const blockLabelById = new Map<string, string>(
      (lockerBlocks.data ?? []).map((b) => [b.id, b.label]),
    );
    return { shapeToSection, blockLabelById };
  }, [lockerSections.data, lockerBlocks.data]);

  const lockerSection = selected?.lockerShapeId
    ? (shapeToSection.get(selected.lockerShapeId) ?? null)
    : null;
  const lockerBlockLabel = lockerSection?.block_id
    ? (blockLabelById.get(lockerSection.block_id) ?? null)
    : null;
  const lockerPanorama = usePanorama(lockerSection?.panorama_id ?? null);
  const bankPanorama = lockerSection ? (lockerPanorama.data ?? null) : null;
  // Private-bucket panoramas need a short-lived signed URL; legacy URLs pass through unchanged.
  const bankPanoramaUrl = useSignedPanoramaUrl(bankPanorama);

  // Detail-card text: a tapped locker shows its section's range + block (falling back to the shape's
  // own label when it isn't assigned to a range yet); everything else uses the selection as-is.
  const isLockerSel = !!selected?.lockerShapeId;
  const detailTitle = selected
    ? isLockerSel && lockerSection
      ? sectionRangeLabel(lockerSection)
      : selected.title
    : '';
  const detailSub = selected
    ? isLockerSel
      ? (lockerBlockLabel ?? (lockerSection ? '' : 'Not assigned to a range yet'))
      : selected.building
    : '';

  // "School is live" status: the in-session period (with a countdown) and, if the student has a
  // class then, its room (rooms.id == a map shape id) matched against the index to find its level.
  const currentPeriod = useCurrentPeriod();
  const currentResolved = useResolvedEntry(currentPeriod?.entry ?? null);
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
        // Building-group index entries are for deep-link highlighting only — keep them out of search.
        .filter((room) => !room.isBuilding)
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

        {currentPeriod &&
          (currentRoom ? (
            <motion.button
              type="button"
              className="map-screen__nowbar map-screen__nowbar--btn"
              variants={fadeUpItem}
              aria-label={`Find your current class, ${currentPeriod.classLabel ?? currentPeriod.periodLabel}, on the map`}
              onClick={() => jumpToRoom(currentRoom)}
            >
              <NowBarContent period={currentPeriod} />
            </motion.button>
          ) : (
            <motion.div className="map-screen__nowbar" variants={fadeUpItem}>
              <NowBarContent period={currentPeriod} />
            </motion.div>
          ))}
      </motion.div>

      <div ref={containerRef} key={level} className="map-screen__canvas" aria-label="Campus map" />

      {/* GPS "Find Me" only on levels with a georef (gps/georef.ts) — each level has its own fit. */}
      {CAMPUS_LEVELS[level].georef && (
        <MapGps
          map={mapInstance}
          imageSize={CAMPUS_LEVELS[level].imageSize}
          georef={CAMPUS_LEVELS[level].georef}
        />
      )}

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
            <p className="map-screen__detail-title">{detailTitle}</p>
            {detailSub && <p className="map-screen__detail-sub">{detailSub}</p>}
            {teacherName && (
              <p className="map-screen__detail-teacher">
                <User size={14} aria-hidden="true" />
                {teacherName}
              </p>
            )}
            {bankPanorama && (
              <button
                type="button"
                className="map-screen__detail-360"
                onClick={() => setPanoOpen(true)}
              >
                <Camera size={14} aria-hidden="true" />
                View 360°
              </button>
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

      {panoOpen && bankPanorama && bankPanoramaUrl.data && (
        <Suspense fallback={null}>
          <PanoramaViewer
            imageUrl={bankPanoramaUrl.data}
            label={selected?.title ?? 'Lockers'}
            lockerNumber={0}
            initialYaw={bankPanorama.initial_yaw}
            initialPitch={bankPanorama.initial_pitch}
            hfov={bankPanorama.hfov}
            onClose={() => setPanoOpen(false)}
          />
        </Suspense>
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

      {calibrating && lockerT && (
        <LockerCalibPanel
          value={lockerT}
          level={level}
          anchor={lockerAnchor}
          onChange={setLockerT}
        />
      )}
    </div>
  );
}

/**
 * Dev-only locker-overlay calibration panel (shown with ?calibrate=1). Nudges the placement transform
 * live — the map's [lockerT] effect repositions the overlay on every change. Copy the printed values
 * into CAMPUS_LEVELS.lockerSvgToImage (campusGeo.ts) to make them permanent.
 *
 * "Move" translates; "scale" stretches AROUND the locker cluster centre (anchor) so it grows/shrinks
 * in place instead of sliding away (image px = a + s·coord, so scaling about coord=0 would also shift
 * everything by s·anchor — we compensate `a` to keep the centre fixed).
 */
function LockerCalibPanel({
  value,
  level,
  anchor,
  onChange,
}: {
  value: LockerTransform;
  level: CampusLevel;
  anchor: [number, number];
  onChange: (next: LockerTransform) => void;
}) {
  const round = (n: number) => Math.round(n * 10000) / 10000;
  const move = (key: 'ax' | 'ay', delta: number) =>
    onChange({ ...value, [key]: round(value[key] + delta) });
  const setScale = (sKey: 'sx' | 'sy', aKey: 'ax' | 'ay', anchorCoord: number, nextS: number) =>
    onChange({
      ...value,
      [sKey]: round(nextS),
      [aKey]: round(value[aKey] + (value[sKey] - nextS) * anchorCoord),
    });

  const rows = [
    { label: 'X move', step: 10, val: value.ax, bump: (d: number) => move('ax', d), set: (v: number) => onChange({ ...value, ax: v }) },
    { label: 'Y move', step: 10, val: value.ay, bump: (d: number) => move('ay', d), set: (v: number) => onChange({ ...value, ay: v }) },
    { label: 'X scale', step: 0.02, val: value.sx, bump: (d: number) => setScale('sx', 'ax', anchor[0], value.sx + d), set: (v: number) => setScale('sx', 'ax', anchor[0], v) },
    { label: 'Y scale', step: 0.02, val: value.sy, bump: (d: number) => setScale('sy', 'ay', anchor[1], value.sy + d), set: (v: number) => setScale('sy', 'ay', anchor[1], v) },
  ];

  return (
    <div className="locker-calib" role="group" aria-label="Locker overlay calibration">
      <p className="locker-calib__title">Locker calibration · {level}</p>
      {rows.map(({ label, step, val, bump, set }) => (
        <div className="locker-calib__row" key={label}>
          <span className="locker-calib__label">{label}</span>
          <button
            type="button"
            className="locker-calib__btn"
            aria-label={`Decrease ${label}`}
            onClick={() => bump(-step)}
          >
            −
          </button>
          <input
            className="locker-calib__input"
            type="number"
            step={step}
            value={val}
            onChange={(e) => set(Number(e.target.value))}
            aria-label={label}
          />
          <button
            type="button"
            className="locker-calib__btn"
            aria-label={`Increase ${label}`}
            onClick={() => bump(step)}
          >
            +
          </button>
        </div>
      ))}
      <code className="locker-calib__out">{`ax:${round(value.ax)} sx:${round(value.sx)} ay:${round(value.ay)} sy:${round(value.sy)}`}</code>
      <p className="locker-calib__hint">Tune until the gold banks sit on the walls, then send me these 4 numbers.</p>
    </div>
  );
}

/** Contents of the "school is live" bar: the period/class + a live time-remaining countdown. */
function NowBarContent({ period }: { period: CurrentPeriod }) {
  return (
    <>
      <MapPin size={16} aria-hidden="true" className="map-screen__nowbar-pin" />
      <span className="map-screen__nowbar-text">
        <span className="map-screen__nowbar-label">
          {period.entry ? 'Class now' : 'In session'}
        </span>
        <span className="map-screen__nowbar-class">{period.classLabel ?? period.periodLabel}</span>
      </span>
      <PeriodCountdown endMinutes={period.endMinutes} />
    </>
  );
}

/** Ticks once a second on its own, so only the countdown re-renders — not the whole map. */
function PeriodCountdown({ endMinutes }: { endMinutes: number }) {
  const now = useNow(1000);
  const left = endMinutes * 60 - secondsSinceMidnight(now);
  if (left <= 0) return null;
  return (
    <span className="map-screen__nowbar-time">
      <Timer size={13} aria-hidden="true" />
      {formatRemaining(left)} left
    </span>
  );
}
