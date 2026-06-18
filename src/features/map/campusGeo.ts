/**
 * Campus map geometry + room index. Each level pairs a campus illustration (raster underlay) with a
 * traced-plan SVG aligned on top, so the invisible SVG tap targets sit on the drawn walls.
 *
 * Two placement styles:
 *  - Combined (upper): the SVG and the illustration are exported from the *same* Figma frame, so they
 *    share one coordinate space and overlay 1:1 — svgToImage is the identity. The SVG carries both the
 *    rooms (building groups) and the lockers (the `lockerGroupId` group), so the lockers inherit the
 *    rooms' placement for free; no separate locker overlay or fit.
 *  - Fitted (lower): the SVG was traced on a different frame than the art, so svgToImage maps SVG
 *    coords → image pixels (image = a + s·svg), fitted by chamfer-matching every traced boundary
 *    against the illustration's edges (`scripts/fit-level.mjs`, mean ≈2px). The lockers are a separate
 *    overlay with their own transform. Re-run the fit script if a fitted asset is re-exported.
 */
export type CampusLevel = 'upper' | 'lower';

export interface LevelConfig {
  label: string;
  svgUrl: string;
  imageUrl: string;
  imageSize: { w: number; h: number };
  svgToImage: { ax: number; sx: number; ay: number; sy: number };
  /** Combined mode: id of the locker group *inside* `svgUrl`. When set, its shapes are drawn gold in
   *  place (sharing the rooms' transform) and kept out of the room index; no separate locker overlay. */
  lockerGroupId?: string;
  /** Fitted mode: a separate visible locker overlay SVG + its own placement transform. Tune live via
   *  /map?lax=&lsx=&lay=&lsy= (see MapScreen). Unused when `lockerGroupId` is set. */
  lockerSvgUrl?: string;
  lockerSvgToImage?: { ax: number; sx: number; ay: number; sy: number };
  /** Whether the GPS georeference (gps/georef.ts) matches this level's illustration. The georef was
   *  calibrated on the old upper art; the redrawn upper map needs fresh control points, so its
   *  "Find Me" dot is hidden until recalibrated. Lower still uses the original (approximate) art. */
  gpsCalibrated?: boolean;
}

export const CAMPUS_LEVELS: Record<CampusLevel, LevelConfig> = {
  upper: {
    label: 'Upper',
    // Combined export: rooms + the "Upper Lockers" group in one SVG, sharing the illustration's frame.
    svgUrl: `${import.meta.env.BASE_URL}upper-combined.svg`,
    // "-v3" = the redrawn flat-frame illustration (trees/parking/courts), exported at the SVG's exact
    // 1382×863 frame so it overlays 1:1. public/ assets keep stable URLs, so a rename is the manual
    // cache-bust — bump it again if the art is ever replaced.
    imageUrl: `${import.meta.env.BASE_URL}campus-map-upper-v3.webp`,
    imageSize: { w: 1382, h: 863 },
    svgToImage: { ax: 0, sx: 1, ay: 0, sy: 1 }, // identity — SVG and art share the frame
    lockerGroupId: 'Upper Lockers',
    gpsCalibrated: false, // redrawn art invalidated the old georef — see gps/georef.ts
  },
  lower: {
    label: 'Lower',
    svgUrl: `${import.meta.env.BASE_URL}campus-lower.svg`,
    imageUrl: `${import.meta.env.BASE_URL}campus-map-lower-v2.webp`,
    imageSize: { w: 1500, h: 910 },
    svgToImage: { ax: -9, sx: 0.8111, ay: 15, sy: 0.7822 },
    lockerSvgUrl: `${import.meta.env.BASE_URL}lockers-lower.svg`,
    lockerSvgToImage: { ax: -245.13, sx: 1.1171, ay: -358.73, sy: 1.1716 },
    gpsCalibrated: true,
  },
};

export const LEVEL_ORDER: CampusLevel[] = ['upper', 'lower'];

/**
 * Per-building alignment nudges (SVG units), applied as a translate on each building group at
 * load. Empty — both levels fit sub-pixel with the global transform alone; kept as the seam for
 * calibrating a future re-export.
 */
export const GROUP_ADJUST: Record<string, { dx: number; dy: number }> = {};

/** Frame/wrapper group ids that are NOT buildings (rooms inside them are standalone). */
const WRAPPER_IDS = new Set(['Upper', 'Upper (1) 1', 'Frame 1']);

export function isWrapperGroupId(id: string | null | undefined): boolean {
  return !id || WRAPPER_IDS.has(id);
}

/** True when an element is the locker group or lives inside it (combined-mode levels). */
export function isInLockerGroup(el: Element, lockerGroupId: string | undefined): boolean {
  return !!lockerGroupId && !!el.closest(`g[id="${lockerGroupId}"]`);
}

export interface CampusRoom {
  /** Shape id — a room number ("461") or a place name ("Aquatics center", "RR_2"). */
  id: string;
  /** Owning building group id, or the shape's own id for standalone places. */
  buildingId: string;
  level: CampusLevel;
  /** True for whole-building group entries (e.g. "bldg400-upper") — kept out of the room search. */
  isBuilding?: boolean;
}

const roomsCache = new Map<CampusLevel, Promise<CampusRoom[]>>();

/** Parse one level's campus SVG and list every named room shape. */
export function loadCampusRooms(level: CampusLevel): Promise<CampusRoom[]> {
  let cached = roomsCache.get(level);
  if (!cached) {
    const lockerGroupId = CAMPUS_LEVELS[level].lockerGroupId;
    cached = fetch(CAMPUS_LEVELS[level].svgUrl)
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error('campus svg missing'))))
      .then((text) => {
        const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
        const rooms: CampusRoom[] = [];
        doc.querySelectorAll('rect[id], path[id]').forEach((el) => {
          const id = el.getAttribute('id');
          // Lockers live in the same combined SVG but aren't rooms — keep them out of the index.
          if (!id || isInLockerGroup(el, lockerGroupId)) return;
          const gid = el.closest('g[id]')?.getAttribute('id');
          rooms.push({ id, buildingId: isWrapperGroupId(gid) ? id : (gid as string), level });
        });
        // Also index the building groups themselves so a deep link (e.g. the locker "Show on map",
        // /map?room=bldg400-upper) can highlight a whole building. Flagged so the room search skips them.
        doc.querySelectorAll('g[id]').forEach((el) => {
          const id = el.getAttribute('id');
          if (!id || isWrapperGroupId(id) || isInLockerGroup(el, lockerGroupId)) return;
          rooms.push({ id, buildingId: id, level, isBuilding: true });
        });
        return rooms;
      });
    roomsCache.set(level, cached);
  }
  return cached;
}

/** Every room on every level (the map search index). */
export function loadAllCampusRooms(): Promise<CampusRoom[]> {
  return Promise.all(LEVEL_ORDER.map(loadCampusRooms)).then((lists) => lists.flat());
}
