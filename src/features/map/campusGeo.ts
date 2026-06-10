/**
 * Campus map geometry + room index.
 *
 * The illustration (campus-map.webp, a 2x/retina render at 3220×1954, displayed in a 1610×977
 * coordinate space) has the traced room lines BAKED IN — it was rendered from the same plan as
 * campus-upper.svg (viewBox 1382×863), so the invisible SVG tap targets sit exactly on the drawn
 * walls. SVG_TO_IMAGE maps SVG coords → coordinate-space pixels (image = a + s·svg); fitted by
 * chamfer-matching every building trace against the image's edges (`scripts/fit-map.mjs`, mean
 * boundary error ≈0.3px; verified per building with `scripts/calibrate-map.mjs`). Re-run those
 * scripts if either asset is re-exported.
 */
export const IMAGE_SIZE = { w: 1610, h: 977 }; // coordinate space; the asset itself is 2x
export const SVG_TO_IMAGE = { ax: 5.6, sx: 1.01, ay: 45.8, sy: 1.0225 };

/**
 * Per-building alignment nudges (SVG units), applied as a translate on each building group at
 * load. Empty since the room lines were baked into the illustration (every building fits the art
 * sub-pixel with the global transform alone); kept as the seam for calibrating a future re-export.
 */
export const GROUP_ADJUST: Record<string, { dx: number; dy: number }> = {};

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
