import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ScheduleEntry } from '../types/personal';
import {
  STORAGE_KEY,
  clearAll,
  clearSchedule,
  getMyLocker,
  getSchedule,
  getSnapshot,
  migrate,
  removePeriod,
  setMyLocker,
  setPeriod,
  subscribe,
} from './personalStore';

const teacherEntry: ScheduleEntry = {
  kind: 'teacher',
  teacher_id: 't-1',
  class_label: 'Algebra 2',
};
const roomEntry: ScheduleEntry = { kind: 'room', room_id: 'r-200', class_label: 'Chemistry' };

beforeEach(() => {
  localStorage.clear();
  clearAll();
});
afterEach(() => {
  localStorage.clear();
});

describe('migrate', () => {
  it('returns a clean default for non-objects and missing data', () => {
    for (const raw of [null, undefined, 'nope', 42, []]) {
      expect(migrate(raw)).toEqual({ version: 1, schedule: {}, my_locker: null });
    }
  });

  it('defaults on unknown / older version', () => {
    expect(migrate({ version: 0, schedule: {}, my_locker: 5 })).toEqual({
      version: 1,
      schedule: {},
      my_locker: null,
    });
    expect(migrate({ version: 2, schedule: { '1': teacherEntry } })).toEqual({
      version: 1,
      schedule: {},
      my_locker: null,
    });
  });

  it('keeps a valid v1 blob', () => {
    const raw = { version: 1, schedule: { '1': teacherEntry, '3': roomEntry }, my_locker: 1042 };
    expect(migrate(raw)).toEqual(raw);
  });

  it('drops invalid schedule entries but keeps valid ones', () => {
    const raw = {
      version: 1,
      schedule: {
        '1': teacherEntry,
        '2': { kind: 'teacher', class_label: 'No id' }, // missing teacher_id
        '3': { kind: 'room', room_id: 'r-9', class_label: 42 }, // non-string label
        '4': { kind: 'section', id: 'x', class_label: 'bad kind' }, // bad kind
        '5': roomEntry,
      },
      my_locker: null,
    };
    expect(migrate(raw).schedule).toEqual({ '1': teacherEntry, '5': roomEntry });
  });

  it('nulls an invalid locker', () => {
    for (const bad of [0, -1, 1.5, '12', 100000]) {
      expect(migrate({ version: 1, schedule: {}, my_locker: bad }).my_locker).toBeNull();
    }
  });
});

describe('schedule API', () => {
  it('sets, reads, and removes periods', () => {
    setPeriod('1', teacherEntry);
    setPeriod('2', roomEntry);
    expect(getSchedule()).toEqual({ '1': teacherEntry, '2': roomEntry });

    removePeriod('1');
    expect(getSchedule()).toEqual({ '2': roomEntry });

    removePeriod('nope'); // no-op
    expect(getSchedule()).toEqual({ '2': roomEntry });

    clearSchedule();
    expect(getSchedule()).toEqual({});
  });

  it('rejects an empty period or an invalid entry', () => {
    expect(() => setPeriod('', teacherEntry)).toThrow();
    expect(() =>
      setPeriod('1', { kind: 'teacher', class_label: 'x' } as unknown as ScheduleEntry),
    ).toThrow();
  });

  it('persists to localStorage under the namespaced key', () => {
    setPeriod('1', teacherEntry);
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw as string)).toEqual({
      version: 1,
      schedule: { '1': teacherEntry },
      my_locker: null,
    });
  });
});

describe('locker API', () => {
  it('sets and clears a valid locker', () => {
    setMyLocker(1042);
    expect(getMyLocker()).toBe(1042);
    setMyLocker(null);
    expect(getMyLocker()).toBeNull();
  });

  it('rejects invalid locker numbers', () => {
    for (const bad of [0, -1, 1.5, 100000]) {
      expect(() => setMyLocker(bad)).toThrow();
    }
  });
});

describe('reactivity', () => {
  it('notifies subscribers and changes the snapshot reference only on write', () => {
    const before = getSnapshot();
    expect(getSnapshot()).toBe(before); // stable until a write

    let calls = 0;
    const unsubscribe = subscribe(() => {
      calls += 1;
    });

    setPeriod('1', teacherEntry);
    expect(calls).toBe(1);
    expect(getSnapshot()).not.toBe(before);

    unsubscribe();
    setPeriod('2', roomEntry);
    expect(calls).toBe(1); // no longer notified after unsubscribe
  });
});
