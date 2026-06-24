import type { InputHTMLAttributes } from 'react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { spring } from '../lib/motion';
import './SearchInput.css';

type SearchInputProps = InputHTMLAttributes<HTMLInputElement>;

const SHADOW_REST = '0 1px 2px rgba(31, 36, 51, 0.06), 0 2px 6px rgba(31, 36, 51, 0.08)';
const SHADOW_FOCUS = '0 8px 24px rgba(31, 36, 51, 0.16)';

export function SearchInput({
  className,
  'aria-label': ariaLabel,
  onFocus,
  onBlur,
  ...rest
}: SearchInputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <motion.div
      className={['search', className].filter(Boolean).join(' ')}
      animate={{ scale: focused ? 1.02 : 1, boxShadow: focused ? SHADOW_FOCUS : SHADOW_REST }}
      transition={spring.smooth}
      style={{ transformOrigin: 'center' }}
    >
      <Search className="search__icon" size={20} aria-hidden="true" />
      <input
        type="search"
        className="search__input"
        aria-label={ariaLabel ?? 'Search'}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...rest}
      />
    </motion.div>
  );
}
