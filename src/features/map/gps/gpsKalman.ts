/**
 * GPS smoothing for "Find Me" — a small constant-position Kalman filter with outlier gating, the
 * standard way to keep a location dot steady instead of letting it jump around.
 *
 * Each browser fix carries an `accuracy` (≈1σ radius in metres). The filter treats that as the
 * measurement noise, so a tight 5 m fix pulls the estimate most of the way while a coarse 50 m
 * wifi/cell fix barely nudges it — no more teleporting on a single bad reading. Between fixes the
 * estimate's uncertainty grows at `processNoise` m/s (how fast a person can walk), so the dot still
 * follows real movement. A fix that lands implausibly far from the estimate (beyond a few σ AND faster
 * than a person could move) is rejected as multipath; after several rejects in a row we trust the new
 * fix anyway, in case the estimate had genuinely drifted (e.g. the user moved while GPS was blocked).
 *
 * Pure + framework-free so it's unit-tested; the variance is kept in metres² and the lat/lng gain is
 * the dimensionless ratio variance/(variance+accuracy²) — the widely-used simplified GPS Kalman.
 */

export interface GpsSample {
  lat: number;
  lng: number;
  /** Reported accuracy in metres (≈1σ). */
  accuracy: number;
  /** Fix time in ms. */
  timestamp: number;
}

export interface GpsEstimate {
  lat: number;
  lng: number;
  /** Filtered uncertainty in metres (√variance) — drives the accuracy circle. */
  accuracy: number;
}

const M_PER_DEG = 111_320; // metres per degree of latitude (good enough for longitude × cos(lat) too)
const MIN_ACCURACY_M = 3; // never claim sub-GPS precision

function metresBetween(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const dLat = (bLat - aLat) * M_PER_DEG;
  const dLng = (bLng - aLng) * M_PER_DEG * Math.cos((aLat * Math.PI) / 180);
  return Math.hypot(dLat, dLng);
}

export interface GpsKalmanOptions {
  /** Expected movement speed (m/s) — higher = more responsive, lower = smoother. */
  processNoise?: number;
  /** Reject a fix beyond this many σ of the estimate (plus a movement allowance). */
  gateSigma?: number;
  /** Accept a far fix anyway after this many consecutive rejects (de-stuck). */
  maxRejects?: number;
}

export class GpsKalman {
  private lat = 0;
  private lng = 0;
  private variance = -1; // <0 → uninitialised
  private lastTs = 0;
  private rejects = 0;
  private readonly processNoise: number;
  private readonly gateSigma: number;
  private readonly maxRejects: number;

  constructor(opts: GpsKalmanOptions = {}) {
    this.processNoise = opts.processNoise ?? 2;
    this.gateSigma = opts.gateSigma ?? 3;
    this.maxRejects = opts.maxRejects ?? 4;
  }

  reset(): void {
    this.variance = -1;
    this.rejects = 0;
  }

  /** Feed a raw fix; returns the smoothed estimate (unchanged if the fix was rejected as an outlier). */
  update(sample: GpsSample): GpsEstimate {
    const accuracy = Math.max(sample.accuracy, 1);
    const r = accuracy * accuracy;

    if (this.variance < 0) {
      this.lat = sample.lat;
      this.lng = sample.lng;
      this.variance = r;
      this.lastTs = sample.timestamp;
      this.rejects = 0;
      return this.estimate();
    }

    const dt = Math.max((sample.timestamp - this.lastTs) / 1000, 0);
    const dist = metresBetween(this.lat, this.lng, sample.lat, sample.lng);
    // Gate: a few σ of combined uncertainty, plus how far a person could have walked since the last fix.
    const gate = this.gateSigma * Math.sqrt(this.variance + r) + this.processNoise * 3 * dt;
    if (dist > gate) {
      if (this.rejects < this.maxRejects) {
        this.rejects += 1;
        return this.estimate(); // hold steady through a likely-multipath outlier
      }
      // Several fixes in a row all land far away → the estimate was stale (GPS was blocked and the user
      // moved). Re-seed on the new fix instead of crawling toward it.
      this.lat = sample.lat;
      this.lng = sample.lng;
      this.variance = r;
      this.lastTs = sample.timestamp;
      this.rejects = 0;
      return this.estimate();
    }
    this.rejects = 0;

    // Predict: uncertainty grows with elapsed time, then update weighted by the fix's accuracy.
    this.variance += dt * this.processNoise * this.processNoise;
    const k = this.variance / (this.variance + r);
    this.lat += k * (sample.lat - this.lat);
    this.lng += k * (sample.lng - this.lng);
    this.variance *= 1 - k;
    this.lastTs = sample.timestamp;
    return this.estimate();
  }

  private estimate(): GpsEstimate {
    return { lat: this.lat, lng: this.lng, accuracy: Math.max(Math.sqrt(this.variance), MIN_ACCURACY_M) };
  }
}
