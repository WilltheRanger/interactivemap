import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Building2, ChevronRight, DoorOpen, GraduationCap } from 'lucide-react';
import { SearchInput, Skeleton } from '../../components';
import { useBuildings, useRooms, useTeachers } from '../../data/hooks';
import { BUILDING_LABELS } from '../map/buildingLabels';
import { loadCampusRooms } from '../map/campusGeo';
import './Find.css';

const MAX_ROOM_RESULTS = 24;

/**
 * Find: search the campus. Rooms come from the owner's campus-plan SVG (real DBHS room numbers) —
 * tapping one jumps to it on the map (/map?room=ID). Teachers/buildings still come from the
 * reference DB (placeholder until the real directory lands). Filtering is client-side and instant.
 */
export function FindScreen() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const campusRooms = useQuery({ queryKey: ['campus-rooms'], queryFn: loadCampusRooms });
  const buildings = useBuildings();
  const teachers = useTeachers();
  const rooms = useRooms(); // DB rooms — used only to resolve teacher home rooms below

  const q = query.trim().toLowerCase();

  const roomHits = useMemo(() => {
    if (!q || !campusRooms.data) return [];
    return campusRooms.data
      .filter(
        (room) =>
          room.id.toLowerCase().includes(q) ||
          (BUILDING_LABELS[room.buildingId] ?? room.buildingId).toLowerCase().includes(q),
      )
      .slice(0, MAX_ROOM_RESULTS + 1);
  }, [q, campusRooms.data]);

  const teacherHits = useMemo(() => {
    if (!q || !teachers.data) return [];
    return teachers.data.filter((t) => t.name.toLowerCase().includes(q));
  }, [q, teachers.data]);

  const buildingHits = useMemo(() => {
    if (!q) return [];
    return Object.entries(BUILDING_LABELS).filter(([, label]) => label.toLowerCase().includes(q));
  }, [q]);

  const roomById = useMemo(() => new Map((rooms.data ?? []).map((r) => [r.id, r])), [rooms.data]);
  const dbBuildingById = useMemo(
    () => new Map((buildings.data ?? []).map((b) => [b.id, b])),
    [buildings.data],
  );

  const total = roomHits.length + teacherHits.length + buildingHits.length;
  const isPending = campusRooms.isPending;

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

        {!q && (
          <p className="find-status">
            Try a room number (like 461), a teacher&rsquo;s name, or a building.
          </p>
        )}

        {q && isPending && (
          <div className="find-results" aria-busy="true">
            <Skeleton height={56} radius="var(--radius-md)" />
            <Skeleton height={56} radius="var(--radius-md)" />
            <Skeleton height={56} radius="var(--radius-md)" />
          </div>
        )}

        {q && !isPending && total === 0 && (
          <p className="find-status" role="status">
            No matches for &ldquo;{query.trim()}&rdquo;.
          </p>
        )}

        {q && total > 0 && (
          <div className="find-results">
            {roomHits.length > 0 && (
              <section aria-labelledby="find-rooms">
                <h2 id="find-rooms" className="find-group">
                  Rooms
                </h2>
                <ul className="find-list">
                  {roomHits.slice(0, MAX_ROOM_RESULTS).map((room) => (
                    <li key={room.id}>
                      <button
                        type="button"
                        className="find-item find-item--link"
                        onClick={() => navigate(`/map?room=${encodeURIComponent(room.id)}`)}
                      >
                        <DoorOpen size={20} aria-hidden="true" className="find-item__icon" />
                        <span className="find-item__text">
                          <span className="find-item__title">
                            {/^\d+$/.test(room.id) ? `Room ${room.id}` : room.id}
                          </span>
                          <span className="find-item__sub">
                            {BUILDING_LABELS[room.buildingId] ?? room.buildingId} · tap to view on
                            the map
                          </span>
                        </span>
                        <ChevronRight size={18} aria-hidden="true" className="find-item__chevron" />
                      </button>
                    </li>
                  ))}
                </ul>
                {roomHits.length > MAX_ROOM_RESULTS && (
                  <p className="find-status">Keep typing to narrow it down…</p>
                )}
              </section>
            )}

            {buildingHits.length > 0 && (
              <section aria-labelledby="find-buildings">
                <h2 id="find-buildings" className="find-group">
                  Buildings
                </h2>
                <ul className="find-list">
                  {buildingHits.map(([id, label]) => (
                    <li key={id}>
                      <button
                        type="button"
                        className="find-item find-item--link"
                        onClick={() => navigate(`/map?room=${encodeURIComponent(id)}`)}
                      >
                        <Building2 size={20} aria-hidden="true" className="find-item__icon" />
                        <span className="find-item__text">
                          <span className="find-item__title">{label}</span>
                          <span className="find-item__sub">Tap to view on the map</span>
                        </span>
                        <ChevronRight size={18} aria-hidden="true" className="find-item__chevron" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {teacherHits.length > 0 && (
              <section aria-labelledby="find-teachers">
                <h2 id="find-teachers" className="find-group">
                  Teachers
                </h2>
                <ul className="find-list">
                  {teacherHits.map((teacher) => {
                    const room = teacher.home_room_id ? roomById.get(teacher.home_room_id) : null;
                    const building = room ? dbBuildingById.get(room.building_id) : null;
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
          </div>
        )}
      </div>
    </section>
  );
}
