import { Users, Trash2, Clock, Info, AlertTriangle, CheckCircle2, XCircle, Ban, ChevronDown, ChevronUp } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useMySections } from '@/hooks/useMySections';
import { useMyCourses } from '@/hooks/useMyCourses.ts';
import { useApp } from '@/contexts/AppContext';
import { useCurrentTerm } from '@/hooks/useCurrentTerm';
import { useSemesterTransition } from '@/hooks/useSemesterTransition';
import { useCourses, useSections } from '@/hooks/useApi';
import { DisciplineDetail } from '@/components/disciplines/DisciplineDetail';
import type { Course, Section } from '@/services/api';
import type { DisciplineStatus } from '@/lib/semester';
import { formatTimeCodes } from '@/lib/schedule';
import { cn } from '@/lib/utils';
import { getBlockCourseBaseCode, isBlockCourseCode, resolveBlockCourseName, getBlockCourseVariantLabel, findCorrespondingBlockSections } from '@/lib/blockCourses';

const STATUS_CONFIG: Record<DisciplineStatus, { label: string; icon: typeof CheckCircle2; activeClass: string }> = {
  approved: {
    label: 'Cursada',
    icon: CheckCircle2,
    activeClass: 'bg-success/15 text-success border-success/40',
  },
  failed: {
    label: 'Reprovada',
    icon: XCircle,
    activeClass: 'bg-destructive/15 text-destructive border-destructive/40',
  },
  dropped: {
    label: 'Trancada',
    icon: Ban,
    activeClass: 'bg-muted text-muted-foreground border-border',
  },
};

function getConflictCodes(conflicts: Array<{ code: string; section: Section }>): string[] {
  const codes = new Set<string>();
  for (const c of conflicts) {
    const code = c.section.course?.code || (c.section as { course_code?: string }).course_code;
    if (code) codes.add(code);
  }
  return [...codes];
}

