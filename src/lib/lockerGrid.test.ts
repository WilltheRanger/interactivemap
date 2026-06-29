import { describe, expect, it } from 'vitest';
import { interpolateGrid, yawPitchFromRay, type GridCorner } from './lockerGrid';

type Vec3 = [number, number, number];
const norm = (v: Vec3): Vec3 => {
  const n = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / n, v[1] / n, v[2] / n];
};

/**
 * Ground truth: a *tilted* planar wall (so it's a real perspective quad, not a trivial fronto-parallel
 * one) viewed from the camera at the origin. P(i,j) is the 3D centre of locker (row i, col j); its true
 * (yaw, pitch) is the direction to it. We hand interpolateGrid only the 4 corners and check every
 * interior pin matches the true direction — i.e. the gnomonic+homography model is exact for a plane.
 */
function wallPoint(i: number, j: number): Vec3 {
  const origin: Vec3 = [-1.2, 0.9, 4]; // top-left locker centre
  const colVec: Vec3 = [0.8, 0, 0.5]; // one column to the right (and receding → perspective)
  const rowVec: Vec3 = [0, -0.6, 0]; // one row down
  return [
    origin[0] + j * colVec[0] + i * rowVec[0],
    origin[1] + j * colVec[1] + i * rowVec[1],
    origin[2] + j * colVec[2] + i * rowVec[2],
  ];
}
const trueDir = (i: number, j: number): GridCorner => yawPitchFromRay(norm(wallPoint(i, j)));

describe('interpolateGrid', () => {
  const rows = 4;
  const cols = 5;

  it('reconstructs every locker on a tilted planar wall from its 4 corners', () => {
    const corners: [GridCorner, GridCorner, GridCorner, GridCorner] = [
      trueDir(0, 0), // top-left
      trueDir(0, cols - 1), // top-right
      trueDir(rows - 1, cols - 1), // bottom-right
      trueDir(rows - 1, 0), // bottom-left
    ];
    const pins = interpolateGrid(corners, rows, cols, 1, 'row');
    expect(pins).toHaveLength(rows * cols);

    let maxErr = 0;
    for (let i = 0; i < rows; i += 1) {
      for (let j = 0; j < cols; j += 1) {
        const expected = trueDir(i, j);
        const pin = pins.find((p) => p.number === 1 + i * cols + j)!;
        maxErr = Math.max(maxErr, Math.abs(pin.yaw - expected.yaw), Math.abs(pin.pitch - expected.pitch));
      }
    }
    // Exact model — the only error is the 0.1° output rounding.
    expect(maxErr).toBeLessThan(0.2);
  });

  it('numbers column-major vs row-major correctly', () => {
    const corners: [GridCorner, GridCorner, GridCorner, GridCorner] = [
      trueDir(0, 0),
      trueDir(0, cols - 1),
      trueDir(rows - 1, cols - 1),
      trueDir(rows - 1, 0),
    ];
    const byCol = interpolateGrid(corners, rows, cols, 100, 'col');
    // 'col': down the first column first → #100 top-left, #101 the locker below it.
    expect(byCol.find((p) => p.number === 100)).toMatchObject(trueDirRounded(0, 0));
    expect(byCol.find((p) => p.number === 101)).toMatchObject(trueDirRounded(1, 0));

    const byRow = interpolateGrid(corners, rows, cols, 100, 'row');
    // 'row': across the first row first → #100 top-left, #101 to its right.
    expect(byRow.find((p) => p.number === 100)).toMatchObject(trueDirRounded(0, 0));
    expect(byRow.find((p) => p.number === 101)).toMatchObject(trueDirRounded(0, 1));
  });

  function trueDirRounded(i: number, j: number) {
    const d = trueDir(i, j);
    return { yaw: Math.round(d.yaw * 10) / 10, pitch: Math.round(d.pitch * 10) / 10 };
  }
});
