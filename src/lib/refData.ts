/**
 * Reference-data access layer (read-only). Encodes the hard rules:
 *  - a class location resolves by TEACHER or ROOM, never by class+period;
 *  - the master schedule is only a pickers data source (it returns the teacher/room to store);
 *  - a locker number resolves to a section BY RANGE.
 */
import { getSupabase } from './supabase';
import type { Tables } from '../types/db';

export type Building = Tables<'buildings'>;
export type Room = Tables<'rooms'>;
export type Teacher = Tables<'teachers'>;
export type MasterScheduleRow = Tables<'master_schedule'>;
export type Panorama = Tables<'panoramas'>;
export type LockerSection = Tables<'locker_sections'>;
export type Locker = Tables<'lockers'>;

export interface Location {
  room: Room;
  building: Building;
}

/** One candidate section for a course/period — the chosen one's teacher/room is what gets stored. */
export interface CourseSection {
  id: string;
  course: string;
  period: string;
  teacher: Teacher | null;
  room: Room | null;
}

// ── Buildings / rooms / teachers ────────────────────────────────────────────────
export async function getBuildings(): Promise<Building[]> {
  const { data, error } = await getSupabase().from('buildings').select('*').order('label');
  if (error) throw error;
  return data ?? [];
}

export async function getBuilding(id: string): Promise<Building | null> {
  const { data, error } = await getSupabase()
    .from('buildings')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getRoomsByBuilding(buildingId: string): Promise<Room[]> {
  const { data, error } = await getSupabase()
    .from('rooms')
    .select('*')
    .eq('building_id', buildingId)
    .order('label');
  if (error) throw error;
  return data ?? [];
}

export async function getRoom(roomId: string): Promise<Room | null> {
  const { data, error } = await getSupabase()
    .from('rooms')
    .select('*')
    .eq('id', roomId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getTeacher(teacherId: string): Promise<Teacher | null> {
  const { data, error } = await getSupabase()
    .from('teachers')
    .select('*')
    .eq('id', teacherId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getRoomWithTeacher(
  roomId: string,
): Promise<{ room: Room; teacher: Teacher | null } | null> {
  const room = await getRoom(roomId);
  if (!room) return null;
  const teacher = room.teacher_id ? await getTeacher(room.teacher_id) : null;
  return { room, teacher };
}

// ── Location resolution (teacher/room only — never class+period) ─────────────────
export async function resolveLocationByRoom(roomId: string): Promise<Location | null> {
  const room = await getRoom(roomId);
  if (!room) return null;
  const building = await getBuilding(room.building_id);
  if (!building) return null;
  return { room, building };
}

export async function resolveLocationByTeacher(teacherId: string): Promise<Location | null> {
  const teacher = await getTeacher(teacherId);
  if (!teacher?.home_room_id) return null;
  return resolveLocationByRoom(teacher.home_room_id);
}

// ── Master schedule (pickers data source) ────────────────────────────────────────
export async function getCoursesForPeriod(period: string): Promise<string[]> {
  const { data, error } = await getSupabase()
    .from('master_schedule')
    .select('course')
    .eq('period', period);
  if (error) throw error;
  return [...new Set((data ?? []).map((r) => r.course))].sort();
}

export async function getSectionsForCourse(
  course: string,
  period?: string,
): Promise<CourseSection[]> {
  let query = getSupabase()
    .from('master_schedule')
    .select('id, course, period, teacher:teachers(*), room:rooms(*)')
    .eq('course', course);
  if (period !== undefined) query = query.eq('period', period);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    course: row.course,
    period: row.period,
    teacher: row.teacher,
    room: row.room,
  }));
}

// ── Lockers / panoramas ──────────────────────────────────────────────────────────
export async function resolveLockerSection(lockerNumber: number): Promise<LockerSection | null> {
  const { data, error } = await getSupabase()
    .from('locker_sections')
    .select('*')
    .lte('number_start', lockerNumber)
    .gte('number_end', lockerNumber)
    .order('number_start')
    .limit(1);
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function getPanorama(id: string): Promise<Panorama | null> {
  const { data, error } = await getSupabase()
    .from('panoramas')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Per-locker hotspot, if a row exists for that exact number (else the viewer uses a section default). */
export async function getLocker(lockerNumber: number): Promise<Locker | null> {
  const { data, error } = await getSupabase()
    .from('lockers')
    .select('*')
    .eq('number', lockerNumber)
    .maybeSingle();
  if (error) throw error;
  return data;
}
