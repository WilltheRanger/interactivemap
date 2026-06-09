import { useState } from 'react';
import { Button } from '../../components';
import { buildHallPassUrl, type HallPassReason } from '../../lib/hallPass';
import { ReasonPicker } from './ReasonPicker';
import { QrScanner } from './QrScanner';
import './LogScreen.css';

/**
 * Hall-pass Log (Phase 12): pick a reason → scan the teacher's QR → open the teacher's own Apps
 * Script logger, which appends the row to *their* Sheet. The app stores nothing (decision #8): no
 * Supabase write, no localStorage write of log content — we only validate the scanned URL and open it.
 */
type Step =
  | { name: 'reason' }
  | { name: 'scan'; reason: HallPassReason }
  | { name: 'confirm'; reason: HallPassReason; url: string }
  | { name: 'invalid'; reason: HallPassReason }
  | { name: 'done'; reason: HallPassReason };

export function LogScreen() {
  const [step, setStep] = useState<Step>({ name: 'reason' });

  // Phase 09 will supply the signed-in @stu.wvusd.org address. Until then the teacher's Apps Script
  // captures the same-Workspace student email itself, so we pass no `student` param.
  const studentId: string | undefined = undefined;

  const handleResult = (raw: string, reason: HallPassReason) => {
    const url = buildHallPassUrl(raw, reason, studentId);
    setStep(url ? { name: 'confirm', reason, url } : { name: 'invalid', reason });
  };

  const openLogger = (url: string, reason: HallPassReason) => {
    // Open from this tap (a user gesture, so pop-up blockers allow it); fall back to a same-tab
    // navigation if the new tab is blocked. Either way we keep none of it.
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (!opened) window.location.assign(url);
    setStep({ name: 'done', reason });
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

      {step.name === 'confirm' && (
        <div className="screen__body log-screen__panel" role="status">
          <p className="log-screen__panel-title">Teacher QR found ✓</p>
          <p>
            Log a <strong>{step.reason}</strong> pass to your teacher&rsquo;s sheet?
          </p>
          <div className="log-screen__panel-actions">
            <Button variant="primary" onClick={() => openLogger(step.url, step.reason)}>
              Log {step.reason} pass
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

      {step.name === 'done' && (
        <div className="screen__body log-screen__panel" role="status">
          <p className="log-screen__panel-title">Opened the hall-pass log ✓</p>
          <p>
            Your <strong>{step.reason}</strong> pass opened in your teacher&rsquo;s logger. This app
            didn&rsquo;t store anything — the entry goes straight to your teacher&rsquo;s own sheet.
          </p>
          <div className="log-screen__panel-actions">
            <Button variant="primary" onClick={() => setStep({ name: 'reason' })}>
              Log another pass
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
