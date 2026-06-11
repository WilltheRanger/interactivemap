import { describe, expect, it } from 'vitest';
import {
  computeTimings,
  findVariant,
  formatRemaining,
  isClassPeriod,
  militaryToMinutes,
  periodIdForBellKey,
  secondsSinceMidnight,
  type BellScheduleVariant,
} from './bellSchedule';

const period = (
  key: string,
  start: string,
  end: string,
): BellScheduleVariant['schedule'][number] => ({
  key,
  print: key,
  start,
  end,
  startPrint: start,
  endPrint: end,
});

const regular: BellScheduleVariant = {
  key: 'Regular',
  print: 'Regular Schedule',
  schedule: [
    period('1', '0830', '0926'),
    period('2', '0934', '1030'),
    period('brunch', '1030', '1040'),
    period('6', '1435', '1530'),
    period('6A', '1435', '1559'), // overlaps Period 6
  ],
};

/** A Date at a local wall-clock time today. */
const at = (h: number, m: number, s = 0) => {
  const d = new Date();
  d.setHours(h, m, s, 0);
  return d;
};

describe('militaryToMinutes', () => {
  it('parses valid military times', () => {
    expect(militaryToMinutes('0830')).toBe(8 * 60 + 30);
    expect(militaryToMinutes('0713')).toBe(7 * 60 + 13);
    expect(militaryToMinutes('1559')).toBe(15 * 60 + 59);
    expect(militaryToMinutes('713')).toBe(7 * 60 + 13); // 3-digit pads
  });
  it('rejects malformed / out-of-range input', () => {
    for (const bad of ['', 'abc', '2461', '0860', '12']) expect(militaryToMinutes(bad)).toBeNull();
  });
});

describe('secondsSinceMidnight', () => {
  it('counts h/m/s in local time', () => {
    expect(secondsSinceMidnight(at(8, 30, 15))).toBe(8 * 3600 + 30 * 60 + 15);
  });
});

describe('period mapping', () => {
  it('maps class keys to saved period ids, including 1A/6A alternates', () => {
    expect(periodIdForBellKey('1')).toBe('1');
    expect(periodIdForBellKey('1A')).toBe('1');
    expect(periodIdForBellKey('6A')).toBe('6');
    expect(periodIdForBellKey('0')).toBe('0');
    expect(periodIdForBellKey('brunch')).toBeNull();
    expect(periodIdForBellKey('lunch')).toBeNull();
  });
  it('classifies class vs break rows', () => {
    expect(isClassPeriod('3')).toBe(true);
    expect(isClassPeriod('lunch')).toBe(false);
  });
});

describe('computeTimings', () => {
  it('flags the in-session period and its remaining seconds', () => {
    const t = computeTimings(regular, at(8, 45, 0)); // mid Period 1 (0830–0926)
    const p1 = t.find((x) => x.period.key === '1')!;
    expect(p1.active).toBe(true);
    // 09:26 - 08:45:00 = 41m = 2460s
    expect(p1.secondsRemaining).toBe(2460);
    expect(t.find((x) => x.period.key === '2')!.active).toBe(false);
  });

  it('marks overlapping periods both active (6 and 6A)', () => {
    const t = computeTimings(regular, at(14, 40, 0)); // 02:40 — inside both 6 and 6A
    expect(t.find((x) => x.period.key === '6')!.active).toBe(true);
    expect(t.find((x) => x.period.key === '6A')!.active).toBe(true);
  });

  it('is exclusive of the end minute and inclusive of the start', () => {
    expect(computeTimings(regular, at(9, 26, 0)).find((x) => x.period.key === '1')!.active).toBe(
      false,
    );
    expect(computeTimings(regular, at(8, 30, 0)).find((x) => x.period.key === '1')!.active).toBe(
      true,
    );
  });

  it('returns nothing in a passing period / before school', () => {
    expect(computeTimings(regular, at(6, 0, 0)).every((x) => !x.active)).toBe(true);
    expect(computeTimings(null, at(9, 0, 0))).toEqual([]);
  });
});

describe('findVariant', () => {
  it('matches by key case-insensitively', () => {
    expect(findVariant([regular], 'regular')?.key).toBe('Regular');
    expect(findVariant([regular], 'Holiday')).toBeNull();
    expect(findVariant([regular], '')).toBeNull();
  });
});

describe('formatRemaining', () => {
  it('hides 0h under an hour and pads', () => {
    expect(formatRemaining(2460)).toBe('41m 00s');
    expect(formatRemaining(13)).toBe('0m 13s');
    expect(formatRemaining(3913)).toBe('1h 05m 13s');
    expect(formatRemaining(-5)).toBe('0m 00s');
  });
});
