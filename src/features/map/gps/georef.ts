import L from 'leaflet';

/**
 * GPS ↔ campus-image georeference (Chunk-1 foundation). Fitted from 3 control points the owner read
 * off real-world coordinates and the map image — corners of the pool, the front-by-parking building,
 * and a side building. Affine: image-pixel = M · (lng, lat); near-isotropic (~4.1 px/m), so the
 * stylized illustration is close enough to scale for building-level placement.
 *
 * Calibrated on the ORIGINAL upper illustration (1500×905). The upper map was since redrawn on a new
 * frame whose layout this affine no longer fits (would need fresh control points), so upper now sets
 * `gpsCalibrated: false` and hides its "Find Me" layer; this georef currently serves the lower level
 * only (near-identical framing) — GPS is approximate (~5–10 m) anyway. Self-contained: the whole gps/
 * folder is a clean deletion if the feature is dropped.
 */
const GEOREF = {
  a: -361902.53295107797,
  b: -60295.66066283343,
  c: -40596503.938283384,
  d: -119032.97929808646,
  e: 460316.8558728938,
  f: -29669027.745826144,
};

export interface ImageSize {
  w: number;
  h: number;
}

/** Real GPS (lat, lng) → image pixel (px, py) on the campus illustration. */
export function latLngToImagePoint(lat: number, lng: number): { px: number; py: number } {
  return {
    px: GEOREF.a * lng + GEOREF.b * lat + GEOREF.c,
    py: GEOREF.d * lng + GEOREF.e * lat + GEOREF.f,
  };
}

export interface GpsMapPoint {
  /** Leaflet CRS.Simple coordinate for the displayed level. */
  latlng: L.LatLngTuple;
  /** False when the fix falls outside the map image (≈ off campus). */
  onMap: boolean;
}

/** Project a GPS fix onto the displayed level's Leaflet coordinate space. */
export function gpsToMapPoint(lat: number, lng: number, size: ImageSize): GpsMapPoint {
  const { px, py } = latLngToImagePoint(lat, lng);
  // The image overlay is placed at [[0,0],[H,W]] in CRS.Simple, so lat = H − py, lng = px.
  return {
    latlng: [size.h - py, px],
    onMap: px >= 0 && px <= size.w && py >= 0 && py <= size.h,
  };
}

/** A GPS accuracy radius (meters) → Leaflet CRS.Simple units (pixels) at this location. */
export function accuracyToMapRadius(lat: number, lng: number, accuracyMeters: number): number {
  const here = latLngToImagePoint(lat, lng);
  const north = latLngToImagePoint(lat + accuracyMeters / 111_000, lng);
  return Math.hypot(north.px - here.px, north.py - here.py);
}

const DEG = Math.PI / 180;

/**
 * A compass heading (degrees clockwise from true north) → the CSS rotation (clockwise from screen-up)
 * that points a marker the right way *on this map* — which is rotated ~180° from north, so "north"
 * faces roughly downward. Pushes the facing direction through the georeference's linear part.
 */
export function headingToMapRotation(lat: number, headingDeg: number): number {
  const east = Math.sin(headingDeg * DEG);
  const north = Math.cos(headingDeg * DEG);
  const cosLat = Math.cos(lat * DEG) || 1;
  // Jacobian of (px, py) w.r.t. meters east/north.
  const sx = (GEOREF.a / (111_000 * cosLat)) * east + (GEOREF.b / 111_000) * north;
  const sy = (GEOREF.d / (111_000 * cosLat)) * east + (GEOREF.e / 111_000) * north;
  // Screen vector (sx right, sy down) → clockwise angle from up.
  return Math.atan2(sx, -sy) / DEG;
}
