import type { ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { spring, tap } from '../lib/motion';
import './IconButton.css';

interface IconButtonProps extends HTMLMotionProps<'button'> {
  /** Accessible name (required — the button has no visible text). */
  label: string;
  icon: ReactNode;
}

export function IconButton({ label, icon, className, ...rest }: IconButtonProps) {
  return (
    <motion.button
      type="button"
      className={['icon-btn', className].filter(Boolean).join(' ')}
      aria-label={label}
      whileTap={tap}
      whileHover={{ y: -1 }}
      transition={spring.snappy}
      {...rest}
    >
      <span aria-hidden="true">{icon}</span>
    </motion.button>
  );
}
