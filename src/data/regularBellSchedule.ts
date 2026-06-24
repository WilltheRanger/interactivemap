import type { BellScheduleVariant } from '../lib/bellSchedule';

/**
 * Offline fallback — the common DBHS bell-schedule variants, transcribed from the teacher's feed.
 * Used when the live proxy can't be reached (so the schedule still works, clearly labeled as
 * not-live since it can't know which one applies today) and as the option list for the preview
 * control. The live feed is the source of truth — keep these in sync if the school changes times.
 */
export const FALLBACK_TODAY_KEY = 'Regular';

const p = (
  key: string,
  print: string,
  start: string,
  end: string,
  startPrint: string,
  endPrint: string,
  length: string,
): BellScheduleVariant['schedule'][number] => ({
  key,
  print,
  start,
  end,
  startPrint,
  endPrint,
  length,
});

export const FALLBACK_SCHEDULES: BellScheduleVariant[] = [
  {
    key: 'Regular',
    print: 'Regular Schedule',
    schedule: [
      p('0', 'Period 0', '0713', '0822', '07:13', '08:22', '69'),
      p('1A', 'Period 1A', '0755', '0926', '07:55', '09:26', '91'),
      p('1', 'Period 1', '0830', '0926', '08:30', '09:26', '56'),
      p('2', 'Period 2', '0934', '1030', '09:34', '10:30', '56'),
      p('brunch', 'Brunch', '1030', '1040', '10:30', '10:40', '10'),
      p('3', 'Period 3', '1048', '1144', '10:48', '11:44', '56'),
      p('4', 'Period 4', '1152', '1248', '11:52', '12:48', '56'),
      p('lunch', 'Lunch', '1248', '1323', '12:48', '01:23', '35'),
      p('5', 'Period 5', '1331', '1427', '01:31', '02:27', '56'),
      p('6', 'Period 6', '1435', '1530', '02:35', '03:30', '55'),
      p('6A', 'Period 6A', '1435', '1559', '02:35', '03:59', '84'),
    ],
  },
  {
    key: 'LateStart',
    print: 'Late Start Schedule',
    schedule: [
      p('collaboration', 'Collaboration', '0830', '0907', '08:30', '09:07', '37'),
      p('1', 'Period 1', '0915', '1005', '09:15', '10:05', '50'),
      p('2', 'Period 2', '1013', '1103', '10:13', '11:03', '50'),
      p('3', 'Period 3', '1111', '1201', '11:11', '12:01', '50'),
      p('lunch', 'Lunch', '1201', '1236', '12:01', '12:36', '35'),
      p('4', 'Period 4', '1244', '1334', '12:44', '01:34', '50'),
      p('5', 'Period 5', '1342', '1432', '01:42', '02:32', '50'),
      p('6', 'Period 6', '1440', '1530', '02:40', '03:30', '50'),
      p('6A', 'Period 6A', '1440', '1559', '02:40', '03:59', '79'),
    ],
  },
  {
    key: 'Minimum',
    print: 'Minimum Day Schedule',
    schedule: [
      p('0', 'Period 0', '0752', '0822', '07:52', '08:22', '30'),
      p('1A', 'Period 1A', '0804', '0900', '08:04', '09:00', '56'),
      p('1', 'Period 1', '0830', '0900', '08:30', '09:00', '30'),
      p('2', 'Period 2', '0908', '0938', '09:08', '09:38', '30'),
      p('3', 'Period 3', '0946', '1016', '09:46', '10:16', '30'),
      p('4', 'Period 4', '1024', '1054', '10:24', '10:54', '30'),
      p('5', 'Period 5', '1102', '1132', '11:02', '11:32', '30'),
      p('6', 'Period 6', '1140', '1210', '11:40', '12:10', '30'),
      p('6A', 'Period 6A', '1140', '1236', '11:40', '12:36', '56'),
    ],
  },
  {
    key: 'Rally',
    print: 'Rally Schedule A (Regular Day)',
    schedule: [
      p('0', 'Period 0', '0732', '0822', '07:32', '08:22', '50'),
      p('1A', 'Period 1A', '0808', '0920', '08:08', '09:20', '72'),
      p('1', 'Period 1', '0830', '0920', '08:30', '09:20', '50'),
      p('2', 'Period 2', '0928', '1018', '09:28', '10:18', '50'),
      p('3', 'Period 3', '1026', '1116', '10:26', '11:16', '50'),
      p('RallyA', 'Rally A', '1124', '1205', '11:24', '12:05', '41'),
      p('4', 'Period 4', '1213', '1259', '12:13', '12:59', '46'),
      p('lunch', 'Lunch', '1259', '1334', '12:59', '01:34', '35'),
      p('5', 'Period 5', '1342', '1432', '01:42', '02:32', '50'),
      p('6', 'Period 6', '1440', '1530', '02:40', '03:30', '50'),
      p('6A', 'Period 6A', '1440', '1552', '02:40', '03:52', '72'),
    ],
  },
];
