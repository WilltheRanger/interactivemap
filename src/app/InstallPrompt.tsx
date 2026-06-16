import { useSyncExternalStore } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Download, X } from 'lucide-react';
import { Button } from '../components';
import {
  dismissInstall,
  getInstallSnapshot,
  promptInstall,
  subscribeInstall,
} from '../lib/pwaInstall';
import { getTosAccepted, subscribeTos } from '../lib/tos';
import './InstallPrompt.css';

/**
 * First-run nudge to install the app to the home screen on Chromium/Android, where the "Add" button
 * opens the native install dialog. A floating card above the bottom nav, hidden once installed or
 * dismissed. iOS Safari has no programmatic install, so its first-run prompt is the InstallModal
 * walkthrough (Share → Add to Home Screen) instead of this banner.
 *
 * Waits for the Terms banner: both first-run surfaces share the same fixed slot above the nav, so
 * they'd stack and cover each other's buttons. Terms come first; this shows after "I Understand."
 */
export function InstallPrompt() {
  const state = useSyncExternalStore(subscribeInstall, getInstallSnapshot, getInstallSnapshot);
  const tosAccepted = useSyncExternalStore(subscribeTos, getTosAccepted, getTosAccepted);
  const show = tosAccepted && !state.installed && !state.dismissed && state.canInstall;

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
            <p className="install-prompt__text">
              Install it like an app for one-tap access — no App Store needed.
            </p>
          </div>

          <div className="install-prompt__actions">
            <Button
              variant="primary"
              icon={<Download size={16} />}
              onClick={() => void promptInstall()}
            >
              Add
            </Button>
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
