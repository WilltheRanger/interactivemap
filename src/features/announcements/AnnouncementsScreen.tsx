import { motion } from 'framer-motion';
import { CalendarDays, CalendarPlus, MapPin } from 'lucide-react';
import { Button, Card, Skeleton } from '../../components';
import { useAnnouncements } from '../../data/hooks';
import { googleCalendarUrl, type CalendarEvent } from '../../lib/calendar';
import type { Announcement } from '../../lib/refData';
import { fadeUpItem, spring, staggerContainer, tap } from '../../lib/motion';
import './Announcements.css';

/** "Just now" / "12m ago" / "3h ago" / "5d ago", then the plain date. */
function formatRelativeDate(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const mins = Math.floor((now.getTime() - then.getTime()) / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 24 * 60) return `${Math.floor(mins / 60)}h ago`;
  if (mins < 7 * 24 * 60) return `${Math.floor(mins / (24 * 60))}d ago`;
  return then.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function toCalendarEvent(a: Announcement): CalendarEvent | null {
  if (!a.event_date) return null;
  return {
    title: a.event_title ?? a.title,
    start: new Date(a.event_date),
    details: a.body,
    location: a.event_location ?? undefined,
    uid: a.id,
  };
}

function AnnouncementCard({ announcement }: { announcement: Announcement }) {
  const event = toCalendarEvent(announcement);
  const created = new Date(announcement.created_at);
  return (
    <Card className="ann-card">
      <div className="ann-card__head">
        <h2 className="ann-card__title">{announcement.title}</h2>
        <time
          className="ann-card__date"
          dateTime={announcement.created_at}
          title={created.toLocaleString()}
        >
          {formatRelativeDate(announcement.created_at)}
        </time>
      </div>
      <p className="ann-card__body">{announcement.body}</p>

      {event && (
        <div className="ann-card__event">
          <p className="ann-card__event-info">
            <span className="ann-card__event-line">
              <CalendarDays size={16} aria-hidden="true" />
              <strong>{event.title}</strong>
            </span>
            <span className="ann-card__event-line">
              {event.start.toLocaleString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </span>
            {event.location && (
              <span className="ann-card__event-line">
                <MapPin size={16} aria-hidden="true" />
                {event.location}
              </span>
            )}
          </p>
          <div className="ann-card__event-actions">
            {/* External link styled as the primary button (LinkButton is router-only). */}
            <motion.span className="btn-press" whileTap={tap} transition={spring.snappy}>
              <a
                className="btn btn--primary"
                href={googleCalendarUrl(event)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="btn__icon" aria-hidden="true">
                  <CalendarPlus size={18} />
                </span>
                Add to Calendar
              </a>
            </motion.span>
          </div>
        </div>
      )}
    </Card>
  );
}

/**
 * Announcements: a read-only feed of staff posts (newest first). Posts with an event date carry
 * an "Add to Calendar" pre-filled Google Calendar link. Written from /admin only.
 */
export function AnnouncementsScreen() {
  const announcements = useAnnouncements();

  return (
    <section className="screen" aria-labelledby="announcements-title">
      <h1 id="announcements-title" className="screen__title">
        News
      </h1>
      <p className="screen__sub">News and events from school staff.</p>
      <div className="screen__body">
        {announcements.isPending && (
          <div className="ann-list" aria-busy="true" role="status" aria-label="Loading news">
            <Skeleton height={120} radius="var(--radius-lg)" />
            <Skeleton height={120} radius="var(--radius-lg)" />
            <Skeleton height={120} radius="var(--radius-lg)" />
          </div>
        )}

        {announcements.isError && (
          <div className="ann-panel ann-panel--error" role="alert">
            <p className="ann-panel__title">Couldn&rsquo;t load the news</p>
            <p>Check your connection and try again.</p>
            <Button variant="primary" onClick={() => void announcements.refetch()}>
              Try again
            </Button>
          </div>
        )}

        {announcements.isSuccess && announcements.data.length === 0 && (
          <div className="ann-panel" role="status">
            <p className="ann-panel__title">No news yet</p>
            <p>News and events from school staff will show up here — check back soon.</p>
          </div>
        )}

        {announcements.isSuccess && announcements.data.length > 0 && (
          <motion.ul
            className="ann-list"
            variants={staggerContainer}
            initial="hidden"
            animate="show"
          >
            {announcements.data.map((a) => (
              <motion.li key={a.id} variants={fadeUpItem}>
                <AnnouncementCard announcement={a} />
              </motion.li>
            ))}
          </motion.ul>
        )}
      </div>
    </section>
  );
}
