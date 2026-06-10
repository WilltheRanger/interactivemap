/**
 * Campus building shapes for the map overlay.
 *
 * Sources: shape positions are traced over the stylized flat-plan campus illustration
 * (public/campus-map.webp); names and room numbers come from the school's official
 * "Upper Level" campus map (owner-supplied, 2026-06-10). The official map is NOT to scale, so the
 * matching of each illustrated building to its real identity is the owner's to verify — see the
 * review list in the PR/chat. Positions are approximate (hand-traced) and refined over time.
 *
 * ⚠️ Hard rule (CLAUDE.md): when the real room→teacher directory lands in Supabase, these ids MUST
 * be reconciled with `buildings.id` so map↔DB joins work. Until then the tap card shows the label +
 * room info below (no DB join yet).
 */
export interface CampusShape {
  id: string;
  label: string;
  /** Human room summary from the official map (display-only). */
  rooms?: string;
  /** Polygon as fractions of the base image: x from left, y from top. */
  poly: [number, number][];
}

/** Axis-aligned rectangle helper (most campus buildings). */
function rect(x1: number, y1: number, x2: number, y2: number): [number, number][] {
  return [
    [x1, y1],
    [x2, y1],
    [x2, y2],
    [x1, y2],
  ];
}

export const CAMPUS_SHAPES: CampusShape[] = [
  {
    id: 'bldg-400s',
    label: 'Library & 400s',
    rooms: 'Library 461 · Rooms 451–468',
    poly: rect(0.21, 0.16, 0.39, 0.34),
  },
  {
    id: 'bldg-500s',
    label: '500s Building',
    rooms: 'Rooms 550–577 · Tech 568',
    poly: rect(0.405, 0.08, 0.545, 0.42),
  },
  {
    id: 'bldg-600s',
    label: '600s Building',
    rooms: 'Rooms 651–661',
    poly: rect(0.565, 0.03, 0.625, 0.235),
  },
  {
    id: 'aquatics',
    label: 'Aquatics Center',
    poly: rect(0.635, 0.06, 0.76, 0.235),
  },
  {
    id: 'tennis',
    label: 'Tennis Courts',
    poly: rect(0.815, 0.085, 0.975, 0.425),
  },
  {
    id: 'basketball',
    label: 'Basketball Courts',
    poly: rect(0.82, 0.44, 0.97, 0.625),
  },
  {
    id: 'lockers-800s',
    label: 'PE Locker Rooms',
    rooms: 'Rooms 804–813 · Boys & Girls Locker Rooms',
    poly: rect(0.61, 0.27, 0.73, 0.41),
  },
  {
    id: 'gym-800s',
    label: 'Gym',
    rooms: 'Gym 801 · Weight Room 803 · Aerobics 851',
    poly: rect(0.635, 0.43, 0.725, 0.655),
  },
  {
    id: 'field',
    label: 'Field',
    poly: rect(0.55, 0.435, 0.63, 0.6),
  },
  {
    id: 'bldg-200s',
    label: '200s Building',
    rooms: 'Rooms 251–278 · USB 275 · Student Store 274',
    poly: rect(0.215, 0.42, 0.32, 0.635),
  },
  {
    id: 'quad',
    label: 'Quad',
    poly: rect(0.325, 0.445, 0.405, 0.615),
  },
  {
    id: 'theater-900s',
    label: 'Theater & Arts (900s)',
    rooms: 'Theater 901 · Stage 906 · Drama 907 · Dance 903 · Choir 904 · Stagecraft 917',
    poly: [
      [0.425, 0.495],
      [0.505, 0.525],
      [0.485, 0.645],
      [0.41, 0.615],
    ],
  },
  {
    id: 'admin-100s',
    label: 'Admin (100s)',
    rooms: 'Front Desk 102 · Guidance 106 · Registrar 109 · Health 110 · Attendance 111',
    poly: rect(0.295, 0.645, 0.41, 0.78),
  },
  {
    id: 'rooms-908',
    label: '908–914 Building',
    rooms: 'Rooms 908–914',
    poly: rect(0.415, 0.625, 0.52, 0.785),
  },
  {
    id: 'bldg-300s',
    label: '300s Building',
    rooms: 'Rooms 351–362',
    poly: rect(0.065, 0.62, 0.18, 0.835),
  },
  {
    id: 'music-1000s',
    label: 'Instrumental Music',
    rooms: 'Band 1011 (bottom) · Orchestra 1031 (top)',
    poly: rect(0.735, 0.625, 0.84, 0.8),
  },
];
