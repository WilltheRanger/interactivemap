import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Button } from '../../components';
import { useBellSchedule } from '../../data/hooks';
import type { BellPeriod } from '../../lib/refData';
import { getSupabase } from '../../lib/supabase';
import { ConfirmDeleteButton, MutationStatus, SectionStates } from './shared';

const DAY_TYPES = ['regular', 'block', 'minimum', 'rally'] as const;
type DayType = (typeof DAY_TYPES)[number];
const DAY_LABEL: Record<DayType, string> = {
  regular: 'Regular',
  block: 'Block',
  minimum: 'Minimum',
  rally: 'Rally',
};

/** One editable period row: label + start/end time, saved explicitly. */
function PeriodRow({ row }: { row: BellPeriod }) {
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState(row.period);
  const [start, setStart] = useState(row.start_time.slice(0, 5));
  const [end, setEnd] = useState(row.end_time.slice(0, 5));
  const [saved, setSaved] = useState(false);
  const dirty =
    period !== row.period ||
    start !== row.start_time.slice(0, 5) ||
    end !== row.end_time.slice(0, 5);

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['bellSchedule'] });
  const save = useMutation({
    mutationFn: async () => {
      if (!period.trim() || !start || !end) throw new Error('Fill the period name and both times.');
      const { error } = await getSupabase()
        .from('bell_schedule')
        .update({ period: period.trim(), start_time: start, end_time: end })
        .eq('id', row.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      setSaved(true);
    },
  });
  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await getSupabase().from('bell_schedule').delete().eq('id', row.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return (
    <li className="admin-row admin-bell__row">
      <input
        className="admin-input admin-bell__period"
        type="text"
        aria-label="Period name"
        value={period}
        onChange={(e) => {
          setPeriod(e.target.value);
          setSaved(false);
        }}
      />
      <input
        className="admin-input"
        type="time"
        aria-label="Start time"
        value={start}
        onChange={(e) => {
          setStart(e.target.value);
          setSaved(false);
        }}
      />
      <span aria-hidden="true">–</span>
      <input
        className="admin-input"
        type="time"
        aria-label="End time"
        value={end}
        onChange={(e) => {
          setEnd(e.target.value);
          setSaved(false);
        }}
      />
      <div className="admin-row__actions">
        <Button
          type="button"
          variant="primary"
          disabled={!dirty || save.isPending}
          onClick={() => save.mutate()}
        >
          {save.isPending ? 'Saving…' : 'Save'}
        </Button>
        <ConfirmDeleteButton
          label={`period ${row.period}`}
          pending={remove.isPending}
          onConfirm={() => remove.mutate()}
        />
      </div>
      <MutationStatus
        error={save.isError ? save.error : remove.isError ? remove.error : null}
        saved={saved && !dirty}
      />
    </li>
  );
}

/**
 * Bell Schedule tab — periods + times per day type (regular / block / minimum / rally).
 * Starts empty: the owner supplies the real DBHS bell schedule (DATA-INTAKE), entered here.
 */
export function BellScheduleAdmin() {
  const schedule = useBellSchedule();
  const queryClient = useQueryClient();
  const [dayType, setDayType] = useState<DayType>('regular');

  const rows = (schedule.data ?? []).filter((r) => r.day_type === dayType);

  const add = useMutation({
    mutationFn: async () => {
      const maxOrder = rows.reduce((m, r) => Math.max(m, r.sort_order), 0);
      const { error } = await getSupabase()
        .from('bell_schedule')
        .insert({
          day_type: dayType,
          period: `${rows.length + 1}`,
          start_time: '08:00',
          end_time: '09:00',
          sort_order: maxOrder + 1,
        });
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['bellSchedule'] }),
  });

  return (
    <div className="admin-body">
      <p className="admin-note" role="note">
        No real bell times are loaded yet — when the school supplies the official schedule, enter it
        here per day type. New periods start with placeholder times (08:00–09:00).
      </p>

      <div className="admin-tabs admin-tabs--inner" role="tablist" aria-label="Day type">
        {DAY_TYPES.map((d) => (
          <button
            key={d}
            type="button"
            role="tab"
            aria-selected={dayType === d}
            className={`admin-tab ${dayType === d ? 'is-active' : ''}`}
            onClick={() => setDayType(d)}
          >
            {DAY_LABEL[d]}
          </button>
        ))}
      </div>

      <SectionStates
        isPending={schedule.isPending}
        isError={schedule.isError}
        onRetry={() => void schedule.refetch()}
      >
        {rows.length === 0 ? (
          <p className="admin-empty" role="status">
            No periods for a {DAY_LABEL[dayType].toLowerCase()} day yet — add the first one below.
          </p>
        ) : (
          <ul className="admin-list">
            {rows.map((r) => (
              <PeriodRow key={r.id} row={r} />
            ))}
          </ul>
        )}
        <div className="admin-form__actions">
          <Button
            variant="secondary"
            icon={<Plus size={16} />}
            disabled={add.isPending}
            onClick={() => add.mutate()}
          >
            {add.isPending ? 'Adding…' : `Add period to ${DAY_LABEL[dayType]}`}
          </Button>
        </div>
        {add.isError && (
          <p className="admin-status admin-status--error" role="alert">
            Couldn&rsquo;t add: {add.error instanceof Error ? add.error.message : 'unknown error'}
          </p>
        )}
      </SectionStates>
    </div>
  );
}
