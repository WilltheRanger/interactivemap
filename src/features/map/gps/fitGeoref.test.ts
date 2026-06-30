import { describe, expect, it } from 'vitest';
import { fitGeoref, type ControlPoint } from './fitGeoref';
import type { Georef } from './georef';

// A known georef; project a handful of lat/lng spots through it to make exact control points, then
// check the fit recovers it.
const TRUTH: Georef = {
  a: -360000,
  b: -60000,
  c: -40000000,
  d: -119000,
  e: 460000,
  f: -29000000,
};
const project = (lat: number, lng: number) => ({
  px: TRUTH.a * lng + TRUTH.b * lat + TRUTH.c,
  py: TRUTH.d * lng + TRUTH.e * lat + TRUTH.f,
});
const cp = (lat: number, lng: number): ControlPoint => ({ lat, lng, ...project(lat, lng) });

describe('fitGeoref', () => {
  it('needs at least 3 points', () => {
    expect(fitGeoref([cp(33.98, -117.81), cp(33.99, -117.82)])).toBeNull();
  });

  it('recovers the georef from exact control points', () => {
    const pts = [
      cp(33.9805, -117.8205),
      cp(33.9825, -117.8185),
      cp(33.9815, -117.8225),
      cp(33.9835, -117.8175),
      cp(33.982, -117.821),
    ];
    const fit = fitGeoref(pts)!;
    expect(fit).not.toBeNull();
    expect(fit.meanErrorPx).toBeLessThan(0.01);
    for (const key of ['a', 'b', 'c', 'd', 'e', 'f'] as const) {
      // Relative recovery within 0.1%.
      expect(Math.abs(fit.georef[key] - TRUTH[key]) / Math.abs(TRUTH[key])).toBeLessThan(1e-3);
    }
  });

  it('reports a non-zero residual when a point is off', () => {
    const pts = [
      cp(33.9805, -117.8205),
      cp(33.9825, -117.8185),
      cp(33.9815, -117.8225),
      { ...cp(33.9835, -117.8175), px: project(33.9835, -117.8175).px + 500 }, // nudged 500 px
    ];
    const fit = fitGeoref(pts)!;
    expect(fit.meanErrorPx).toBeGreaterThan(50);
  });
});
