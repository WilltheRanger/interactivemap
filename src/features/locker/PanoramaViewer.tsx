import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import 'pannellum/build/pannellum.css';
import 'pannellum'; // side effect: defines window.pannellum
// Shell / pin / spinner styles live in LockersScreen.css (loaded eagerly with the screen) so they're
// already present when this lazy chunk mounts — see the note there.

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
  onClose: () => void;
}

type Status = 'loading' | 'ready' | 'error';

/**
 * Full-screen Pannellum 360° viewer for a locker bank. Lazy-loaded (React.lazy in LockersScreen) so
 * the Pannellum library and the large equirectangular image stay out of the main bundle and download
 * only when a student opens their locker.
 *
 * A pin marks the locker: the per-locker yaw/pitch if it was tagged in /admin, otherwise the
 * panorama's default view. A loader covers the canvas until the image finishes (never a blank
 * screen); a failed load shows an error.
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
  onClose,
}: PanoramaViewerProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>('loading');

  const hasPin = typeof hotspotYaw === 'number' && typeof hotspotPitch === 'number';

  useEffect(() => {
    const el = canvasRef.current;
    const pannellum = window.pannellum;
    if (!el || !pannellum) {
      setStatus('error');
      return;
    }

    const viewer = pannellum.viewer(el, {
      type: 'equirectangular',
      panorama: imageUrl,
      autoLoad: true,
      showZoomCtrl: true,
      showFullscreenCtrl: false,
      crossOrigin: 'anonymous',
      yaw: (hasPin ? hotspotYaw : initialYaw) ?? 0,
      pitch: (hasPin ? hotspotPitch : initialPitch) ?? 0,
      hfov: hfov ?? 100,
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
    viewer.on('load', () => setStatus('ready'));
    viewer.on('error', () => setStatus('error'));

    return () => {
      try {
        viewer.destroy();
      } catch {
        // A viewer that failed to fully initialize can throw on teardown — nothing actionable.
      }
    };
  }, [imageUrl, lockerNumber, initialYaw, initialPitch, hfov, hotspotYaw, hotspotPitch, hasPin]);

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
        <div ref={canvasRef} className="pano__canvas" />
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
