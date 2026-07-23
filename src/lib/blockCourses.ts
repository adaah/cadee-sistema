const BLOCK_COURSE_SUFFIX = /\.\d+$/;

export function isBlockCourseCode(code: string): boolean {
  return BLOCK_COURSE_SUFFIX.test(code);
}

export function getBlockCourseBaseCode(code: string): string {
  return isBlockCourseCode(code) ? code.replace(BLOCK_COURSE_SUFFIX, '') : code;
}

export function resolveBlockCourseName(
  code: string,
  indexByCode: Map<string, { name?: string }>,
  fallback?: string
): string {
  const idx = indexByCode.get(code);
  if (!isBlockCourseCode(code)) {
    return idx?.name ?? fallback ?? code;
  }

  const baseIdx = indexByCode.get(getBlockCourseBaseCode(code));
  return baseIdx?.name ?? idx?.name ?? fallback ?? code;
}

export function getBlockCourseVariantLabel(
  code: string,
  indexByCode: Map<string, { name?: string }>
): string {
  const idx = indexByCode.get(code);
  const name = idx?.name ?? '';
  if (/TEÓRIC/i.test(name) || /\.0$/.test(code)) return 'Teórica';
  if (/PRÁTIC/i.test(name) || /\.1$/.test(code)) return 'Prática';
  const suffix = code.split('.').pop();
  return suffix ? `Bloco ${suffix}` : code;
}

export type DisciplineGroup = {
  key: string;
  baseCode: string;
  name: string;
  courses: Array<{ code: string; name?: string; sections_count?: number; level?: string; type?: string; credits?: number; workload?: number; prerequisites?: unknown; sections_url?: string; detail_url?: string; mode?: string; location?: string; id_ref?: string; department?: string; code_url?: string }>;
  sections_count: number;
  isBlockGroup: boolean;
};

export function groupDisciplinesByBlock<T extends { code: string; name?: string; sections_count?: number }>(
  courses: T[],
  indexByCode: Map<string, { name?: string }>
): DisciplineGroup[] {
  const groups = new Map<string, DisciplineGroup>();

  for (const course of courses) {
    const isBlock = isBlockCourseCode(course.code);
    const baseCode = getBlockCourseBaseCode(course.code);
    const key = isBlock ? baseCode : course.code;

    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        baseCode: isBlock ? baseCode : course.code,
        name: resolveBlockCourseName(course.code, indexByCode, course.name),
        courses: [],
        sections_count: 0,
        isBlockGroup: false,
      };
      groups.set(key, group);
    }

    if (isBlock) {
      group.isBlockGroup = true;
      group.name = resolveBlockCourseName(course.code, indexByCode, course.name);
    }

    group.courses.push(course);
    group.sections_count += course.sections_count ?? 0;
  }

  for (const group of groups.values()) {
    if (!group.isBlockGroup) continue;

    const blockCourses = group.courses.filter((c) => isBlockCourseCode(c.code));
    if (blockCourses.length > 0) {
      group.courses = blockCourses.sort((a, b) => a.code.localeCompare(b.code));
      group.sections_count = blockCourses.reduce((sum, c) => sum + (c.sections_count ?? 0), 0);
    }
  }

  return Array.from(groups.values()).sort((a, b) => a.baseCode.localeCompare(b.baseCode));
}
