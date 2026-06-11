import { useSyncExternalStore } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Download, Share, X } from 'lucide-react';
import { Button } from '../components';
import {
  dismissInstall,
  getInstallSnapshot,
  promptInstall,
  subscribeInstall,
} from '../lib/pwaInstall';
import './InstallPrompt.css';

/**
 * First-run nudge to install the app to the home screen. On Chromium/Android the "Add" button opens
 * the native install dialog; on iOS Safari (no programmatic install) it shows the Share-sheet steps.
 * Hidden once installed or dismissed. Mounted in the app shell, fixed above the bottom nav.
 */
export function InstallPrompt() {
  const state = useSyncExternalStore(subscribeInstall, getInstallSnapshot, getInstallSnapshot);
  const show = !state.installed && !state.dismissed && (state.canInstall || state.iosInstall);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="install-prompt"
          role="dialog"
          aria-labelledby="install-prompt-title"
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        >
          <div className="install-prompt__body">
            <p id="install-prompt-title" className="install-prompt__title">
              Add Wayfinder to your home screen
            </p>
            {state.iosInstall ? (
              <p className="install-prompt__text">
                In Safari, tap Share{' '}
                <Share size={13} aria-hidden="true" className="install-prompt__inline-icon" /> then
                “Add to Home Screen.”
              </p>
            ) : (
              <p className="install-prompt__text">
                Install it like an app for one-tap access — no App Store needed.
              </p>
            )}
          </div>

          <div className="install-prompt__actions">
            {state.canInstall && (
              <Button
                variant="primary"
                icon={<Download size={16} />}
                onClick={() => void promptInstall()}
              >
                Add
              </Button>
            )}
            <button
              type="button"
              className="install-prompt__dismiss"
              aria-label="Dismiss"
              onClick={dismissInstall}
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
