import { useRef, useState } from 'react';

/**
 * Dev-only GPS calibration helper (route: /geocal). Shows the Upper campus map; click a feature and
 * it reports the exact image pixel (in the map's 1382×863 space). Pair each click with the real-world
 * lat/lng (from Google Earth) and send the list back — those (pixel ↔ lat/lng) pairs are what refit
 * the GPS georeference (gps/georef.ts) for the redrawn Upper map. Not linked from the nav.
 */
const IMG_W = 1382;
const IMG_H = 863;

interface Point {
  x: number;
  y: number;
  latlng: string;
}

export function GeoCalibrate() {
  const imgRef = useRef<HTMLImageElement>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const [copied, setCopied] = useState(false);

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

  const copyText = points.map((p, i) => `${i + 1}: px=${p.x},${p.y}  latlng=${p.latlng}`).join('\n');
  const copy = () => {
    void navigator.clipboard?.writeText(copyText);
    setCopied(true);
  };

  return (
    <section className="screen" style={{ maxWidth: 'none' }}>
      <h1 className="screen__title">GPS calibration</h1>
      <p className="screen__sub">
        Click a feature on the map (pool, field, a building corner…), then type its real lat,lng in
        the matching row. Add 4–5 spread across campus, then <strong>Copy</strong> and send me the
        list.
      </p>

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
        {points.length === 1 ? '' : 's'}
      </div>

      <div style={{ position: 'relative', lineHeight: 0, border: '1px solid var(--color-border)' }}>
        <img
          ref={imgRef}
          src={`${import.meta.env.BASE_URL}campus-map-upper-v3.webp`}
          alt="Upper campus map"
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
        <button className="admin-input" type="button" onClick={copy} disabled={points.length === 0}>
          {copied ? 'Copied ✓' : 'Copy list'}
        </button>
      </div>

      {points.length > 0 && (
        <textarea
          className="admin-input"
          readOnly
          value={copyText}
          rows={Math.min(points.length + 1, 8)}
          style={{ width: '100%', marginTop: 'var(--space-2)', fontFamily: 'monospace' }}
        />
      )}
    </section>
  );
}
