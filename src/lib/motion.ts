/**
 * Motion presets — the single source of truth for the app's animation feel (iOS-like: spring-driven,
 * subtle). Components import these so timings stay consistent. Reduced-motion is honored globally via
 * <MotionConfig reducedMotion="user"> in App.tsx.
 */
import type { Transition, Variants } from 'framer-motion';

/** Spring presets. */
export const spring = {
  /** Taps, the nav indicator — fast and crisp. */
  snappy: { type: 'spring' as const, stiffness: 420, damping: 32, mass: 0.8 },
  /** Cards, focus, hover lifts — smooth and settled. */
  smooth: { type: 'spring' as const, stiffness: 260, damping: 28, mass: 1 },
  /** Page-load rises — gentle. */
  gentle: { type: 'spring' as const, stiffness: 190, damping: 24, mass: 1 },
  /** Selected icon pop to 1.08 — a touch of bounce. */
  pop: { type: 'spring' as const, stiffness: 400, damping: 17, mass: 0.9 },
  /** Bottom sheets — heavier, iOS sheet physics. */
  sheet: { type: 'spring' as const, stiffness: 300, damping: 30, mass: 1 },
} satisfies Record<string, Transition>;

/** Easing curves (cubic-bezier). `out` is an easeOutQuint — the classic iOS entrance. */
export const ease = {
  out: [0.16, 1, 0.3, 1] as [number, number, number, number],
  inOut: [0.65, 0, 0.35, 1] as [number, number, number, number],
};

export const duration = {
  fast: 0.2,
  base: 0.35,
  slow: 0.45,
};

/** Stagger container + item used for nav load and lists. */
export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.08 } },
};

export const fadeUpItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: duration.base, ease: ease.out } },
};

/** Route transitions: fade + slight upward movement. */
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: duration.base, ease: ease.out } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.25, ease: ease.out } },
};

/** Common press feedback for buttons/cards. */
export const tap = { scale: 0.97 };
