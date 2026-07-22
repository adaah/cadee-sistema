import { useMemo, useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useMyPrograms } from '@/hooks/useMyPrograms';
import { useMyCourses } from '@/hooks/useMyCourses';
import { useMySections } from '@/hooks/useMySections';
import { usePrograms } from '@/hooks/useApi';
import { parseCompleteHistory, type WorkloadData } from '@/utils/historyParser';
import { getCourseWorkload, getWorkloadCategory, sumWorkloadByCategory } from '@/lib/semester';

export interface OverallProgressData {
  overallProgress: number;
  totalHours: number;
  totalRequiredHours: number;
  mandatory: { completed: number; total: number };
  electives: { completed: number; total: number };
  complementary: { completed: number; total: number };
  // Previsão com disciplinas planejadas
  projected: {
    overallProgress: number;
    totalHours: number;
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

  // Calcular carga horária das disciplinas planejadas por categoria
  const plannedWorkload = useMemo(() => {
    const workload = { mandatory: 0, elective: 0, complementary: 0 };
    const coursesByCode = new Map(courses.map((c) => [c.code, c]));
    const plannedCodes = new Set<string>();

    mySections.forEach((section) => {
      const code = section.course?.code || (section as { course_code?: string }).course_code;
      if (code && !plannedCodes.has(code)) {
        plannedCodes.add(code);
        const course = coursesByCode.get(code);
        if (course) {
          const courseWorkload = getCourseWorkload(course as any);
          const courseType = (course as any).type;
          const category = getWorkloadCategory(typeof courseType === 'string' ? courseType : undefined);
          if (category === 'mandatory') workload.mandatory += courseWorkload;
          else if (category === 'elective') workload.elective += courseWorkload;
          else if (category === 'complementary') workload.complementary += courseWorkload;
        }
      }
    });

    return workload;
  }, [mySections, courses]);

  // Calcular bônus de disciplinas marcadas manualmente
  const manualWorkloadBonus = useMemo(() => {
    const bonus = { mandatory: 0, elective: 0, complementary: 0 };
    const coursesByCode = new Map(courses.map((c) => [c.code, c]));
    
    completedDisciplines.forEach((code) => {
      const course = coursesByCode.get(code);
      if (course) {
        const workload = getCourseWorkload(course);
        const courseType = (course as any).type;
        const category = getWorkloadCategory(typeof courseType === 'string' ? courseType : undefined);
        if (category === 'mandatory') bonus.mandatory += workload;
        else if (category === 'elective') bonus.elective += workload;
        else if (category === 'complementary') bonus.complementary += workload;
      }
    });
    
    return bonus;
  }, [completedDisciplines, courses]);

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
    // Verificar se há histórico importado
    const savedData = localStorage.getItem('progressData');
    
    if (!savedData) {
      return {
        totalHours: 0,
        mandatory: { completed: 0, total: curriculumRequirements.mandatory },
        electives: { completed: 0, total: curriculumRequirements.elective },
        complementary: { completed: 0, total: curriculumRequirements.complementary },
        totalSemesters: 0,
      };
    }

    try {
      const parsedData = JSON.parse(savedData);
      const parsedWorkload = parsedData.workload as WorkloadData | null;
      const parsedSemesters = parsedData.semesters as Map<string, any> | null;

      console.log('[useOverallProgress] parsedWorkload:', parsedWorkload);

      // Usar os requisitos do histórico importado se disponíveis, caso contrário usar curriculumRequirements
      const mandatoryTotal = parsedWorkload?.mandatory.required ?? curriculumRequirements.mandatory;
      const electivesTotal = parsedWorkload?.elective.required ?? curriculumRequirements.elective;
      const complementaryTotal = parsedWorkload?.complementary.required ?? curriculumRequirements.complementary;

      // O histórico importado já tem as horas completadas, não somar manualWorkloadBonus
      const mandatoryCompleted = parsedWorkload?.mandatory.completed ?? 0;
      const electivesCompleted = parsedWorkload?.elective.completed ?? 0;
      const complementaryCompleted = parsedWorkload?.complementary.completed ?? 0;
      const totalHours = mandatoryCompleted + electivesCompleted + complementaryCompleted;

      console.log('[useOverallProgress] progressData:', {
        mandatoryCompleted,
        electivesCompleted,
        complementaryCompleted,
        totalHours,
        mandatoryTotal,
        electivesTotal,
        complementaryTotal
      });

      return {
        totalHours,
        mandatory: { completed: mandatoryCompleted, total: mandatoryTotal },
        electives: { completed: electivesCompleted, total: electivesTotal },
        complementary: { completed: complementaryCompleted, total: complementaryTotal },
        totalSemesters: parsedSemesters?.size || 0,
      };
    } catch {
      return {
        totalHours: 0,
        mandatory: { completed: 0, total: curriculumRequirements.mandatory },
        electives: { completed: 0, total: curriculumRequirements.elective },
        complementary: { completed: 0, total: curriculumRequirements.complementary },
        totalSemesters: 0,
      };
    }
  }, [manualWorkloadBonus, curriculumRequirements, semesterOutcomes, localStorageKey]);

  const totalRequiredHours = progressData.mandatory.total + progressData.electives.total + progressData.complementary.total;
  const overallProgress = totalRequiredHours > 0 
    ? (progressData.totalHours / totalRequiredHours) * 100 
    : 0;

  // Calcular previsão com disciplinas planejadas
  const projectedTotalHours = progressData.totalHours + plannedWorkload.mandatory + plannedWorkload.elective + plannedWorkload.complementary;
  const projectedMandatoryCompleted = progressData.mandatory.completed + plannedWorkload.mandatory;
  const projectedElectivesCompleted = progressData.electives.completed + plannedWorkload.elective;
  const projectedComplementaryCompleted = progressData.complementary.completed + plannedWorkload.complementary;
  const projectedOverallProgress = totalRequiredHours > 0 
    ? (projectedTotalHours / totalRequiredHours) * 100 
    : 0;

  return {
    overallProgress,
    totalHours: progressData.totalHours,
    totalRequiredHours,
    mandatory: progressData.mandatory,
    electives: progressData.electives,
    complementary: progressData.complementary,
    projected: {
      overallProgress: projectedOverallProgress,
      totalHours: projectedTotalHours,
      mandatory: { completed: projectedMandatoryCompleted, total: progressData.mandatory.total },
      electives: { completed: projectedElectivesCompleted, total: progressData.electives.total },
      complementary: { completed: projectedComplementaryCompleted, total: progressData.complementary.total },
    },
  };
}
