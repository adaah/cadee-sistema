import { atomWithStorage } from 'jotai/utils';
import { useAtom } from 'jotai';

/** Semestre letivo em que o usuário está planejando a grade (ex: "2026.1"). */
const planningTermAtom = atomWithStorage<string | null>('planningTerm', null);

export function usePlanningTerm() {
  const [planningTerm, setPlanningTerm] = useAtom(planningTermAtom);
  return { planningTerm, setPlanningTerm };
}
