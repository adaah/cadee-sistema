import { useMemo, useCallback } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useMySections } from '@/hooks/useMySections';
import { useMyCourses } from '@/hooks/useMyCourses';
import { useCourses } from '@/hooks/useApi';
import { fetchCourseByCode, type Course, type Section } from '@/services/api';
import { getBlockCourseBaseCode, resolveBlockCourseName } from '@/lib/blockCourses';
import { getCourseWorkload } from '@/lib/semester';

export type DisciplineCategory = 'mandatory' | 'elective' | 'offered';

export interface PlannedDisciplineInfo {
  baseCode: string;
  disciplineCodes: string[];
  sections: Section[];
  course?: Course;
  name: string;
  workload: number;
  category: DisciplineCategory;
  isEquivalent: boolean;
  equivalentToCourse?: Course;
}

export function extractEquivalentBaseCodes(detail: any): Set<string> {
  const out = new Set<string>();
  const equivalences = detail?.equivalences as any[][] | undefined;
  if (!equivalences || !Array.isArray(equivalences)) return out;
  for (const grp of equivalences) {
    if (!Array.isArray(grp)) continue;
    for (const eq of grp) {
      const eqCode = (eq as any)?.code as string | undefined;
      if (eqCode) out.add(getBlockCourseBaseCode(eqCode));
    }
  }
  return out;
}

export function isCurriculumElective(c: Course): boolean {
  if ((c.level || '').includes('Ofertada')) return false;
  const levelRaw = (c.level || '').replace(' (Ofertada)', '').replace('Ofertada ao curso', '').trim().toLowerCase();
  if (levelRaw.includes('optativ')) return true;
  const t = (c.type || '').toUpperCase().trim();
  return t.includes('OPT');
}

export function isCurriculumMandatory(c: Course): boolean {
  if ((c.level || '').includes('Ofertada')) return false;
  const levelRaw = (c.level || '').replace(' (Ofertada)', '').replace('Ofertada ao curso', '').trim().toLowerCase();
  if (levelRaw.includes('optativ')) return false;
  const t = (c.type || '').toUpperCase().trim();
  if (t.includes('OPT')) return false;
  if (t.includes('COMP')) return false;
  return true;
}

