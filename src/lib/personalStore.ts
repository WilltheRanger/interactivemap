/**
 * Personal data store — schedule + locker, persisted ONLY to localStorage.
 *
 * Privacy (CLAUDE.md hard rule): nothing here is ever written to Supabase or associated with the
 * signed-in Google identity. This module has no network calls by construction.
 *
 * Implemented as a tiny external store (subscribe / getSnapshot) so React components can read it
 * reactively via `useSyncExternalStore` (see ../data/usePersonal.ts), and so other tabs stay in
 * sync via the `storage` event. `getSnapshot` returns a stable reference that only changes on write.
 */
import type { MyLocker, Personal, Schedule, ScheduleEntry } from '../types/personal';

export const STORAGE_KEY = 'dbhs-wayfinder:v1';
export const CURRENT_VERSION = 2 as const;

const MAX_LOCKER = 99999;

function defaultPersonal(): Personal {
  return { version: CURRENT_VERSION, schedule: {}, my_locker: null };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isValidEntry(value: unknown): value is ScheduleEntry {
  if (!isRecord(value)) return false;
  if (typeof value.class_label !== 'string') return false;
  if (value.kind === 'teacher') return typeof value.teacher_id === 'string';
  if (value.kind === 'room') return typeof value.room_id === 'string';
  return false;
}

function isValidLocker(value: unknown): value is MyLocker {
  return (
    isRecord(value) &&
    typeof value.block_id === 'string' &&
    value.block_id.length > 0 &&
    typeof value.number === 'number' &&
    Number.isInteger(value.number) &&
    value.number > 0 &&
    value.number <= MAX_LOCKER
  );
}

/**
 * Normalize any stored/unknown blob into a valid `Personal`. Malformed fields degrade to safe
 * defaults rather than throwing, and invalid schedule entries are dropped (not kept) so a corrupt
 * entry can never crash a read.
 *
 * v1 → v2 migration: v1 and v2 share the schedule shape, so the schedule carries over. Only the
 * locker changed — v1 stored a bare number, which can't be resolved to a block now that numbers
 * repeat across blocks, so it's dropped (set to null) and the student re-picks their block + number.
 * Any other version falls back to a clean default.
 */
export function migrate(raw: unknown): Personal {
  if (!isRecord(raw)) return defaultPersonal();
  if (raw.version !== 1 && raw.version !== CURRENT_VERSION) return defaultPersonal();

  const schedule: Schedule = {};
  if (isRecord(raw.schedule)) {
    for (const [period, entry] of Object.entries(raw.schedule)) {
      if (period.length > 0 && isValidEntry(entry)) schedule[period] = entry;
    }
  }

  // isValidLocker only accepts the v2 {block_id, number} shape, so a v1 bare-number locker → null.
  const my_locker = isValidLocker(raw.my_locker) ? raw.my_locker : null;
  return { version: CURRENT_VERSION, schedule, my_locker };
}

function loadFromStorage(): Personal {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null) return defaultPersonal();
    return migrate(JSON.parse(raw) as unknown);
  } catch {
    return defaultPersonal();
  }
}

let current: Personal = loadFromStorage();
const listeners = new Set<() => void>();

function persist(next: Personal): void {
  current = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore quota / unavailable storage; in-memory state still updates so the UI stays consistent.
  }
  for (const listener of listeners) listener();
}

// Cross-tab sync: another tab writing the same key updates this tab's snapshot.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) return;
    current = event.newValue == null ? defaultPersonal() : migrate(safeJson(event.newValue));
    for (const listener of listeners) listener();
  });
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ── External-store API (for useSyncExternalStore) ──────────────────────────────
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): Personal {
  return current;
}

// ── Schedule API ───────────────────────────────────────────────────────────────
export function getSchedule(): Schedule {
  return current.schedule;
}

export function setPeriod(period: string, entry: ScheduleEntry): void {
  if (period.length === 0) throw new Error('period must be a non-empty string');
  if (!isValidEntry(entry)) throw new Error('invalid schedule entry');
  persist({ ...current, schedule: { ...current.schedule, [period]: entry } });
}

export function removePeriod(period: string): void {
  if (!(period in current.schedule)) return;
  const schedule = { ...current.schedule };
  delete schedule[period];
  persist({ ...current, schedule });
}

export function clearSchedule(): void {
  persist({ ...current, schedule: {} });
}

// ── Locker API ───────────────────────────────────────────────────────────────
export function getMyLocker(): MyLocker | null {
  return current.my_locker;
}

export function setMyLocker(value: MyLocker | null): void {
  if (value !== null && !isValidLocker(value)) {
    throw new Error('locker must be { block_id, number } or null');
  }
  persist({ ...current, my_locker: value });
}

// ── Whole-store reset ──────────────────────────────────────────────────────────
export function clearAll(): void {
  persist(defaultPersonal());
}
