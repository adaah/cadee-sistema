import { useEffect, useMemo, useCallback } from 'react';
import { atomWithStorage } from 'jotai/utils';
import { useAtom } from 'jotai';
import { useCurrentTerm } from '@/hooks/useCurrentTerm';
import { usePlanningTerm } from '@/hooks/usePlanningTerm';
import { useMySections } from '@/hooks/useMySections';
import { useApp } from '@/contexts/AppContext';

const resolveModalDismissedAtom = atomWithStorage<boolean>('semesterResolveModalDismissed', false);

export function useSemesterTransition() {
  const { currentTerm } = useCurrentTerm();
  const { planningTerm, setPlanningTerm } = usePlanningTerm();
  const { mySections, clearSections } = useMySections();
  const { getDisciplineStatus } = useApp();
  const [resolveModalDismissed, setResolveModalDismissed] = useAtom(resolveModalDismissedAtom);

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
  /** Modal inicial bloqueante; some ao ir resolver na home e reaparece quando tudo estiver marcado. */
  const showNewSemesterModal = pendingTransition && (canAdvance || !resolveModalDismissed);

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

  useEffect(() => {
    if (!pendingTransition) {
      setResolveModalDismissed(false);
    }
  }, [pendingTransition, setResolveModalDismissed]);

  const advanceToNewSemester = useCallback(() => {
    if (!currentTerm || !canAdvance) return;
    clearSections();
    setPlanningTerm(currentTerm);
  }, [currentTerm, canAdvance, clearSections, setPlanningTerm]);

  const dismissModalToResolve = useCallback(() => {
    setResolveModalDismissed(true);
  }, [setResolveModalDismissed]);

  return {
    currentTerm,
    planningTerm,
    pendingTransition,
    showNewSemesterModal,
    canAdvance,
    isNewSemester,
    statusTerm,
    unresolvedCodes,
    plannedCodes,
    advanceToNewSemester,
    dismissModalToResolve,
  };
}
