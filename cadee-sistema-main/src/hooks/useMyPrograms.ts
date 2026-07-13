import { useEffect, useMemo } from 'react';
import { usePrograms } from '@/hooks/useApi';
import type { Program } from '@/services/api';
import { atom, useAtom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

// Persist only IDs; derive full Program objects via usePrograms
const selectedProgramIdsAtom = atomWithStorage<string[]>('selectedPrograms', []);

export interface UseMyProgramsApi {
  myPrograms: Program[];
  selectedPrograms: string[];
  setSelectedPrograms: (ids: string[]) => void;
  addProgram: (id: string) => void;
  removeProgram: (id: string) => void;
  clearPrograms: () => void;
}

export function useMyPrograms(): UseMyProgramsApi {
    const { data: programs } = usePrograms();
    const [selectedPrograms, setSelectedPrograms] = useAtom(selectedProgramIdsAtom);

    const myPrograms = useMemo(() => {
        if (!programs) return [];
        const byId = new Map(programs.map((p) => [p.id_ref, p]));
        return selectedPrograms
            .map((id) => byId.get(id))
            .filter(Boolean) as Program[];
    }, [programs, selectedPrograms]);

    const addProgram = (id: string) => {
        setSelectedPrograms((prev) => (prev.includes(id) ? prev : [...prev, id]));
    };

    const removeProgram = (id: string) => {
        setSelectedPrograms((prev) => prev.filter((p) => p !== id));
    };

    const clearPrograms = () => setSelectedPrograms([]);

    return {
        myPrograms,
        selectedPrograms,
        setSelectedPrograms,
        addProgram,
        removeProgram,
        clearPrograms,
    };
}
