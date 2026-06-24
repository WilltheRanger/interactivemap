/**
 * Theme preference — persisted ONLY to localStorage (on-device, like personalStore; never sent to a
 * server). The user picks Light / Dark / System; we resolve "System" against the OS color scheme and
 * set `data-theme` on <html>, which flips the token values in tokens.css.
 *
 * Implemented as a tiny external store (subscribe / getSnapshot) so React reads it reactively via
 * useSyncExternalStore (see ../data/useTheme.ts). `getSnapshot` returns a stable reference that only
 * changes on write or an OS scheme change (while on "System").
 */
export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeState {
  preference: ThemePreference;
  resolved: ResolvedTheme;
}

export const THEME_KEY = 'dbhs-wayfinder:theme';
const PREFERENCES = ['light', 'dark', 'system'] as const;

function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === 'string' && (PREFERENCES as readonly string[]).includes(value);
}

function prefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === 'system') return prefersDark() ? 'dark' : 'light';
  return preference;
}

function loadPreference(): ThemePreference {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    return isThemePreference(raw) ? raw : 'system';
  } catch {
    return 'system';
  }
}

let preference: ThemePreference = loadPreference();
let snapshot: ThemeState = { preference, resolved: resolveTheme(preference) };
const listeners = new Set<() => void>();

function apply(): void {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = snapshot.resolved;
  }
}

function refresh(): void {
  snapshot = { preference, resolved: resolveTheme(preference) };
  apply();
  for (const listener of listeners) listener();
}

// ── External-store API (for useSyncExternalStore) ──────────────────────────────
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): ThemeState {
  return snapshot;
}

export function setPreference(next: ThemePreference): void {
  if (!isThemePreference(next) || next === preference) return;
  preference = next;
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    // Ignore quota / unavailable storage; in-memory state + applied theme still update.
  }
  refresh();
}

/**
 * Set the initial `data-theme` and wire the OS-scheme + cross-tab listeners. Call once at startup
 * (after the inline no-flash script in index.html has already set the first paint's theme).
 */
export function initTheme(): void {
  apply();
  if (typeof window === 'undefined') return;

  if (typeof window.matchMedia === 'function') {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (preference === 'system') refresh();
    });
  }

  window.addEventListener('storage', (event) => {
    if (event.key !== THEME_KEY) return;
    preference = isThemePreference(event.newValue) ? event.newValue : 'system';
    refresh();
  });
}
