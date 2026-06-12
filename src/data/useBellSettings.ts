import { useSyncExternalStore } from 'react';
import { getBellSettingsSnapshot, subscribeBellSettings } from '../lib/bellSettings';

/** Reactive read of the on-device bell-schedule settings (toggles). */
export function useBellSettings() {
  return useSyncExternalStore(
    subscribeBellSettings,
    getBellSettingsSnapshot,
    getBellSettingsSnapshot,
  );
}
