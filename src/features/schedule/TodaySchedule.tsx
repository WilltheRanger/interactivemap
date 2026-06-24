import { CalendarOff, FlaskConical, RefreshCw, Timer, WifiOff } from 'lucide-react';
import { Skeleton } from '../../components';
import { useBellFeed } from '../../data/useBellFeed';
import { useBellSettings } from '../../data/useBellSettings';
import { useNow } from '../../data/useNow';
import { useSchedule } from '../../data/usePersonal';
import { FALLBACK_SCHEDULES, FALLBACK_TODAY_KEY } from '../../data/regularBellSchedule';
import {
  computeTimings,
  findVariant,
  formatRemaining,
  isClassPeriod,
  periodIdForBellKey,
  type BellScheduleVariant,
  type PeriodTiming,
} from '../../lib/bellSchedule';
import './TodaySchedule.css';

/** Preview override (dev/owner only) — pin a variant + a simulated clock so the highlight is visible. */
export interface PreviewMode {
  variantKey: string;
  now: Date;
}

/** The student's saved class label for a bell row (class periods only), or null. */
function classLabelFor(key: string, schedule: ReturnType<typeof useSchedule>): string | null {
  const periodId = periodIdForBellKey(key);
  if (!periodId) return null;
  return schedule[periodId]?.class_label || null;
}

/**
 * Today's bell schedule with the live period highlighted. Reads the proxied feed (falls back to the
 * bundled variants, clearly labeled, when it can't be reached), ticks once a second, and lines the
 * student's saved classes up against the active period — so the top banner answers "what class am I
 * in right now?" Overlapping periods (6 / 6A) both highlight, per the source app. Optional periods
 * (0 / 1A / 6A) are hidden unless the student turns them on in settings. A preview override pins a
 * variant + clock so the highlight can be demoed off-season.
 */
export function TodaySchedule({ preview }: { preview?: PreviewMode }) {
  const settings = useBellSettings();
  const feed = useBellFeed(settings);
  const realNow = useNow();
  const schedule = useSchedule();

  const now = preview ? preview.now : realNow;

  if (feed.isPending && !preview) {
    return (
      <div
        className="bell-loading"
        aria-busy="true"
        role="status"
        aria-label="Loading the schedule"
      >
        <Skeleton height={72} radius="var(--radius-lg)" />
        <Skeleton height={260} radius="var(--radius-lg)" />
      </div>
    );
  }

  const feedData = feed.data;
  const live = feed.isSuccess && !!feedData && feedData.schedules.length > 0;
  const schedules: BellScheduleVariant[] =
    live && feedData ? feedData.schedules : FALLBACK_SCHEDULES;
  const todayKey = preview
    ? preview.variantKey
    : live && feedData
      ? feedData.todayKey
      : FALLBACK_TODAY_KEY;
  // Resolve against the loaded schedules, then the bundled set (so preview always finds its variant).
  const variant = findVariant(schedules, todayKey) ?? findVariant(FALLBACK_SCHEDULES, todayKey);

  // Live feed, but today's key isn't a known schedule (empty / holiday / break) → no school.
  if (!preview && live && !variant) {
    return (
      <div className="bell-card bell-empty" role="status">
        <CalendarOff size={22} aria-hidden="true" />
        <div>
          <p className="bell-empty__title">No school today</p>
          <p className="bell-empty__sub">
            There&rsquo;s no bell schedule for right now. Enjoy the day off!
          </p>
        </div>
        <RefreshButton onClick={() => void feed.refetch()} busy={feed.isFetching} />
      </div>
    );
  }
  if (!variant) {
    return (
      <div className="bell-card bell-empty" role="status">
        <CalendarOff size={22} aria-hidden="true" />
        <div>
          <p className="bell-empty__title">Schedule unavailable</p>
          <p className="bell-empty__sub">
            Couldn&rsquo;t load the bell schedule. Try again in a moment.
          </p>
        </div>
        <RefreshButton onClick={() => void feed.refetch()} busy={feed.isFetching} />
      </div>
    );
  }

  // Hide optional periods the student doesn't have (preview shows everything).
  const showRow = (key: string): boolean => {
    if (preview) return true;
    if (key === '0') return settings.period0;
    if (key === '1A') return settings.period1a;
    if (key === '6A') return settings.period6a;
    return true;
  };

  const timings = computeTimings(variant, now).filter((t) => showRow(t.period.key));
  const active = timings.filter((t) => t.active);
  // Headline = the in-session class period the student actually has, else any active class period,
  // else any active row (so a passing period or break still shows a countdown).
  const headline =
    active.find((t) => classLabelFor(t.period.key, schedule)) ??
    active.find((t) => isClassPeriod(t.period.key)) ??
    active[0] ??
    null;

  return (
    <div className="bell-card">
      <div className="bell-card__head">
        <div>
          <p className="bell-card__title">{variant.print}</p>
          {preview ? (
            <p className="bell-card__preview">
              <FlaskConical size={12} aria-hidden="true" /> Preview
            </p>
          ) : (
            !live && (
              <p className="bell-card__offline">
                <WifiOff size={12} aria-hidden="true" /> Standard times — couldn&rsquo;t reach live
                data
              </p>
            )
          )}
        </div>
        <RefreshButton onClick={() => void feed.refetch()} busy={feed.isFetching} />
      </div>

      <NowBanner headline={headline} schedule={schedule} />

      <ul className="bell-list">
        {timings.map((t) => {
          const label = classLabelFor(t.period.key, schedule);
          const isClass = isClassPeriod(t.period.key);
          return (
            <li
              key={t.period.key}
              className={['bell-row', t.active ? 'is-active' : '', isClass ? '' : 'bell-row--break']
                .filter(Boolean)
                .join(' ')}
              aria-current={t.active ? 'true' : undefined}
            >
              <span className="bell-row__main">
                <span className="bell-row__name">{t.period.print}</span>
                {label && <span className="bell-row__class">{label}</span>}
              </span>
              <span className="bell-row__time">
                {t.period.startPrint}&ndash;{t.period.endPrint}
              </span>
              <span className="bell-row__remaining">
                {t.active && t.secondsRemaining != null && (
                  <>
                    <Timer size={13} aria-hidden="true" />
                    {formatRemaining(t.secondsRemaining)}
                  </>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function NowBanner({
  headline,
  schedule,
}: {
  headline: PeriodTiming | null;
  schedule: ReturnType<typeof useSchedule>;
}) {
  if (!headline) {
    return (
      <div className="bell-now bell-now--idle">
        <span className="bell-now__label">Not in session</span>
        <span className="bell-now__what">No class right now</span>
      </div>
    );
  }
  const label = classLabelFor(headline.period.key, schedule);
  return (
    <div className="bell-now">
      <span className="bell-now__label">In session</span>
      <span className="bell-now__what">
        {headline.period.print}
        {label && <span className="bell-now__class"> · {label}</span>}
      </span>
      {headline.secondsRemaining != null && (
        <span className="bell-now__count">
          <Timer size={14} aria-hidden="true" />
          {formatRemaining(headline.secondsRemaining)} left
        </span>
      )}
    </div>
  );
}

function RefreshButton({ onClick, busy }: { onClick: () => void; busy: boolean }) {
  return (
    <button
      type="button"
      className="bell-refresh"
      onClick={onClick}
      aria-label="Refresh the schedule"
      disabled={busy}
    >
      <RefreshCw size={16} aria-hidden="true" className={busy ? 'bell-refresh--spin' : undefined} />
    </button>
  );
}
