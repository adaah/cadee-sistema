import { useEffect, useMemo, useCallback } from 'react';
import { useCurrentTerm } from '@/hooks/useCurrentTerm';
import { usePlanningTerm } from '@/hooks/usePlanningTerm';
import { useMySections } from '@/hooks/useMySections';
import { useApp } from '@/contexts/AppContext';

export function useSemesterTransition() {
  const { currentTerm } = useCurrentTerm();
  const { planningTerm, setPlanningTerm } = usePlanningTerm();
  const { mySections, clearSections } = useMySections();
  const { getDisciplineStatus } = useApp();

  const plannedCodes = useMemo(() => {
    const codes = new Set<string>();
    for (const s of mySections) {
      const code = s.course?.code || (s as { course_code?: string }).course_code;
      if (code) codes.add(code);
    }
    return [...codes];
  }, [mySections]);

  const unresolvedCodes = useMemo(
    () => plannedCodes.filter((code) => !getDisciplineStatus(code)),
    [plannedCodes, getDisciplineStatus]
  );

  const isNewSemester = !!(currentTerm && planningTerm && currentTerm !== planningTerm);
  const pendingTransition = isNewSemester && mySections.length > 0;
  const canAdvance = isNewSemester && unresolvedCodes.length === 0;

  /** Termo usado para registrar resultados (semestre anterior durante transição). */
  const statusTerm = pendingTransition ? planningTerm : currentTerm;

  useEffect(() => {
    if (!currentTerm) return;
    if (!planningTerm) {
      setPlanningTerm(currentTerm);
      return;
    }
    if (currentTerm !== planningTerm && mySections.length === 0) {
      setPlanningTerm(currentTerm);
    }
  }, [currentTerm, planningTerm, mySections.length, setPlanningTerm]);

  const advanceToNewSemester = useCallback(() => {
    if (!currentTerm || !canAdvance) return;
    clearSections();
    setPlanningTerm(currentTerm);
  }, [currentTerm, canAdvance, clearSections, setPlanningTerm]);

  return {
    currentTerm,
    planningTerm,
    pendingTransition,
    canAdvance,
    isNewSemester,
    statusTerm,
    unresolvedCodes,
    plannedCodes,
    advanceToNewSemester,
  };
}
