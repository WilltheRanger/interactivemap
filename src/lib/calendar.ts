/**
 * "Add to Calendar" helpers for announcement events: a pre-filled Google Calendar URL and a
 * downloadable .ics (RFC 5545) fallback for Apple/Outlook/etc. Pure functions except downloadIcs.
 */

export interface CalendarEvent {
  title: string;
  start: Date;
  /** Events have no stored end time — default to a 1-hour block. */
  durationMinutes?: number;
  details?: string;
  location?: string;
  /** Stable id (the announcement id) so re-downloads update rather than duplicate. */
  uid?: string;
}

const DEFAULT_DURATION_MIN = 60;

const pad = (n: number) => String(n).padStart(2, '0');

/** UTC basic format (YYYYMMDDTHHMMSSZ) used by both Google Calendar URLs and ICS. */
export function toUtcStamp(date: Date): string {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

function endOf(event: CalendarEvent): Date {
  return new Date(event.start.getTime() + (event.durationMinutes ?? DEFAULT_DURATION_MIN) * 60_000);
}

export function googleCalendarUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${toUtcStamp(event.start)}/${toUtcStamp(endOf(event))}`,
  });
  if (event.details) params.set('details', event.details);
  if (event.location) params.set('location', event.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** RFC 5545 TEXT escaping: backslash, semicolon, comma, newlines. */
const escapeIcsText = (text: string) =>
  text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** RFC 5545 line folding: lines longer than 75 octets continue on the next line after a space. */
const foldIcsLine = (line: string) => {
  const parts: string[] = [];
  for (let i = 0; i < line.length; i += 74) parts.push(line.slice(i, i + 74));
  return parts.join('\r\n ');
};

export function icsFileContents(event: CalendarEvent, now: Date = new Date()): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DBHS Wayfinder//EN',
    'BEGIN:VEVENT',
    `UID:${event.uid ?? toUtcStamp(now)}@dbhs-wayfinder`,
    `DTSTAMP:${toUtcStamp(now)}`,
    `DTSTART:${toUtcStamp(event.start)}`,
    `DTEND:${toUtcStamp(endOf(event))}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    ...(event.details ? [`DESCRIPTION:${escapeIcsText(event.details)}`] : []),
    ...(event.location ? [`LOCATION:${escapeIcsText(event.location)}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(foldIcsLine).join('\r\n') + '\r\n';
}

/** Offer the event as a .ics download (Apple/Outlook fallback to the Google Calendar link). */
export function downloadIcs(event: CalendarEvent, filename = 'event.ics'): void {
  const blob = new Blob([icsFileContents(event)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
