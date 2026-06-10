/**
 * Campus map geometry + room index.
 *
 * The owner's Figma frame (campus-upper.svg, viewBox 1382×863) is a 1:1 CROP of the campus
 * illustration (campus-map.webp, 1627×967) — the untraced fringes (tennis courts, parking) lie
 * outside the frame. SVG_TO_IMAGE maps SVG coords → image pixels (image = a + s·svg); the offset
 * was fitted by chamfer-matching every building trace against the illustration's edges
 * (`scripts/fit-map.mjs`, mean boundary error ≈3px; verified per building with
 * `scripts/calibrate-map.mjs`). Re-run those scripts if either asset is re-exported.
 */
export const IMAGE_SIZE = { w: 1627, h: 967 };
export const SVG_TO_IMAGE = { ax: 11.5, sx: 1, ay: 44.8, sy: 1 };

/**
 * Per-building alignment nudges (SVG units), applied as a translate on each building group at load.
 * With the fitted 1:1 transform above, every building lands on its illustrated footprint without a
 * nudge except the 600s (its trace sits ~3px right of the art). Known residual a translate can't
 * fix: the 300s rotated wing's angle differs ~2° from the art (centered).
 */
export const GROUP_ADJUST: Record<string, { dx: number; dy: number }> = {
  'bldg600-upper': { dx: -3, dy: 0 },
};

export const MAP_SVG_URL = `${import.meta.env.BASE_URL}campus-upper.svg`;
export const MAP_IMAGE_URL = `${import.meta.env.BASE_URL}campus-map.webp`;

export interface CampusRoom {
  /** Shape id — a room number ("461") or a place name ("aquatics-center"). */
  id: string;
  /** Owning building group id, or the shape's own id for standalone places. */
  buildingId: string;
}

let roomsCache: Promise<CampusRoom[]> | null = null;

/** Parse the campus SVG once and list every named room shape (shared by Map and Find). */
export function loadCampusRooms(): Promise<CampusRoom[]> {
  roomsCache ??= fetch(MAP_SVG_URL)
    .then((res) => (res.ok ? res.text() : Promise.reject(new Error('campus svg missing'))))
    .then((text) => {
      const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
      const rooms: CampusRoom[] = [];
      doc.querySelectorAll('rect[id], path[id]').forEach((el) => {
        const id = el.getAttribute('id');
        if (!id) return;
        const gid = el.closest('g[id]')?.getAttribute('id');
        rooms.push({ id, buildingId: gid && gid !== 'Upper' ? gid : id });
      });
      return rooms;
    });
  return roomsCache;
}
