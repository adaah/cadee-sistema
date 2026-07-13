import { useMemo } from 'react';
import { pipe, map, uniq } from 'ramda'
import { useQueries } from '@tanstack/react-query';
import { useMyPrograms } from '@/hooks/useMyPrograms';
import type { Course } from '@/services/api';
import type { ProgramDetail } from '@/services/api';
import { fetchProgramDetail } from '@/services/api';
import { useCourses } from '@/hooks/useApi';

// Aggregates courses from all selected programs, running N parallel queries.
export function useMyCourses() {
  const { myPrograms } = useMyPrograms();

  const batchResults = useQueries({
    queries: (myPrograms || []).map((p) => ({
      queryKey: ['program-detail', p.detail_url] as const,
      queryFn: () => fetchProgramDetail(p.detail_url),
      enabled: !!p.detail_url,
      staleTime: 1000 * 60 * 60,
      gcTime: 1000 * 60 * 60 * 24,
    })),
  });

  const isLoading = batchResults.some((r) => r.isLoading);

  // Índice global de cursos (contém sections_count, sections_url etc.)
  const { data: coursesIndex = [] } = useCourses();

  const courses: Course[] = useMemo(() => {
    const indexByCode = new Map(coursesIndex.map((c) => [c.code, c]));
    // Extrai e deduplica disciplinas (por código) a partir dos ProgramDetail
    const all: Course[] = batchResults.flatMap((r) => {
      const pd = (r.data as unknown as ProgramDetail) || ({} as ProgramDetail);
      const list = Array.isArray(pd?.courses) ? pd.courses : [];
      return list.map((c: any) => {
        const idx = indexByCode.get(c.code) as any;
        return {
          code: c.code,
          name: idx?.name ?? c.name,
          level: typeof c.semester === 'number' ? `${c.semester}º Semestre` : (c.level ?? '').replace("Nível", "Semestre"),
          type: c.type,
          credits: c.credits,
          workload: c.workload,
          // usa prerequisitos do programa; se não houver, usa do índice
          prerequisites: c.prerequisites ?? (idx as any)?.prerequisites ?? (idx as any)?.prereqs ?? (idx as any)?.prerequisite_codes,
          // Enriquecimento a partir do índice
          sections_count: idx?.sections_count ?? 0,
          sections_url: idx?.sections_url,
          detail_url: idx?.detail_url,
          mode: idx?.mode,
          location: idx?.location,
          id_ref: idx?.id_ref,
          department: idx?.department,
          code_url: idx?.code_url,
        } as Course;
      }) as Course[];
    });

    const byCode = new Map(all.map((c) => [c.code, c]));
    return Array.from(byCode.values());
  }, [batchResults, coursesIndex]);

  const types = useMemo(() => pipe(
    map((r) => r.type),
    uniq
  )(courses), [courses]);

  const levels = useMemo(() => pipe(
    map((r) => r.level),
    uniq
  )(courses), [courses]);

  return { courses, isLoading, levels, types };
}
