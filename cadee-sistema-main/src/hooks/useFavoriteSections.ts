import { useQueries } from '@tanstack/react-query';
import { fetchSectionsByCourseCode, Section } from '@/services/api';

export function useFavoriteSections(codes: string[]) {
  const queries = useQueries({
    queries: (codes || []).map((code) => ({
      queryKey: ['course-sections-by-code', code],
      queryFn: () => fetchSectionsByCourseCode(code),
      enabled: !!code,
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 60,
    })),
  });

  const sections: Section[] = queries.flatMap((q) => q.data || []);
  const isLoading = queries.some((q) => q.isLoading);
  const isFetching = queries.some((q) => q.isFetching);
  const error = queries.find((q) => q.error)?.error as Error | undefined;

  return { sections, isLoading, isFetching, error } as const;
}

