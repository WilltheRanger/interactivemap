import { UtensilsCrossed } from 'lucide-react';
import { Skeleton } from '../../components';
import { useLunchMenu } from '../../data/useLunchMenu';
import { localDateKey, lunchForDate } from '../../lib/lunchMenu';
import './LunchCard.css';

/**
 * Today's cafeteria lunch (item names only), from the proxied My School Menus feed. Self-contained:
 * deleting this file + its line in ScheduleScreen removes the feature. Degrades to a quiet note on a
 * non-school day (weekend / holiday / summer → no items) or a feed error — never a blank or a crash.
 */
export function LunchCard() {
  const today = new Date();
  const feed = useLunchMenu(today.getFullYear(), today.getMonth() + 1);

  if (feed.isPending) {
    return (
      <div className="lunch-card" aria-busy="true" role="status" aria-label="Loading today's lunch">
        <Skeleton width={150} height={18} radius="var(--radius-sm)" />
        <Skeleton height={72} radius="var(--radius-md)" />
      </div>
    );
  }

  const title = (
    <p className="lunch-card__title">
      <UtensilsCrossed size={16} aria-hidden="true" /> Today&rsquo;s Lunch
    </p>
  );

  if (feed.isError) {
    return (
      <div className="lunch-card" role="status">
        {title}
        <p className="lunch-card__note">Couldn&rsquo;t load the menu right now.</p>
      </div>
    );
  }

  const items = lunchForDate(feed.data, localDateKey(today));

  return (
    <div className="lunch-card">
      {title}
      {items.length === 0 ? (
        <p className="lunch-card__note">No lunch menu today.</p>
      ) : (
        <ul className="lunch-card__items">
          {items.map((name, i) => (
            <li key={`${i}-${name}`}>{name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
