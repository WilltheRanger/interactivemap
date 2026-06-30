import type { Georef } from './georef';

/**
 * Least-squares fit of a level's GPS georeference from hand-picked control points. Each point pairs an
 * image pixel (px, py) with the real-world (lat, lng) at that spot. We solve the two independent affine
 * maps the viewer uses — px = a·lng + b·lat + c and py = d·lng + e·lat + f — via the 3×3 normal
 * equations, and report the mean pixel residual so a bad point is obvious. Needs ≥3 points (4–5 spread
 * across the map gives a solid fit). Pure + unit-tested.
 */
export interface ControlPoint {
  px: number;
  py: number;
  lat: number;
  lng: number;
}

export interface GeorefFit {
  georef: Georef;
  /** Mean distance (image px) between each control point and where the fit places it. */
  meanErrorPx: number;
}

/** Solve a 3×3 system A·x = b with partial pivoting; null if singular. */
function solve3(A: number[][], b: number[]): [number, number, number] | null {
  // Work on a copy of the augmented matrix.
  const m = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < 3; col += 1) {
    let pivot = col;
    for (let r = col + 1; r < 3; r += 1) if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r;
    if (Math.abs(m[pivot][col]) < 1e-12) return null;
    [m[col], m[pivot]] = [m[pivot], m[col]];
    for (let r = 0; r < 3; r += 1) {
      if (r === col) continue;
      const factor = m[r][col] / m[col][col];
      for (let c = col; c < 4; c += 1) m[r][c] -= factor * m[col][c];
    }
  }
  return [m[0][3] / m[0][0], m[1][3] / m[1][1], m[2][3] / m[2][2]];
}

export function fitGeoref(points: ControlPoint[]): GeorefFit | null {
  if (points.length < 3) return null;

  // Normal-equation accumulators. MᵀM is shared by both axes (rows of M are [lng, lat, 1]).
  let sLL = 0;
  let sLA = 0;
  let sL = 0;
  let sAA = 0;
  let sA = 0;
  let n = 0;
  let xL = 0;
  let xA = 0;
  let x1 = 0;
  let yL = 0;
  let yA = 0;
  let y1 = 0;
  for (const p of points) {
    const L = p.lng;
    const A = p.lat;
    sLL += L * L;
    sLA += L * A;
    sL += L;
    sAA += A * A;
    sA += A;
    n += 1;
    xL += L * p.px;
    xA += A * p.px;
    x1 += p.px;
    yL += L * p.py;
    yA += A * p.py;
    y1 += p.py;
  }
  const MtM = [
    [sLL, sLA, sL],
    [sLA, sAA, sA],
    [sL, sA, n],
  ];
  const xs = solve3(MtM, [xL, xA, x1]);
  const ys = solve3(MtM, [yL, yA, y1]);
  if (!xs || !ys) return null;
  const [a, b, c] = xs;
  const [d, e, f] = ys;

  let errSum = 0;
  for (const p of points) {
    errSum += Math.hypot(a * p.lng + b * p.lat + c - p.px, d * p.lng + e * p.lat + f - p.py);
  }
  return { georef: { a, b, c, d, e, f }, meanErrorPx: errSum / points.length };
}
