import { useSyncExternalStore } from 'react';
import { Download, Share } from 'lucide-react';
import { Button } from '../../components';
import { getInstallSnapshot, promptInstall, subscribeInstall } from '../../lib/pwaInstall';

/**
 * Persistent "Install app" control for the Account screen — the way back in for a student who
 * dismissed the first-run banner (InstallPrompt) and wants to install later. Same platform logic as
 * the banner: the native dialog on Chromium, the Share-sheet steps on iOS (no programmatic install),
 * and an "Installed" confirmation once it's running standalone. Unlike the banner it ignores the
 * dismissed flag, so it's always here.
 */
export function InstallSetting() {
  const state = useSyncExternalStore(subscribeInstall, getInstallSnapshot, getInstallSnapshot);

  if (state.installed) {
    return (
      <div className="account__row">
        <span className="account__row-label">Install app</span>
        <span className="account__row-value">Installed</span>
      </div>
    );
  }

  if (state.canInstall) {
    return (
      <div className="account__row">
        <div>
          <p className="account__row-label">Install Wayfinder</p>
          <p className="account__hint">Add it to your home screen for one-tap access.</p>
        </div>
        <Button
          variant="primary"
          icon={<Download size={16} />}
          onClick={() => void promptInstall()}
        >
          Install
        </Button>
      </div>
    );
  }

  if (state.iosInstall) {
    return (
      <div>
        <p className="account__row-label">Install Wayfinder</p>
        <p className="account__hint">
          In Safari, tap Share{' '}
          <Share size={14} aria-hidden="true" className="account__inline-icon" /> then “Add to Home
          Screen.”
        </p>
      </div>
    );
  }

  // No native prompt and not iOS (e.g. desktop Firefox, or the event hasn't fired yet) — point the
  // student at a browser that can install, instead of showing a dead button.
  return (
    <div>
      <p className="account__row-label">Install Wayfinder</p>
      <p className="account__hint">
        Open Wayfinder in Chrome on Android or Safari on iPhone to add it to your home screen.
      </p>
    </div>
  );
}