export function usePlannedDisciplineCategories() {
  const { mySections } = useMySections();
  const { courses } = useMyCourses();
  const { data: coursesIndex = [] } = useCourses();

  const coursesByCode = useMemo(() => new Map(courses.map((c) => [c.code, c])), [courses]);
  const coursesIndexByCode = useMemo(() => new Map(coursesIndex.map((c) => [c.code, c])), [coursesIndex]);

  // Agrupa seções planejadas pelo código base da disciplina (ex: MATB59.0 e MATB59.1 -> MATB59)
  const groupedSections = useMemo(() => {
    const groups = new Map<string, Section[]>();
    for (const s of mySections) {
      const code = s.course?.code || (s as { course_code?: string }).course_code;
      if (code) {
        const baseCode = getBlockCourseBaseCode(code);
        const existing = groups.get(baseCode) || [];
        existing.push(s);
        groups.set(baseCode, existing);
      }
    }
    return groups;
  }, [mySections]);

  // Lista de códigos para busca de detalhes e equivalências
  const codesToQuery = useMemo(() => {
    const set = new Set<string>();
    for (const c of courses) {
      set.add(getBlockCourseBaseCode(c.code));
    }
    for (const s of mySections) {
      const code = s.course?.code || (s as any).course_code;
      if (code) set.add(getBlockCourseBaseCode(code));
    }
    return Array.from(set);
  }, [courses, mySections]);

  // Busca detalhes de todas as disciplinas envolvidas para capturar equivalências
  const allCourseDetails = useQueries({
    queries: codesToQuery.map((code) => ({
      queryKey: ['course-by-code', code],
      queryFn: () => fetchCourseByCode(code),
      enabled: !!code,
      staleTime: 1000 * 60 * 60,
      gcTime: 1000 * 60 * 60 * 24,
    })),
  });

  // Constrói grafo de equivalências bidirecionais (usando queries e localStorage)
  const equivalenceGraph = useMemo(() => {
    const graph = new Map<string, Set<string>>();

    const addEdge = (a: string, b: string) => {
      if (a === b) return;
      if (!graph.has(a)) graph.set(a, new Set());
      if (!graph.has(b)) graph.set(b, new Set());
      graph.get(a)!.add(b);
      graph.get(b)!.add(a);
    };

    // 1. Carrega equivalências persistidas
    try {
      const persisted = JSON.parse(localStorage.getItem('cadee_equivalences') || '{}') as Record<string, string[]>;
      for (const [base, eqs] of Object.entries(persisted)) {
        for (const eq of eqs) {
          addEdge(base, getBlockCourseBaseCode(eq));
        }
      }
    } catch (e) {
      console.error('Erro ao ler cadee_equivalences:', e);
    }

    // 2. Extrai das queries carregadas
    const newPersistedMap: Record<string, string[]> = {};
    for (const result of allCourseDetails) {
      const detail = result.data;
      if (!detail?.code) continue;
      const base = getBlockCourseBaseCode(detail.code);
      const eqs = extractEquivalentBaseCodes(detail);
      if (eqs.size > 0) {
        newPersistedMap[base] = Array.from(eqs);
        for (const eq of eqs) {
          addEdge(base, eq);
        }
      }
    }

    // Atualiza o localStorage se novas equivalências foram descobertas
    if (Object.keys(newPersistedMap).length > 0) {
      try {
        const current = JSON.parse(localStorage.getItem('cadee_equivalences') || '{}');
        const updated = { ...current, ...newPersistedMap };
        localStorage.setItem('cadee_equivalences', JSON.stringify(updated));
      } catch {}
    }

    return graph;
  }, [allCourseDetails]);

  // Função helper para obter todos os códigos equivalentes a um dado código
  const getEquivalentCodesFor = useCallback(
    (code: string): string[] => {
      const base = getBlockCourseBaseCode(code);
      const visited = new Set<string>();
      const queue = [base];
      visited.add(base);

      while (queue.length > 0) {
        const curr = queue.shift()!;
        const neighbors = equivalenceGraph.get(curr);
        if (neighbors) {
          for (const next of neighbors) {
            if (!visited.has(next)) {
              visited.add(next);
              queue.push(next);
            }
          }
        }
      }

      return Array.from(visited);
    },
    [equivalenceGraph]
  );

  // Mapeamento dos cursos curriculares para identificação rápida
  const { mandatoryCurriculumMap, electiveCurriculumMap } = useMemo(() => {
    const mandatory = new Map<string, Course>();
    const elective = new Map<string, Course>();

    for (const c of courses) {
      const base = getBlockCourseBaseCode(c.code);
      if (isCurriculumElective(c)) {
        elective.set(base, c);
      } else if (isCurriculumMandatory(c)) {
        mandatory.set(base, c);
      }
    }

    return { mandatoryCurriculumMap: mandatory, electiveCurriculumMap: elective };
  }, [courses]);

  // Detalha e classifica cada disciplina planejada
  const plannedDisciplines = useMemo<PlannedDisciplineInfo[]>(() => {
    const list: PlannedDisciplineInfo[] = [];

    for (const [baseCode, sections] of groupedSections.entries()) {
      const disciplineCodes = sections.map(
        (s) => s.course?.code || (s as { course_code?: string }).course_code || baseCode
      );

      const course = coursesByCode.get(baseCode) || coursesByCode.get(disciplineCodes[0]) || coursesIndexByCode.get(baseCode);
      const name = resolveBlockCourseName(
        disciplineCodes[0],
        coursesIndexByCode,
        course?.name ?? baseCode
      );
      const workload = getCourseWorkload(course as any);

      // Determina a categoria
      let category: DisciplineCategory = 'offered';
      let isEquivalent = false;
      let equivalentToCourse: Course | undefined = undefined;

      // 1. Checagem direta na grade do curso
      if (mandatoryCurriculumMap.has(baseCode)) {
        category = 'mandatory';
        isEquivalent = false;
      } else if (electiveCurriculumMap.has(baseCode)) {
        category = 'elective';
        isEquivalent = false;
      } else {
        // 2. Checagem por equivalência
        const equivalentCodes = getEquivalentCodesFor(baseCode);
        for (const eq of equivalentCodes) {
          if (eq === baseCode) continue;

          if (mandatoryCurriculumMap.has(eq)) {
            category = 'mandatory';
            isEquivalent = true;
            equivalentToCourse = mandatoryCurriculumMap.get(eq);
            break;
          } else if (electiveCurriculumMap.has(eq)) {
            category = 'elective';
            isEquivalent = true;
            equivalentToCourse = electiveCurriculumMap.get(eq);
            break;
          }
        }
      }

      list.push({
        baseCode,
        disciplineCodes,
        sections,
        course: course as Course | undefined,
        name,
        workload,
        category,
        isEquivalent,
        equivalentToCourse,
      });
    }

    return list;
  }, [groupedSections, coursesByCode, coursesIndexByCode, mandatoryCurriculumMap, electiveCurriculumMap, getEquivalentCodesFor]);

  // Contagem de disciplinas por categoria
  const disciplinesCount = useMemo(() => {
    let mandatory = 0;
    let elective = 0;
    let offered = 0;

    for (const item of plannedDisciplines) {
      if (item.category === 'mandatory') mandatory++;
      else if (item.category === 'elective') elective++;
      else if (item.category === 'offered') offered++;
    }

    return {
      mandatory,
      elective,
      offered,
      total: plannedDisciplines.length,
    };
  }, [plannedDisciplines]);

  // Divisão de carga horária por categoria
  const workloadBreakdown = useMemo(() => {
    let mandatory = 0;
    let elective = 0;
    let offered = 0;

    for (const item of plannedDisciplines) {
      if (item.category === 'mandatory') mandatory += item.workload;
      else if (item.category === 'elective') elective += item.workload;
      else if (item.category === 'offered') offered += item.workload;
    }

    return {
      mandatory,
      elective,
      offered,
      complementary: 0,
      total: mandatory + elective + offered,
    };
  }, [plannedDisciplines]);

  const getDisciplineCategory = useCallback(
    (code: string): DisciplineCategory => {
      const base = getBlockCourseBaseCode(code);
      const found = plannedDisciplines.find((p) => p.baseCode === base);
      if (found) return found.category;

      if (mandatoryCurriculumMap.has(base)) return 'mandatory';
      if (electiveCurriculumMap.has(base)) return 'elective';

      const equivalentCodes = getEquivalentCodesFor(base);
      for (const eq of equivalentCodes) {
        if (eq === base) continue;
        if (mandatoryCurriculumMap.has(eq)) return 'mandatory';
        if (electiveCurriculumMap.has(eq)) return 'elective';
      }

      return 'offered';
    },
    [plannedDisciplines, mandatoryCurriculumMap, electiveCurriculumMap, getEquivalentCodesFor]
  );

  return {
    plannedDisciplines,
    scheduledCount: plannedDisciplines.length,
    disciplinesCount,
    workloadBreakdown,
    getDisciplineCategory,
    getEquivalentCodesFor,
    isLoaded: !allCourseDetails.some((q) => q.isLoading),
  };
}
