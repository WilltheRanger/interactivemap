import { useSearchParams } from 'react-router-dom';
import { Segmented, type SegmentedOption } from '../account/Segmented';
import { PlanBody } from '../plan/PlanScreen';
import { TodaySchedule } from './TodaySchedule';
import { ClassList } from './ClassList';
import './Schedule.css';

type View = 'year' | 'plan';

const VIEW_OPTIONS: SegmentedOption<View>[] = [
  { value: 'year', label: 'This Year' },
  { value: 'plan', label: '4-Year Plan' },
];

/**
 * The combined Schedule destination. "This Year" pairs the live bell schedule (today's variant, with
 * the current period + your class highlighted) with the per-period class editor. "4-Year Plan" is the
 * credit planner. The view is reflected in ?view= so the header/Account can deep-link straight to the
 * plan (the old /plan route redirects here).
 */
export function ScheduleScreen() {
  const [params, setParams] = useSearchParams();
  const view: View = params.get('view') === 'plan' ? 'plan' : 'year';

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
          <TodaySchedule />
          <h2 className="schedule__subhead">Your classes</h2>
          <ClassList />
        </>
      ) : (
        <PlanBody />
      )}
    </section>
  );
}
