import axios, {AxiosResponse} from "axios";

const API_BASE_URL = 'https://FormigTeen.github.io/sigaa-static/api/v1';

export const getData = <T>(aResponse: AxiosResponse<T>) => aResponse.data;

export interface Program {
  title: string;
  location: string;
  program_type: string;
  mode: string;
  time_code: string;
  id_ref: string;
  code: string;
  detail_url: string;
}

export interface CourseApi {
  code: string;
  name: string;
  mode: string;
  id_ref: string;
  location: string;
  department: string;
  detail_url: string;
  code_url: string;
  sections_url: string;
  sections_count: number;
  level: string;
  type: string;
}

interface SyncedCourse {
  code: string;
  name: string;
  id_ref: string;
}

interface NotSyncedCourse {
  code: string;
}

export interface CourseDetail {
  code: string;
  name: string;
  credits?: number;
  workload?: number;
  semester?: number;
  type?: string;
  description?: string;
  department?: string;
  mode?: string;
  location?: string;
  id_ref?: string;
  equivalences: Array<Array<NotSyncedCourse | SyncedCourse>>;
  prerequisites: Array<NotSyncedCourse | SyncedCourse>[];
  corequisites: Array<NotSyncedCourse | SyncedCourse>[];
}

export interface ProgramDetail {
  id_ref: string;
  title: string;
  code?: string;
  courses?: Array<{
    code: string;
    name: string;
    semester?: number;
    type?: string;
    credits?: number;
    workload?: number;
    prerequisites?: string[];
  }>;
}

export interface Section {
  course: {
    code: string;
    name: string;
  };
  id_ref: string;
  location_table: string;
  mode: string;
  seats_accepted: number;
  seats_count: number;
  seats_requested: number;
  seats_rerequested: number;
  spots_reserved: Array<{
    program: {
      title: string;
      location?: string;
      program_type?: string;
      mode?: string;
      time_code?: string;
      id_ref?: string;
      code?: string;
      detail_url?: string;
    };
    seats_count: number;
  }>;
  teachers: string[];
  time_codes: string[];
}

export type Course = CourseApi;


export interface SectionSchedule {
  day: string;
  start_time: string;
  end_time: string;
}

export async function fetchPrograms(): Promise<Program[]> {
  return axios.get<Program[]>(`${API_BASE_URL}/programs.json`).then(getData);
}

export async function fetchCoursesIndex(): Promise<CourseApi[]> {
  return axios.get<CourseApi[]>(`${API_BASE_URL}/courses.json`).then(getData);
}

export async function findCourseSummaryByCode(code: string): Promise<CourseApi | null> {
  const courses = await fetchCoursesIndex();
  return courses.find(course => course.code === code) || null;
}

export async function fetchCourses(): Promise<Course[]> {
  // Retorna o payload bruto do índice de cursos
  return axios.get<CourseApi[]>(`${API_BASE_URL}/courses.json`).then(getData);
}

export async function fetchCoursesForProgram(programIdRef: string): Promise<Course[]> {
  try {
    const programs = await fetchPrograms();
    const program = programs.find((p) => p.id_ref === programIdRef);
    const detailUrl = program?.detail_url;

    if (!detailUrl) {
      return fetchCourses();
    }

    const [programDetail, coursesIndex] = await Promise.all([
      fetchProgramDetail(detailUrl),
      fetchCoursesIndex(),
    ]);

    const indexByCode = new Map(coursesIndex.map((c) => [c.code, c]));
    const programCourses = programDetail.courses || [];

    const courses: Course[] = programCourses
      .map((progCourse) => {
        const summary = indexByCode.get(progCourse.code);
        if (!summary) return null;
        // Retornar objeto bruto combinando resumo + dados do programa (sem defaults)
        return { ...summary, ...progCourse } as Course;
      })
      .filter(Boolean) as Course[];

    if (courses.length === 0) {
      return fetchCourses();
    }

    return courses;
  } catch (error) {
    console.error(`Error fetching courses for program ${programIdRef}:`, error);
    return fetchCourses();
  }
}

export async function fetchSections(): Promise<Section[]> {
  return axios.get<Section[]>(`${API_BASE_URL}/sections.json`).then(getData);
}

export async function fetchCourseDetail(detailUrl: string): Promise<CourseDetail> {
  return axios.get<CourseDetail>(detailUrl).then(getData);
}

export async function fetchCourseByCode(code: string): Promise<CourseDetail> {
  const url = `${API_BASE_URL}/course/code/${code}.json`;
  return axios.get<CourseDetail>(url).then(getData);
}

export async function fetchSectionsByCourseCode(courseCode: string): Promise<Section[]> {
  return axios.get<Section[]>(`${API_BASE_URL}/course/${courseCode}/sections.json`).then(getData)
}

export function parseSigaaSchedule(raw: string): SectionSchedule[] {
  if (!raw || raw.trim() === '') return [];
  
  const schedules: SectionSchedule[] = [];
  
  const dayMap: Record<string, string> = {
    '2': 'Seg',
    '3': 'Ter',
    '4': 'Qua',
    '5': 'Qui',
    '6': 'Sex',
    '7': 'Sáb',
  };

  const shiftMap: Record<string, { base: number }> = {
    'M': { base: 7 },
    'T': { base: 13 },
    'N': { base: 18 },
  };

  const pattern = /(\d+)([MTN])(\d+)/g;
  let match;

  while ((match = pattern.exec(raw)) !== null) {
    const [, days, shift, slots] = match;
    const shiftInfo = shiftMap[shift];
    
    if (!shiftInfo) continue;

    const slotNumbers = slots.split('').map(Number);
    const firstSlot = Math.min(...slotNumbers);
    const lastSlot = Math.max(...slotNumbers);
    
    const startTime = shiftInfo.base + (firstSlot - 1);
    const endTime = shiftInfo.base + lastSlot;

    for (const dayChar of days.split('')) {
      const dayName = dayMap[dayChar];
      if (dayName) {
        schedules.push({
          day: dayName,
          start_time: `${startTime.toString().padStart(2, '0')}:00`,
          end_time: `${endTime.toString().padStart(2, '0')}:00`,
        });
      }
    }
  }

  return schedules;
}

export async function fetchProgramDetail(detailUrl: string): Promise<ProgramDetail> {
  return axios.get<ProgramDetail>(detailUrl).then(getData);
}

export async function getProgramCourseCodes(programIdRef: string): Promise<string[]> {
  try {
    const programs = await fetchPrograms();
    const program = programs.find(p => p.id_ref === programIdRef);
    
    if (!program || !program.detail_url) {
      return [];
    }
    
    const programDetail = await fetchProgramDetail(program.detail_url);
    
    if (programDetail.courses && Array.isArray(programDetail.courses)) {
      return programDetail.courses.map(c => c.code);
    }
    
    return [];
  } catch (error) {
    console.error(`Error fetching courses for program ${programIdRef}:`, error);
    return [];
  }
}
