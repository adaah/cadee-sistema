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

export function ScheduleSummary() {
  const { mySections, toggleSection, getConflictsForSection } = useMySections();
  const { courses } = useMyCourses();
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
        >
          Limpar
        </button>
      </div>

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
