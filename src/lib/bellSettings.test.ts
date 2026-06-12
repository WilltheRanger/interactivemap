import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  BELL_SETTINGS_KEY,
  getBellSettingsSnapshot,
  migrateBellSettings,
  setBellSetting,
  subscribeBellSettings,
} from './bellSettings';

const ALL_OFF = {
  pathwaysAcademy: false,
  rallyScheduleB: false,
  period0: false,
  period1a: false,
  period6a: false,
};

beforeEach(() => {
  localStorage.clear();
  // Reset the module singleton to defaults.
  for (const k of Object.keys(ALL_OFF) as (keyof typeof ALL_OFF)[]) setBellSetting(k, false);
});
afterEach(() => localStorage.clear());

describe('migrateBellSettings', () => {
  it('defaults everything off for non-objects / missing data', () => {
    for (const raw of [null, undefined, 'nope', 42, []]) {
      expect(migrateBellSettings(raw)).toEqual(ALL_OFF);
    }
  });
  it('keeps only the true booleans, ignoring junk', () => {
    expect(
      migrateBellSettings({ period0: true, period6a: 'yes', rallyScheduleB: 1, extra: true }),
    ).toEqual({ ...ALL_OFF, period0: true });
  });
});

describe('setBellSetting', () => {
  it('updates, persists, and notifies', () => {
    let calls = 0;
    const unsubscribe = subscribeBellSettings(() => {
      calls += 1;
    });

    setBellSetting('period0', true);
    expect(getBellSettingsSnapshot().period0).toBe(true);
    expect(calls).toBe(1);
    expect(JSON.parse(localStorage.getItem(BELL_SETTINGS_KEY) as string).period0).toBe(true);

    setBellSetting('period0', true); // no-op (unchanged) → no extra notify
    expect(calls).toBe(1);

    unsubscribe();
  });
});
