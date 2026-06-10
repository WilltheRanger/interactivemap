import { describe, expect, it } from 'vitest';
import { googleCalendarUrl, icsFileContents, toUtcStamp } from './calendar';

const event = {
  title: 'Back-to-School Night',
  start: new Date('2026-08-20T18:30:00Z'),
  details: 'Meet the teachers',
  location: 'DBHS Gym',
  uid: 'abc-123',
};

describe('toUtcStamp', () => {
  it('formats in UTC basic format', () => {
    expect(toUtcStamp(new Date('2026-08-20T18:30:00Z'))).toBe('20260820T183000Z');
  });
});

describe('googleCalendarUrl', () => {
  it('pre-fills title, a 1-hour window, details, and location', () => {
    const url = new URL(googleCalendarUrl(event));
    expect(url.origin + url.pathname).toBe('https://calendar.google.com/calendar/render');
    expect(url.searchParams.get('action')).toBe('TEMPLATE');
    expect(url.searchParams.get('text')).toBe('Back-to-School Night');
    expect(url.searchParams.get('dates')).toBe('20260820T183000Z/20260820T193000Z');
    expect(url.searchParams.get('details')).toBe('Meet the teachers');
    expect(url.searchParams.get('location')).toBe('DBHS Gym');
  });

  it('omits empty optional fields', () => {
    const url = new URL(googleCalendarUrl({ title: 'T', start: event.start }));
    expect(url.searchParams.has('details')).toBe(false);
    expect(url.searchParams.has('location')).toBe(false);
  });
});

describe('icsFileContents', () => {
  const now = new Date('2026-06-10T12:00:00Z');

  it('emits a valid VEVENT with CRLF line endings', () => {
    const ics = icsFileContents(event, now);
    expect(ics).toContain('BEGIN:VCALENDAR\r\n');
    expect(ics).toContain('UID:abc-123@dbhs-wayfinder\r\n');
    expect(ics).toContain('DTSTAMP:20260610T120000Z\r\n');
    expect(ics).toContain('DTSTART:20260820T183000Z\r\n');
    expect(ics).toContain('DTEND:20260820T193000Z\r\n');
    expect(ics).toContain('SUMMARY:Back-to-School Night\r\n');
    expect(ics).toContain('LOCATION:DBHS Gym\r\n');
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
  });

  it('escapes RFC 5545 special characters', () => {
    const ics = icsFileContents(
      { title: 'a,b;c\\d', start: event.start, details: 'line1\nline2' },
      now,
    );
    expect(ics).toContain('SUMMARY:a\\,b\\;c\\\\d');
    expect(ics).toContain('DESCRIPTION:line1\\nline2');
  });

  it('folds lines longer than 75 octets', () => {
    const ics = icsFileContents({ title: 'x'.repeat(200), start: event.start }, now);
    for (const line of ics.split('\r\n')) expect(line.length).toBeLessThanOrEqual(75);
  });
});
