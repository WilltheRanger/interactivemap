import L from 'leaflet';

/**
 * GPS ↔ campus-image georeference. Affine: image-pixel = M · (lng, lat), near-isotropic (~4 px/m),
 * so the stylized illustration is close enough to scale for building-level placement.
 *
 * The constants are **per level** (each level's art is a different drawing/scale) and live in
 * campusGeo.CAMPUS_LEVELS[level].georef — fitted by least-squares from pixel↔lat/lng control points
 * captured with the /geocal helper. A level with no `georef` hides its "Find Me" layer. GPS is
 * approximate (~5–10 m). Self-contained: the whole gps/ folder is a clean deletion if dropped.
 */
export interface Georef {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

export interface ImageSize {
  w: number;
  h: number;
}

/** Real GPS (lat, lng) → image pixel (px, py) on a level's campus illustration. */
export function latLngToImagePoint(lat: number, lng: number, g: Georef): { px: number; py: number } {
  return {
    px: g.a * lng + g.b * lat + g.c,
    py: g.d * lng + g.e * lat + g.f,
  };
}

export interface GpsMapPoint {
  /** Leaflet CRS.Simple coordinate for the displayed level. */
  latlng: L.LatLngTuple;
  /** False when the fix falls outside the map image (≈ off campus). */
  onMap: boolean;
}

/** Project a GPS fix onto the displayed level's Leaflet coordinate space. */
export function gpsToMapPoint(lat: number, lng: number, size: ImageSize, g: Georef): GpsMapPoint {
  const { px, py } = latLngToImagePoint(lat, lng, g);
  // The image overlay is placed at [[0,0],[H,W]] in CRS.Simple, so lat = H − py, lng = px.
  return {
    latlng: [size.h - py, px],
    onMap: px >= 0 && px <= size.w && py >= 0 && py <= size.h,
  };
}

/** A GPS accuracy radius (meters) → Leaflet CRS.Simple units (pixels) at this location. */
export function accuracyToMapRadius(
  lat: number,
  lng: number,
  accuracyMeters: number,
  g: Georef,
): number {
  const here = latLngToImagePoint(lat, lng, g);
  const north = latLngToImagePoint(lat + accuracyMeters / 111_000, lng, g);
  return Math.hypot(north.px - here.px, north.py - here.py);
}

const DEG = Math.PI / 180;

/**
 * A compass heading (degrees clockwise from true north) → the CSS rotation (clockwise from screen-up)
 * that points a marker the right way *on this map* (the art is rotated relative to north). Pushes the
 * facing direction through the georeference's linear part.
 */
export function headingToMapRotation(lat: number, headingDeg: number, g: Georef): number {
  const east = Math.sin(headingDeg * DEG);
  const north = Math.cos(headingDeg * DEG);
  const cosLat = Math.cos(lat * DEG) || 1;
  // Jacobian of (px, py) w.r.t. meters east/north.
  const sx = (g.a / (111_000 * cosLat)) * east + (g.b / 111_000) * north;
  const sy = (g.d / (111_000 * cosLat)) * east + (g.e / 111_000) * north;
  // Screen vector (sx right, sy down) → clockwise angle from up.
  return Math.atan2(sx, -sy) / DEG;
}
