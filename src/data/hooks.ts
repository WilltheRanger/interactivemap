/**
 * TanStack Query hooks over the reference-data access layer. Each exposes { data, isPending, error }
 * so screens can render the loading / empty / error states (DESIGN.md).
 */
import { useQuery } from '@tanstack/react-query';
import {
  getBuilding,
  getBuildings,
  getCoursesForPeriod,
  getPanorama,
  getRoomsByBuilding,
  getRoomWithTeacher,
  getSectionsForCourse,
  getTeachers,
  resolveLockerSection,
} from '../lib/refData';

const STALE_MS = 5 * 60 * 1000; // reference data changes rarely

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

export function usePanorama(id: string | null) {
  return useQuery({
    queryKey: ['panorama', id],
    queryFn: () => getPanorama(id as string),
    enabled: id != null,
    staleTime: STALE_MS,
  });
}