export function ScheduleSummary() {
  const { mySections, toggleSection, getConflictsForSection } = useMySections();
  const { courses } = useMyCourses();
  const { data: coursesIndex = [] } = useCourses();
  const { data: allSections = [] } = useSections();
  const { getDisciplineStatus, setDisciplineStatus, clearDisciplineStatus } = useApp();
  const { currentTerm } = useCurrentTerm();
  const { pendingTransition, statusTerm, planningTerm, unresolvedCodes } = useSemesterTransition();
  const [selectedDiscipline, setSelectedDiscipline] = useState<Course | null>(null);
  const [expandedStatus, setExpandedStatus] = useState<Set<string>>(new Set());

  const outcomeTerm = statusTerm || currentTerm;
  
  const coursesByCode = useMemo(() => new Map(courses.map((c) => [c.code, c])), [courses]);
  const coursesIndexByCode = useMemo(() => new Map(coursesIndex.map((c) => [c.code, c])), [coursesIndex]);
  
  // Group sections by base course code
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

  if (mySections.length === 0) {
    return null;
  }

  const handleStatusClick = (codes: string[], status: DisciplineStatus) => {
    codes.forEach(code => {
      const current = getDisciplineStatus(code);
      if (current === status) {
        clearDisciplineStatus(code, outcomeTerm || undefined);
      } else {
        setDisciplineStatus(code, status, outcomeTerm || undefined);
      }
    });
  };

  const toggleStatusExpanded = (key: string) => {
    setExpandedStatus((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="bg-card rounded-xl border border-border p-3 sm:p-4 space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="font-semibold text-card-foreground text-sm sm:text-base">Minhas Turmas</h3>
          {(pendingTransition ? planningTerm : currentTerm) && (
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary shrink-0">
              {pendingTransition ? planningTerm : currentTerm}
            </span>
          )}
        </div>
        <button
          onClick={() => mySections.forEach((s) => toggleSection(s, allSections))}
          className="text-xs sm:text-sm text-destructive hover:text-destructive/80 transition-colors shrink-0"
        >
          Limpar
        </button>
      </div>

      {pendingTransition && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
          Semestre <strong>{currentTerm}</strong> disponível. Finalize as {unresolvedCodes.length} disciplina{unresolvedCodes.length !== 1 ? 's' : ''} pendente{unresolvedCodes.length !== 1 ? 's' : ''} abaixo para avançar.
        </div>
      )}

      <div className="space-y-3">
        {[...groupedSections.entries()].map(([baseCode, sections]) => {
          const disciplineCodes = sections.map(s => 
            s.course?.code || (s as { course_code?: string }).course_code || ''
          );
          const disciplineName = resolveBlockCourseName(
            disciplineCodes[0],
            coursesIndexByCode,
            coursesByCode.get(baseCode)?.name ?? coursesByCode.get(disciplineCodes[0])?.name ?? baseCode
          );
          const cardKey = baseCode;
          
          // Get the status from any of the codes (they should all be the same)
          const currentStatus = disciplineCodes.reduce((acc, code) => 
            acc || getDisciplineStatus(code), 
            undefined as DisciplineStatus | undefined
          );
          const isUnresolved = pendingTransition && !currentStatus;
          const isStatusExpanded = expandedStatus.has(cardKey) || isUnresolved;
          
          // Get the course (try base code first, then the first code in the group)
          const course = courses?.find((c) => c.code === baseCode) || 
                         courses?.find((c) => c.code === disciplineCodes[0]);
          const workload = (course as any)?.workload;
          
          // Get all conflicts and conflict codes for all sections
          const allConflicts = sections.flatMap(s => getConflictsForSection(s));
          const conflictCodes = getConflictCodes(allConflicts);

          return (
            <div
              key={cardKey}
              className={cn(
                'rounded-xl border bg-muted/30 overflow-hidden',
                currentStatus === 'approved' && 'border-success/40 bg-success/5',
                currentStatus === 'failed' && 'border-destructive/40 bg-destructive/5',
                currentStatus === 'dropped' && 'border-border bg-muted/50',
                !currentStatus && 'border-border'
              )}
            >
              <div className="p-3 sm:p-4">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-primary">{baseCode}</span>
                      {workload && (
                        <span className="text-[10px] text-muted-foreground">{workload}h</span>
                      )}
                    </div>
                    <p className="font-medium text-card-foreground text-sm sm:text-base leading-snug mt-0.5">
                      {disciplineName}
                    </p>

                    <div className="mt-3 space-y-3">
                      {sections.map((s, sectionIdx) => {
                        const disciplineCode = s.course?.code || (s as { course_code?: string }).course_code || '';
                        const classCode = (s as { section_code?: string }).section_code || s.id_ref;
                        const variantLabel = getBlockCourseVariantLabel(disciplineCode, coursesByCode);
                        const teachers = Array.isArray(s.teachers) ? s.teachers : [];
                        const timeCodes = Array.isArray(s.time_codes) ? s.time_codes : [];
                        const formattedSchedules = formatTimeCodes(timeCodes);
                        
                        return (
                          <div key={`${disciplineCode}-${classCode}`} className="border rounded-lg bg-background p-3">
                            <div className="flex items-start gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  {isBlockCourseCode(disciplineCode) && (
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary">
                                      {variantLabel}
                                    </span>
                                  )}
                                  <span className="text-[10px] text-muted-foreground">
                                    {disciplineCode} • {classCode}
                                  </span>
                                </div>

                                <div className="mt-2 space-y-1.5">
                                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                                    <Users className="w-3 h-3 mt-0.5 shrink-0" />
                                    <span className="break-words">{teachers.length > 0 ? teachers.join(', ') : 'Professor(es) a definir'}</span>
                                  </div>
                                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                                    <Clock className="w-3 h-3 mt-0.5 shrink-0" />
                                    {formattedSchedules.length > 0 ? (
                                      <div className="grid gap-1" style={{ gridTemplateColumns: formattedSchedules.length <= 4 ? 'repeat(4, 1fr)' : (formattedSchedules.length <= 6 ? 'repeat(3, 1fr)' : 'repeat(4, 1fr)') }}>
                                        {formattedSchedules.map((schedule, idx) => {
                                          const [day, time] = schedule.split(' ');
                                          return (
                                            <span key={idx} className="inline-block bg-muted px-2 py-1 rounded text-xs font-mono text-center min-h-[40px] flex flex-col items-center justify-center">
                                              <span className="font-semibold">{day}</span>
                                              <span className="text-[10px]">{time}</span>
                                            </span>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <span>Horário a definir</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col gap-1 shrink-0">
                                <button
                                  onClick={() => { if (course) setSelectedDiscipline(course as Course); }}
                                  className="p-2 rounded-lg text-muted-foreground hover:bg-accent transition-all"
                                  aria-label="Mais informações"
                                >
                                  <Info className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => toggleSection(s, allSections)}
                                  className="p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
                                  aria-label="Remover turma"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {conflictCodes.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {conflictCodes.map((code) => (
                          <span
                            key={code}
                            className="px-2 py-0.5 rounded text-[10px] font-medium bg-secondary text-secondary-foreground inline-flex items-center gap-1"
                          >
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            Conflito com {code}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Resultado da disciplina — recolhível */}
              <div className="border-t border-border/60 bg-background/50">
                <button
                  type="button"
                  onClick={() => toggleStatusExpanded(cardKey)}
                  className="w-full flex items-center justify-between px-3 sm:px-4 py-2.5 text-left hover:bg-muted/40 transition-colors"
                >
                  <span className="text-xs text-muted-foreground">
                    Resultado da disciplina
                    {currentStatus && (
                      <span className="ml-1.5 text-foreground font-medium">
                        — {STATUS_CONFIG[currentStatus].label}
                      </span>
                    )}
                  </span>
                  {isStatusExpanded ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                </button>

                {isStatusExpanded && (
                  <div className="px-3 sm:px-4 pb-3">
                    <div className="grid grid-cols-3 gap-2">
                      {(Object.entries(STATUS_CONFIG) as [DisciplineStatus, typeof STATUS_CONFIG[DisciplineStatus]][]).map(
                        ([status, config]) => {
                          const Icon = config.icon;
                          const isActive = currentStatus === status;
                          return (
                            <button
                              key={status}
                              onClick={() => handleStatusClick(disciplineCodes, status)}
                              className={cn(
                                'flex flex-col sm:flex-row items-center justify-center gap-1 px-2 py-2 rounded-lg border text-[10px] sm:text-xs font-medium transition-all',
                                isActive ? config.activeClass : 'border-border text-muted-foreground hover:bg-muted'
                              )}
                            >
                              <Icon className="w-3.5 h-3.5 shrink-0" />
                              <span>{config.label}</span>
                            </button>
                          );
                        }
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedDiscipline && (
        <DisciplineDetail
          discipline={selectedDiscipline}
          onClose={() => setSelectedDiscipline(null)}
        />
      )}
    </div>
  );
}
