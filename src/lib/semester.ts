import type { Section } from '@/services/api';
import type { Course } from '@/services/api';
import { isBlockCourseCode, resolveBlockCourseName } from '@/lib/blockCourses';

export type DisciplineStatus = 'approved' | 'failed' | 'dropped';

export interface SemesterOutcome {
  approved: string[];
  failed: string[];
  dropped: string[];
}

export type WorkloadCategory = 'mandatory' | 'elective' | 'complementary';

/** Extrai o semestre letivo vigente a partir das turmas da API (campo `term`, ex: "2026.1"). */
export function extractCurrentTerm(sections: Section[]): string | null {
  const terms = sections
    .map((s) => s.term || (s as { period?: string }).period)
    .filter((t): t is string => !!t);

  if (terms.length === 0) return null;

  const counts = new Map<string, number>();
  for (const term of terms) {
    counts.set(term, (counts.get(term) || 0) + 1);
  }

  return [...counts.entries()].sort((a, b) => {
    const cmp = b[1] - a[1];
    if (cmp !== 0) return cmp;
    return b[0].localeCompare(a[0]);
  })[0][0];
}

export function getWorkloadCategory(type?: string): WorkloadCategory {
  const t = (type || '').toUpperCase();
  if (t === 'OPT' || t === 'OPTATIVO') return 'elective';
  if (t === 'COMP' || t === 'COMPLEMENTAR') return 'complementary';
  return 'mandatory';
}

export function getCourseWorkload(course: Course | undefined, fallback = 60): number {
  if (!course) return fallback;
  const w = (course as { workload?: number }).workload;
  return typeof w === 'number' && w > 0 ? w : fallback;
}

export function sumWorkloadByCategory(
  items: Array<{ type?: string; workload?: number }>
): Record<WorkloadCategory, number> {
  const sums: Record<WorkloadCategory, number> = { mandatory: 0, elective: 0, complementary: 0 };
  for (const item of items) {
    const hours = getCourseWorkload(item as Course);
    const category = getWorkloadCategory(item.type);
    sums[category] += hours;
  }
  return sums;
}

export function emptySemesterOutcome(): SemesterOutcome {
  return { approved: [], failed: [], dropped: [] };
}

export function mergeSemesterOutcomes(
  imported: Map<string, { approved: number; failed: number; dropped: number; notDone: number }>,
  manual: Record<string, SemesterOutcome>,
  currentTerm: string | null
): Array<{ term: string; approved: number; failed: number; dropped: number; notDone: number; isCurrent: boolean }> {
  const merged = new Map<string, { approved: number; failed: number; dropped: number; notDone: number }>();

  for (const [term, data] of imported.entries()) {
    merged.set(term, { ...data });
  }

  for (const [term, outcome] of Object.entries(manual)) {
    const existing = merged.get(term) || { approved: 0, failed: 0, dropped: 0, notDone: 0 };
    merged.set(term, {
      approved: Math.max(existing.approved, outcome.approved.length),
      failed: Math.max(existing.failed, outcome.failed.length),
      dropped: Math.max(existing.dropped, outcome.dropped.length),
      notDone: existing.notDone,
    });
  }

  return [...merged.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([term, data]) => ({
      term,
      ...data,
      isCurrent: term === currentTerm,
    }));
}

export function getSectionTerm(section: { term?: string; period?: string }): string | undefined {
  return section.term || section.period;
}

export function filterSectionsByCurrentTerm<T extends { term?: string; period?: string }>(
  sections: T[],
  currentTerm: string | null
): T[] {
  if (!currentTerm) return sections;
  return sections.filter((s) => getSectionTerm(s) === currentTerm);
}

export function buildCurrentTermSectionIndex(
  sections: Array<{ term?: string; period?: string; course?: { code?: string }; course_code?: string }>,
  currentTerm: string | null
) {
  const codesWithSections = new Set<string>();
  const sectionCountByCode = new Map<string, number>();
  const sectionsByCourse = new Map<string, typeof sections>();

  for (const section of sections) {
    if (currentTerm && getSectionTerm(section) !== currentTerm) continue;

    const code = section.course?.code || section.course_code;
    if (!code) continue;

    codesWithSections.add(code);
    sectionCountByCode.set(code, (sectionCountByCode.get(code) || 0) + 1);
    if (!sectionsByCourse.has(code)) sectionsByCourse.set(code, []);
    sectionsByCourse.get(code)!.push(section);
  }

  return { codesWithSections, sectionCountByCode, sectionsByCourse };
}

type OfferedSection = {
  term?: string;
  period?: string;
  course?: { code?: string; name?: string };
  course_code?: string;
  mode?: string;
  spots_reserved?: Array<{ program?: { title?: string } }>;
};

export function isSectionOfferedToPrograms(
  section: OfferedSection,
  programTitles: Set<string>
): boolean {
  if (programTitles.size === 0) return false;
  const reserved = section.spots_reserved || [];
  if (reserved.length === 0) return false;
  return reserved.some((r) => {
    const title = (r.program?.title || '').trim().toLowerCase();
    return title && programTitles.has(title);
  });
}

export function mergeProgramCoursesWithOffered(
  programCourses: Course[],
  sections: OfferedSection[],
  coursesIndex: Course[],
  currentTerm: string | null,
  programTitles: Set<string>,
  sectionCountByCode?: Map<string, number>
): Course[] {
  const byCode = new Map(programCourses.map((c) => [c.code, c]));
  const indexByCode = new Map(coursesIndex.map((c) => [c.code, c]));

  for (const section of sections) {
    if (currentTerm && getSectionTerm(section) !== currentTerm) continue;

    const code = section.course?.code || section.course_code;
    if (!code || byCode.has(code)) continue;
    if (!isSectionOfferedToPrograms(section, programTitles)) continue;

    const idx = indexByCode.get(code);
    const name = isBlockCourseCode(code)
      ? resolveBlockCourseName(code, indexByCode, section.course?.name)
      : (section.course?.name ?? idx?.name ?? code);

    byCode.set(code, {
      code,
      name,
      level: idx?.level?.replace('Nível', 'Semestre') ?? 'Ofertada ao curso',
      type: idx?.type ?? '',
      credits: (idx as { credits?: number })?.credits,
      workload: (idx as { workload?: number })?.workload,
      prerequisites: (idx as { prerequisites?: string[] })?.prerequisites ?? [],
      sections_count: sectionCountByCode?.get(code) ?? 1,
      sections_url: idx?.sections_url,
      detail_url: idx?.detail_url,
      mode: idx?.mode ?? section.mode ?? '',
      location: idx?.location ?? '',
      id_ref: idx?.id_ref ?? '',
      department: idx?.department ?? '',
      code_url: idx?.code_url ?? '',
    } as Course);
  }

  return Array.from(byCode.values());
}
