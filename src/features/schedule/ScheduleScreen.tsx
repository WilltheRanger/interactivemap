import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronDown, ChevronRight, FlaskConical, SlidersHorizontal } from 'lucide-react';
import { Switch } from '../../components';
import { Segmented, type SegmentedOption } from '../account/Segmented';
import { PlanBody } from '../plan/PlanScreen';
import { TodaySchedule } from './TodaySchedule';
import { ClassList } from './ClassList';
import { useBellSettings } from '../../data/useBellSettings';
import {
  setBellSetting,
  setWarningMinutes,
  WARNING_MINUTE_CHOICES,
  type BellBoolKey,
} from '../../lib/bellSettings';
import { FALLBACK_SCHEDULES } from '../../data/regularBellSchedule';
import './Schedule.css';

type View = 'year' | 'plan';

const VIEW_OPTIONS: SegmentedOption<View>[] = [
  { value: 'year', label: 'This Year' },
  { value: 'plan', label: '4-Year Plan' },
];

const DAY_TOGGLES: { key: BellBoolKey; label: string }[] = [
  { key: 'pathwaysAcademy', label: 'Pathways Academy' },
  { key: 'rallyScheduleB', label: 'Rally Schedule B' },
];
const PERIOD_TOGGLES: { key: BellBoolKey; label: string }[] = [
  { key: 'period0', label: 'Period 0' },
  { key: 'period1a', label: 'Period 1A' },
  { key: 'period6a', label: 'Period 6A' },
];
const WARNING_OPTIONS: SegmentedOption<string>[] = WARNING_MINUTE_CHOICES.map((m) => ({
  value: String(m),
  label: `${m} min`,
}));

/**
 * The combined Schedule destination. "This Year" pairs the live bell schedule (today's variant, with
 * the current period + your class highlighted) with the per-period class editor. "4-Year Plan" is the
 * credit planner. The view is reflected in ?view= so the header/Account can deep-link straight to the
 * plan (the old /plan route redirects here). ?preview=1 reveals an owner-only schedule preview.
 */
export function ScheduleScreen() {
  const [params, setParams] = useSearchParams();
  const view: View = params.get('view') === 'plan' ? 'plan' : 'year';
  const previewing = params.get('preview') === '1';

  const setView = (next: View) => {
    const updated = new URLSearchParams(params);
    if (next === 'plan') updated.set('view', 'plan');
    else updated.delete('view');
    setParams(updated, { replace: true });
  };

  return (
    <section className="screen schedule" aria-labelledby="schedule-title">
      <h1 id="schedule-title" className="screen__title">
        Schedule
      </h1>

      <div className="schedule__toggle">
        <Segmented
          ariaLabel="Schedule view"
          layoutId="schedule-view-seg"
          value={view}
          options={VIEW_OPTIONS}
          onChange={setView}
        />
      </div>

      {view === 'year' ? (
        <>
          {previewing ? <PreviewPanel /> : <TodaySchedule />}
          <ScheduleOptions />
          <h2 className="schedule__subhead">Your classes</h2>
          <ClassList />
        </>
      ) : (
        <PlanBody />
      )}
    </section>
  );
}

/** Collapsible toggles that tune the schedule feed, which optional periods show, and reminders. */
function ScheduleOptions() {
  const settings = useBellSettings();
  const [open, setOpen] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  );

  const renderRow = ({ key, label }: { key: BellBoolKey; label: string }) => (
    <div key={key} className="schedule__opt-row">
      <span>{label}</span>
      <Switch checked={settings[key]} onChange={(v) => setBellSetting(key, v)} label={label} />
    </div>
  );

  const toggleNotifications = async (on: boolean) => {
    if (on && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      try {
        setPermission(await Notification.requestPermission());
      } catch {
        // permission prompt can reject in some contexts; the hint below covers it
      }
    }
    setBellSetting('notificationsEnabled', on);
  };

  return (
    <div className="schedule__options">
      <button
        type="button"
        className="schedule__options-toggle"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <SlidersHorizontal size={16} aria-hidden="true" />
        <span>Schedule options</span>
        <span className="schedule__options-chevron" aria-hidden="true">
          {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </span>
      </button>

      {open && (
        <div className="schedule__options-body">
          <p className="schedule__opt-hint">
            Pathways / Rally change which schedule the live feed returns. The period toggles show
            the optional periods you have.
          </p>
          <p className="schedule__opt-group-title">Which day applies</p>
          {DAY_TOGGLES.map(renderRow)}
          <p className="schedule__opt-group-title">Show optional periods</p>
          {PERIOD_TOGGLES.map(renderRow)}

          <p className="schedule__opt-group-title">Reminders</p>
          <div className="schedule__opt-row">
            <span>Class reminders</span>
            <Switch
              checked={settings.notificationsEnabled}
              onChange={(v) => void toggleNotifications(v)}
              label="Class reminders"
            />
          </div>
          {settings.notificationsEnabled && (
            <>
              <div className="schedule__opt-row">
                <span>Warn before class ends</span>
                <Segmented
                  ariaLabel="Reminder lead time"
                  layoutId="warn-seg"
                  value={String(settings.warningMinutes)}
                  options={WARNING_OPTIONS}
                  onChange={(v) => setWarningMinutes(Number(v))}
                />
              </div>
              {permission === 'denied' && (
                <p className="schedule__opt-hint">
                  Notifications are blocked — enable them for this site in your browser settings.
                </p>
              )}
              {permission === 'unsupported' && (
                <p className="schedule__opt-hint">
                  This browser doesn&rsquo;t support notifications.
                </p>
              )}
              <p className="schedule__opt-hint">
                Reminders fire only while the app is open in your browser.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Owner-only preview (via ?preview=1): pin a variant + time so the highlight/countdown is visible. */
function PreviewPanel() {
  const [variantKey, setVariantKey] = useState(FALLBACK_SCHEDULES[0].key);
  const [time, setTime] = useState(() => {
    const d = new Date();
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });

  const [hh, mm] = time.split(':').map(Number);
  const now = new Date();
  now.setHours(Number.isFinite(hh) ? hh : 10, Number.isFinite(mm) ? mm : 0, 0, 0);

  return (
    <>
      <div className="schedule__preview">
        <p className="schedule__preview-title">
          <FlaskConical size={14} aria-hidden="true" /> Preview — only visible with ?preview=1
        </p>
        <div className="schedule__preview-fields">
          <label className="schedule__preview-field">
            <span>Schedule</span>
            <select value={variantKey} onChange={(e) => setVariantKey(e.target.value)}>
              {FALLBACK_SCHEDULES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.print}
                </option>
              ))}
            </select>
          </label>
          <label className="schedule__preview-field">
            <span>Time</span>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </label>
        </div>
        <p className="schedule__opt-hint">
          Frozen at the chosen time (the countdown doesn&rsquo;t tick here).
        </p>
      </div>
      <TodaySchedule preview={{ variantKey, now }} />
    </>
  );
}
