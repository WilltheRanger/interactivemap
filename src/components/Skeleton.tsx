import './Skeleton.css';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  radius?: string;
  className?: string;
}

/** Shimmering placeholder for loading states. Shimmer is disabled under prefers-reduced-motion. */
export function Skeleton({ width, height, radius, className }: SkeletonProps) {
  return (
    <span
      className={['skeleton', className].filter(Boolean).join(' ')}
      style={{ width, height, borderRadius: radius }}
      aria-hidden="true"
    />
  );
}
