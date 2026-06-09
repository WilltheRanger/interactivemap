import type { InputHTMLAttributes } from 'react';
import { Search } from 'lucide-react';
import './SearchInput.css';

type SearchInputProps = InputHTMLAttributes<HTMLInputElement>;

export function SearchInput({ className, 'aria-label': ariaLabel, ...rest }: SearchInputProps) {
  return (
    <div className={['search', className].filter(Boolean).join(' ')}>
      <Search className="search__icon" size={20} aria-hidden="true" />
      <input type="search" className="search__input" aria-label={ariaLabel ?? 'Search'} {...rest} />
    </div>
  );
}
