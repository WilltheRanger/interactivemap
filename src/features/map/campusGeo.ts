/**
 * Campus map geometry + room index.
 *
 * The owner's Figma frame (campus-upper.svg, viewBox 1382×863) is a CROP of the campus
 * illustration (campus-map.webp, 1627×967) — the untraced fringes (tennis courts, parking) lie
 * outside the frame. SVG_TO_IMAGE maps SVG coords → image pixels (image = a + s·svg); the values
 * were derived empirically by compositing the rooms over the illustration and iterating visually
 * (within a few px). A future Figma re-export with the illustration embedded in the frame would
 * supersede this transform.
 */
export const IMAGE_SIZE = { w: 1627, h: 967 };
export const SVG_TO_IMAGE = { ax: 48, sx: 0.95, ay: 65, sy: 0.945 };

/**
 * Per-building alignment nudges (SVG units), applied as a translate on each building group at load.
 * Calibrated one building at a time by compositing the rooms over the illustration and iterating
 * visually (3 rounds, 2026-06-10). Residual quirks that a translate can't fix: the 100s/900s traces
 * are slightly larger than their illustrated footprints (centered), and the 300s rotated wing's
 * angle differs ~2° from the art (centered).
 */
export const GROUP_ADJUST: Record<string, { dx: number; dy: number }> = {
  'bldg400-upper': { dx: -8, dy: -5 },
  'bldg500-upper': { dx: -1, dy: -7 },
  'bldg600-upper': { dx: 10, dy: -13 },
  'aquatics-center': { dx: 29, dy: -13 },
  bldg800: { dx: 15, dy: -3 },
  bldg900: { dx: 14, dy: 8 },
  bldg100: { dx: 19, dy: 14 },
  'bldg200-upper': { dx: -4, dy: 0 },
  'bldg300-upper': { dx: -17, dy: -11 },
  '1031': { dx: 26, dy: 11 },
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
