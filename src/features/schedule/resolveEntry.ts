/**
 * Resolution to location (06.4): a saved ScheduleEntry → teacher + room + building, via the join-key
 * rule only (teacher → home_room → building, or room → building). Degrades gracefully — a teacher
 * with no home room resolves with room/building null ("Room TBD" in the UI), never a crash.
 */
import { useQuery } from '@tanstack/react-query';
import { getBuilding, getRoom, getTeacher } from '../../lib/refData';
import type { Building, Room, Teacher } from '../../lib/refData';
import type { ScheduleEntry } from '../../types/personal';

export interface ResolvedLocation {
  teacher: Teacher | null;
  room: Room | null;
  building: Building | null;
}

export async function resolveEntry(entry: ScheduleEntry): Promise<ResolvedLocation> {
  if (entry.kind === 'teacher') {
    const teacher = await getTeacher(entry.teacher_id);
    if (!teacher?.home_room_id) return { teacher, room: null, building: null };
    const room = await getRoom(teacher.home_room_id);
    const building = room ? await getBuilding(room.building_id) : null;
    return { teacher, room, building };
  }
  const room = await getRoom(entry.room_id);
  if (!room) return { teacher: null, room: null, building: null };
  const [building, teacher] = await Promise.all([
    getBuilding(room.building_id),
    room.teacher_id ? getTeacher(room.teacher_id) : Promise.resolve(null),
  ]);
  return { teacher, room, building };
}

const STALE_MS = 5 * 60 * 1000;

/** Reactive resolution for one entry. The key is the stored id — class_label never resolves. */
export function useResolvedEntry(entry: ScheduleEntry | null) {
  const refId = entry == null ? null : entry.kind === 'teacher' ? entry.teacher_id : entry.room_id;
  return useQuery({
    queryKey: ['resolve-entry', entry?.kind ?? null, refId],
    queryFn: () => resolveEntry(entry as ScheduleEntry),
    enabled: entry != null,
    staleTime: STALE_MS,
  });
}
