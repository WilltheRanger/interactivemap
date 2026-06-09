import { useSyncExternalStore } from 'react';
import {
  getSnapshot,
  setPreference,
  subscribe,
  type ThemePreference,
  type ThemeState,
} from '../lib/theme';

/**
 * Reactive theme preference. Returns the chosen preference, the resolved light/dark value (System is
 * resolved against the OS), and a setter. Re-renders on a write or — while on System — an OS change.
 */
export function useTheme(): ThemeState & { setPreference: (preference: ThemePreference) => void } {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { ...state, setPreference };
}
