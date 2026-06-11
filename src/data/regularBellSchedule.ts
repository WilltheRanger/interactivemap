import type { BellScheduleVariant } from '../lib/bellSchedule';

/**
 * Offline fallback — the standard Regular-day bell times, transcribed from the teacher's feed. Used
 * ONLY when the live proxy can't be reached, so the schedule view still works (clearly labeled as
 * not-live, since it can't know about special days). Keep in sync if the school changes Regular-day
 * times; the live feed is the source of truth.
 */
export const FALLBACK_TODAY_KEY = 'Regular';

export const FALLBACK_SCHEDULES: BellScheduleVariant[] = [
  {
    key: 'Regular',
    print: 'Regular Schedule',
    schedule: [
      {
        key: '0',
        print: 'Period 0',
        start: '0713',
        end: '0822',
        startPrint: '07:13',
        endPrint: '08:22',
        length: '69',
      },
      {
        key: '1A',
        print: 'Period 1A',
        start: '0755',
        end: '0926',
        startPrint: '07:55',
        endPrint: '09:26',
        length: '91',
      },
      {
        key: '1',
        print: 'Period 1',
        start: '0830',
        end: '0926',
        startPrint: '08:30',
        endPrint: '09:26',
        length: '56',
      },
      {
        key: '2',
        print: 'Period 2',
        start: '0934',
        end: '1030',
        startPrint: '09:34',
        endPrint: '10:30',
        length: '56',
      },
      {
        key: 'brunch',
        print: 'Brunch',
        start: '1030',
        end: '1040',
        startPrint: '10:30',
        endPrint: '10:40',
        length: '10',
      },
      {
        key: '3',
        print: 'Period 3',
        start: '1048',
        end: '1144',
        startPrint: '10:48',
        endPrint: '11:44',
        length: '56',
      },
      {
        key: '4',
        print: 'Period 4',
        start: '1152',
        end: '1248',
        startPrint: '11:52',
        endPrint: '12:48',
        length: '56',
      },
      {
        key: 'lunch',
        print: 'Lunch',
        start: '1248',
        end: '1323',
        startPrint: '12:48',
        endPrint: '01:23',
        length: '35',
      },
      {
        key: '5',
        print: 'Period 5',
        start: '1331',
        end: '1427',
        startPrint: '01:31',
        endPrint: '02:27',
        length: '56',
      },
      {
        key: '6',
        print: 'Period 6',
        start: '1435',
        end: '1530',
        startPrint: '02:35',
        endPrint: '03:30',
        length: '55',
      },
      {
        key: '6A',
        print: 'Period 6A',
        start: '1435',
        end: '1559',
        startPrint: '02:35',
        endPrint: '03:59',
        length: '84',
      },
    ],
  },
];
