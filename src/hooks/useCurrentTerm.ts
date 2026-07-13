import { useMemo } from 'react';
import { useSections } from '@/hooks/useApi';
import { extractCurrentTerm } from '@/lib/semester';

export function useCurrentTerm() {
  const { data: sections = [], isLoading } = useSections();

  const currentTerm = useMemo(() => extractCurrentTerm(sections), [sections]);

  return { currentTerm, isLoading };
}
