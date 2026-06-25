/**
 * TanStack Query hooks over the reference-data access layer. Each exposes { data, isPending, error }
 * so screens can render the loading / empty / error states (DESIGN.md).
 */
import { useQuery } from '@tanstack/react-query';
import { getSupabase } from '../lib/supabase';
import { panoramaStoragePath } from '../lib/panoramaUpload';
import type { Panorama } from '../lib/refData';
import {
  getAnnouncements,
  getBellSchedule,
  getCourses,
  getGraduationRequirements,
  getLockerBlock,
  getLockerBlocks,
  getLockerSections,
  getLockersBySection,
  getPanoramas,
  getBuilding,
  getBuildings,
  getCoursesForPeriod,
  getPanorama,
  getRooms,
  getRoomsByBuilding,
  getRoomWithTeacher,
  getSectionsForCourse,
  getTeachers,
  resolveLockerInBlock,
  resolveLockerSection,
} from '../lib/refData';

const STALE_MS = 5 * 60 * 1000; // reference data changes rarely

export function useAnnouncements() {
  // Fresher than reference data — staff post these during the year.
  return useQuery({ queryKey: ['announcements'], queryFn: getAnnouncements, staleTime: 60 * 1000 });
}

export function useCourses() {
  return useQuery({ queryKey: ['courses'], queryFn: getCourses, staleTime: STALE_MS });
}

export function useGraduationRequirements() {
  return useQuery({
    queryKey: ['graduationRequirements'],
    queryFn: getGraduationRequirements,
    staleTime: STALE_MS,
  });
}

export function useLockerSections() {
  return useQuery({
    queryKey: ['lockerSections'],
    queryFn: getLockerSections,
    staleTime: STALE_MS,
  });
}

export function useLockersBySection(sectionId: string | null) {
  return useQuery({
    queryKey: ['lockers', sectionId],
    queryFn: () => getLockersBySection(sectionId as string),
    enabled: sectionId != null,
    staleTime: STALE_MS,
  });
}

export function usePanoramas() {
  return useQuery({ queryKey: ['panoramas'], queryFn: getPanoramas, staleTime: STALE_MS });
}

export function useBellSchedule() {
  return useQuery({ queryKey: ['bellSchedule'], queryFn: getBellSchedule, staleTime: STALE_MS });
}

export function useBuildings() {
  return useQuery({ queryKey: ['buildings'], queryFn: getBuildings, staleTime: STALE_MS });
}

export function useBuilding(id: string | null) {
  return useQuery({
    queryKey: ['building', id],
    queryFn: () => getBuilding(id as string),
    enabled: id != null,
    staleTime: STALE_MS,
  });
}

export function useRoomsByBuilding(buildingId: string | null) {
  return useQuery({
    queryKey: ['rooms', buildingId],
    queryFn: () => getRoomsByBuilding(buildingId as string),
    enabled: buildingId != null,
    staleTime: STALE_MS,
  });
}

export function useRoomWithTeacher(roomId: string | null) {
  return useQuery({
    queryKey: ['room', roomId],
    queryFn: () => getRoomWithTeacher(roomId as string),
    enabled: roomId != null,
    staleTime: STALE_MS,
  });
}

export function useTeachers() {
  return useQuery({ queryKey: ['teachers'], queryFn: getTeachers, staleTime: STALE_MS });
}

export function useRooms() {
  return useQuery({ queryKey: ['rooms', 'all'], queryFn: getRooms, staleTime: STALE_MS });
}

export function useCoursesForPeriod(period: string | null) {
  return useQuery({
    queryKey: ['courses', period],
    queryFn: () => getCoursesForPeriod(period as string),
    enabled: period != null,
    staleTime: STALE_MS,
  });
}

export function useSectionsForCourse(course: string | null, period?: string) {
  return useQuery({
    queryKey: ['sections', course, period ?? null],
    queryFn: () => getSectionsForCourse(course as string, period),
    enabled: course != null,
    staleTime: STALE_MS,
  });
}

export function useLockerSection(lockerNumber: number | null) {
  return useQuery({
    queryKey: ['lockerSection', lockerNumber],
    queryFn: () => resolveLockerSection(lockerNumber as number),
    enabled: lockerNumber != null,
    staleTime: STALE_MS,
  });
}

/** All locker blocks — the list a student picks from (and the admin Block dropdown). */
export function useLockerBlocks() {
  return useQuery({ queryKey: ['lockerBlocks'], queryFn: getLockerBlocks, staleTime: STALE_MS });
}

/** One block by id, for its display label (the saved locker stores only the id). */
export function useLockerBlock(blockId: string | null) {
  return useQuery({
    queryKey: ['lockerBlock', blockId],
    queryFn: () => getLockerBlock(blockId as string),
    enabled: blockId != null,
    staleTime: STALE_MS,
  });
}

/** Resolve a saved {block, number} to the section (range) in that block that contains the number. */
export function useResolveLocker(blockId: string | null, lockerNumber: number | null) {
  return useQuery({
    queryKey: ['resolveLocker', blockId, lockerNumber],
    queryFn: () => resolveLockerInBlock(blockId as string, lockerNumber as number),
    enabled: blockId != null && lockerNumber != null,
    staleTime: STALE_MS,
  });
}

export function usePanorama(id: string | null) {
  return useQuery({
    queryKey: ['panorama', id],
    queryFn: () => getPanorama(id as string),
    enabled: id != null,
    staleTime: STALE_MS,
  });
}

const SIGNED_URL_TTL_SEC = 3600;

/**
 * Resolve a panorama row to a URL the 360° viewer can load. Panoramas stored in the private
 * `panoramas` Storage bucket get a short-lived **signed** URL (so the bytes stay off the public web);
 * anything else (legacy Cloudinary, or a pasted URL) passes through unchanged. The result is cached
 * and auto-refreshed before the signature expires. Pass the panorama row (or null while it loads).
 */
export function useSignedPanoramaUrl(pano: Pick<Panorama, 'id' | 'image_url'> | null | undefined) {
  const rawUrl = pano?.image_url ?? null;
  const path = rawUrl ? panoramaStoragePath(rawUrl) : null;
  return useQuery({
    queryKey: ['panoramaUrl', pano?.id, rawUrl],
    enabled: rawUrl != null,
    // Non-Storage URLs are stable — seed them so the viewer opens with no extra round-trip.
    initialData: rawUrl != null && path == null ? rawUrl : undefined,
    staleTime: path != null ? (SIGNED_URL_TTL_SEC - 300) * 1000 : Infinity,
    gcTime: SIGNED_URL_TTL_SEC * 1000,
    queryFn: async (): Promise<string> => {
      if (path == null) return rawUrl as string;
      const { data, error } = await getSupabase()
        .storage.from('panoramas')
        .createSignedUrl(path, SIGNED_URL_TTL_SEC);
      if (error || !data?.signedUrl) throw error ?? new Error('Could not load the panorama photo.');
      return data.signedUrl;
    },
  });
}
