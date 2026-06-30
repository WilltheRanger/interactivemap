import { useRef, useState } from 'react';
import { CAMPUS_LEVELS, LEVEL_ORDER, type CampusLevel } from './campusGeo';
import { fitGeoref, type ControlPoint } from './gps/fitGeoref';

/**
 * Dev-only GPS calibration helper (route: /geocal, not linked). Pick a floor, click features on its
 * map, and type each one's real lat,lng (from Google Earth/Maps). With 3+ points it fits that floor's
 * GPS georeference right here and prints the constants to paste into CAMPUS_LEVELS[level].georef
 * (gps/georef.ts powers the "Find Me" dot). The mean error tells you if a point is off.
 */
interface Point {
  x: number;
  y: number;
  latlng: string;
}

/** "lat, lng" → numbers, or null if it isn't a clean pair. */
function parseLatLng(s: string): { lat: number; lng: number } | null {
  const parts = s.split(',').map((v) => Number(v.trim()));
  if (parts.length === 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
    return { lat: parts[0], lng: parts[1] };
  }
  return null;
}

export function GeoCalibrate() {
  const imgRef = useRef<HTMLImageElement>(null);
  const [level, setLevel] = useState<CampusLevel>('upper');
  const [points, setPoints] = useState<Point[]>([]);
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const [copied, setCopied] = useState(false);

  const config = CAMPUS_LEVELS[level];
  const IMG_W = config.imageSize.w;
  const IMG_H = config.imageSize.h;

  const toPixel = (clientX: number, clientY: number) => {
    const r = imgRef.current?.getBoundingClientRect();
    if (!r) return null;
    const x = Math.round(((clientX - r.left) / r.width) * IMG_W);
    const y = Math.round(((clientY - r.top) / r.height) * IMG_H);
    if (x < 0 || y < 0 || x > IMG_W || y > IMG_H) return null;
    return { x, y };
  };

  const addPoint = (e: React.MouseEvent) => {
    const p = toPixel(e.clientX, e.clientY);
    if (p) {
      setPoints((prev) => [...prev, { ...p, latlng: '' }]);
      setCopied(false);
    }
  };

  const setLatLng = (i: number, latlng: string) =>
    setPoints((prev) => prev.map((p, idx) => (idx === i ? { ...p, latlng } : p)));

  const switchLevel = (next: CampusLevel) => {
    if (next === level) return;
    setLevel(next);
    setPoints([]); // pixel coords are per-floor — start over
    setCopied(false);
  };

  // Live fit from every point that has a valid lat,lng (need ≥3).
  const controlPoints = points
    .map((p): ControlPoint | null => {
      const ll = parseLatLng(p.latlng);
      return ll ? { px: p.x, py: p.y, lat: ll.lat, lng: ll.lng } : null;
    })
    .filter((p): p is ControlPoint => p !== null);
  const fit = controlPoints.length >= 3 ? fitGeoref(controlPoints) : null;

  const georefText = fit
    ? `georef: {\n  a: ${fit.georef.a},\n  b: ${fit.georef.b},\n  c: ${fit.georef.c},\n  d: ${fit.georef.d},\n  e: ${fit.georef.e},\n  f: ${fit.georef.f},\n},`
    : '';
  const copy = () => {
    void navigator.clipboard?.writeText(georefText);
    setCopied(true);
  };

  return (
    <section className="screen" style={{ maxWidth: 'none' }}>
      <h1 className="screen__title">GPS calibration</h1>
      <p className="screen__sub">
        Pick a floor, click a feature on the map (pool, field, a building corner…), then type its real
        lat,lng in the matching row. Add 4–5 spread across campus — the georef fits live below.
      </p>

      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
        {LEVEL_ORDER.map((l) => (
          <button
            key={l}
            type="button"
            className="admin-input"
            onClick={() => switchLevel(l)}
            style={
              l === level
                ? { fontWeight: 700, background: 'var(--color-primary)', color: '#fff' }
                : undefined
            }
          >
            {CAMPUS_LEVELS[l].label}
          </button>
        ))}
      </div>

      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 2,
          padding: 'var(--space-2)',
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-md)',
          fontVariantNumeric: 'tabular-nums',
          marginBottom: 'var(--space-2)',
        }}
      >
        Cursor: {hover ? `x=${hover.x}, y=${hover.y}` : '—'} · {points.length} point
        {points.length === 1 ? '' : 's'} · {controlPoints.length} with lat/lng
      </div>

      <div style={{ position: 'relative', lineHeight: 0, border: '1px solid var(--color-border)' }}>
        <img
          ref={imgRef}
          src={config.imageUrl}
          alt={`${config.label} campus map`}
          draggable={false}
          onClick={addPoint}
          onMouseMove={(e) => setHover(toPixel(e.clientX, e.clientY))}
          onMouseLeave={() => setHover(null)}
          style={{ width: '100%', display: 'block', cursor: 'crosshair' }}
        />
        {points.map((p, i) => (
          <span
            key={i}
            style={{
              position: 'absolute',
              left: `${(p.x / IMG_W) * 100}%`,
              top: `${(p.y / IMG_H) * 100}%`,
              transform: 'translate(-50%, -50%)',
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: 'var(--color-accent)',
              color: '#000',
              border: '2px solid #fff',
              boxShadow: '0 1px 4px rgba(0,0,0,0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 700,
              pointerEvents: 'none',
            }}
          >
            {i + 1}
          </span>
        ))}
      </div>

      <div style={{ display: 'grid', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
        {points.map((p, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span style={{ fontWeight: 700, width: 24 }}>#{i + 1}</span>
            <span style={{ width: 130, fontVariantNumeric: 'tabular-nums' }}>
              px {p.x}, {p.y}
            </span>
            <input
              className="admin-input"
              style={{ flex: 1, minWidth: 0 }}
              placeholder="lat, lng  (e.g. 33.9816, -117.8399)"
              value={p.latlng}
              onChange={(e) => setLatLng(i, e.target.value)}
            />
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
        <button className="admin-input" type="button" onClick={() => setPoints((p) => p.slice(0, -1))}>
          Undo last
        </button>
        <button className="admin-input" type="button" onClick={() => setPoints([])}>
          Clear all
        </button>
        <button className="admin-input" type="button" onClick={copy} disabled={!fit}>
          {copied ? 'Copied ✓' : 'Copy georef'}
        </button>
      </div>

      {controlPoints.length > 0 && controlPoints.length < 3 && (
        <p className="screen__sub" style={{ marginTop: 'var(--space-2)' }}>
          Add {3 - controlPoints.length} more point{3 - controlPoints.length === 1 ? '' : 's'} with
          lat/lng to fit.
        </p>
      )}

      {fit && (
        <div style={{ marginTop: 'var(--space-3)' }}>
          <p className="screen__sub">
            Fit from {controlPoints.length} points · mean error{' '}
            <strong>{fit.meanErrorPx.toFixed(1)} px</strong> (lower is better; a stray point inflates
            it). Paste into <code>CAMPUS_LEVELS.{level}.georef</code> in <code>campusGeo.ts</code>:
          </p>
          <textarea
            className="admin-input"
            readOnly
            value={georefText}
            rows={8}
            style={{ width: '100%', marginTop: 'var(--space-2)', fontFamily: 'monospace' }}
          />
        </div>
      )}
    </section>
  );
}
