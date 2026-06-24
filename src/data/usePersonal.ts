import { useSyncExternalStore } from 'react';
import type { MyLocker, Personal, Schedule } from '../types/personal';
import { getSnapshot, subscribe } from '../lib/personalStore';

/** Reactive read of the whole personal store. Re-renders when schedule or locker changes. */
export function usePersonal(): Personal {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useSchedule(): Schedule {
  return usePersonal().schedule;
}

export function useMyLocker(): MyLocker | null {
  return usePersonal().my_locker;
}
