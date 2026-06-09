import { useSyncExternalStore } from 'react';
import {
  getSnapshot,
  setContrast,
  setTextSize,
  subscribe,
  type Contrast,
  type DisplayPrefs,
  type TextSize,
} from '../lib/displayPrefs';

/** Reactive text-size + contrast prefs with setters. Re-renders when either changes. */
export function useDisplayPrefs(): DisplayPrefs & {
  setTextSize: (textSize: TextSize) => void;
  setContrast: (contrast: Contrast) => void;
} {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { ...state, setTextSize, setContrast };
}
