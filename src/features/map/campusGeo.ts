/**
 * Campus map geometry + room index — two campus levels, each an illustration + traced-plan SVG
 * pair rendered from the same plan (so the invisible SVG tap targets sit exactly on the drawn
 * walls). svgToImage maps SVG coords → image pixels (image = a + s·svg); fitted per level by
 * chamfer-matching every traced shape boundary against the illustration's edges
 * (`scripts/fit-level.mjs`; mean boundary error upper ≈0.9px, lower ≈0.1px). Re-run that script
 * if any asset is re-exported.
 */
export type CampusLevel = 'upper' | 'lower';

export interface LevelConfig {
  label: string;
  svgUrl: string;
  imageUrl: string;
  imageSize: { w: number; h: number };
  svgToImage: { ax: number; sx: number; ay: number; sy: number };
}

export const CAMPUS_LEVELS: Record<CampusLevel, LevelConfig> = {
  upper: {
    label: 'Upper',
    svgUrl: `${import.meta.env.BASE_URL}campus-upper.svg`,
    imageUrl: `${import.meta.env.BASE_URL}campus-map.webp`,
    imageSize: { w: 767, h: 463 },
    svgToImage: { ax: 7, sx: 0.4093, ay: 33, sy: 0.3955 },
  },
  lower: {
    label: 'Lower',
    svgUrl: `${import.meta.env.BASE_URL}campus-lower.svg`,
    imageUrl: `${import.meta.env.BASE_URL}campus-map-lower.webp`,
    imageSize: { w: 670, h: 408 },
    svgToImage: { ax: 4, sx: 0.3447, ay: 20, sy: 0.3422 },
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
