import { useState } from 'react';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { Button, Skeleton } from '../../components';
import { PERIODS, type Period } from '../../data/periods';
import { useSchedule } from '../../data/usePersonal';
import { clearSchedule, removePeriod, setPeriod } from '../../lib/personalStore';
import type { ScheduleEntry } from '../../types/personal';
import { useResolvedEntry } from './resolveEntry';
import { PeriodEditor } from './PeriodEditor';
import './SetClasses.css';

/**
 * Set Classes (06.5–06.6 + the 07.1 list / 07.2 detail): one row per period. Empty rows prompt to
 * add a class; saved rows show the class + resolved room/building/teacher and expand to rename,
 * change, or remove. Everything persists on-device only. (The 07.2 map highlight wires up when the
 * Phase 05 map + highlight API exist.)
 */
export function SetClassesScreen() {
  const schedule = useSchedule();
  const [editing, setEditing] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);

  const count = PERIODS.filter((p) => schedule[p.id]).length;

  return (
    <section className="screen" aria-labelledby="setclasses-title">
      <h1 id="setclasses-title" className="screen__title">
        Set Classes
      </h1>
      <p className="screen__sub">
        {count === 0
          ? 'Add a class for each period. Your schedule stays on this device only.'
          : `${count} of ${PERIODS.length} periods set. Tap a period to see or change it.`}
      </p>

      <ul className="sched-list">
        {PERIODS.map((period) => (
          <PeriodRow
            key={period.id}
            period={period}
            entry={schedule[period.id] ?? null}
            editing={editing === period.id}
            expanded={expanded === period.id}
            onStartEdit={() => {
              setEditing(period.id);
              setExpanded(null);
            }}
            onCancelEdit={() => setEditing(null)}
            onSave={(entry) => {
              setPeriod(period.id, entry);
              setEditing(null);
              setExpanded(null);
            }}
            onToggleExpand={() => setExpanded(expanded === period.id ? null : period.id)}
            onRemove={() => {
              removePeriod(period.id);
              setExpanded(null);
            }}
          />
        ))}
      </ul>

      {count > 0 && (
        <div className="sched-clear">
          {confirmingClear ? (
            <div className="sched-clear__confirm" role="group" aria-label="Confirm clearing">
              <span>Clear all {count} saved classes?</span>
              <div className="sched-clear__actions">
                <Button
                  variant="danger"
                  onClick={() => {
                    clearSchedule();
                    setConfirmingClear(false);
                    setExpanded(null);
                    setEditing(null);
                  }}
                >
                  Yes, clear all
                </Button>
                <Button variant="secondary" onClick={() => setConfirmingClear(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="secondary" onClick={() => setConfirmingClear(true)}>
              Clear all classes
            </Button>
          )}
        </div>
      )}
    </section>
  );
}

interface PeriodRowProps {
  period: Period;
  entry: ScheduleEntry | null;
  editing: boolean;
  expanded: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: (entry: ScheduleEntry) => void;
  onToggleExpand: () => void;
  onRemove: () => void;
}

function PeriodRow({
  period,
  entry,
  editing,
  expanded,
  onStartEdit,
  onCancelEdit,
  onSave,
  onToggleExpand,
  onRemove,
}: PeriodRowProps) {
  const resolved = useResolvedEntry(entry);

  const title =
    entry == null
      ? 'Add a class'
      : entry.class_label || resolved.data?.teacher?.name || resolved.data?.room?.label || 'Class';

  const locationText = (() => {
    if (entry == null || resolved.isPending) return null;
    if (resolved.isError) return 'Location unavailable — check your connection';
    const parts = [
      resolved.data?.teacher?.name,
      resolved.data?.room?.label ?? 'Room TBD',
      resolved.data?.building?.label,
    ].filter(Boolean);
    return parts.join(' · ');
  })();

  return (
    <li className="sched-row">
      <button
        type="button"
        className="sched-row__head"
        aria-expanded={entry == null ? undefined : expanded}
        onClick={entry == null ? onStartEdit : onToggleExpand}
      >
        <span className="sched-row__period" aria-hidden="true">
          {period.id}
        </span>
        <span className="sched-row__text">
          <span className={`sched-row__title${entry == null ? ' sched-row__title--empty' : ''}`}>
            {title}
          </span>
          <span className="sched-row__sub">
            {entry == null ? (
              period.label
            ) : resolved.isPending ? (
              <Skeleton width={180} height={14} radius="var(--radius-sm)" />
            ) : (
              locationText
            )}
          </span>
        </span>
        <span className="sched-row__chevron" aria-hidden="true">
          {entry == null ? (
            <Plus size={18} />
          ) : expanded ? (
            <ChevronDown size={18} />
          ) : (
            <ChevronRight size={18} />
          )}
        </span>
      </button>

      {editing && (
        <div className="sched-row__body">
          <PeriodEditor period={period} onSave={onSave} onCancel={onCancelEdit} />
        </div>
      )}

      {!editing && expanded && entry != null && (
        <div className="sched-row__body">
          <RenameField
            entry={entry}
            onRename={(label) => onSave({ ...entry, class_label: label })}
          />
          <div className="sched-row__actions">
            <Button variant="secondary" onClick={onStartEdit}>
              Change class
            </Button>
            <Button variant="danger" onClick={onRemove}>
              Remove
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}

/** class_label is display-only and editable (06.3) — renaming never changes the stored teacher/room. */
function RenameField({
  entry,
  onRename,
}: {
  entry: ScheduleEntry;
  onRename: (label: string) => void;
}) {
  const [value, setValue] = useState(entry.class_label);
  const dirty = value.trim() !== entry.class_label;
  return (
    <div className="sched-rename">
      <input
        type="text"
        className="sched-input"
        aria-label="Class name"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Class name"
      />
      {dirty && (
        <Button variant="primary" onClick={() => onRename(value.trim())}>
          Save name
        </Button>
      )}
    </div>
  );
}
