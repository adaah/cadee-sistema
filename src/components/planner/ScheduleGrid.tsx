import { Fragment } from 'react';
import { useMySections } from '@/hooks/useMySections';
import { cn } from '@/lib/utils';
import { getSpplitedCode } from '@/lib/schedule';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Section } from '@/services/api';
import { AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const days = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
const hours = ['07:00', '07:55', '08:50', '09:45', '10:40', '11:35', '13:00', '13:55', '14:50', '15:45', '16:40', '17:35', '18:30', '19:25', '20:20', '21:15'];

const dayMap: Record<string, string> = {
  '2': 'SEG',
  '3': 'TER',
  '4': 'QUA',
  '5': 'QUI',
  '6': 'SEX',
  '7': 'SAB',
};

const horariosManha = ['07:00', '07:55', '08:50', '09:45', '10:40', '11:35'];
const horariosTarde = ['13:00', '13:55', '14:50', '15:45', '16:40', '17:35'];
const horariosNoite = ['18:30', '19:25', '20:20', '21:15'];

type ScheduledItem = {
  disciplineCode: string;
  disciplineName: string;
  classCode: string;
  professor: string;
  color: string;
  day: string;
  startTime: string;
  endTime: string;
  section: Section;
};

const COLORS = [
  'hsl(217, 91%, 60%)',
  'hsl(142, 71%, 45%)',
  'hsl(280, 65%, 60%)',
  'hsl(0, 72%, 51%)',
  'hsl(38, 92%, 50%)',
  'hsl(180, 65%, 45%)',
  'hsl(330, 71%, 51%)',
  'hsl(45, 93%, 47%)',
];

function colorFor(code: string) {
  let hash = 0;
  for (let i = 0; i < code.length; i++) hash = ((hash << 5) - hash) + code.charCodeAt(i);
  const idx = Math.abs(hash) % COLORS.length;
  return COLORS[idx];
}

interface ScheduleGridProps {
  onSectionClick?: (section: Section) => void;
}

export function ScheduleGrid({ onSectionClick }: ScheduleGridProps = {}) {
  const { mySections, getConflictsForSection } = useMySections();
  const isMobile = useIsMobile();

  // Mapeia cada horário para um índice 0..15 (posição na lista de hours)
  const hourToIndex = new Map<string, number>();
  hours.forEach((h, i) => hourToIndex.set(h, i));

  const scheduledItems: ScheduledItem[] = [];
  for (const s of mySections) {
    const disciplineCode = (s as any)?.course?.code || (s as any)?.course_code || '';
    const disciplineName = (s as any)?.course?.name || disciplineCode;
    const classCode = (s as any)?.section_code || s.id_ref;
    const professor = Array.isArray((s as any)?.teachers) && (s as any).teachers.length > 0
      ? (s as any).teachers.join(', ')
      : ((s as any)?.professor || '');

    const codes = Array.isArray(s.time_codes) ? s.time_codes : [];
    const discreteCodes = codes.flatMap((c) => getSpplitedCode(c));

    for (const code of discreteCodes) {
      const match = code.match(/^([2-7])([MTN])([1-6])$/i);
      if (!match) continue;
      const [, dayNum, shift, slotStr] = match;
      const day = dayMap[dayNum];
      const slot = parseInt(slotStr, 10) - 1;

      let startTime: string;
      let endTime: string;

      if (shift === 'M') {
        startTime = horariosManha[slot];
        endTime = slot < horariosManha.length - 1 ? horariosManha[slot + 1] : '12:00';
      } else if (shift === 'T') {
        startTime = horariosTarde[slot];
        endTime = slot < horariosTarde.length - 1 ? horariosTarde[slot + 1] : '18:00';
      } else if (shift === 'N') {
        startTime = horariosNoite[slot];
        endTime = slot < horariosNoite.length - 1 ? horariosNoite[slot + 1] : '22:00';
      } else {
        continue;
      }

      scheduledItems.push({
        disciplineCode,
        disciplineName,
        classCode,
        professor,
        color: colorFor(disciplineCode),
        day,
        startTime,
        endTime,
        section: s,
      });
    }
  }

  // Duração em slots (0..16)
  const getItemDurationInSlots = (item: ScheduledItem): number => {
    const startIdx = hourToIndex.get(item.startTime);
    const endIdx = hourToIndex.get(item.endTime);
    if (startIdx === undefined) return 1;
    if (endIdx === undefined) {
      // End time não está na lista (ex: 12:00, 18:00, 22:00) → acha o slot mais próximo depois
      const endHour = parseInt(item.endTime.split(':')[0]);
      const endMin = parseInt(item.endTime.split(':')[1]);
      let closest = hours.length;
      for (let i = 0; i < hours.length; i++) {
        const h = parseInt(hours[i].split(':')[0]);
        const m = parseInt(hours[i].split(':')[1]);
        if (h * 60 + m > endHour * 60 + endMin) { closest = i; break; }
      }
      return Math.max(1, closest - startIdx);
    }
    return Math.max(1, endIdx - startIdx);
  };

  // Pega os itens que começam exatamente nesse slot de (day, hour)
  const getStartingItemsForSlot = (day: string, hour: string) => {
    return scheduledItems.filter(item => item.day === day && item.startTime === hour);
  };

  const getConflictMessage = (conflicts: Array<{ code: string; section: Section }>) => {
    if (!conflicts.length) return '';
    const conflictList = conflicts.map(conflict => {
      const section = conflict.section;
      const courseCode = section.course?.code || (section as any)?.course_code || 'Desconhecido';
      const className = (section as any)?.section_code || section.id_ref || 'N/A';
      return `${courseCode} (${className})`;
    }).join(', ');
    return conflictList;
  };

  // Verifica se há conflito geral nessa célula (mais de um item começando aqui ou sobreposição detectada)
  const hasAnyConflictInCell = (day: string, hour: string) => {
    const itemsAtStart = getStartingItemsForSlot(day, hour);
    // também considera itens que passam por esse horário (overlap)
    const hourIdx = hourToIndex.get(hour);
    if (hourIdx === undefined) return itemsAtStart.length > 1;
    const overlapping = scheduledItems.filter(it => {
      if (it.day !== day) return false;
      const sIdx = hourToIndex.get(it.startTime);
      if (sIdx === undefined) return false;
      const dur = getItemDurationInSlots(it);
      return sIdx <= hourIdx && hourIdx < sIdx + dur && it.startTime !== hour;
    });
    const totalInCell = itemsAtStart.length + overlapping.length;
    if (totalInCell > 1) return true;
    for (const item of itemsAtStart) {
      if (getConflictsForSection(item.section).length > 0) return true;
    }
    return false;
  };

  return (
    <TooltipProvider>
      <div className="w-full">
        <div className={cn(
          "calendar-grid mobile-compact responsive-grade max-w-full mx-auto",
          isMobile ? "" : "md:max-w-4xl",
        )} style={{
          display: 'grid',
          gridTemplateColumns: `repeat(7, minmax(0, 1fr))`,
          gap: 0,
          border: '1px solid hsl(var(--border))',
          borderRadius: '0.75rem',
          overflow: 'hidden',
          backgroundColor: 'hsl(var(--card))',
        }}>
          {/* Linha 1 - Cabeçalho superior */}
          <div className="day-header bg-muted/50 border-b border-r border-border p-2 md:p-3" style={{ gridColumn: '1' }}>
            <div className={cn("responsive-text-sm font-semibold text-center", isMobile ? "text-[10px]" : "", isMobile ? "block" : "md:block")}>
              Período
            </div>
            <div className={cn("text-center text-muted-foreground mt-0.5", isMobile ? "text-[9px]" : "text-xs", isMobile ? "block" : "md:block")}>
              Horário
            </div>
          </div>
          {days.map((day) => (
            <div
              key={day}
              className={cn(
                "day-header bg-muted/50 border-b border-r border-border p-2 md:p-3 flex items-center justify-center",
                day === 'SAB' && "border-r-0"
              )}
            >
              <div className={cn(
                "responsive-text-sm font-semibold text-center",
                isMobile ? "text-[10px]" : ""
              )}>
                {day}
              </div>
            </div>
          ))}

          {/* Linhas - Horários */}
          {hours.map((hour, rowIdx) => (
            <Fragment key={`row-${hour}`}>
              {/* Coluna do horário */}
              <div
                key={`time-${hour}`}
                className={cn(
                  "calendar-cell border-r border-border bg-muted/30 p-1.5 md:p-2 flex items-center justify-center",
                  rowIdx !== hours.length - 1 && "border-b"
                )}
              >
                <div className={cn(
                  "time-slot text-center responsive-text-sm font-medium text-muted-foreground",
                  isMobile ? "text-[9px]" : "text-xs"
                )}>
                  {hour}
                </div>
              </div>

              {/* Colunas dos dias */}
              {days.map((day, dayIdx) => {
                const startingItems = getStartingItemsForSlot(day, hour);
                const cellConflict = hasAnyConflictInCell(day, hour);
                return (
                  <div
                    key={`${day}-${hour}`}
                    className={cn(
                      "calendar-cell relative p-0.5 md:p-1",
                      dayIdx !== days.length - 1 && "border-r border-border",
                      rowIdx !== hours.length - 1 && "border-b border-border",
                      cellConflict && "bg-destructive/5"
                    )}
                    style={{
                      minHeight: isMobile ? '2.5rem' : '3.25rem',
                    }}
                  >
                    <div className="flex flex-col gap-1 w-full h-full">
                      {startingItems.map((item) => {
                        const durationSlots = getItemDurationInSlots(item);
                        const conflicts = getConflictsForSection(item.section);
                        const hasItemConflict = cellConflict || conflicts.length > 0;
                        const conflictMessage = getConflictMessage(conflicts);

                        return (
                          <Tooltip key={`${item.disciplineCode}-${item.classCode}-${day}-${hour}`}>
                            <TooltipTrigger asChild>
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onSectionClick) onSectionClick(item.section);
                                }}
                                className={cn(
                                  "event-block text-white cursor-pointer flex items-center justify-center font-semibold text-center w-full transition-all hover:opacity-90 hover:z-10 relative",
                                  isMobile ? "text-[9px] rounded-sm" : "text-xs rounded-md",
                                  hasItemConflict && "ring-2 ring-destructive ring-offset-1 ring-offset-card"
                                )}
                                style={{
                                  backgroundColor: item.color,
                                  padding: isMobile ? '0.15rem 0' : '0.4rem 0.25rem',
                                  minHeight: isMobile ? '1.25rem' : '2rem',
                                }}
                              >
                                {hasItemConflict && (
                                  <AlertTriangle className={cn(
                                    "absolute top-0.5 right-0.5 text-white flex-shrink-0",
                                    isMobile ? "w-2.5 h-2.5" : "w-3 h-3"
                                  )} />
                                )}
                                <div className={cn(
                                  "truncate text-center w-full px-1",
                                  hasItemConflict && (isMobile ? "pr-3" : "pr-4")
                                )}>
                                  {item.disciplineCode}
                                </div>
                                {!isMobile && item.disciplineName && durationSlots >= 2 && (
                                  <div className="hidden lg:block truncate text-center w-full px-1 font-normal opacity-95 mt-0.5 text-[10px]">
                                    {item.disciplineName}
                                  </div>
                                )}
                                {!isMobile && durationSlots >= 3 && (
                                  <div className="hidden lg:block text-[9px] opacity-90 mt-0.5 truncate px-1 text-center font-normal">
                                    {item.classCode} • {item.professor}
                                  </div>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-xs z-50">
                              <div className="space-y-1">
                                <p className="font-semibold text-sm">{item.disciplineName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {item.disciplineCode} • Turma {item.classCode}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {item.professor}
                                </p>
                                {hasItemConflict && (
                                  <>
                                    <div className="border-t border-border my-1.5 pt-1.5">
                                      <p className="text-xs font-medium text-destructive flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3" />
                                        Conflito de Horário
                                      </p>
                                      {conflictMessage && (
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                          {conflictMessage}
                                        </p>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}
