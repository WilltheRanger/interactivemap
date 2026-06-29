import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import 'pannellum/build/pannellum.css';
import 'pannellum'; // side effect: defines window.pannellum
// Shell / pin / spinner styles live in LockersScreen.css (loaded eagerly with the screen) so they're
// already present when this lazy chunk mounts — see the note there.

/** A pin to render in the panorama (admin tagger passes several; the student view uses the single
 *  hotspot props below). */
export interface PanoPin {
  id: string;
  yaw: number;
  pitch: number;
  label: string;
  /** Tagger: tapping this pin's marker selects it (e.g. to edit it). */
  onSelect?: () => void;
}

interface PanoramaViewerProps {
  imageUrl: string;
  label: string;
  lockerNumber: number;
  /** Panorama default view (used when the locker has no tagged pin). */
  initialYaw?: number | null;
  initialPitch?: number | null;
  hfov?: number | null;
  /** Per-locker pin angle; when both are set, a pin is drawn and the view opens facing it. */
  hotspotYaw?: number | null;
  hotspotPitch?: number | null;
  /** Admin tagger: render these pins (managed live, no reload) instead of the single hotspot. */
  pins?: PanoPin[];
  /** Admin tagger: enable click-to-capture — a tap on the photo reports the angle under the cursor. */
  onPick?: (coords: { yaw: number; pitch: number }) => void;
  /** Admin tagger: hand the live viewer to the parent (e.g. to read the current view for a default). */
  onReady?: (viewer: PannellumViewer) => void;
  onClose: () => void;
}

type Status = 'loading' | 'ready' | 'error';

/**
 * WebGL needs the panorama served with CORS (we load it `crossOrigin: 'anonymous'`). Supabase's CDN
 * can cache a copy *without* the CORS header if the URL was ever fetched with no Origin (e.g. opened
 * directly in a browser tab), then serve that stale copy to the viewer's CORS request → load fails.
 * A stable extra query param gives the viewer's request its own cache entry, first populated by a
 * CORS request (which carries an Origin) so it's cached *with* the header. Harmless on other hosts.
 */
function corsSafe(url: string): string {
  if (!/^https?:/i.test(url)) return url;
  return url + (url.includes('?') ? '&' : '?') + 'cors=1';
}

/**
 * Full-screen Pannellum 360° viewer for a locker bank. Lazy-loaded (React.lazy in LockersScreen and
 * the admin LockerTagger) so the Pannellum library and the large equirectangular image stay out of
 * the main bundle and download only when a student opens their locker — or an admin tags one.
 *
 * Student view: a pin marks the locker (the per-locker yaw/pitch tagged in /admin, else the
 * panorama's default view). Admin tagger: `pins` are drawn and managed live, and `onPick` turns a
 * tap into the {yaw, pitch} under the cursor. A loader covers the canvas until the image finishes; a
 * failed load shows an error.
 */
