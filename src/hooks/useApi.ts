import { useQuery, useQueries } from '@tanstack/react-query';
import { 
  fetchPrograms, 
  fetchCourses, 
  fetchSections, 
  fetchCourseDetail,
  fetchCourseByCode,
  fetchSectionsByCourseCode,
  fetchProgramDetail,
  getProgramCourseCodes,
  Program, 
  Course, 
  Section,
  CourseDetail,
  ProgramDetail
} from '@/services/api';

export function usePrograms() {
  const result = useQuery<Program[], Error>({
    queryKey: ['programs'],
    queryFn: fetchPrograms,
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
  });
  const programs = result.data || [];
  return { ...result, data: programs };
}

export function useCourses() {
  return useQuery<Course[], Error>({
    queryKey: ['courses'],
    queryFn: fetchCourses,
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
  });
}

// Query config para um programa (ProgramDetail) por id_ref
// (removido) batch por código – use useQueries diretamente onde precisar

export function useSections() {
  return useQuery<Section[], Error>({
    queryKey: ['sections'],
    queryFn: fetchSections,
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60 * 12,
  });
}

export function useCourseDetail(detailUrl: string | null | undefined) {
  return useQuery<CourseDetail, Error>({
    queryKey: ['course-detail', detailUrl],
    queryFn: () => detailUrl ? fetchCourseDetail(detailUrl) : Promise.reject(new Error('URL não fornecida')),
    enabled: !!detailUrl,
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
  });
}

export function useCourseByCode(code: string | null | undefined) {
  return useQuery<CourseDetail, Error>({
    queryKey: ['course-by-code', code],
    queryFn: () => code ? fetchCourseByCode(code) : Promise.reject(new Error('Código não fornecido')),
    enabled: !!code,
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
  });
}

export function useCourseSections(courseCode: string | null | undefined) {
  return useQuery<Section[], Error>({
    queryKey: ['course-sections-by-code', courseCode],
    queryFn: () => courseCode ? fetchSectionsByCourseCode(courseCode) : Promise.reject(new Error('Código não fornecido')),
    enabled: !!courseCode,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 60,
  });
}

export function useProgramDetail(detailUrl: string | null | undefined) {
  return useQuery<ProgramDetail, Error>({
    queryKey: ['program-detail', detailUrl],
    queryFn: () => detailUrl ? fetchProgramDetail(detailUrl) : Promise.reject(new Error('URL não fornecida')),
    enabled: !!detailUrl,
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
  });
}

export function useProgramCourseCodes(programIdRef: string | null | undefined) {
  return useQuery<string[], Error>({
    queryKey: ['program-course-codes', programIdRef],
    queryFn: () => programIdRef ? getProgramCourseCodes(programIdRef) : Promise.reject(new Error('ID não fornecido')),
    enabled: !!programIdRef,
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
  });
}
