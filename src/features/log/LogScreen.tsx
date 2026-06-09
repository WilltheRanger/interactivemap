import { useState } from 'react';
import { Button } from '../../components';
import { buildHallPassUrl, type HallPassReason } from '../../lib/hallPass';
import { ReasonPicker } from './ReasonPicker';
import { QrScanner } from './QrScanner';
import './LogScreen.css';

/**
 * Hall-pass Log (Phase 12): pick a reason → scan the teacher's QR → the pass is logged silently in
 * the background. We validate the scanned QR (it must be the teacher's Google Apps Script /exec
 * endpoint — see hallPass.ts), then fire a fire-and-forget request to it; the script appends the row
 * to the teacher's own Sheet. The student never leaves the app, and the app stores nothing
 * (decision #8): no Supabase write, no localStorage write of log content.
 *
 * The background request is anonymous, so the teacher must deploy their script with "Anyone" access
 * (see docs/hall-pass-teacher-setup.md). Student identity (?student=) arrives with the Phase 09
 * Google sign-in; until then rows record time + reason only.
 */
type Step =
  | { name: 'reason' }
  | { name: 'scan'; reason: HallPassReason }
  | { name: 'sending'; reason: HallPassReason }
  | { name: 'done'; reason: HallPassReason }
  | { name: 'invalid'; reason: HallPassReason }
  | { name: 'error'; reason: HallPassReason; url: string };

export function LogScreen() {
  const [step, setStep] = useState<Step>({ name: 'reason' });

  // Phase 09 will supply the signed-in @stu.wvusd.org address as ?student=. Until then we send no
  // identity, so rows record time + reason only.
  const studentId: string | undefined = undefined;

  const submit = async (url: string, reason: HallPassReason) => {
    setStep({ name: 'sending', reason });
    try {
      // Fire-and-forget GET to the validated Apps Script endpoint. no-cors because Apps Script can't
      // return CORS headers — we never read the response, we only need the side effect (a row in the
      // teacher's Sheet). The app keeps nothing; keepalive lets it finish even if the view changes.
      await fetch(url, { method: 'GET', mode: 'no-cors', keepalive: true });
      setStep({ name: 'done', reason });
    } catch {
      // Only a hard network failure rejects a no-cors fetch; surface it so the student can retry.
      setStep({ name: 'error', reason, url });
    }
  };

  const handleResult = (raw: string, reason: HallPassReason) => {
    // Gate: only the teacher's Google Apps Script /exec endpoint passes; any other QR is rejected.
    const url = buildHallPassUrl(raw, reason, studentId);
    if (!url) {
      setStep({ name: 'invalid', reason });
      return;
    }
    void submit(url, reason);
  };

  return (
    <section className="screen log-screen" aria-labelledby="log-title">
      <h1 id="log-title" className="screen__title">
        Log
      </h1>

      {step.name === 'reason' && (
        <>
          <p className="screen__sub">Pick a reason, then scan your teacher&rsquo;s hall-pass QR.</p>
          <div className="screen__body">
            <ReasonPicker onPick={(reason) => setStep({ name: 'scan', reason })} />
          </div>
        </>
      )}

      {step.name === 'scan' && (
        <>
          <p className="screen__sub">
            Reason: <strong>{step.reason}</strong> &middot; point your camera at the teacher&rsquo;s
            QR code.
          </p>
          <div className="screen__body">
            <QrScanner
              onResult={(raw) => handleResult(raw, step.reason)}
              onCancel={() => setStep({ name: 'reason' })}
            />
          </div>
        </>
      )}

      {step.name === 'sending' && (
        <div className="screen__body log-screen__panel" role="status" aria-live="polite">
          <span className="log-screen__spinner" aria-hidden="true" />
          <p className="log-screen__panel-title">Logging your {step.reason} pass…</p>
        </div>
      )}

      {step.name === 'done' && (
        <div className="screen__body log-screen__panel" role="status" aria-live="polite">
          <p className="log-screen__panel-title">
            Your <strong>{step.reason}</strong> pass has been logged ✓
          </p>
          <div className="log-screen__panel-actions">
            <Button variant="primary" onClick={() => setStep({ name: 'reason' })}>
              Log another pass
            </Button>
          </div>
        </div>
      )}

      {step.name === 'invalid' && (
        <div className="screen__body log-screen__panel log-screen__panel--error" role="alert">
          <p className="log-screen__panel-title">That&rsquo;s not a hall-pass QR</p>
          <p>
            Only your teacher&rsquo;s official hall-pass QR works here. Scan that one to log your
            pass.
          </p>
          <div className="log-screen__panel-actions">
            <Button
              variant="primary"
              onClick={() => setStep({ name: 'scan', reason: step.reason })}
            >
              Scan again
            </Button>
            <Button variant="secondary" onClick={() => setStep({ name: 'reason' })}>
              Change reason
            </Button>
          </div>
        </div>
      )}

      {step.name === 'error' && (
        <div className="screen__body log-screen__panel log-screen__panel--error" role="alert">
          <p className="log-screen__panel-title">Couldn&rsquo;t reach the logger</p>
          <p>Check your connection and try again.</p>
          <div className="log-screen__panel-actions">
            <Button variant="primary" onClick={() => void submit(step.url, step.reason)}>
              Try again
            </Button>
            <Button
              variant="secondary"
              onClick={() => setStep({ name: 'scan', reason: step.reason })}
            >
              Rescan
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
