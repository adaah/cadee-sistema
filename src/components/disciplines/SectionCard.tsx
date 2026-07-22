import { AlertCircle, Clock, Plus, Users, Eraser, ArrowLeftRight, AlertTriangle, Star, Flame, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Section } from '@/services/api';
import { useMySections } from '@/hooks/useMySections';
import { useApp } from '@/contexts/AppContext';
import { getCompetitionLevel, getPhase1Level, getPhase2Level } from '@/lib/competition';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useMyPrograms } from '@/hooks/useMyPrograms';
import { Progress } from '@/components/ui/progress';
import { getReservedUnfilledBonus, getReservedUnfilledForTitles } from '@/lib/utils';
import { formatTimeCodes } from '@/lib/schedule';

interface SectionCardProps {
  section: Section;
  isAdded: boolean;
  onAdd: (section: Section) => void;
  onNavigateCourse?: (courseCode: string) => void;
}

export function SectionCard({ section, isAdded, onAdd, onNavigateCourse }: SectionCardProps) {
  const { hasSectionOnCourse, getConflictsForSection } = useMySections();
  const { completedDisciplines } = useApp();
  const seatsCount = section.seats_count;
  const seatsAccepted = section.seats_accepted;
  const available = seatsCount - seatsAccepted;
  const isFull = available <= 0;
  const isAlmostFull = available > 0 && available <= 5;
  const seatsRequested = (section as any)?.seats_requested ?? 0;
  const seatsRerequested = (section as any)?.seats_rerequested ?? 0;
  const competition = getCompetitionLevel(seatsCount, seatsRequested, seatsRerequested);
  const compPhase1 = getPhase1Level(seatsCount, seatsRequested);
  const compPhase2 = getPhase2Level(seatsCount, seatsAccepted, seatsRerequested);
  const { myPrograms } = useMyPrograms();
  const myProgramTitles = new Set(myPrograms.map(p => (p.title || '').trim().toLowerCase()));
  const hasExclusive = Array.isArray(section.spots_reserved) && section.spots_reserved.some(r => {
    const t = ((r as any)?.program?.title || '').trim().toLowerCase();
    return t && myProgramTitles.has(t);
  });
  const reservedRemaining = getReservedUnfilledForTitles(section, myProgramTitles);

  const teachers = section.teachers ?? []

  // Compute time conflicts via helper
  const conflicts = getConflictsForSection(section);

  return (
    <div
      className={cn(
        'p-4 rounded-xl border-2 transition-all',
        isFull
          ? 'border-destructive/50 bg-destructive/5'
          : isAlmostFull
          ? 'border-warning/50 bg-warning/5'
          : isAdded
          ? 'border-success/50 bg-success/5'
          : 'border-border bg-muted/50',
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-card-foreground text-sm">
              {teachers && teachers.length > 0
                ? teachers[0]
                : `Turma ${section.id_ref}`}
            </span>
          </div>

          {/* Tags always below the title (no 'Adicionar' tag) */}
          <div className="mb-2 flex flex-wrap gap-1 items-center">
            {isFull && (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-destructive text-destructive-foreground">
                Lotada
              </span>
            )}
            {isAdded && (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-success text-success-foreground">
                Adicionada
              </span>
            )}
            {/* Conflito */}
            {!isFull && conflicts.length > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground inline-flex items-center gap-1 cursor-default">
                      <AlertTriangle className="w-3 h-3" /> Conflito
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div>Há choque de horário com outra turma selecionada.</div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {/* Poucas Vagas */}
            {!isFull && isAlmostFull && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="px-2 py-0.5 rounded text-xs font-medium inline-flex items-center gap-1 cursor-default bg-indigo-600 text-white">
                      <Flame className="w-3 h-3" /> Poucas Vagas
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div>Restam poucas vagas disponíveis nesta turma.</div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {/* Reservado */}
            {hasExclusive && reservedRemaining > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-primary text-primary-foreground inline-flex items-center gap-1 cursor-default">
                      <Star className="w-3 h-3" /> Reservado para o curso {reservedRemaining} vagas
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div>Vagas reservadas ao(s) seu(s) programa(s) selecionado(s).</div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {/* Sem reservas */}
            {!hasExclusive && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground inline-flex items-center gap-1 cursor-default">
                      Sem reservas para o curso
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div>Esta turma não possui vagas reservadas para o seu curso.</div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {/* Bônus Lixão oculto temporariamente
            {(() => {
              const bonus = getReservedUnfilledBonus(section);
              if (bonus <= 0) return null;
              return (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-accent text-accent-foreground border border-border inline-flex items-center gap-1 cursor-default">
                  <Trash2 className="w-3 h-3" /> Bônus Lixão ({bonus})
                </span>
              );
            })()}
            */}
          </div>

          {(() => {
            if (teachers && teachers.length > 1) {
              const extra = teachers.length - 1;
              return (
                <div className="mb-2">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span className="truncate block">+ {extra} professor{extra > 1 ? 'es' : ''}</span>
                  </div>
                </div>
              );
            }
            if (!teachers || teachers.length === 0) {
              return (
                <div className="mb-2">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span className="truncate block">Professor(es) a definir</span>
                  </div>
                </div>
              );
            }
            return null;
          })()}

          <div className="mt-2 pt-2 border-t border-border">
            <div className="space-y-2">
              <div className="flex items-start gap-1 text-sm text-muted-foreground">
                <Clock className="w-4 h-4 mt-0.5 shrink-0" />
                {(() => {
                  const timeCodes = Array.isArray(section.time_codes) ? section.time_codes : [];
                  const formattedSchedules = formatTimeCodes(timeCodes);
                  return (
                    <div className="grid gap-1" style={{ gridTemplateColumns: formattedSchedules.length <= 4 ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)' }}>
                      {formattedSchedules.length > 0 ? (
                        formattedSchedules.map((h, i) => {
                          const [day, time] = h.split(' ');
                          return (
                            <span key={i} className="inline-block bg-muted px-2 py-1 rounded text-xs font-mono text-center min-h-[40px] flex flex-col items-center justify-center">
                              <span className="font-semibold">{day}</span>
                              <span className="text-[10px]">{time}</span>
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-xs">Horário a definir</span>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            {(() => {
              if (conflicts.length === 0) return null;
              const currentCourseCode = section.course?.code;
              const uniqueCodes = Array.from(new Set(
                conflicts
                  .map((c) => c.section.course?.code)
                  .filter((code): code is string => Boolean(code) && code !== currentCourseCode)
              ));
              if (uniqueCodes.length === 0) return null;
              return (
                <div className="flex flex-wrap gap-2 mt-3">
                  {uniqueCodes.map((code) => (
                    <button
                      key={`conf-${code}`}
                      onClick={() => onNavigateCourse?.(code)}
                      className="px-2 py-0.5 rounded text-xs font-medium bg-accent text-accent-foreground hover:bg-accent/80 border border-border"
                    >
                      {code}
                    </button>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>

        {(() => {
          const courseCode = section.course?.code;
          const isCompleted = courseCode ? completedDisciplines.includes(courseCode) : false;
          if (isCompleted || isFull) return null;
          return (
        <div className="flex items-center gap-2">
          {isAdded ? (
            <button
              onClick={() => onAdd(section)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all',
                'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg shadow-destructive/25'
              )}
            >
              <Eraser className="w-4 h-4" />
              <span className="hidden sm:inline">Remover</span>
            </button>
          ) : (() => {
            const code = section.course?.code as string | undefined;
            const showSwap = !!code && hasSectionOnCourse(code);
            return showSwap ? (
              <button
                onClick={() => onAdd(section)}
                disabled={isFull}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all',
                  isFull
                    ? 'bg-muted text-muted-foreground cursor-not-allowed'
                    : 'bg-warning text-warning-foreground hover:bg-warning/90 shadow-lg shadow-warning/25',
                )}
              >
                <ArrowLeftRight className="w-4 h-4" />
                <span className="hidden sm:inline">Trocar</span>
              </button>
            ) : (
              <button
                onClick={() => onAdd(section)}
                disabled={isFull}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all',
                  isFull
                    ? 'bg-muted text-muted-foreground cursor-not-allowed'
                    : conflicts.length > 0
                      ? 'bg-warning text-warning-foreground hover:bg-warning/90 shadow-lg shadow-warning/25'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25',
                )}
              >
                {conflicts.length > 0 ? (
                  <ArrowLeftRight className="w-4 h-4" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">{conflicts.length > 0 ? 'Trocar' : 'Adicionar'}</span>
              </button>
            );
          })()}
        </div>
          );
        })()}
      </div>

      {false}
    </div>
  );
}
