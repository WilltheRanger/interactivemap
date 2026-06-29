/**
 * Grid interpolation for the locker tagger: from the 4 tapped corner lockers of a regular bank, place
 * a pin on every locker in between — "tuned to the 360° photo".
 *
 * Why not just lerp yaw/pitch? A flat wall of lockers, seen in an equirectangular panorama, is NOT a
 * linear grid in (yaw, pitch) — equal physical spacing bows outward (the arctan of perspective +
 * spherical curvature). The exact model: a planar wall under a pinhole (gnomonic) projection is a
 * perspective quadrilateral, and a planar quad maps from grid coordinates by a HOMOGRAPHY. So we
 *   1. turn each corner's (yaw, pitch) into a 3D ray,
 *   2. project the rays into a gnomonic plane centred on the wall (great circles → straight lines),
 *   3. fit the unit-square → quad homography (Heckbert) to the 4 corners,
 *   4. sample each grid cell through it, and
 *   5. convert the gnomonic point back to a ray → (yaw, pitch).
 * Conventions only need to be self-consistent: the corner inputs and pin outputs share one
 * (yaw, pitch) ⇄ ray mapping, so the output lands in the viewer's own frame.
 */

export interface GridCorner {
  yaw: number;
  pitch: number;
}
export interface GridPin {
  number: number;
  yaw: number;
  pitch: number;
}
/** 'col' = numbered down each column then right; 'row' = across each row then down. */
export type GridOrder = 'col' | 'row';

type Vec3 = [number, number, number];
const DEG = Math.PI / 180;

export function rayFromYawPitch(yawDeg: number, pitchDeg: number): Vec3 {
  const y = yawDeg * DEG;
  const p = pitchDeg * DEG;
  return [Math.sin(y) * Math.cos(p), Math.sin(p), Math.cos(y) * Math.cos(p)];
}

export function yawPitchFromRay([x, y, z]: Vec3): GridCorner {
  return {
    yaw: Math.atan2(x, z) / DEG,
    pitch: Math.asin(Math.max(-1, Math.min(1, y))) / DEG,
  };
}

const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
function normalize(v: Vec3): Vec3 {
  const n = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / n, v[1] / n, v[2] / n];
}

/** Projective map of the unit square → a quad [p0..p3] (Heckbert). Returns coefficients a..h. */
interface Homography {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
  g: number;
  h: number;
}
function squareToQuad(q: [number, number][]): Homography {
  const [x0, y0] = q[0];
  const [x1, y1] = q[1];
  const [x2, y2] = q[2];
  const [x3, y3] = q[3];
  const dx1 = x1 - x2;
  const dx2 = x3 - x2;
  const dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2;
  const dy2 = y3 - y2;
  const dy3 = y0 - y1 + y2 - y3;
  const den = dx1 * dy2 - dx2 * dy1 || 1e-12;
  const g = (dx3 * dy2 - dx2 * dy3) / den;
  const h = (dx1 * dy3 - dx3 * dy1) / den;
  return {
    a: x1 - x0 + g * x1,
    b: x3 - x0 + h * x3,
    c: x0,
    d: y1 - y0 + g * y1,
    e: y3 - y0 + h * y3,
    f: y0,
    g,
    h,
  };
}
function applyHomography(m: Homography, u: number, v: number): [number, number] {
  const w = m.g * u + m.h * v + 1 || 1e-12;
  return [(m.a * u + m.b * v + m.c) / w, (m.d * u + m.e * v + m.f) / w];
}

/**
 * Interpolate a `rows`×`cols` bank from its 4 corner-locker centres (tapped in order: top-left,
 * top-right, bottom-right, bottom-left). Numbers run from `start` in `order`. Needs rows≥2 and cols≥2;
 * works for a wall within roughly a forward hemisphere (a single bank, not one that wraps past ~150°).
 */
export function interpolateGrid(
  corners: [GridCorner, GridCorner, GridCorner, GridCorner],
  rows: number,
  cols: number,
  start: number,
  order: GridOrder,
): GridPin[] {
  const rays = corners.map((c) => normalize(rayFromYawPitch(c.yaw, c.pitch)));
  // Gnomonic centre: the mean corner direction (the wall is in front of it).
  const center = normalize(rays.reduce<Vec3>((a, r) => [a[0] + r[0], a[1] + r[1], a[2] + r[2]], [0, 0, 0]));
  // Orthonormal screen basis. Right ⟂ world-up & forward; up completes it. Fall back if the wall is
  // near-vertical (centre parallel to world up).
  let right = cross([0, 1, 0], center);
  if (dot(right, right) < 1e-6) right = cross([0, 0, 1], center);
  right = normalize(right);
  const up = normalize(cross(center, right));

  // Project a ray to the gnomonic plane (X right, Y up), dividing by the forward component.
  const project = (r: Vec3): [number, number] => {
    const fwd = dot(r, center);
    return [dot(r, right) / fwd, dot(r, up) / fwd];
  };
  const homography = squareToQuad(rays.map(project) as [number, number][]);

  const pins: GridPin[] = [];
  for (let i = 0; i < rows; i += 1) {
    for (let j = 0; j < cols; j += 1) {
      const u = cols > 1 ? j / (cols - 1) : 0;
      const v = rows > 1 ? i / (rows - 1) : 0;
      const [gx, gy] = applyHomography(homography, u, v);
      const ray = normalize([
        center[0] + gx * right[0] + gy * up[0],
        center[1] + gx * right[1] + gy * up[1],
        center[2] + gx * right[2] + gy * up[2],
      ]);
      const { yaw, pitch } = yawPitchFromRay(ray);
      const index = order === 'col' ? j * rows + i : i * cols + j;
      pins.push({
        number: start + index,
        yaw: Math.round(yaw * 10) / 10,
        pitch: Math.round(pitch * 10) / 10,
      });
    }
  }
  return pins;
}
