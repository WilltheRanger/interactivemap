import { useBellNotifications } from '../../data/useBellNotifications';

/**
 * Headless mount point for class reminders — runs the scheduler app-wide (so reminders fire from any
 * screen while the app is open). Renders nothing; no-ops until the student enables reminders.
 */
export function BellNotifier() {
  useBellNotifications();
  return null;
}
