<<<<<<< HEAD
import { Users, Trash2, Clock, Info, AlertTriangle, CheckCircle2, XCircle, Ban, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { useMySections } from '@/hooks/useMySections';
import { useMyCourses } from '@/hooks/useMyCourses.ts';
import { useApp } from '@/contexts/AppContext';
import { useCurrentTerm } from '@/hooks/useCurrentTerm';
import { useSemesterTransition } from '@/hooks/useSemesterTransition';
import { DisciplineDetail } from '@/components/disciplines/DisciplineDetail';
import type { Course, Section } from '@/services/api';
import type { DisciplineStatus } from '@/lib/semester';
import { formatTimeCodes } from '@/lib/schedule';
import { cn } from '@/lib/utils';

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
=======
import { Calendar, Users, Trash2, Clock, Info, BadgeInfo, AlertTriangle, AlertCircle, Star, Flame } from 'lucide-react';
import { useState } from 'react';
import { useMySections } from '@/hooks/useMySections';
import { useMyCourses } from '@/hooks/useMyCourses.ts';
import { DisciplineDetail } from '@/components/disciplines/DisciplineDetail';
import type { Course } from '@/services/api';
import { Progress } from '@/components/ui/progress';
import { getCompetitionLevel, getPhase1Level, getPhase2Level } from '@/lib/competition';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useMyPrograms } from '@/hooks/useMyPrograms';
import { getReservedUnfilledBonus, getReservedUnfilledForTitles } from '@/lib/utils';
>>>>>>> 6cf8892a564b1bf37153af61a5515e91e5c07d59

