/**
 * Campus map geometry + room index. Each level pairs a campus illustration (raster underlay) with a
 * traced-plan SVG aligned on top, so the invisible SVG tap targets sit on the drawn walls.
 *
 * Both levels are "combined" SVGs — one file carries the rooms and the lockers (the `lockerGroupId`
 * group), so the lockers inherit the rooms' placement for free (no separate locker overlay). Each SVG's
 * illustration is rendered from the *same* Figma frame, so svgToImage is just the affine that maps SVG
 * coords → image pixels:
 *  - Upper: the illustration is the frame at 1:1 — svgToImage is the identity.
 *  - Lower: the illustration is a cropped/scaled render of the frame, so svgToImage carries that small
 *    offset+scale, found by chamfer-matching the traced boundaries against the image edges
 *    (`scripts/fit-level.mjs`, mean ≈0.1px). Re-run the fit script if either asset is re-exported.
 * (The standalone fitted-overlay fields — lockerSvgUrl/lockerSvgToImage — are retained on LevelConfig
 *  for the calibration seam but are currently unused.)
 */
import type { Georef } from './gps/georef';

export type CampusLevel = 'upper' | 'lower';

export interface LevelConfig {
  label: string;
  svgUrl: string;
  imageUrl: string;
  imageSize: { w: number; h: number };
  svgToImage: { ax: number; sx: number; ay: number; sy: number };
  /** Combined mode: id of the locker group *inside* `svgUrl`. When set, its shapes are tappable locker
   *  banks (invisible at rest, gold highlight on select) and left out of the room search index; no
   *  separate locker overlay. */
  lockerGroupId?: string;
  /** Fitted mode: a separate visible locker overlay SVG + its own placement transform. Tune live via
   *  /map?lax=&lsx=&lay=&lsy= (see MapScreen). Unused when `lockerGroupId` is set. */
  lockerSvgUrl?: string;
  lockerSvgToImage?: { ax: number; sx: number; ay: number; sy: number };
  /** GPS georeference for this level (gps/georef.ts) — fitted from /geocal control points. When
   *  present, the "Find Me" layer shows and uses it; absent → the layer is hidden for this level. */
  georef?: Georef;
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
    // Fitted (least-squares) from 5 /geocal control points on the v3 map — mean ~16 px (~4 m) error.
    georef: {
      a: -378354.36080380145,
      b: -86550.72825823678,
      c: -41642912.292653,
      d: -98717.19614963865,
      e: 507230.21229327813,
      f: -28869273.55171639,
    },
  },
  lower: {
    label: 'Lower',
    // Combined export (rooms + the "Lower Lockers" group in one SVG). The v3 illustration is rendered
    // from the *same* Figma frame as this SVG, so svgToImage is a near-exact fit (the offset/scale just
    // accounts for the image being a cropped render of the frame). Re-run `node scripts/fit-level.mjs
    // lower` and paste the new SVG_TO_IMAGE if either asset is re-exported.
    svgUrl: `${import.meta.env.BASE_URL}lower-combined.svg`,
    imageUrl: `${import.meta.env.BASE_URL}campus-map-lower-v4.webp`,
    imageSize: { w: 3472, h: 2064 },
    svgToImage: { ax: 16, sx: 2, ay: 40, sy: 2.0002 }, // fitted, mean ~0.02px (fit-level.mjs)
    lockerGroupId: 'Lower Lockers',
    // Georef recomposed for the v4 art (the v3 georef pushed through the v3→v4 pixel transform).
    // Approximate (~5–10 m); recapture /geocal control points on the v4 art for a precise refit if needed.
    georef: {
      a: -793645.9055944692,
      b: -132227.32601498556,
      c: -89027306.2330776,
      d: -277170.8558696537,
      e: 1071857.7125925056,
      f: -69084971.99161986,
    },
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
const WRAPPER_IDS = new Set([
  'Upper',
  'Upper (1) 1',
  'Frame 1',
  // lower-combined.svg wrappers: rooms sit flat in "Lower"; the locker banks are nested under
  // "Lower Lockers" (the lockerGroupId) inside "Lower Lockers (1) 1".
  'Lower 1',
  'Lower',
  'Lower Lockers (1) 1',
]);

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
