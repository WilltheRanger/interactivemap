/**
 * Bell-schedule settings — the student's toggles that tune the schedule feed, persisted to
 * localStorage only (same external-store shape as displayPrefs/personalStore so React reads it via
 * useSyncExternalStore and other tabs stay in sync). pathwaysAcademy/rallyScheduleB change which
 * daily variant the proxy returns; period0/1a/6a flag the optional periods a student actually has,
 * so the schedule can hide the rows that don't apply to them.
 */
export interface BellSettings {
  pathwaysAcademy: boolean;
  rallyScheduleB: boolean;
  period0: boolean;
  period1a: boolean;
  period6a: boolean;
}

export const BELL_SETTINGS_KEY = 'dbhs-wayfinder:bell-settings:v1';

export const BELL_SETTING_KEYS = [
  'pathwaysAcademy',
  'rallyScheduleB',
  'period0',
  'period1a',
  'period6a',
] as const;

function defaults(): BellSettings {
  return {
    pathwaysAcademy: false,
    rallyScheduleB: false,
    period0: false,
    period1a: false,
    period6a: false,
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

/** Normalize any stored/unknown blob into valid settings; unknown fields fall back to false. */
export function migrateBellSettings(raw: unknown): BellSettings {
  const out = defaults();
  if (!isRecord(raw)) return out;
  for (const key of BELL_SETTING_KEYS) {
    if (raw[key] === true) out[key] = true;
  }
  return out;
}

function loadFromStorage(): BellSettings {
  try {
    const raw = localStorage.getItem(BELL_SETTINGS_KEY);
    return raw == null ? defaults() : migrateBellSettings(JSON.parse(raw) as unknown);
  } catch {
    return defaults();
  }
}

let current: BellSettings = loadFromStorage();
const listeners = new Set<() => void>();

function persist(next: BellSettings): void {
  current = next;
  try {
    localStorage.setItem(BELL_SETTINGS_KEY, JSON.stringify(next));
  } catch {
    // ignore quota / unavailable storage; in-memory state still updates
  }
  for (const l of listeners) l();
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== BELL_SETTINGS_KEY) return;
    current = event.newValue == null ? defaults() : migrateBellSettings(safeJson(event.newValue));
    for (const l of listeners) l();
  });
}

export function subscribeBellSettings(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getBellSettingsSnapshot(): BellSettings {
  return current;
}

export function setBellSetting(key: keyof BellSettings, value: boolean): void {
  if (current[key] === value) return;
  persist({ ...current, [key]: value });
}
