import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useMemo } from 'react';

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
  courses: any[]; // Todas as disciplinas do curso
  completedDisciplines: string[]; // Códigos marcados como concluídos
  courseLevels: string[]; // Níveis/semestres do curso
  showInfo?: boolean;
  infoText?: string;
}

export function AdvancedSemesterGrid({ 
  courses,
  completedDisciplines,
  courseLevels,
  showInfo = false,
  infoText = ''
}: AdvancedSemesterGridProps) {
  
  // Agrupa disciplinas obrigatórias por semestre
  const disciplinesBySemester = useMemo(() => {
    const semesterMap = new Map<number, SemesterData>();
    
    // Inicializa apenas os semestres que existem no curso
    courseLevels.forEach((level, index) => {
      const semesterNumber = index + 1;
      semesterMap.set(semesterNumber, {
        semester: semesterNumber,
        totalMandatory: 0,
        completedMandatory: 0,
        percentage: 0,
        disciplines: []
      });
    });
    
    // Processa as disciplinas do curso
    if (courses && Array.isArray(courses)) {
      courses.forEach((course) => {
        // Considera apenas disciplinas obrigatórias
        if (course.type === 'OPT' || course.type === 'OPTATIVO') {
          return;
        }
        
        // Encontra o semestre correspondente ao level
        const semesterIndex = courseLevels.findIndex(level => level === course.level);
        if (semesterIndex === -1) return;
        
        const semester = semesterIndex + 1;
        const semesterData = semesterMap.get(semester);
        if (!semesterData) return;
        
        // Verifica se está cursada (tem seção ativa)
        const isEnrolled = course.sections_count > 0;
        const isCompleted = completedDisciplines && completedDisciplines.includes(course.code);
        
        semesterData.totalMandatory++;
        if (isCompleted) {
          semesterData.completedMandatory++;
        }
        
        semesterData.disciplines.push({
          code: course.code,
          name: course.name,
          completed: isCompleted,
          enrolled: isEnrolled
        });
      });
    }
    
    // Calcula porcentagens
    semesterMap.forEach(data => {
      data.percentage = data.totalMandatory > 0 
        ? Math.round((data.completedMandatory / data.totalMandatory) * 100)
        : 0;
    });
    
    return semesterMap;
  }, [courses, completedDisciplines, courseLevels]);
  
  // Converte para array ordenado
  const semesterArray = Array.from(disciplinesBySemester.values())
    .sort((a, b) => a.semester - b.semester);

  // Função para determinar a cor baseada na porcentagem
  const getColorByPercentage = (percentage: number): string => {
    if (percentage === 100) return 'bg-green-500 text-white';
    if (percentage >= 75) return 'bg-green-400 text-white';
    if (percentage >= 50) return 'bg-yellow-400 text-white';
    if (percentage >= 25) return 'bg-orange-400 text-white';
    if (percentage > 0) return 'bg-red-400 text-white';
    return 'bg-muted text-muted-foreground';
  };

  // Função para determinar a cor da borda baseada na porcentagem
  const getBorderColorByPercentage = (percentage: number): string => {
    if (percentage === 100) return 'border-green-500';
    if (percentage >= 75) return 'border-green-400';
    if (percentage >= 50) return 'border-yellow-400';
    if (percentage >= 25) return 'border-orange-400';
    if (percentage > 0) return 'border-red-400';
    return 'border-border';
  };

  // Gera os semestres para exibir (com base nos dados ou totalSemesters)
  // Se não houver semestres, mostra mensagem
  if (courseLevels.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-4">
        <div className="text-center py-4 text-xs text-muted-foreground">
          Nenhuma informação de semestres encontrada para este curso
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-foreground">Progresso por Semestre</h3>
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
      
      {/* Legenda de cores - em linha separada para mobile */}
      <div className="flex flex-wrap items-center gap-2 mb-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <span>100%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-400"></div>
          <span>75%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
          <span>50%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-orange-400"></div>
          <span>25%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-red-400"></div>
          <span>&lt;25%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-muted"></div>
          <span>0%</span>
        </div>
      </div>
      
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {semesterArray.map((semester) => {
          const colorClass = getColorByPercentage(semester.percentage);
          const borderClass = getBorderColorByPercentage(semester.percentage);
          const levelName = courseLevels[semester.semester - 1] || `${semester.semester}º Semestre`;
          
          return (
            <div key={semester.semester} className="space-y-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div 
                      className={`h-8 rounded-md flex items-center justify-center text-xs font-medium cursor-pointer transition-all hover:scale-105 border-2 ${colorClass} ${borderClass}`}
                    >
                      {semester.semester}º
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs space-y-1">
                      <div className="font-medium">
                        {levelName}
                      </div>
                      <div>
                        {semester.completedMandatory}/{semester.totalMandatory} disciplinas obrigatórias
                      </div>
                      <div className="font-bold">
                        {semester.percentage}% completo
                      </div>
                      <div className="text-xs opacity-75 max-w-[250px]">
                        <div className="font-medium mb-1">Status das disciplinas:</div>
                        {semester.disciplines.map(d => (
                          <div key={d.code} className="flex items-center gap-1 py-0.5">
                            <span className={`w-2 h-2 rounded-full ${
                              d.completed ? 'bg-green-500' : 'bg-gray-400'
                            }`}></span>
                            <span>{d.code} - {d.completed ? 'Cursado' : 'Não feito'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <div className="text-xs text-center text-muted-foreground">
                {semester.percentage}%
              </div>
            </div>
          );
        })}
      </div>
      
      {semesterArray.length === 0 && (
        <div className="text-center py-4 text-xs text-muted-foreground">
          Nenhuma disciplina obrigatória encontrada para os semestres deste curso
        </div>
      )}
    </div>
  );
}
