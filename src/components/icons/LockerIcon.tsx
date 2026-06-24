import type { SVGProps } from 'react';

interface LockerIconProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

/** Two locker doors — a lucide-style icon (lucide has no locker glyph). */
export function LockerIcon({ size = 24, ...props }: LockerIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <rect x="4" y="3" width="7" height="18" rx="1" />
      <rect x="13" y="3" width="7" height="18" rx="1" />
      <line x1="7.5" y1="7" x2="7.5" y2="9" />
      <line x1="16.5" y1="7" x2="16.5" y2="9" />
    </svg>
  );
}
