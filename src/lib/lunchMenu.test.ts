import { describe, expect, it } from 'vitest';
import { localDateKey, lunchForDate, type LunchFeed } from './lunchMenu';

describe('localDateKey', () => {
  it('formats local Y-M-D with zero padding (not UTC)', () => {
    expect(localDateKey(new Date(2026, 4, 7))).toBe('2026-05-07'); // May 7
    expect(localDateKey(new Date(2026, 0, 1))).toBe('2026-01-01');
  });
});

describe('lunchForDate', () => {
  const feed: LunchFeed = {
    menuId: 118393,
    year: 2026,
    month: 5,
    days: { '2026-05-07': ['Chicken Clux bowl', 'Dinner Roll', 'Fresh Fruit', 'Milk'] },
  };

  it('returns the day’s items', () => {
    expect(lunchForDate(feed, '2026-05-07')).toEqual([
      'Chicken Clux bowl',
      'Dinner Roll',
      'Fresh Fruit',
      'Milk',
    ]);
  });

  it('returns [] for a day with no menu or no feed', () => {
    expect(lunchForDate(feed, '2026-05-09')).toEqual([]);
    expect(lunchForDate(undefined, '2026-05-07')).toEqual([]);
  });
});
