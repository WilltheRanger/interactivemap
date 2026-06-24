import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { spring } from '../../lib/motion';
import './Segmented.css';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

interface SegmentedProps<T extends string> {
  /** Accessible name for the radiogroup. */
  ariaLabel: string;
  /** Unique id so the sliding indicator animates within this group only. */
  layoutId: string;
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
}

/** A compact segmented radio control with a sliding active indicator (theme / text size / contrast). */
export function Segmented<T extends string>({
  ariaLabel,
  layoutId,
  value,
  options,
  onChange,
}: SegmentedProps<T>) {
  return (
    <div className="seg" role="radiogroup" aria-label={ariaLabel}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            className={`seg__option${active ? ' is-active' : ''}`}
            onClick={() => onChange(option.value)}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="seg__indicator"
                transition={spring.snappy}
              />
            )}
            <span className="seg__content">
              {option.icon}
              <span className="seg__label">{option.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
