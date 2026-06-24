import { useEffect, useRef, useState } from 'react';
import { Button } from '../../components';

type ScanStatus = 'starting' | 'scanning' | 'denied' | 'unsupported' | 'error';

interface QrScannerProps {
  /** Fired once with the raw decoded text when a QR is read. The parent validates it. */
  onResult: (rawText: string) => void;
  /** Fired when the student backs out of scanning. */
  onCancel: () => void;
}

/** Decode at most this often (ms) — jsQR per-frame on a phone is CPU-heavy, so we throttle. */
const SCAN_THROTTLE_MS = 180;
/** Downscale frames for jsQR so decoding stays fast; a QR filling the reticle reads fine at this size. */
const MAX_DECODE_EDGE = 480;

/**
 * Camera QR scanner for the hall-pass Log. Opens the rear camera via getUserMedia (so it works the
 * same in the browser and when installed as the PWA — both run on the device's web engine), then
 * decodes frames with the native BarcodeDetector when available, falling back to jsQR (iOS Safari).
 * On a successful read it hands the raw text up; the parent runs it through buildHallPassUrl.
 *
 * getUserMedia requires a secure context (https / localhost); the deployed PWA is https.
 */
export function QrScanner({ onResult, onCancel }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // Keep the latest onResult in a ref so the camera effect doesn't restart when the parent re-renders.
  const onResultRef = useRef(onResult);
  useEffect(() => {
    onResultRef.current = onResult;
  });

  const [status, setStatus] = useState<ScanStatus>('starting');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    let handled = false;
    let detector: BarcodeDetector | null = null;
    // jsQR is loaded on demand (only when there's no native BarcodeDetector), so it stays out of the
    // main bundle and off the path entirely for browsers that have the native API.
    let decodeJsQR: typeof import('jsqr').default | null = null;
    let lastScan = 0;
    let canvas: HTMLCanvasElement | null = null;

    const stopStream = () => {
      stream?.getTracks().forEach((track) => track.stop());
      stream = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    };

    const finish = (text: string) => {
      if (handled || !text) return;
      handled = true;
      cancelAnimationFrame(raf);
      stopStream();
      onResultRef.current(text);
    };

    const decodeFrame = async (video: HTMLVideoElement) => {
      // Native fast path.
      if (detector) {
        try {
          const codes = await detector.detect(video);
          if (codes.length) finish(codes[0].rawValue);
        } catch {
          // A transient detect() failure — keep looping.
        }
        return;
      }
      // jsQR fallback: draw a downscaled frame and decode its pixels.
      if (!decodeJsQR) return;
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (!vw || !vh) return;
      const scale = Math.min(1, MAX_DECODE_EDGE / Math.max(vw, vh));
      const w = Math.round(vw * scale);
      const h = Math.round(vh * scale);
      if (!canvas) canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, w, h);
      const { data } = ctx.getImageData(0, 0, w, h);
      const result = decodeJsQR(data, w, h, { inversionAttempts: 'dontInvert' });
      if (result) finish(result.data);
    };

    const loop = (ts: number) => {
      if (stopped || handled) return;
      raf = requestAnimationFrame(loop);
      if (ts - lastScan < SCAN_THROTTLE_MS) return;
      lastScan = ts;
      const video = videoRef.current;
      if (video && video.readyState >= 2) void decodeFrame(video);
    };

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('unsupported');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
      } catch (err) {
        const name = (err as DOMException).name;
        setStatus(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'error');
        return;
      }
      if (stopped) {
        stopStream();
        return;
      }
      const video = videoRef.current;
      if (!video) {
        stopStream();
        return;
      }
      video.srcObject = stream;
      try {
        await video.play();
      } catch {
        // Autoplay can reject on some browsers; the stream still renders once allowed.
      }
      if (window.BarcodeDetector) {
        try {
          detector = new window.BarcodeDetector({ formats: ['qr_code'] });
        } catch {
          detector = null;
        }
      }
      if (!detector) {
        try {
          decodeJsQR = (await import('jsqr')).default;
        } catch {
          stopStream();
          setStatus('error');
          return;
        }
      }
      if (stopped) {
        stopStream();
        return;
      }
      setStatus('scanning');
      raf = requestAnimationFrame(loop);
    };

    void start();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stopStream();
    };
  }, [attempt]);

  const live = status === 'starting' || status === 'scanning';

  return (
    <div className="qr-scanner">
      {live ? (
        <div className="qr-scanner__viewport">
          <video
            ref={videoRef}
            className="qr-scanner__video"
            autoPlay
            muted
            playsInline
            aria-label="Camera viewfinder — point at your teacher's hall-pass QR code"
          />
          <div className="qr-scanner__reticle" aria-hidden="true" />
          <p className="qr-scanner__hint" role="status">
            {status === 'starting' ? 'Starting camera…' : "Point at the teacher's QR code"}
          </p>
        </div>
      ) : (
        <div className="qr-scanner__message" role="status">
          {status === 'denied' && (
            <>
              <h2 className="qr-scanner__message-title">Camera access needed</h2>
              <p>Allow camera access for this site in your browser settings, then try again.</p>
            </>
          )}
          {status === 'unsupported' && (
            <>
              <h2 className="qr-scanner__message-title">Camera not available</h2>
              <p>
                This device or browser can&rsquo;t open the camera here. Make sure you&rsquo;re
                using the app over a secure (https) connection.
              </p>
            </>
          )}
          {status === 'error' && (
            <>
              <h2 className="qr-scanner__message-title">Couldn&rsquo;t start the camera</h2>
              <p>Something went wrong opening the camera. Try again.</p>
            </>
          )}
          {status !== 'unsupported' && (
            <Button variant="primary" onClick={() => setAttempt((n) => n + 1)}>
              Try again
            </Button>
          )}
        </div>
      )}
      <div className="qr-scanner__actions">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