export function ScheduleSummary() {
  const { mySections, toggleSection, getConflictsForSection } = useMySections();
  const { courses } = useMyCourses();
<<<<<<< HEAD
  const { getDisciplineStatus, setDisciplineStatus, clearDisciplineStatus } = useApp();
  const { currentTerm } = useCurrentTerm();
  const { pendingTransition, statusTerm, planningTerm, unresolvedCodes } = useSemesterTransition();
  const [selectedDiscipline, setSelectedDiscipline] = useState<Course | null>(null);
  const [expandedStatus, setExpandedStatus] = useState<Set<string>>(new Set());

  const outcomeTerm = statusTerm || currentTerm;

  if (mySections.length === 0) {
    return null;
  }

  const handleStatusClick = (code: string, status: DisciplineStatus) => {
    const current = getDisciplineStatus(code);
    if (current === status) {
      clearDisciplineStatus(code, outcomeTerm || undefined);
    } else {
      setDisciplineStatus(code, status, outcomeTerm || undefined);
    }
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
          onClick={() => mySections.forEach((s) => toggleSection(s))}
          className="text-xs sm:text-sm text-destructive hover:text-destructive/80 transition-colors shrink-0"
=======
  const [selectedDiscipline, setSelectedDiscipline] = useState<Course | null>(null);
  const { myPrograms } = useMyPrograms();
  const myProgramTitles = new Set(myPrograms.map(p => (p.title || '').trim().toLowerCase()));

  if (mySections.length === 0) {
    return null; // Não renderiza nada quando não há turmas
  }

  return (
    <div className="bg-card rounded-xl border border-border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-card-foreground">Minhas Turmas</h3>
        <button
          onClick={() => mySections.forEach((s) => toggleSection(s))}
          className="text-sm text-destructive hover:text-destructive/80 transition-colors"
>>>>>>> 6cf8892a564b1bf37153af61a5515e91e5c07d59
        >
          Limpar
        </button>
      </div>

<<<<<<< HEAD
      {pendingTransition && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
          Semestre <strong>{currentTerm}</strong> disponível. Finalize as {unresolvedCodes.length} disciplina{unresolvedCodes.length !== 1 ? 's' : ''} pendente{unresolvedCodes.length !== 1 ? 's' : ''} abaixo para avançar.
        </div>
      )}

      <div className="space-y-3">
        {mySections.map((s) => {
          const disciplineCode = s.course?.code || (s as { course_code?: string }).course_code || '';
          const disciplineName = s.course?.name || disciplineCode;
          const classCode = (s as { section_code?: string }).section_code || s.id_ref;
          const cardKey = `${disciplineCode}-${classCode}`;
          const teachers = Array.isArray(s.teachers) ? s.teachers : [];
          const timeCodes = Array.isArray(s.time_codes) ? s.time_codes : [];
          const formattedSchedules = formatTimeCodes(timeCodes);
          const course = courses?.find((c) => c.code === disciplineCode);
          const conflicts = getConflictsForSection(s);
          const conflictCodes = getConflictCodes(conflicts);
          const currentStatus = getDisciplineStatus(disciplineCode);
          const isUnresolved = pendingTransition && !currentStatus;
          const isStatusExpanded = expandedStatus.has(cardKey) || isUnresolved;

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
                      <span className="text-xs font-semibold text-primary">{disciplineCode}</span>
                      {course?.workload && (
                        <span className="text-[10px] text-muted-foreground">{course.workload}h</span>
                      )}
                    </div>
                    <p className="font-medium text-card-foreground text-sm sm:text-base leading-snug mt-0.5">
                      {disciplineName}
                    </p>

                    <div className="mt-2 space-y-1.5">
                      <div className="flex items-start gap-2 text-xs text-muted-foreground">
                        <Users className="w-3 h-3 mt-0.5 shrink-0" />
                        <span className="break-words">{teachers.length > 0 ? teachers.join(', ') : 'Professor(es) a definir'}</span>
                      </div>
                      <div className="flex items-start gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3 mt-0.5 shrink-0" />
                        {formattedSchedules.length > 0 ? (
                          <div className="space-y-0.5">
                            {formattedSchedules.map((schedule, idx) => (
                              <div key={idx}>{schedule}</div>
                            ))}
                          </div>
                        ) : (
                          <span>Horário a definir</span>
                        )}
                      </div>
                    </div>

                    {conflictCodes.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
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

                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      onClick={() => { if (course) setSelectedDiscipline(course as Course); }}
                      className="p-2 rounded-lg text-muted-foreground hover:bg-accent transition-all"
                      aria-label="Mais informações"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toggleSection(s)}
                      className="p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
                      aria-label="Remover turma"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
                              onClick={() => handleStatusClick(disciplineCode, status)}
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
=======
      <div className="space-y-3">
        {mySections.map((s) => {
          const disciplineCode = s.course?.code || (s as any)?.course_code || '';
          const disciplineName = s.course?.name || disciplineCode;
          const classCode = (s as any)?.section_code || s.id_ref;
          const teachers = Array.isArray((s as any)?.teachers) ? (s as any).teachers : ((s as any)?.professor ? [(s as any).professor] : []);
          const timeCodes = Array.isArray(s.time_codes) ? s.time_codes : [];
          const course = courses?.find(c => c.code === disciplineCode);
          const alternatives = Math.max(0, ((course?.sections_count ?? 1) - 1));
          const seatsAccepted = (s as any)?.seats_accepted ?? 0;
          const seatsCount = (s as any)?.seats_count ?? 0;
          const progress = seatsCount > 0 ? Math.min(100, Math.max(0, Math.round((seatsAccepted / seatsCount) * 100))) : 0;
          const seatsRequested = (s as any)?.seats_requested ?? 0;
          const seatsRerequested = (s as any)?.seats_rerequested ?? 0;
          const competition = getCompetitionLevel(seatsCount, seatsRequested, seatsRerequested);
          const compPhase1 = getPhase1Level(seatsCount, seatsRequested);
          const compPhase2 = getPhase2Level(seatsCount, seatsAccepted, seatsRerequested);
          const available = Math.max(0, seatsCount - seatsAccepted);
          const isAlmostFull = available > 0 && available <= 5;
          const conflicts = getConflictsForSection(s);
          const hasExclusive = Array.isArray((s as any)?.spots_reserved) && ((s as any).spots_reserved as any[]).some(r => {
            const t = ((r as any)?.program?.title || '').trim().toLowerCase();
            return t && myProgramTitles.has(t);
          });
          const bonus = getReservedUnfilledBonus(s as any);
          const reservedMine = getReservedUnfilledForTitles(s as any, myProgramTitles);

          return (
            <div key={`${disciplineCode}-${classCode}`} className="p-3 rounded-lg border border-border bg-muted/40">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-primary">{disciplineCode}</span>
                  </div>
                  <p className="font-medium text-card-foreground truncate">{disciplineName}</p>

                  <div className="mt-1 space-y-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Users className="w-3 h-3" />
                      <span className="truncate">{teachers.length > 0 ? teachers.join(', ') : 'Professor(es) a definir'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span className="truncate">{timeCodes.length > 0 ? timeCodes.join(', ') : 'Horário a definir'}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => toggleSection(s)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { if (course) setSelectedDiscipline(course as Course); }}
                  className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent transition-all"
                  aria-label="Mais informações"
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>Vagas preenchidas</span>
                  <span>{seatsAccepted}/{seatsCount}</span>
                </div>
                <Progress value={progress} />
                
                {/* Tags moved to bottom, allow wrap */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {alternatives > 0 && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-accent text-accent-foreground border border-border whitespace-nowrap">
                      + {alternatives} alternativa{alternatives > 1 ? 's' : ''}
                    </span>
                  )}
                  {conflicts.length > 0 && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-secondary text-secondary-foreground inline-flex items-center gap-1 cursor-default">
                            <AlertTriangle className="w-3 h-3" /> Conflito
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div>Há choque de horário com outra turma selecionada.</div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  {isAlmostFull && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium inline-flex items-center gap-1 cursor-default bg-indigo-600 text-white">
                            <Flame className="w-3 h-3" /> Poucas Vagas
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div>Restam poucas vagas disponíveis nesta turma.</div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  {hasExclusive && reservedMine > 0 && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-primary text-primary-foreground inline-flex items-center gap-1 cursor-default">
                            <Star className="w-3 h-3" /> Reservado ({reservedMine})
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div>Vagas reservadas ao(s) seu(s) programa(s) selecionado(s).</div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  {/* Bônus Lixão oculto temporariamente
                  {bonus > 0 && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-accent text-accent-foreground border border-border inline-flex items-center gap-1 cursor-default">
                      <Trash2 className="w-3 h-3" /> Bônus Lixão ({bonus})
                    </span>
                  )}
                  */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium whitespace-nowrap inline-flex items-center gap-1 ${compPhase1.colorClass}`}>
                          <BadgeInfo className="w-3 h-3" /> Etapa 1: {compPhase1.label} ({seatsRequested})
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div>
                          <div>Solicitações (Etapa 1): {seatsRequested}</div>
                          <div>Vagas Totais: {seatsCount}</div>
                          <div>Razão: {compPhase1.ratio.toFixed(2)}</div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium whitespace-nowrap inline-flex items-center gap-1 ${compPhase2.colorClass}`}>
                          <BadgeInfo className="w-3 h-3" /> Etapa 2: {compPhase2.label} ({seatsRerequested})
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div>
                          <div>Solicitações (Etapa 2): {seatsRerequested}</div>
                          <div>Vagas Remanescentes: {Math.max(0, seatsCount - seatsAccepted)}</div>
                          <div>Razão: {compPhase2.ratio.toFixed(2)}</div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
>>>>>>> 6cf8892a564b1bf37153af61a5515e91e5c07d59
              </div>
            </div>
          );
        })}
      </div>
<<<<<<< HEAD

=======
>>>>>>> 6cf8892a564b1bf37153af61a5515e91e5c07d59
      {selectedDiscipline && (
        <DisciplineDetail
          discipline={selectedDiscipline}
          onClose={() => setSelectedDiscipline(null)}
        />
      )}
    </div>
  );
}
