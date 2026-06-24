import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { MyLocker, ScheduleEntry } from '../types/personal';
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
const locker: MyLocker = { block_id: 'block-1', number: 1042 };

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
      expect(migrate(raw)).toEqual({ version: 2, schedule: {}, my_locker: null });
    }
  });

  it('defaults on an unknown version', () => {
    for (const version of [0, 3, 99]) {
      expect(
        migrate({ version, schedule: { '1': teacherEntry }, my_locker: locker }),
      ).toEqual({ version: 2, schedule: {}, my_locker: null });
    }
  });

  it('migrates a v1 blob: keeps the schedule, drops the un-resolvable bare-number locker', () => {
    const v1 = { version: 1, schedule: { '1': teacherEntry, '3': roomEntry }, my_locker: 1042 };
    expect(migrate(v1)).toEqual({
      version: 2,
      schedule: { '1': teacherEntry, '3': roomEntry },
      my_locker: null,
    });
  });

  it('keeps a valid v2 blob', () => {
    const v2 = {
      version: 2,
      schedule: { '1': teacherEntry, '3': roomEntry },
      my_locker: locker,
    };
    expect(migrate(v2)).toEqual(v2);
  });

  it('drops invalid schedule entries but keeps valid ones', () => {
    const raw = {
      version: 2,
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
    const bads = [
      1042, // a bare number (the v1 shape) is no longer valid
      { number: 5 }, // missing block_id
      { block_id: 'block-1' }, // missing number
      { block_id: '', number: 5 }, // empty block_id
      { block_id: 'block-1', number: 0 },
      { block_id: 'block-1', number: -1 },
      { block_id: 'block-1', number: 1.5 },
      { block_id: 'block-1', number: 100000 },
      { block_id: 'block-1', number: '5' },
    ];
    for (const bad of bads) {
      expect(migrate({ version: 2, schedule: {}, my_locker: bad }).my_locker).toBeNull();
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
      version: 2,
      schedule: { '1': teacherEntry },
      my_locker: null,
    });
  });
});

describe('locker API', () => {
  it('sets and clears a valid locker', () => {
    setMyLocker(locker);
    expect(getMyLocker()).toEqual(locker);
    setMyLocker(null);
    expect(getMyLocker()).toBeNull();
  });

  it('rejects invalid lockers', () => {
    const bads = [
      1042,
      { number: 5 },
      { block_id: 'block-1' },
      { block_id: '', number: 5 },
      { block_id: 'block-1', number: 0 },
      { block_id: 'block-1', number: 100000 },
    ];
    for (const bad of bads) {
      expect(() => setMyLocker(bad as never)).toThrow();
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
