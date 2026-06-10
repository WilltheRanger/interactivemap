import { useMemo, useState } from 'react';
import { Building2, DoorOpen, GraduationCap } from 'lucide-react';
import { SearchInput, Skeleton } from '../../components';
import { useBuildings, useRooms, useTeachers } from '../../data/hooks';
import type { Building, Room, Teacher } from '../../lib/refData';
import './Find.css';

interface FindResults {
  buildings: Building[];
  rooms: Room[];
  teachers: Teacher[];
  total: number;
}

/**
 * Find: search rooms, teachers, and buildings across the reference data. Filtering happens
 * client-side over the cached tables (they're small and change rarely), so typing is instant.
 * Results show the resolved context (room → building + teacher, teacher → home room). Tapping a
 * result to jump to the map arrives with Phase 05.
 */
export function FindScreen() {
  const [query, setQuery] = useState('');
  const buildings = useBuildings();
  const rooms = useRooms();
  const teachers = useTeachers();

  const q = query.trim().toLowerCase();
  const isPending = buildings.isPending || rooms.isPending || teachers.isPending;
  const isError = buildings.isError || rooms.isError || teachers.isError;

  const results = useMemo<FindResults | null>(() => {
    if (!q || isPending || isError) return null;
    const b = (buildings.data ?? []).filter((x) => x.label.toLowerCase().includes(q));
    const r = (rooms.data ?? []).filter((x) => (x.label ?? x.id).toLowerCase().includes(q));
    const t = (teachers.data ?? []).filter((x) => x.name.toLowerCase().includes(q));
    return { buildings: b, rooms: r, teachers: t, total: b.length + r.length + t.length };
  }, [q, isPending, isError, buildings.data, rooms.data, teachers.data]);

  const roomById = useMemo(() => new Map((rooms.data ?? []).map((r) => [r.id, r])), [rooms.data]);
  const buildingById = useMemo(
    () => new Map((buildings.data ?? []).map((b) => [b.id, b])),
    [buildings.data],
  );
  const teacherById = useMemo(
    () => new Map((teachers.data ?? []).map((t) => [t.id, t])),
    [teachers.data],
  );

  return (
    <section className="screen" aria-labelledby="find-title">
      <h1 id="find-title" className="screen__title">
        Find
      </h1>
      <p className="screen__sub">Search rooms, teachers, and buildings across campus.</p>
      <div className="screen__body">
        <SearchInput
          placeholder="Room, teacher, or building…"
          aria-label="Search rooms, teachers, or buildings"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {q && isPending && (
          <div className="find-results" aria-busy="true">
            <Skeleton height={56} radius="var(--radius-md)" />
            <Skeleton height={56} radius="var(--radius-md)" />
            <Skeleton height={56} radius="var(--radius-md)" />
          </div>
        )}

        {q && isError && (
          <p className="find-status" role="status">
            Couldn&rsquo;t load campus data — check your connection.
          </p>
        )}

        {!q && (
          <p className="find-status">
            Try a room number, a teacher&rsquo;s name, or a building name.
          </p>
        )}

        {results && results.total === 0 && (
          <p className="find-status" role="status">
            No matches for &ldquo;{query.trim()}&rdquo;.
          </p>
        )}

        {results && results.total > 0 && (
          <div className="find-results" role="status" aria-label={`${results.total} results`}>
            {results.rooms.length > 0 && (
              <section aria-labelledby="find-rooms">
                <h2 id="find-rooms" className="find-group">
                  Rooms
                </h2>
                <ul className="find-list">
                  {results.rooms.map((room) => {
                    const building = buildingById.get(room.building_id);
                    const teacher = room.teacher_id ? teacherById.get(room.teacher_id) : null;
                    return (
                      <li key={room.id} className="find-item">
                        <DoorOpen size={20} aria-hidden="true" className="find-item__icon" />
                        <span className="find-item__text">
                          <span className="find-item__title">{room.label ?? room.id}</span>
                          <span className="find-item__sub">
                            {[building?.label, teacher?.name].filter(Boolean).join(' · ')}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {results.teachers.length > 0 && (
              <section aria-labelledby="find-teachers">
                <h2 id="find-teachers" className="find-group">
                  Teachers
                </h2>
                <ul className="find-list">
                  {results.teachers.map((teacher) => {
                    const room = teacher.home_room_id ? roomById.get(teacher.home_room_id) : null;
                    const building = room ? buildingById.get(room.building_id) : null;
                    return (
                      <li key={teacher.id} className="find-item">
                        <GraduationCap size={20} aria-hidden="true" className="find-item__icon" />
                        <span className="find-item__text">
                          <span className="find-item__title">{teacher.name}</span>
                          <span className="find-item__sub">
                            {room
                              ? [room.label ?? room.id, building?.label].filter(Boolean).join(' · ')
                              : 'Room TBD'}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {results.buildings.length > 0 && (
              <section aria-labelledby="find-buildings">
                <h2 id="find-buildings" className="find-group">
                  Buildings
                </h2>
                <ul className="find-list">
                  {results.buildings.map((building) => {
                    const roomCount = (rooms.data ?? []).filter(
                      (r) => r.building_id === building.id,
                    ).length;
                    return (
                      <li key={building.id} className="find-item">
                        <Building2 size={20} aria-hidden="true" className="find-item__icon" />
                        <span className="find-item__text">
                          <span className="find-item__title">{building.label}</span>
                          <span className="find-item__sub">
                            {roomCount === 1 ? '1 room' : `${roomCount} rooms`}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
