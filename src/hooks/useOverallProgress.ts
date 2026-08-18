import { useMemo, useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useMyPrograms } from '@/hooks/useMyPrograms';
import { useMyCourses } from '@/hooks/useMyCourses';
import { useMySections } from '@/hooks/useMySections';
import { usePrograms } from '@/hooks/useApi';
import { type WorkloadData } from '@/utils/historyParser';
import { getCourseWorkload, getWorkloadCategory, sumWorkloadByCategory } from '@/lib/semester';

import { usePlannedDisciplineCategories } from '@/hooks/usePlannedDisciplineCategories';

export interface OverallProgressData {
  overallProgress: number;
  totalHours: number;
  rawTotalHours: number;
  totalRequiredHours: number;
  mandatory: { completed: number; total: number };
  electives: { completed: number; total: number };
  complementary: { completed: number; total: number };
  // Previsão com disciplinas planejadas
  projected: {
    overallProgress: number;
    totalHours: number;
    rawTotalHours: number;
    mandatory: { completed: number; total: number };
    electives: { completed: number; total: number };
    complementary: { completed: number; total: number };
  };
}

export function useOverallProgress(): OverallProgressData {
  const { completedDisciplines, semesterOutcomes } = useApp();
  const { myPrograms, selectedPrograms } = useMyPrograms();
  const { courses } = useMyCourses();
  const { mySections } = useMySections();
  const { data: programs } = usePrograms();
  const { workloadBreakdown: plannedWorkload } = usePlannedDisciplineCategories();
  const [localStorageKey, setLocalStorageKey] = useState(0);

  // Listener para mudanças no localStorage (quando histórico é importado)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'progressData') {
        setLocalStorageKey(prev => prev + 1);
      }
    };

    // Listener para evento customizado (mesma aba)
    const handleCustomEvent = () => {
      setLocalStorageKey(prev => prev + 1);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('progressDataUpdated', handleCustomEvent);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('progressDataUpdated', handleCustomEvent);
    };
  }, []);

  // Obter dados salvos do histórico importado
  const savedParsedData = useMemo(() => {
    const savedData = localStorage.getItem('progressData');
    if (!savedData) return null;
    try {
      const parsed = JSON.parse(savedData);
      return {
        codes: (parsed.codes || []) as string[],
        workload: (parsed.workload || null) as WorkloadData | null,
        semestersCount: (parsed.semesters ? parsed.semesters.length : 0) as number,
      };
    } catch {
      return null;
    }
  }, [localStorageKey]);

  // Calcular bônus de disciplinas marcadas manualmente (que não vieram da tabela do histórico)
  const manualWorkloadBonus = useMemo(() => {
    const bonus = { mandatory: 0, elective: 0, complementary: 0 };
    const coursesByCode = new Map(courses.map((c) => [c.code, c]));
    const importedCodes = new Set(savedParsedData?.codes || []);
    const hasWorkloadTable = !!savedParsedData?.workload;

    const allApproved = new Set([
      ...completedDisciplines,
      ...Object.values(semesterOutcomes).flatMap((o) => o.approved),
    ]);

    for (const code of allApproved) {
      // Se tiver tabela de carga horária importada e a disciplina já estava no histórico, não soma novamente
      if (hasWorkloadTable && importedCodes.has(code)) continue;

      const course = coursesByCode.get(code);
      if (course) {
        const workload = getCourseWorkload(course);
        const courseType = (course as any).type;
        const category = getWorkloadCategory(typeof courseType === 'string' ? courseType : undefined);
        if (category === 'mandatory') bonus.mandatory += workload;
        else if (category === 'elective') bonus.elective += workload;
        else if (category === 'complementary') bonus.complementary += workload;
      }
    }

    return bonus;
  }, [completedDisciplines, semesterOutcomes, courses, savedParsedData]);

  // Calcular requisitos do currículo
  const curriculumRequirements = useMemo(() => {
    if (!selectedPrograms.length || !programs) {
      return { mandatory: 0, elective: 0, complementary: 0 };
    }

    const programId = selectedPrograms[0];
    const program = programs.find((p) => p.id_ref === programId);
    
    if (!program) {
      return { mandatory: 0, elective: 0, complementary: 0 };
    }

    // Usar os dados do programa se disponíveis, caso contrário usar os cursos do useMyCourses
    let programCourses = (program as any).courses || [];
    
    // Se o programa não tiver cursos, usar os cursos do useMyCourses
    if (programCourses.length === 0 && courses.length > 0) {
      programCourses = courses;
    }
    
    const byCategory = sumWorkloadByCategory(programCourses);
    
    return {
      mandatory: byCategory.mandatory,
      elective: byCategory.elective,
      complementary: byCategory.complementary,
    };
  }, [selectedPrograms, programs, courses]);

  const progressData = useMemo(() => {
    const parsedWorkload = savedParsedData?.workload;

    // Requisitos: histórico importado ou grade curricular
    const mandatoryTotal = parsedWorkload?.mandatory.required || curriculumRequirements.mandatory || 0;
    const electivesTotal = parsedWorkload?.elective.required || curriculumRequirements.elective || 0;
    const complementaryTotal = parsedWorkload?.complementary.required || curriculumRequirements.complementary || 0;

    // Horas completadas: histórico + disciplinas manuais adicionais
    const mandatoryCompleted = (parsedWorkload?.mandatory.completed ?? 0) + manualWorkloadBonus.mandatory;
    const electivesCompleted = (parsedWorkload?.elective.completed ?? 0) + manualWorkloadBonus.elective;
    const complementaryCompleted = (parsedWorkload?.complementary.completed ?? 0) + manualWorkloadBonus.complementary;
    const rawTotalHours = mandatoryCompleted + electivesCompleted + complementaryCompleted;

    return {
      rawTotalHours,
      mandatory: { completed: mandatoryCompleted, total: mandatoryTotal },
      electives: { completed: electivesCompleted, total: electivesTotal },
      complementary: { completed: complementaryCompleted, total: complementaryTotal },
    };
  }, [savedParsedData, manualWorkloadBonus, curriculumRequirements]);

  const totalRequiredHours = progressData.mandatory.total + progressData.electives.total + progressData.complementary.total;
  
  // Calcular horas efetivas limitadas ao teto de cada categoria (não permitindo que horas excedentes compensem outras)
  const cappedMandatory = Math.min(progressData.mandatory.completed, progressData.mandatory.total);
  const cappedElectives = Math.min(progressData.electives.completed, progressData.electives.total);
  const cappedComplementary = Math.min(progressData.complementary.completed, progressData.complementary.total);
  const effectiveTotalHours = cappedMandatory + cappedElectives + cappedComplementary;

  const overallProgress = totalRequiredHours > 0 
    ? Math.min(100, (effectiveTotalHours / totalRequiredHours) * 100)
    : 0;

  // Previsão com disciplinas planejadas
  const projectedMandatoryCompleted = progressData.mandatory.completed + plannedWorkload.mandatory;
  const projectedElectivesCompleted = progressData.electives.completed + plannedWorkload.elective;
  const projectedComplementaryCompleted = progressData.complementary.completed + plannedWorkload.complementary;
  const rawProjectedTotalHours = projectedMandatoryCompleted + projectedElectivesCompleted + projectedComplementaryCompleted;
  
  const cappedProjectedMandatory = Math.min(projectedMandatoryCompleted, progressData.mandatory.total);
  const cappedProjectedElectives = Math.min(projectedElectivesCompleted, progressData.electives.total);
  const cappedProjectedComplementary = Math.min(projectedComplementaryCompleted, progressData.complementary.total);
  const effectiveProjectedTotalHours = cappedProjectedMandatory + cappedProjectedElectives + cappedProjectedComplementary;

  const projectedOverallProgress = totalRequiredHours > 0 
    ? Math.min(100, (effectiveProjectedTotalHours / totalRequiredHours) * 100)
    : 0;

  return {
    overallProgress,
    totalHours: effectiveTotalHours,
    rawTotalHours: progressData.rawTotalHours,
    totalRequiredHours,
    mandatory: progressData.mandatory,
    electives: progressData.electives,
    complementary: progressData.complementary,
    projected: {
      overallProgress: projectedOverallProgress,
      totalHours: effectiveProjectedTotalHours,
      rawTotalHours: rawProjectedTotalHours,
      mandatory: { completed: projectedMandatoryCompleted, total: progressData.mandatory.total },
      electives: { completed: projectedElectivesCompleted, total: progressData.electives.total },
      complementary: { completed: projectedComplementaryCompleted, total: progressData.complementary.total },
    },
  };
}
