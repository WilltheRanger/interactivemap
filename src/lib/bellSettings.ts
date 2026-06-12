/**
 * Bell-schedule settings — the student's toggles that tune the schedule feed + class reminders,
 * persisted to localStorage only (same external-store shape as displayPrefs/personalStore so React
 * reads it via useSyncExternalStore and other tabs stay in sync). pathwaysAcademy/rallyScheduleB
 * change which daily variant the proxy returns; period0/1a/6a flag the optional periods a student
 * has (so unused rows hide); notificationsEnabled + warningMinutes drive the end-of-period reminders.
 */
export interface BellSettings {
  pathwaysAcademy: boolean;
  rallyScheduleB: boolean;
  period0: boolean;
  period1a: boolean;
  period6a: boolean;
  notificationsEnabled: boolean;
  warningMinutes: number;
}

export const BELL_SETTINGS_KEY = 'dbhs-wayfinder:bell-settings:v1';

const BOOL_KEYS = [
  'pathwaysAcademy',
  'rallyScheduleB',
  'period0',
  'period1a',
  'period6a',
  'notificationsEnabled',
] as const;
export type BellBoolKey = (typeof BOOL_KEYS)[number];

/** Allowed reminder lead times (minutes before a class ends). */
export const WARNING_MINUTE_CHOICES = [2, 5, 10] as const;
const DEFAULT_WARNING = 5;

function defaults(): BellSettings {
  return {
    pathwaysAcademy: false,
    rallyScheduleB: false,
    period0: false,
    period1a: false,
    period6a: false,
    notificationsEnabled: false,
    warningMinutes: DEFAULT_WARNING,
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function isWarningChoice(v: unknown): v is number {
  return typeof v === 'number' && (WARNING_MINUTE_CHOICES as readonly number[]).includes(v);
}

/** Normalize any stored/unknown blob into valid settings; unknown fields fall back to defaults. */
export function migrateBellSettings(raw: unknown): BellSettings {
  const out = defaults();
  if (!isRecord(raw)) return out;
  for (const key of BOOL_KEYS) {
    if (raw[key] === true) out[key] = true;
  }
  if (isWarningChoice(raw.warningMinutes)) out.warningMinutes = raw.warningMinutes;
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

export function setBellSetting(key: BellBoolKey, value: boolean): void {
  if (current[key] === value) return;
  persist({ ...current, [key]: value });
}

export function setWarningMinutes(minutes: number): void {
  const next = isWarningChoice(minutes) ? minutes : DEFAULT_WARNING;
  if (current.warningMinutes === next) return;
  persist({ ...current, warningMinutes: next });
}
