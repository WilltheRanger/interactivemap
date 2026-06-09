import type { ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import './Button.css';

type ButtonVariant = 'primary' | 'secondary';

interface LinkButtonProps extends LinkProps {
  variant?: ButtonVariant;
  icon?: ReactNode;
  tracked?: boolean;
}

/** A router Link styled as a button — for navigation actions (e.g. the header's Set Classes/Account). */
export function LinkButton({
  variant = 'secondary',
  icon,
  tracked,
  children,
  className,
  ...rest
}: LinkButtonProps) {
  const classes = ['btn', `btn--${variant}`, tracked ? 'btn--tracked' : '', className]
    .filter(Boolean)
    .join(' ');
  return (
    <Link className={classes} {...rest}>
      {icon ? (
        <span className="btn__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {children}
    </Link>
  );
}
