import { useEffect } from 'react';
import { useBellFeed } from './useBellFeed';
import { useBellSettings } from './useBellSettings';
import { useSchedule } from './usePersonal';
import { findVariant, periodIdForBellKey, planReminders } from '../lib/bellSchedule';

/**
 * Schedules end-of-period class reminders while the app is open. Honest about the web's limits: it
 * uses setTimeout + the Notifications API, so reminders fire only while a tab/PWA is running — true
 * background delivery would need Push infrastructure (a future addition). Only schedules from LIVE
 * feed data (never the offline fallback), so it can't fire at the wrong times on a special day, and
 * reschedules whenever the schedule, lead time, or saved classes change.
 */
export function useBellNotifications(): void {
  const settings = useBellSettings();
  const schedule = useSchedule();
  const enabled = settings.notificationsEnabled;
  const warningMinutes = settings.warningMinutes;
  const feed = useBellFeed(settings, enabled);
  const feedData = feed.data;

  useEffect(() => {
    if (!enabled) return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    if (!feedData) return;
    const variant = findVariant(feedData.schedules, feedData.todayKey);
    if (!variant) return;

    const labelFor = (periodKey: string): string | null => {
      const id = periodIdForBellKey(periodKey);
      return id ? schedule[id]?.class_label || null : null;
    };
    const reminders = planReminders(variant, warningMinutes, labelFor, new Date());
    const icon = `${import.meta.env.BASE_URL}icons/icon-192.png`;
    const timers = reminders.map((reminder) =>
      window.setTimeout(
        () => {
          try {
            new Notification(reminder.title, {
              body: reminder.body,
              tag: `bell-${reminder.key}`,
              icon,
            });
          } catch {
            // some embedded webviews throw on construction; nothing actionable
          }
        },
        Math.max(0, reminder.fireAt - Date.now()),
      ),
    );
    return () => timers.forEach((t) => clearTimeout(t));
  }, [enabled, warningMinutes, feedData, schedule]);
}
