import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  BELL_SETTINGS_KEY,
  getBellSettingsSnapshot,
  migrateBellSettings,
  setBellSetting,
  setWarningMinutes,
  subscribeBellSettings,
} from './bellSettings';

const DEFAULTS = {
  pathwaysAcademy: false,
  rallyScheduleB: false,
  period0: false,
  period1a: false,
  period6a: false,
  notificationsEnabled: false,
  warningMinutes: 5,
};

beforeEach(() => {
  localStorage.clear();
  // Reset the module singleton to defaults.
  setBellSetting('pathwaysAcademy', false);
  setBellSetting('rallyScheduleB', false);
  setBellSetting('period0', false);
  setBellSetting('period1a', false);
  setBellSetting('period6a', false);
  setBellSetting('notificationsEnabled', false);
  setWarningMinutes(5);
});
afterEach(() => localStorage.clear());

describe('migrateBellSettings', () => {
  it('returns defaults for non-objects / missing data', () => {
    for (const raw of [null, undefined, 'nope', 42, []]) {
      expect(migrateBellSettings(raw)).toEqual(DEFAULTS);
    }
  });
  it('keeps only the true booleans + a valid warningMinutes, ignoring junk', () => {
    expect(
      migrateBellSettings({
        period0: true,
        period6a: 'yes',
        rallyScheduleB: 1,
        notificationsEnabled: true,
        warningMinutes: 10,
        extra: true,
      }),
    ).toEqual({ ...DEFAULTS, period0: true, notificationsEnabled: true, warningMinutes: 10 });
  });
  it('falls back to the default warningMinutes when it is not an allowed choice', () => {
    expect(migrateBellSettings({ warningMinutes: 7 }).warningMinutes).toBe(5);
    expect(migrateBellSettings({ warningMinutes: '5' }).warningMinutes).toBe(5);
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

describe('setWarningMinutes', () => {
  it('accepts allowed choices and ignores others', () => {
    setWarningMinutes(10);
    expect(getBellSettingsSnapshot().warningMinutes).toBe(10);
    setWarningMinutes(7); // not allowed → clamps to default
    expect(getBellSettingsSnapshot().warningMinutes).toBe(5);
  });
});
