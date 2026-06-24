import { RefreshCw } from 'lucide-react';
import { config } from '../lib/config';
import './ErrorFallbacks.css';

const REPORT_HREF = `mailto:${config.feedbackEmail}?subject=${encodeURIComponent(
  'DBHS Wayfinder — something broke',
)}&body=${encodeURIComponent('What were you doing when it broke?\n\n— Sent from DBHS Wayfinder')}`;

/**
 * Whole-app crash screen (top-level ErrorBoundary). Deliberately self-contained and dependency-light
 * — it must render even when most of the app is broken. Reload is the most reliable recovery.
 */
export function AppCrashScreen() {
  return (
    <div className="crash" role="alert">
      <img
        src={`${import.meta.env.BASE_URL}icons/icon-192.png`}
        alt=""
        width={72}
        height={72}
        className="crash__logo"
      />
      <h1 className="crash__title">Something went wrong</h1>
      <p className="crash__text">
        Sorry — the app hit a problem. Reloading usually fixes it, and your saved schedule and
        locker are safe on this device.
      </p>
      <div className="crash__actions">
        <button type="button" className="crash__button" onClick={() => window.location.reload()}>
          <RefreshCw size={16} aria-hidden="true" /> Reload app
        </button>
        <a className="crash__link" href={REPORT_HREF}>
          Report the problem
        </a>
      </div>
    </div>
  );
}

/**
 * Per-screen crash card (route-level ErrorBoundary): the header and bottom nav stay alive, so the
 * student can retry this tab or just use another one.
 */
export function ScreenCrashCard({ reset }: { reset: () => void }) {
  return (
    <div className="screen" role="alert">
      <div className="crash crash--card">
        <h2 className="crash__title">This screen hit a problem</h2>
        <p className="crash__text">
          The rest of the app still works — try this tab again, or use the buttons below to go
          somewhere else.
        </p>
        <div className="crash__actions">
          <button type="button" className="crash__button" onClick={reset}>
            <RefreshCw size={16} aria-hidden="true" /> Try again
          </button>
          <a className="crash__link" href={REPORT_HREF}>
            Report the problem
          </a>
        </div>
      </div>
    </div>
  );
}
