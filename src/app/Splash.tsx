import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { duration, ease, spring } from '../lib/motion';
import './Splash.css';

/** Total time the splash stays before fading out. Keep short — it's aesthetics, not a loader. */
const SPLASH_MS = 1100;

/**
 * Brand splash on app open (Instagram-style): Brahmas tile + wordmark over the theme background,
 * auto-dismissing after ~1.1s. Purely decorative (aria-hidden) — the app renders underneath, so
 * nothing is delayed by it. The PWA manifest provides the matching native splash on installed
 * launches; this covers the in-browser moment after.
 */
export function Splash() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), SPLASH_MS);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="splash"
          aria-hidden="true"
          exit={{ opacity: 0, transition: { duration: duration.base, ease: ease.out } }}
        >
          <motion.div
            className="splash__tile"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={spring.gentle}
          >
            <img
              src={`${import.meta.env.BASE_URL}icons/icon-192.png`}
              alt=""
              width={96}
              height={96}
              className="splash__logo"
            />
          </motion.div>
          <motion.p
            className="splash__name"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: duration.base, ease: ease.out }}
          >
            DBHS Wayfinder
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
