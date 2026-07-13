import { atomWithStorage } from 'jotai/utils';
import { useAtom } from 'jotai';
import { produce } from 'immer';
import type { Section } from '@/services/api';
import { useMemo } from 'react';
import { getSpplitedCode } from '@/lib/schedule';

// Persisted sections selected by the user
const mySectionsAtom = atomWithStorage<Section[]>('mySections', []);

export function useMySections() {
  const [mySections, setMySections] = useAtom(mySectionsAtom);

  const toggleSection = (aSection: Section) => {
    setMySections((current) => {
      const next = produce(current, (draft) => {
        // Verifica se já existe uma turma da mesma disciplina
        const courseCode = aSection.course?.code || (aSection as any)?.course_code;
        const existingSectionIndex = draft.findIndex((s) => {
          const sCourseCode = s.course?.code || (s as any)?.course_code;
          return sCourseCode === courseCode;
        });
        
        if (existingSectionIndex >= 0) {
          const existingSection = draft[existingSectionIndex];
          
          // Se é a mesma turma, remove ela
          if (existingSection.id_ref === aSection.id_ref) {
            draft.splice(existingSectionIndex, 1);
          } else {
            // Se é outra turma da mesma disciplina, substitui
            draft[existingSectionIndex] = aSection;
          }
        } else {
          // Se não existe nenhuma turma desta disciplina, adiciona
          draft.push(aSection);
        }
      });
      return next;
    });
  };

  const clearSections = () => setMySections([]);

  // Record keyed by each time code (if any)
  const byTimeCode = useMemo(() =>
    mySections
      .flatMap((s) => (s.time_codes || []).map((code) => [code, s] as const))
      .reduce((acc, [code, s]) => {
        acc[code] = s;
        return acc;
      }, {} as Record<string, Section>)
  , [mySections]);

  const timeCodeKeys = useMemo(() => Object.keys(byTimeCode), [byTimeCode]);

  // Record keyed by id_ref
  const byIdRef = useMemo(() =>
    mySections.reduce((acc, s) => {
      acc[s.id_ref] = s;
      return acc;
    }, {} as Record<string, Section>)
  , [mySections]);

  // Record keyed by course.code (last one wins if multiple)
  const byCourseCode = useMemo(() =>
    mySections.reduce((acc, s) => {
      const code = s.course.code;
      acc[code] = s;
      return acc;
    }, {} as Record<string, Section>)
  , [mySections]);

  // Record keyed by cartesian split codes from time_codes
  const byCartesianCode = useMemo(() =>
    Object.entries(byTimeCode)
      .flatMap(([time, s]) => getSpplitedCode(time).map((k) => [k, s] as const))
      .reduce((acc, [k, s]) => {
        acc[k] = s;
        return acc;
      }, {} as Record<string, Section>)
  , [byTimeCode]);

  const hasSectionOnCourse = (code: string): boolean => {
    if (!code) return false;
    return !!byCourseCode[code];
  };

  // Nova função para verificar se uma turma específica está selecionada
  const hasSection = (sectionId: string): boolean => {
    return !!byIdRef[sectionId];
  };

  // Função para obter a turma atual de uma disciplina
  const getSectionForCourse = (courseCode: string): Section | null => {
    return byCourseCode[courseCode] || null;
  };

  const hasSectionOnCode = (code: string): Array<{ code: string; section: Section }> => {
    if (!code) return [];
    const keys = getSpplitedCode(code);
    return keys
      .map((k) => (byCartesianCode[k] ? { code: k, section: byCartesianCode[k] } : null))
      .filter((x): x is { code: string; section: Section } => !!x);
  };

  const getConflictsForSection = (aSection: Section): Array<{ code: string; section: Section }> => {
    if (!aSection.time_codes) return [];
    
    const conflicts: Array<{ code: string; section: Section }> = [];
    const seen = new Set<string>();
    
    // Para cada time_code da seção
    for (const timeCode of aSection.time_codes) {
      // Quebra o time_code em códigos individuais (dias e horários)
      const codes = getSpplitedCode(timeCode);
      
      // Para cada código individual
      for (const code of codes) {
        // Encontra todas as seções que compartilham este código
        const sectionsWithSameCode = hasSectionOnCode(code);
        
        // Adiciona à lista de conflitos, se não for a própria seção e não for duplicada
        for (const { section, code: conflictCode } of sectionsWithSameCode) {
          if (section.id_ref !== aSection.id_ref && !seen.has(section.id_ref)) {
            conflicts.push({ code: conflictCode, section });
            seen.add(section.id_ref);
          }
        }
      }
    }
    
    return conflicts;
  };

  return {
    mySections,
    toggleSection,
    clearSections,
    byTimeCode,
    timeCodeKeys,
    byIdRef,
    byCourseCode,
    byCartesianCode,
    hasSectionOnCourse,
    hasSection,
    getSectionForCourse,
    hasSectionOnCode,
    getConflictsForSection,
  } as const;
}
