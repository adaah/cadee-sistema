import { Info, X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';

interface SemesterData {
  semester: number;
  totalMandatory: number;
  completedMandatory: number;
  percentage: number;
  disciplines: {
    code: string;
    name: string;
    completed: boolean;
    enrolled: boolean;
  }[];
}

interface AdvancedSemesterGridProps {
  courses: any[];
  completedDisciplines: string[];
  enrolledCodes?: string[];
  courseLevels: string[];
  currentTerm?: string | null;
  showInfo?: boolean;
  infoText?: string;
}

function SemesterDetailContent({
  semester,
  levelName,
  hideTitle = false,
}: {
  semester: SemesterData;
  levelName: string;
  hideTitle?: boolean;
}) {
  return (
    <div className="text-xs space-y-2">
      {!hideTitle && <div className="font-medium text-sm">{levelName}</div>}
      <div className="text-muted-foreground">
        {semester.completedMandatory}/{semester.totalMandatory} disciplinas obrigatórias
      </div>
      <div className="font-bold text-foreground">{semester.percentage}% completo</div>
      <div className="border-t border-border pt-2">
        <div className="font-medium mb-2 text-foreground">Status das disciplinas</div>
        <div className="space-y-1.5 max-h-[40vh] overflow-y-auto">
          {semester.disciplines.map((d) => (
            <div key={d.code} className="flex items-start gap-2">
              <span
                className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${
                  d.completed ? 'bg-green-500' : d.enrolled ? 'bg-blue-400' : 'bg-gray-400'
                }`}
              />
              <div className="min-w-0">
                <span className="font-medium text-foreground">{d.code}</span>
                <span className="text-muted-foreground"> — {d.name}</span>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {d.completed ? 'Cursado' : d.enrolled ? 'Planejado' : 'Não feito'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AdvancedSemesterGrid({
  courses,
  completedDisciplines,
  enrolledCodes = [],
  courseLevels,
  currentTerm,
  showInfo = false,
  infoText = '',
}: AdvancedSemesterGridProps) {
  const isMobile = useIsMobile();
  const [selectedSemester, setSelectedSemester] = useState<SemesterData | null>(null);

  const disciplinesBySemester = useMemo(() => {
    const semesterMap = new Map<number, SemesterData>();

    courseLevels.forEach((level, index) => {
      const semesterNumber = index + 1;
      semesterMap.set(semesterNumber, {
        semester: semesterNumber,
        totalMandatory: 0,
        completedMandatory: 0,
        percentage: 0,
        disciplines: [],
      });
    });

    if (courses && Array.isArray(courses)) {
      courses.forEach((course) => {
        if (course.type === 'OPT' || course.type === 'OPTATIVO') {
          return;
        }

        const semesterIndex = courseLevels.findIndex((level) => level === course.level);
        if (semesterIndex === -1) return;

        const semester = semesterIndex + 1;
        const semesterData = semesterMap.get(semester);
        if (!semesterData) return;

        const isEnrolled = enrolledCodes.includes(course.code);
        const isCompleted = completedDisciplines && completedDisciplines.includes(course.code);

        semesterData.totalMandatory++;
        if (isCompleted) {
          semesterData.completedMandatory++;
        }

        semesterData.disciplines.push({
          code: course.code,
          name: course.name,
          completed: isCompleted,
          enrolled: isEnrolled,
        });
      });
    }

    semesterMap.forEach((data) => {
      data.percentage =
        data.totalMandatory > 0
          ? Math.round((data.completedMandatory / data.totalMandatory) * 100)
          : 0;
    });

    return semesterMap;
  }, [courses, completedDisciplines, courseLevels, enrolledCodes]);

  const semesterArray = Array.from(disciplinesBySemester.values()).sort(
    (a, b) => a.semester - b.semester
  );

  const getColorByPercentage = (percentage: number): string => {
    if (percentage === 100) return 'bg-green-500 text-white';
    if (percentage >= 75) return 'bg-green-400 text-white';
    if (percentage >= 50) return 'bg-yellow-400 text-white';
    if (percentage >= 25) return 'bg-orange-400 text-white';
    if (percentage > 0) return 'bg-red-400 text-white';
    return 'bg-muted text-muted-foreground';
  };

  const getBorderColorByPercentage = (percentage: number): string => {
    if (percentage === 100) return 'border-green-500';
    if (percentage >= 75) return 'border-green-400';
    if (percentage >= 50) return 'border-yellow-400';
    if (percentage >= 25) return 'border-orange-400';
    if (percentage > 0) return 'border-red-400';
    return 'border-border';
  };

  const getLevelName = (semesterNumber: number) =>
    courseLevels[semesterNumber - 1] || `${semesterNumber}º Semestre`;

  const renderSemesterCell = (semester: SemesterData) => {
    const colorClass = getColorByPercentage(semester.percentage);
    const borderClass = getBorderColorByPercentage(semester.percentage);
    const levelName = getLevelName(semester.semester);

    const cell = (
      <div
        role="button"
        tabIndex={0}
        onClick={() => isMobile && setSelectedSemester(semester)}
        onKeyDown={(e) => {
          if (isMobile && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setSelectedSemester(semester);
          }
        }}
        className={`h-8 rounded-md flex items-center justify-center text-xs font-medium cursor-pointer transition-all border-2 ${colorClass} ${borderClass} ${
          isMobile ? 'active:scale-95' : 'hover:scale-105'
        }`}
      >
        {semester.semester}º
      </div>
    );

    if (isMobile) {
      return cell;
    }

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{cell}</TooltipTrigger>
          <TooltipContent className="max-w-[280px]">
            <SemesterDetailContent semester={semester} levelName={levelName} />
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  if (courseLevels.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-4">
        <div className="text-center py-4 text-xs text-muted-foreground">
          Nenhuma informação de semestres encontrada para este curso
        </div>
      </div>
    );
  }

  const selectedLevelName = selectedSemester
    ? getLevelName(selectedSemester.semester)
    : '';

  return (
    <>
      <div className="bg-card rounded-lg border border-border p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-medium text-foreground">Progresso por Semestre</h3>
            {currentTerm && (
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary">
                Letivo {currentTerm}
              </span>
            )}
            {showInfo && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs max-w-[200px]">{infoText}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span>100%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <span>75%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-yellow-400" />
            <span>50%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-orange-400" />
            <span>25%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-400" />
            <span>&lt;25%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-muted" />
            <span>0%</span>
          </div>
        </div>

        {isMobile && (
          <p className="text-[10px] text-muted-foreground mb-3">
            Toque em um semestre para ver o detalhamento
          </p>
        )}

        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {semesterArray.map((semester) => (
            <div key={semester.semester} className="space-y-1">
              {renderSemesterCell(semester)}
              <div className="text-xs text-center text-muted-foreground">
                {semester.percentage}%
              </div>
            </div>
          ))}
        </div>

        {semesterArray.length === 0 && (
          <div className="text-center py-4 text-xs text-muted-foreground">
            Nenhuma disciplina obrigatória encontrada para os semestres deste curso
          </div>
        )}
      </div>

      <AnimatePresence>
        {isMobile && selectedSemester && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setSelectedSemester(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ duration: 0.18 }}
              className="w-full max-w-md bg-card rounded-2xl shadow-xl border border-border p-5 max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <p className="text-lg font-semibold text-foreground">
                    {selectedSemester.semester}º Semestre
                  </p>
                  <p className="text-xs text-muted-foreground">{selectedLevelName}</p>
                </div>
                <button
                  onClick={() => setSelectedSemester(null)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted"
                  aria-label="Fechar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <SemesterDetailContent
                semester={selectedSemester}
                levelName={selectedLevelName}
                hideTitle
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
