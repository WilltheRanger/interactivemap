import { useCallback, useEffect, useRef, useState } from 'react';
import {
  useBuildings,
  useCoursesForPeriod,
  useRoomsByBuilding,
  useSectionsForCourse,
  useTeachers,
} from '../../data/hooks';
import { sectionToEntry } from '../../lib/schedule';
import type { Period } from '../../data/periods';
import type { ScheduleEntry } from '../../types/personal';
import { OptionList } from './OptionList';

type Mode = 'course' | 'section' | 'teacher' | 'room';

interface PeriodEditorProps {
  period: Period;
  onSave: (entry: ScheduleEntry) => void;
  onCancel: () => void;
}

const MODE_TITLE: Record<Mode, string> = {
  course: 'Pick your class',
  section: 'Which teacher do you have?',
  teacher: 'Pick your teacher',
  room: 'Pick the room',
};

/**
 * Inline editor for one period (06.2–06.3). Master-schedule flow: pick a course (filtered to this
 * period) → a single-section course saves immediately; a multi-section course forces a teacher
 * choice (the join key — never course+period). Fallbacks: pick a teacher or a room directly when
 * the class isn't in the master schedule.
 */
export function PeriodEditor({ period, onSave, onCancel }: PeriodEditorProps) {
  const [mode, setMode] = useState<Mode>('course');
  const [course, setCourse] = useState<string | null>(null);
  const [buildingId, setBuildingId] = useState<string | null>(null);
  const [classLabel, setClassLabel] = useState('');
  const savedRef = useRef(false);

  const courses = useCoursesForPeriod(period.id);
  const sections = useSectionsForCourse(course, period.id);
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

  // A single-section course auto-selects its teacher — no extra tap (06.3).
  useEffect(() => {
    if (mode === 'section' && sections.data?.length === 1) {
      save(sectionToEntry(sections.data[0]));
    }
  }, [mode, sections.data, save]);

  const back = () => {
    if (mode === 'room' && buildingId != null) {
      setBuildingId(null);
      return;
    }
    setCourse(null);
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
            options={(courses.data ?? []).map((c) => ({ id: c, label: c }))}
            loading={courses.isPending}
            error={courses.isError}
            emptyText="No classes are listed for this period yet — pick your teacher or room below."
            filterPlaceholder="Type to filter classes…"
            onPick={(c) => {
              setCourse(c);
              setMode('section');
            }}
          />
          <p className="sched-editor__alt">
            Not listed?{' '}
            <button type="button" className="sched-textbtn" onClick={() => setMode('teacher')}>
              Pick by teacher
            </button>{' '}
            ·{' '}
            <button type="button" className="sched-textbtn" onClick={() => setMode('room')}>
              Pick by room
            </button>
          </p>
        </>
      )}

      {mode === 'section' && (
        <OptionList
          options={(sections.data ?? []).map((s) => ({
            id: s.id,
            label: s.teacher?.name ?? s.room?.label ?? 'Unknown teacher',
            sub: s.room?.label ?? undefined,
          }))}
          loading={sections.isPending}
          error={sections.isError}
          emptyText="No sections found for this class — go back and pick by teacher or room."
          onPick={(id) => {
            const picked = sections.data?.find((s) => s.id === id);
            if (picked) save(sectionToEntry(picked));
          }}
        />
      )}

      {(mode === 'teacher' || mode === 'room') && (
        <label className="sched-labelfield">
          <span className="sched-labelfield__caption">Class name (optional, just a label)</span>
          <input
            type="text"
            className="sched-input"
            value={classLabel}
            onChange={(e) => setClassLabel(e.target.value)}
            placeholder="e.g. Algebra 1"
          />
        </label>
      )}

      {mode === 'teacher' && (
        <OptionList
          options={(teachers.data ?? []).map((t) => ({ id: t.id, label: t.name }))}
          loading={teachers.isPending}
          error={teachers.isError}
          emptyText="No teachers found."
          filterPlaceholder="Type to filter teachers…"
          onPick={(id) => save({ kind: 'teacher', teacher_id: id, class_label: classLabel.trim() })}
        />
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
