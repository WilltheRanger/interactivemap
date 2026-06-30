import { describe, expect, it } from 'vitest';
import { GpsKalman, type GpsSample } from './gpsKalman';

const M_PER_DEG = 111_320;
const metres = (lat: number, lng: number, lat0 = 33.98, lng0 = -117.81) =>
  Math.hypot((lat - lat0) * M_PER_DEG, (lng - lng0) * M_PER_DEG * Math.cos((lat0 * Math.PI) / 180));

// A true spot, sampled with a deterministic ±N-metre wobble in lat and lng.
function noisyFix(i: number, wobbleM: number, accuracy: number): GpsSample {
  const sign = i % 2 === 0 ? 1 : -1;
  const second = i % 3 === 0 ? 1 : -1;
  return {
    lat: 33.98 + (sign * wobbleM) / M_PER_DEG,
    lng: -117.81 + (second * wobbleM) / (M_PER_DEG * Math.cos((33.98 * Math.PI) / 180)),
    accuracy,
    timestamp: i * 1000,
  };
}

describe('GpsKalman', () => {
  it('converges near the true point and tightens the accuracy as noisy fixes accumulate', () => {
    const k = new GpsKalman();
    let est = k.update(noisyFix(0, 15, 15));
    for (let i = 1; i < 25; i += 1) est = k.update(noisyFix(i, 15, 15));
    // Settles within a few metres of the true spot despite ±15 m wobble…
    expect(metres(est.lat, est.lng)).toBeLessThan(6);
    // …and the reported uncertainty has dropped below a single raw fix's 15 m.
    expect(est.accuracy).toBeLessThan(15);
  });

  it('rejects a lone implausible jump (multipath teleport)', () => {
    const k = new GpsKalman();
    for (let i = 0; i < 10; i += 1) k.update(noisyFix(i, 5, 8)); // settle tightly
    const before = k.update(noisyFix(10, 5, 8));
    // A fix 500 m away, 1 s later (≈500 m/s) with coarse accuracy → outlier.
    const after = k.update({ lat: 33.985, lng: -117.81, accuracy: 40, timestamp: 11_000 });
    expect(metres(after.lat, after.lng)).toBeLessThan(10); // barely moved
    expect(after.lat).toBeCloseTo(before.lat, 4);
  });

  it('eventually accepts a sustained move so it cannot get stuck', () => {
    const k = new GpsKalman({ maxRejects: 3 });
    for (let i = 0; i < 8; i += 1) k.update(noisyFix(i, 5, 8));
    // Repeated tight fixes at a new spot 80 m away — first few gated, then trusted.
    let est = k.update(noisyFix(8, 5, 8));
    for (let i = 9; i < 16; i += 1) {
      est = k.update({
        lat: 33.98 + 80 / M_PER_DEG,
        lng: -117.81,
        accuracy: 8,
        timestamp: i * 1000,
      });
    }
    expect((est.lat - 33.98) * M_PER_DEG).toBeGreaterThan(60); // followed the real move
  });
});
