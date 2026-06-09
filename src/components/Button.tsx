import type { ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { spring, tap } from '../lib/motion';
import './Button.css';

type ButtonVariant = 'primary' | 'secondary';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: ButtonVariant;
  icon?: ReactNode;
  /** Uppercase + letter-spaced, like the header actions in the mockup. */
  tracked?: boolean;
  children?: ReactNode;
}

export function Button({
  variant = 'primary',
  icon,
  tracked,
  children,
  className,
  ...rest
}: ButtonProps) {
  const classes = ['btn', `btn--${variant}`, tracked ? 'btn--tracked' : '', className]
    .filter(Boolean)
    .join(' ');
  return (
    <motion.button className={classes} whileTap={tap} transition={spring.snappy} {...rest}>
      {icon ? (
        <span className="btn__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {children}
    </motion.button>
  );
}
