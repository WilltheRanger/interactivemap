import L from 'leaflet';

/**
 * GPS ↔ campus-image georeference (Chunk-1 foundation). Fitted from 3 control points the owner read
 * off real-world coordinates and the map image — corners of the pool, the front-by-parking building,
 * and a side building. Affine: image-pixel = M · (lng, lat); near-isotropic (~4.1 px/m), so the
 * stylized illustration is close enough to scale for building-level placement.
 *
 * Calibrated on the UPPER illustration (1500×905) and reused for the lower level (near-identical
 * framing) — GPS is approximate (~5–10 m) anyway. Self-contained: the whole gps/ folder is a clean
 * deletion if the feature is dropped.
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
