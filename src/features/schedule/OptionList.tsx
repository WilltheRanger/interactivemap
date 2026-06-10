import { useState } from 'react';
import { SearchInput, Skeleton } from '../../components';

export interface PickOption {
  id: string;
  label: string;
  sub?: string;
}

interface OptionListProps {
  options: PickOption[] | undefined;
  loading?: boolean;
  error?: boolean;
  /** Shown when the list loads but is empty (lookup-miss state). */
  emptyText: string;
  filterPlaceholder?: string;
  onPick: (id: string) => void;
}

/** Type-to-filter pick list shared by the course / section / teacher / room pickers (06.3). */
export function OptionList({
  options,
  loading,
  error,
  emptyText,
  filterPlaceholder,
  onPick,
}: OptionListProps) {
  const [filter, setFilter] = useState('');

  if (loading) {
    return (
      <div className="picker" aria-busy="true">
        <Skeleton height={44} radius="var(--radius-md)" />
        <Skeleton height={44} radius="var(--radius-md)" />
        <Skeleton height={44} radius="var(--radius-md)" />
      </div>
    );
  }
  if (error) {
    return <p className="picker__status">Couldn&rsquo;t load — check your connection.</p>;
  }

  const all = options ?? [];
  const q = filter.trim().toLowerCase();
  const visible = q
    ? all.filter(
        (o) => o.label.toLowerCase().includes(q) || (o.sub?.toLowerCase().includes(q) ?? false),
      )
    : all;

  if (all.length === 0) return <p className="picker__status">{emptyText}</p>;

  return (
    <div className="picker">
      {all.length > 5 && (
        <SearchInput
          placeholder={filterPlaceholder ?? 'Type to filter…'}
          aria-label={filterPlaceholder ?? 'Type to filter'}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      )}
      {visible.length === 0 ? (
        <p className="picker__status">No matches for &ldquo;{filter.trim()}&rdquo;.</p>
      ) : (
        <ul className="picker__list">
          {visible.map((option) => (
            <li key={option.id}>
              <button type="button" className="picker__option" onClick={() => onPick(option.id)}>
                <span className="picker__label">{option.label}</span>
                {option.sub && <span className="picker__sub">{option.sub}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
