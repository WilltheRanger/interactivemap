import { useEffect, useRef, useSyncExternalStore } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Share, X } from 'lucide-react';
import { Button } from '../components';
import { dismissInstall, getInstallSnapshot, subscribeInstall } from '../lib/pwaInstall';
import { getTosAccepted, subscribeTos } from '../lib/tos';
import { duration, ease, spring } from '../lib/motion';
import './InstallModal.css';

/** Path to the install walkthrough GIF (lives in public/, served under BASE_URL on GitHub Pages). */
const HOWTO_GIF = `${import.meta.env.BASE_URL}install-howto.gif`;

/**
 * First-run "add to home screen" walkthrough for iOS Safari, where there's no programmatic install —
 * the only way in is the Share sheet, so a short screen-recording GIF shows exactly which buttons to
 * tap. A centered modal (more prominent than the InstallPrompt banner, which is left for Chromium's
 * one-tap native install). Shown once, then a dismissal is remembered; the Account screen's
 * InstallSetting is the way back in.
 *
 * Waits for the Terms banner: the student accepts Terms first, then this appears.
 */
export function InstallModal() {
  const state = useSyncExternalStore(subscribeInstall, getInstallSnapshot, getInstallSnapshot);
  const tosAccepted = useSyncExternalStore(subscribeTos, getTosAccepted, getTosAccepted);
  // iosInstall already encodes "iOS Safari, not installed, no native prompt".
  const show = tosAccepted && state.iosInstall && !state.dismissed;

  return <AnimatePresence>{show && <InstallModalDialog />}</AnimatePresence>;
}

/** Split out so the focus / Escape / scroll-lock effects only run while the modal is mounted. */
function InstallModalDialog() {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Move focus into the dialog and let Escape dismiss it.
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismissInstall();
    };
    document.addEventListener('keydown', onKey);

    // Stop the page underneath from scrolling while the modal is open.
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      html.style.overflow = prevOverflow;
    };
  }, []);

  return (
    <motion.div
      className="install-modal__backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: duration.fast, ease: ease.out }}
      onClick={dismissInstall}
    >
      <motion.div
        className="install-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-modal-title"
        aria-describedby="install-modal-steps"
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.98 }}
        transition={spring.smooth}
        // Clicks inside the card shouldn't fall through to the backdrop's dismiss.
        onClick={(event) => event.stopPropagation()}
      >
        <button
          ref={closeRef}
          type="button"
          className="install-modal__close"
          aria-label="Dismiss"
          onClick={dismissInstall}
        >
          <X size={20} aria-hidden="true" />
        </button>

        <h2 id="install-modal-title" className="install-modal__title">
          Add Wayfinder to your home screen
        </h2>
        <p className="install-modal__intro">
          Install it like an app for one-tap access — no App Store needed.
        </p>

        <img
          className="install-modal__gif"
          src={HOWTO_GIF}
          alt="Screen recording: in Safari, tap the Share button, then choose Add to Home Screen."
          // Hide gracefully if the GIF hasn't been added yet — the written steps still stand.
          onError={(event) => {
            event.currentTarget.style.display = 'none';
          }}
        />

        <p id="install-modal-steps" className="install-modal__steps">
          In Safari, tap Share{' '}
          <Share size={14} aria-hidden="true" className="install-modal__inline-icon" /> then “Add to
          Home Screen.”
        </p>

        <Button variant="primary" className="install-modal__cta" onClick={dismissInstall}>
          Got it
        </Button>
      </motion.div>
    </motion.div>
  );
}
