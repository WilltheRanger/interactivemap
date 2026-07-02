import { useCallback, useRef, useState } from 'react';
import { useBuildings, useCourses, useRoomsByBuilding, useTeachers } from '../../data/hooks';
import type { Period } from '../../data/periods';
import type { ScheduleEntry } from '../../types/personal';
import { OptionList } from './OptionList';

type Mode = 'course' | 'teacher' | 'room';

interface PeriodEditorProps {
  /** Which period this editor edits. Kept for the caller's API (and future per-period logic); the
   *  two-step class→teacher flow itself no longer filters by period. */
  period: Period;
  onSave: (entry: ScheduleEntry) => void;
  onCancel: () => void;
}

const MODE_TITLE: Record<Mode, string> = {
  course: 'Pick your class',
  teacher: 'Pick your teacher',
  room: 'Pick the room',
};

/**
 * Inline editor for one period (06.2–06.3). Two-step flow: **pick your class** (from the course
 * catalog, a display-only label) → **pick your teacher for that period** (the join key — a teacher
 * resolves to their home room; never class+period). "Pick by room" is the fallback for a class that
 * resolves by room rather than a teacher (PE, a teacher with no home room, an unlisted teacher).
 */
export function PeriodEditor({ onSave, onCancel }: PeriodEditorProps) {
  const [mode, setMode] = useState<Mode>('course');
  const [buildingId, setBuildingId] = useState<string | null>(null);
  // The chosen class name — a display-only label, pre-filled from the picked course and editable.
  const [classLabel, setClassLabel] = useState('');
  const savedRef = useRef(false);

  const courses = useCourses();
  const teachers = useTeachers();
  const buildings = useBuildings();
  const rooms = useRoomsByBuilding(buildingId);

  const save = useCallback(
    (entry: ScheduleEntry | null) => {
      if (!entry || savedRef.current) return;
      savedRef.current = true;
      onSave(entry);
    },
    [onSave],
  );

  const back = () => {
    if (mode === 'room' && buildingId != null) {
      setBuildingId(null);
      return;
    }
    if (mode === 'room') {
      setMode('teacher');
      return;
    }
    // teacher → course; drop the label so re-picking a class re-seeds it.
    setClassLabel('');
    setMode('course');
  };

  return (
    <div className="sched-editor">
      <div className="sched-editor__head">
        <span className="sched-editor__title">
          {mode === 'room' && buildingId == null ? 'Which building?' : MODE_TITLE[mode]}
        </span>
        <span className="sched-editor__nav">
          {mode !== 'course' && (
            <button type="button" className="sched-textbtn" onClick={back}>
              Back
            </button>
          )}
          <button type="button" className="sched-textbtn" onClick={onCancel}>
            Cancel
          </button>
        </span>
      </div>

      {mode === 'course' && (
        <>
          <OptionList
            options={(courses.data ?? []).map((c) => ({ id: c.name, label: c.name }))}
            loading={courses.isPending}
            error={courses.isError}
            emptyText="No classes are listed yet — pick your teacher below."
            filterPlaceholder="Type to filter classes…"
            onPick={(name) => {
              setClassLabel(name);
              setMode('teacher');
            }}
          />
          <p className="sched-editor__alt">
            Class not listed?{' '}
            <button
              type="button"
              className="sched-textbtn"
              onClick={() => {
                setClassLabel('');
                setMode('teacher');
              }}
            >
              Pick your teacher anyway
            </button>
          </p>
        </>
      )}

      {(mode === 'teacher' || mode === 'room') && (
        <label className="sched-labelfield">
          <span className="sched-labelfield__caption">Your class (label only)</span>
          <input
            type="text"
            className="sched-input"
            value={classLabel}
            onChange={(e) => setClassLabel(e.target.value)}
            placeholder="e.g. Chemistry Pre-AP"
          />
        </label>
      )}

      {mode === 'teacher' && (
        <>
          <OptionList
            options={(teachers.data ?? []).map((t) => ({ id: t.id, label: t.name }))}
            loading={teachers.isPending}
            error={teachers.isError}
            emptyText="No teachers found."
            filterPlaceholder="Type to filter teachers…"
            onPick={(id) => save({ kind: 'teacher', teacher_id: id, class_label: classLabel.trim() })}
          />
          <p className="sched-editor__alt">
            Don&rsquo;t see your teacher?{' '}
            <button type="button" className="sched-textbtn" onClick={() => setMode('room')}>
              Pick by room instead
            </button>
          </p>
        </>
      )}

      {mode === 'room' &&
        (buildingId == null ? (
          <OptionList
            options={(buildings.data ?? []).map((b) => ({ id: b.id, label: b.label }))}
            loading={buildings.isPending}
            error={buildings.isError}
            emptyText="No buildings found."
            onPick={setBuildingId}
          />
        ) : (
          <OptionList
            options={(rooms.data ?? []).map((r) => ({ id: r.id, label: r.label ?? r.id }))}
            loading={rooms.isPending}
            error={rooms.isError}
            emptyText="No rooms found in this building."
            filterPlaceholder="Type to filter rooms…"
            onPick={(id) => save({ kind: 'room', room_id: id, class_label: classLabel.trim() })}
          />
        ))}
    </div>
  );
}
