/**
 * Campus map geometry + room index — two campus levels, each an illustration + traced-plan SVG
 * pair rendered from the same plan (so the invisible SVG tap targets sit exactly on the drawn
 * walls). svgToImage maps SVG coords → image pixels (image = a + s·svg); fitted per level by
 * chamfer-matching every traced shape boundary against the illustration's edges
 * (`scripts/fit-level.mjs`). Fitted to the high-res 1500px art (mean boundary error upper ≈1.8px,
 * lower ≈2.0px — within the highlight's blur tolerance). Re-run that script if any asset is
 * re-exported.
 */
export type CampusLevel = 'upper' | 'lower';

export interface LevelConfig {
  label: string;
  svgUrl: string;
  imageUrl: string;
  imageSize: { w: number; h: number };
  svgToImage: { ax: number; sx: number; ay: number; sy: number };
  /** Visible locker overlay. Traced on a separate artboard, so it gets its own placement transform.
   *  These values are a rough seed — tune live via /map?lax=&lsx=&lay=&lsy= (see MapScreen), or, if
   *  the lockers are re-exported inside the campus frame, set this equal to svgToImage for an exact fit. */
  lockerSvgUrl: string;
  lockerSvgToImage: { ax: number; sx: number; ay: number; sy: number };
}

export const CAMPUS_LEVELS: Record<CampusLevel, LevelConfig> = {
  upper: {
    label: 'Upper',
    svgUrl: `${import.meta.env.BASE_URL}campus-upper.svg`,
    // "-v2" = the high-res re-export. public/ assets keep stable URLs, so a rename is the manual
    // cache-bust — bump it again if the art is ever replaced.
    imageUrl: `${import.meta.env.BASE_URL}campus-map-upper-v2.webp`,
    imageSize: { w: 1500, h: 905 },
    svgToImage: { ax: 20, sx: 0.8004, ay: 57, sy: 0.7822 },
    lockerSvgUrl: `${import.meta.env.BASE_URL}lockers-upper.svg`,
    // Seed from matching locker colours to campus building colours (scripts removed; re-derive if the
    // art changes). Approximate — banks land near their buildings but not exactly on the walls.
    lockerSvgToImage: { ax: -362.52, sx: 1.0539, ay: -36.71, sy: 0.7093 },
  },
  lower: {
    label: 'Lower',
    svgUrl: `${import.meta.env.BASE_URL}campus-lower.svg`,
    imageUrl: `${import.meta.env.BASE_URL}campus-map-lower-v2.webp`,
    imageSize: { w: 1500, h: 910 },
    svgToImage: { ax: -9, sx: 0.8111, ay: 15, sy: 0.7822 },
    lockerSvgUrl: `${import.meta.env.BASE_URL}lockers-lower.svg`,
    lockerSvgToImage: { ax: -245.13, sx: 1.1171, ay: -358.73, sy: 1.1716 },
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
    cached = fetch(CAMPUS_LEVELS[level].svgUrl)
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error('campus svg missing'))))
      .then((text) => {
        const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
        const rooms: CampusRoom[] = [];
        doc.querySelectorAll('rect[id], path[id]').forEach((el) => {
          const id = el.getAttribute('id');
          if (!id) return;
          const gid = el.closest('g[id]')?.getAttribute('id');
          rooms.push({ id, buildingId: isWrapperGroupId(gid) ? id : (gid as string), level });
        });
        // Also index the building groups themselves so a deep link (e.g. the locker "Show on map",
        // /map?room=bldg400-upper) can highlight a whole building. Flagged so the room search skips them.
        doc.querySelectorAll('g[id]').forEach((el) => {
          const id = el.getAttribute('id');
          if (!id || isWrapperGroupId(id)) return;
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