export default function PanoramaViewer({
  imageUrl,
  label,
  lockerNumber,
  initialYaw,
  initialPitch,
  hfov,
  hotspotYaw,
  hotspotPitch,
  pins,
  onPick,
  onReady,
  onClose,
}: PanoramaViewerProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<PannellumViewer | null>(null);
  // Hotspots currently on the viewer: id → "yaw,pitch", so the sync below can diff and touch only the
  // ones that changed.
  const hotspotsRef = useRef<Map<string, string>>(new Map());
  const [status, setStatus] = useState<Status>('loading');

  // Latest callbacks kept in refs so the viewer-creation effect doesn't rebuild (and re-download the
  // image) when a parent re-renders with new callback identities. Updated after each render (the
  // viewer's async 'load' + pointer handlers read them well after).
  const onPickRef = useRef(onPick);
  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onPickRef.current = onPick;
    onReadyRef.current = onReady;
  });

  const tagging = !!onPick;
  const hasPin = !tagging && typeof hotspotYaw === 'number' && typeof hotspotPitch === 'number';

  useEffect(() => {
    const el = canvasRef.current;
    const pannellum = window.pannellum;
    const hotspots = hotspotsRef.current; // stable Map; cleared on teardown (captured for the cleanup)
    if (!el || !pannellum) {
      setStatus('error');
      return;
    }

    const viewer = pannellum.viewer(el, {
      type: 'equirectangular',
      panorama: corsSafe(imageUrl),
      autoLoad: true,
      showZoomCtrl: true,
      showFullscreenCtrl: false,
      crossOrigin: 'anonymous',
      yaw: (hasPin ? hotspotYaw : initialYaw) ?? 0,
      pitch: (hasPin ? hotspotPitch : initialPitch) ?? 0,
      hfov: hfov ?? 100,
      // Tagger pins are added by the sync effect below (so saving one doesn't rebuild the viewer).
      hotSpots: hasPin
        ? [
            {
              yaw: hotspotYaw as number,
              pitch: hotspotPitch as number,
              cssClass: 'pano-pin',
              createTooltipFunc: (div) => {
                const tag = document.createElement('span');
                tag.className = 'pano-pin__label';
                tag.textContent = `Locker #${lockerNumber}`;
                div.appendChild(tag);
              },
            },
          ]
        : [],
    });
    viewerRef.current = viewer;
    viewer.on('load', () => {
      setStatus('ready');
      onReadyRef.current?.(viewer);
    });
    viewer.on('error', () => setStatus('error'));

    // Click-to-capture (tagger). A near-stationary pointerup is a tap (a moved one was a pan/drag).
    let downX = 0;
    let downY = 0;
    const onDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };
    const onUp = (e: PointerEvent) => {
      const pick = onPickRef.current;
      if (!pick || Math.hypot(e.clientX - downX, e.clientY - downY) > 8) return;
      // A tap on an existing pin selects it (its own click handler runs) — don't also capture a point.
      if ((e.target as Element | null)?.closest?.('.pnlm-hotspot-base')) return;
      try {
        const [pitch, yaw] = viewer.mouseEventToCoords(e);
        pick({ yaw, pitch });
      } catch {
        // mouseEventToCoords can throw before the scene is ready — ignore.
      }
    };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointerup', onUp);

    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointerup', onUp);
      viewerRef.current = null;
      hotspots.clear();
      try {
        viewer.destroy();
      } catch {
        // A viewer that failed to fully initialize can throw on teardown — nothing actionable.
      }
    };
  }, [imageUrl, lockerNumber, initialYaw, initialPitch, hfov, hotspotYaw, hotspotPitch, hasPin]);

  // Tagger: sync the live pin set onto the viewer INCREMENTALLY — only remove hotspots that are gone
  // or have moved, and only add new/moved ones; leave unchanged pins in place. Removing and re-adding
  // every hotspot on each change (e.g. deleting one of 100) made Pannellum leave ghost hotspots
  // scattered across the photo. No-op for the student view, which passes no `pins`.
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || status !== 'ready' || !pins) return;
    const have = hotspotsRef.current;
    const want = new Map(pins.map((p) => [p.id, `${p.yaw},${p.pitch}`]));
    // Drop hotspots no longer wanted, or whose position changed (they'll be re-added below).
    for (const [id, pos] of [...have]) {
      if (want.get(id) !== pos) {
        try {
          viewer.removeHotSpot(id);
        } catch {
          // already gone — ignore
        }
        have.delete(id);
      }
    }
    // Add anything not already present (new pins, or ones that just moved).
    for (const p of pins) {
      if (have.has(p.id)) continue;
      if (!Number.isFinite(p.yaw) || !Number.isFinite(p.pitch)) continue; // never place a garbage pin
      try {
        viewer.addHotSpot({
          id: p.id,
          yaw: p.yaw,
          pitch: p.pitch,
          cssClass: 'pano-pin',
          createTooltipFunc: (div) => {
            const tag = document.createElement('span');
            tag.className = 'pano-pin__label';
            tag.textContent = p.label;
            div.appendChild(tag);
          },
          clickHandlerFunc: p.onSelect ? () => p.onSelect?.() : undefined,
        });
        have.set(p.id, `${p.yaw},${p.pitch}`);
      } catch {
        // ignore a pin that fails to add
      }
    }
  }, [pins, status]);

  // Escape closes; lock the page scroll behind the full-screen viewer.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      html.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div className="pano" role="dialog" aria-modal="true" aria-label={`${label} — 360° view`}>
      <div className="pano__bar">
        <p className="pano__title">{label}</p>
        <button type="button" className="pano__close" aria-label="Close 360° view" onClick={onClose}>
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      <div className="pano__stage">
        <div
          ref={canvasRef}
          className={tagging ? 'pano__canvas pano__canvas--pick' : 'pano__canvas'}
        />
        {tagging && status === 'ready' && (
          <p className="pano__pickhint" role="note">
            Tap a locker to capture its position
          </p>
        )}
        {status === 'loading' && (
          <div className="pano__overlay" role="status">
            <span className="pano__spinner" aria-hidden="true" />
            <p className="pano__msg">Loading the 360° view…</p>
          </div>
        )}
        {status === 'error' && (
          <div className="pano__overlay pano__overlay--error" role="alert">
            <p className="pano__msg">Couldn’t load the 360° view. The photo may be unavailable.</p>
          </div>
        )}
      </div>
    </div>
  );
}
