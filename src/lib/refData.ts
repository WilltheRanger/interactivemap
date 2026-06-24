/**
 * Reference-data access layer (read-only). Encodes the hard rules:
 *  - a class location resolves by TEACHER or ROOM, never by class+period;
 *  - the master schedule is only a pickers data source (it returns the teacher/room to store);
 *  - a locker number resolves to a section BY RANGE.
 */
import { getSupabase } from './supabase';
import type { Tables } from '../types/db';

export type Announcement = Tables<'announcements'>;
export type BellPeriod = Tables<'bell_schedule'>;
export type Course = Tables<'courses'>;
export type GraduationRequirement = Tables<'graduation_requirements'>;
export type Building = Tables<'buildings'>;
export type Room = Tables<'rooms'>;
export type Teacher = Tables<'teachers'>;
export type MasterScheduleRow = Tables<'master_schedule'>;
export type Panorama = Tables<'panoramas'>;
export type LockerBlock = Tables<'locker_blocks'>;
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

// ── Announcements (public read; written only by admins via the /admin screen) ────
export async function getAnnouncements(): Promise<Announcement[]> {
  const { data, error } = await getSupabase()
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ── 4-year plan reference data (courses + graduation/UC/Brahma-Tech requirements) ─
export async function getCourses(): Promise<Course[]> {
  const { data, error } = await getSupabase().from('courses').select('*').order('name');
  if (error) throw error;
  return data ?? [];
}

export async function getGraduationRequirements(): Promise<GraduationRequirement[]> {
  const { data, error } = await getSupabase().from('graduation_requirements').select('*');
  if (error) throw error;
  return data ?? [];
}

// ── Admin-managed reference lists (lockers / panoramas / bell schedule) ─────────
export async function getLockerSections(): Promise<LockerSection[]> {
  const { data, error } = await getSupabase()
    .from('locker_sections')
    .select('*')
    .order('number_start');
  if (error) throw error;
  return data ?? [];
}

export async function getLockersBySection(sectionId: string): Promise<Locker[]> {
  const { data, error } = await getSupabase()
    .from('lockers')
    .select('*')
    .eq('section_id', sectionId)
    .order('number');
  if (error) throw error;
  return data ?? [];
}

export async function getPanoramas(): Promise<Panorama[]> {
  const { data, error } = await getSupabase().from('panoramas').select('*').order('id');
  if (error) throw error;
  return data ?? [];
}

export async function getBellSchedule(): Promise<BellPeriod[]> {
  const { data, error } = await getSupabase()
    .from('bell_schedule')
    .select('*')
    .order('day_type')
    .order('sort_order');
  if (error) throw error;
  return data ?? [];
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

export async function getRooms(): Promise<Room[]> {
  const { data, error } = await getSupabase().from('rooms').select('*').order('label');
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

export async function getTeachers(): Promise<Teacher[]> {
  const { data, error } = await getSupabase().from('teachers').select('*').order('name');
  if (error) throw error;
  return data ?? [];
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
/**
 * Resolve a locker number to a block (`locker_sections` row) by RANGE. Ambiguous now that the school's
 * locker numbers repeat across blocks — it returns the first matching block. Kept only for the map's
 * tap-a-bank lookup pending Phase B; the student finder resolves by block id (getLockerSectionById).
 */
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

// ── Locker blocks (the student-facing grouping; a block has many section ranges) ──
/** All locker blocks ("Block 1", "Block 2"…) — the list a student picks from. */
export async function getLockerBlocks(): Promise<LockerBlock[]> {
  const { data, error } = await getSupabase()
    .from('locker_blocks')
    .select('*')
    .order('sort_order')
    .order('label');
  if (error) throw error;
  return data ?? [];
}

/** One block by id (for its display label). */
export async function getLockerBlock(id: string): Promise<LockerBlock | null> {
  const { data, error } = await getSupabase()
    .from('locker_blocks')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Resolve a (block, number) to the section within that block whose range contains the number. A block
 * holds several non-overlapping ranges (e.g. Block 4 = 001–069, 070–156, 253–264, 265–306); this
 * finds the one the number lands in. Returns null when no range in the block contains it. The block
 * id is what disambiguates — the same number can exist in a different block's range.
 */
export async function resolveLockerInBlock(
  blockId: string,
  lockerNumber: number,
): Promise<LockerSection | null> {
  const { data, error } = await getSupabase()
    .from('locker_sections')
    .select('*')
    .eq('block_id', blockId)
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
