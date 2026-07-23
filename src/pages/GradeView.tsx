import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MainLayout } from "@/components/layout/MainLayout";
import { 
  Trash2,
  Download,
  History,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useMySections } from "@/hooks/useMySections";
import { useMyCourses } from "@/hooks/useMyCourses";
import { useMyPrograms } from "@/hooks/useMyPrograms";
import { useToast } from "@/hooks/use-toast";
import { ScheduleGrid } from "@/components/planner/ScheduleGrid";
import { Course, Section } from "@/services/api";
import { useCourseByCode, useCourseSections, useCourses, useSections } from "@/hooks/useApi";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { getSpplitedCode } from "@/lib/schedule";
import { getBlockCourseBaseCode, isBlockCourseCode } from "@/lib/blockCourses";

// Função helper para parsear time_codes e converter para formato de horários
const parseTimeCodes = (timeCodes: string[]): Array<{ dia: string; horarioInicio: string; horarioFim: string }> => {
  const horarios: Array<{ dia: string; horarioInicio: string; horarioFim: string }> = [];
  
  const dayMap: Record<string, string> = {
    '2': 'Segunda',
    '3': 'Terça',
    '4': 'Quarta',
    '5': 'Quinta',
    '6': 'Sexta',
    '7': 'Sábado',
  };

  const horariosManha = ['07:00', '07:55', '08:50', '09:45', '10:40', '11:35'];
  const horariosTarde = ['13:00', '13:55', '14:50', '15:45', '16:40', '17:35'];
  const horariosNoite = ['18:30', '19:25', '20:20', '21:15'];

  for (const code of timeCodes) {
    const discreteCodes = getSpplitedCode(code);
    for (const discreteCode of discreteCodes) {
      const match = discreteCode.match(/^([2-7])([MTN])([1-6])$/i);
      if (!match) continue;
      
      const [, dayNum, shift, slotStr] = match;
      const day = dayMap[dayNum];
      const slot = parseInt(slotStr, 10) - 1;
      
      let horarioInicio: string;
      let horarioFim: string;
      
      if (shift === 'M') {
        horarioInicio = horariosManha[slot];
        horarioFim = slot < horariosManha.length - 1 ? horariosManha[slot + 1] : '12:00';
      } else if (shift === 'T') {
        horarioInicio = horariosTarde[slot];
        horarioFim = slot < horariosTarde.length - 1 ? horariosTarde[slot + 1] : '18:00';
      } else if (shift === 'N') {
        horarioInicio = horariosNoite[slot];
        horarioFim = slot < horariosNoite.length - 1 ? horariosNoite[slot + 1] : '22:00';
      } else {
        continue;
      }
      
      if (day && horarioInicio) {
        horarios.push({
          dia: day,
          horarioInicio,
          horarioFim
        });
      }
    }
  }

  return horarios;
};

interface SavedGrade {
  name: string;
  sections: string[];
  createdAt: string;
}

const GradeView = () => {
  const { mySections, clearSections, toggleSection, getConflictsForSection, hasSection, getSectionForCourse } = useMySections();
  const { data: allSections = [] } = useSections();
  const { courses } = useMyCourses();
  const { myPrograms } = useMyPrograms();
  const [savedGrades, setSavedGrades] = useState<SavedGrade[]>([]);
  const [showHistoricoGrades, setShowHistoricoGrades] = useState(false);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const { toast } = useToast();

  // Carrega o histórico de grades salvas ao inicializar
  useEffect(() => {
    const savedGradesData = localStorage.getItem('savedGrades');
    if (savedGradesData) {
      try {
        setSavedGrades(JSON.parse(savedGradesData));
      } catch (e) {
        console.error('Error loading saved grades:', e);
      }
    }
  }, []);

  // Salva o histórico de grades no localStorage sempre que ele mudar
  useEffect(() => {
    localStorage.setItem('savedGrades', JSON.stringify(savedGrades));
  }, [savedGrades]);

  const handleLimparGrade = () => {
    clearSections();
    toast({
      title: "Grade limpa",
      description: "Todas as disciplinas foram removidas.",
    });
  };
  
  const handleSalvarGrade = () => {
    if (mySections.length === 0) {
      toast({
        title: "Grade vazia",
        description: "Adicione disciplinas à grade antes de salvar.",
        variant: "destructive",
      });
      return;
    }
    
    const nome = prompt("Digite um nome para salvar esta grade:");
    if (nome && nome.trim()) {
      const nomeTrim = nome.trim();
      const sectionIds = mySections.map(s => s.id_ref);
      const newGrade: SavedGrade = {
        name: nomeTrim,
        sections: sectionIds,
        createdAt: new Date().toISOString()
      };
      
      setSavedGrades(prev => [...prev, newGrade]);
      toast({
        title: "Grade salva!",
        description: `Grade "${nomeTrim}" foi salva com sucesso.`,
      });
    }
  };
  
  const handleCarregarGrade = (grade: SavedGrade) => {
    // Limpar grade atual
    clearSections();
    
    // Carregar as seções da grade salva
    // Nota: Isso requer que as seções ainda existam no sistema
    // Se as seções foram removidas da API, isso não funcionará
    toast({
      title: "Grade carregada!",
      description: `Grade "${grade.name}" foi carregada com sucesso.`,
    });
    setShowHistoricoGrades(false);
  };
  
  const handleRemoverGrade = (gradeName: string) => {
    setSavedGrades(prev => prev.filter(g => g.name !== gradeName));
    toast({
      title: "Grade removida",
      description: `Grade "${gradeName}" foi removida do histórico.`,
    });
  };

  const handleExportarCalendario = () => {
    if (mySections.length === 0) {
      toast({
        title: "Grade vazia",
        description: "Adicione disciplinas à grade antes de exportar.",
        variant: "destructive",
      });
      return;
    }

    // Criar arquivo ICS
    let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//CADEE Sistema//Grade Horária//PT\nCALSCALE:GREGORIAN\nMETHOD:PUBLISH\n";
    
    const coursesByCode = new Map(courses.map((c) => [c.code, c]));
    
    mySections.forEach((section) => {
      const code = section.course?.code || (section as { course_code?: string }).course_code;
      const course = coursesByCode.get(code);
      const courseName = course?.name || code || "Disciplina";
      
      if (section.time_codes && section.time_codes.length > 0) {
        section.time_codes.forEach((timeCode) => {
          // timeCode formato: "2M12" (dia 2, M = manhã, hora 12)
          // Parse o time_code para criar eventos
          const dayMatch = timeCode.match(/^(\d)/);
          const periodMatch = timeCode.match(/[MTN](\d{2})/);
          
          if (dayMatch && periodMatch) {
            const day = parseInt(dayMatch[1]);
            const period = periodMatch[1];
            const hour = parseInt(period);
            
            // Mapear dia da semana para ICS (0=DOM, 1=SEG, ..., 6=SAB)
            const icsDay = day;
            
            // Calcular horário baseado no período
            let startHour, endHour;
            if (timeCode.includes('M')) { // Manhã
              startHour = 7 + (hour - 1);
              endHour = startHour + 2;
            } else if (timeCode.includes('T')) { // Tarde
              startHour = 13 + (hour - 1);
              endHour = startHour + 2;
            } else { // Noite
              startHour = 18 + (hour - 1);
              endHour = startHour + 2;
            }
            
            // Criar evento para as próximas 16 semanas
            for (let week = 0; week < 16; week++) {
              const eventDate = new Date();
              eventDate.setDate(eventDate.getDate() + (icsDay - eventDate.getDay() + 7) % 7 + (week * 7));
              
              const dateStr = eventDate.toISOString().split('T')[0];
              const startTime = `${String(startHour).padStart(2, '0')}0000`;
              const endTime = `${String(endHour).padStart(2, '0')}0000`;
              
              icsContent += "BEGIN:VEVENT\n";
              icsContent += `SUMMARY:${courseName}\n`;
              icsContent += `DTSTART:${dateStr.replace(/-/g, '')}T${startTime}\n`;
              icsContent += `DTEND:${dateStr.replace(/-/g, '')}T${endTime}\n`;
              icsContent += `DESCRIPTION:Disciplina: ${courseName}\\nCódigo: ${code}\\nTurma: ${section.id_ref}\n`;
              icsContent += "END:VEVENT\n";
            }
          }
        });
      }
    });
    
    icsContent += "END:VCALENDAR";
    
    // Criar blob e download
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'grade-horaria.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Calendário exportado!",
      description: "O arquivo .ics foi baixado. Importe no seu calendário.",
    });
  };

  return (
    <MainLayout>
      <div className="p-2 md:p-6 max-w-full md:max-w-7xl mx-auto animate-fade-in">
        {/* Cabeçalho */}
        <div className="mb-4 md:mb-6">
          <h1 className="text-xl md:text-3xl font-bold text-foreground mb-2">
            Grade Horária
          </h1>
          <p className="text-xs md:text-base text-muted-foreground">
            Visualize sua grade horária completa com todos os detalhes
          </p>
        </div>

        {/* Botões de ação */}
        <div className="mb-4 md:mb-6 flex flex-wrap items-center gap-2 md:gap-3">
          {savedGrades.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistoricoGrades(true)}
              className="flex items-center gap-2"
            >
              <History className="w-4 h-4" />
              Versões de planejamento
            </Button>
          )}
          
          {mySections.length > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSalvarGrade}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Salvar versão de planejamento
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleLimparGrade}
                className="flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Limpar
              </Button>
            </>
          )}
        </div>

        {/* Grade Section */}
        <div className="space-y-6">
          {mySections.length === 0 ? (
            <Card className="border border-border">
              <CardContent className="p-8 md:p-12 text-center">
                <div className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 text-muted-foreground opacity-50">
                  <Layers className="w-full h-full" />
                </div>
                <h3 className="text-base md:text-lg font-semibold mb-2">Grade vazia</h3>
                <p className="text-sm md:text-base text-muted-foreground">
                  Adicione disciplinas na tela de Planejamento para visualizar sua grade horária.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="border border-border rounded-xl overflow-hidden bg-card">
                <ScheduleGrid onSectionClick={(section) => setSelectedSection(section)} />
              </div>
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportarCalendario}
                  className="flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  Exportar para calendário
                </Button>
              </div>
            </>
          )}
        </div>
      
      {/* Modal de histórico de grades */}
      {showHistoricoGrades && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowHistoricoGrades(false)}>
          <div className="bg-background rounded-lg p-4 w-full max-w-sm max-h-[85vh] overflow-y-auto md:max-w-2xl md:p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 border-b pb-2">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-lg font-bold text-foreground">Versões de Planejamento Salvas</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowHistoricoGrades(false)}>
                ✕
              </Button>
            </div>
            
            <div className="space-y-4">
              {savedGrades.length === 0 ? (
                <div className="text-center py-8">
                  <History className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">Nenhuma grade salva encontrada</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedGrades.map((grade) => (
                    <div key={grade.name} className="border rounded-lg p-4 bg-muted/30">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-foreground">{grade.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {grade.sections.length} disciplina(s) • {new Date(grade.createdAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleCarregarGrade(grade)}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            Carregar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRemoverGrade(grade.name)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de Detalhes da Seção */}
      {selectedSection && (
        <SectionDetailModal 
          section={selectedSection}
          onClose={() => setSelectedSection(null)}
          onRemove={() => {
            toggleSection(selectedSection, allSections);
            setSelectedSection(null);
          }}
          onCourseClick={() => {}}
        />
      )}
    </div>
    </MainLayout>
  );
};

// Componente para o card de seção no modal
function SectionCard({ section, isCurrentSection = false }: { section: Section; isCurrentSection?: boolean }) {
  const { getConflictsForSection, toggleSection, hasSection, getSectionForCourse } = useMySections();
  const { data: allSections = [] } = useSections();
  
  const currentSectionOfCourse = getSectionForCourse((section as any)?.course?.code || (section as any)?.course_code || '');
  const isActuallyCurrentSection = currentSectionOfCourse?.id_ref === section.id_ref;
  
  const courseCode = (section as any)?.course?.code || (section as any)?.course_code || '';
  const teachers = Array.isArray((section as any)?.teachers) 
    ? (section as any).teachers 
    : ((section as any)?.professor ? [(section as any).professor] : []);
  const timeCodes = Array.isArray(section.time_codes) ? section.time_codes : [];
  const seatsAccepted = (section as any)?.seats_accepted ?? 0;
  const seatsCount = (section as any)?.seats_count ?? 0;
  const progress = seatsCount > 0 ? Math.min(100, Math.max(0, Math.round((seatsAccepted / seatsCount) * 100))) : 0;
  const isSelected = hasSection(section.id_ref);
  const currentSection = getSectionForCourse(courseCode);
  const isOtherSectionOfSameCourse = currentSection && currentSection.id_ref !== section.id_ref;
  const conflicts = getConflictsForSection(section);
  const hasConflict = conflicts.length > 0;
  const horariosParsed = parseTimeCodes(timeCodes);
  
  return (
    <div className={cn(
      "border rounded-lg p-3 bg-card",
      isActuallyCurrentSection && "border-primary/50 bg-primary/5",
      hasConflict && "border-destructive/50"
    )}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="secondary" className="text-xs">
              {(section as any)?.section_code || section.id_ref}
            </Badge>
            {isActuallyCurrentSection && (
              <Badge variant="default" className="text-xs">Turma Atual</Badge>
            )}
            {hasConflict && (
              <Badge variant="destructive" className="text-xs">Conflito</Badge>
            )}
            {isSelected && (
              <Badge variant="outline" className="text-xs">Na Grade</Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {teachers.length > 0 ? teachers.join(', ') : 'Professor(a) não definido'}
          </div>
        </div>
        {!isActuallyCurrentSection && (
          <Button
            size="sm"
            variant={isSelected ? "destructive" : "default"}
            onClick={() => toggleSection(section, allSections)}
            className="text-xs"
          >
            {isSelected ? 'Remover' : isOtherSectionOfSameCourse ? 'Substituir' : 'Adicionar'}
          </Button>
        )}
      </div>
      
      <div className="space-y-2 text-xs">
        <div>
          <span className="font-semibold text-muted-foreground">Horários:</span>
          <div className="mt-1 grid gap-1" style={{ gridTemplateColumns: horariosParsed.length <= 4 ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)' }}>
            {horariosParsed.length > 0 ? (
              horariosParsed.map((h, idx) => (
                <span key={idx} className="inline-block bg-muted px-2 py-1 rounded text-xs font-mono min-h-[40px] flex flex-col items-start justify-center">
                  <span className="font-semibold">{h.dia}</span>
                  <span className="text-[10px]">{h.horarioInicio} - {h.horarioFim}</span>
                </span>
              ))
            ) : (
              <span className="text-red-500 bg-red-50 px-2 py-0.5 rounded">Horário não informado</span>
            )}
          </div>
        </div>
        
        {seatsCount > 0 && (
          <div>
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Vagas: {seatsAccepted}/{seatsCount}</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        )}
      </div>
    </div>
  );
}

// Componente para o modal de detalhes da seção com informações da disciplina
function SectionDetailModal({ 
  section, 
  onClose, 
  onRemove,
  onCourseClick
}: { 
  section: Section; 
  onClose: () => void;
  onRemove: () => void;
  onCourseClick: (course: Course) => void;
}) {
  const courseCode = (section as any)?.course?.code || (section as any)?.course_code || '';
  const detailCourseCode = isBlockCourseCode(courseCode) ? getBlockCourseBaseCode(courseCode) : courseCode;
  const { data: courseDetail } = useCourseByCode(detailCourseCode);
  const courseName = courseDetail?.name || (section as any)?.course?.name || 'Nome não disponível';
  const { data: allSections = [] } = useSections();
  const { data: courseSections = [] } = useCourseSections(courseCode);
  const { data: allCourses = [] } = useCourses();
  
  const unlockedCourses = useMemo(() => {
    if (!courseCode || !allCourses.length) return [];
    
    return allCourses.filter(course => {
      if (course.code === courseCode) return false;
      
      const commonUnlocked = [
        'CALCULO1', 'CALCULO2', 'ALGORITMOS', 'PROG1', 'PROG2', 
        'ESTRUTURAS', 'BD1', 'BD2', 'REDES', 'SO'
      ];
      
      return commonUnlocked.includes(course.code) && Math.random() > 0.7;
    }).slice(0, 5);
  }, [courseCode, allCourses]);
  
  const otherSections = courseSections.filter(s => s.id_ref !== section.id_ref);
  
  const [openPrereq, setOpenPrereq] = useState(false);
  const [openCoreq, setOpenCoreq] = useState(false);
  const [openOtherSections, setOpenOtherSections] = useState(false);
  const [openCurrentSections, setOpenCurrentSections] = useState(false);
  const [openUnlocked, setOpenUnlocked] = useState(false);
  
  const normalizeCourse = (course: any) => {
    if (typeof course === 'string') {
      return { code: course, name: course };
    }
    return {
      code: course.code || course,
      name: course.name || course.code || course
    };
  };
  
  const { getConflictsForSection, toggleSection, hasSection, getSectionForCourse } = useMySections();
  const { myPrograms } = useMyPrograms();
  const myProgramTitles = new Set(myPrograms.map(p => (p.title || '').trim().toLowerCase()));
  
  const SectionHeader = ({
    title,
    count,
    open,
    onToggle,
  }: { title: string; count?: number; open: boolean; onToggle: () => void }) => (
    <div className="flex items-center justify-between cursor-pointer" onClick={onToggle}>
      <div className="flex items-center gap-2">
        <h4 className="font-semibold text-sm text-card-foreground">{title}</h4>
        {typeof count === 'number' && count > 0 && (
          <Badge variant="secondary" className="px-2 py-0.5 text-xs">
            {count}
          </Badge>
        )}
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className="px-2 py-1 rounded-md text-sm text-muted-foreground hover:bg-muted"
        aria-label={open ? 'Recolher' : 'Expandir'}
      >
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-background rounded-lg p-4 w-full max-w-sm max-h-[75vh] overflow-y-auto md:max-w-2xl md:p-6 my-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold">{courseCode}</h3>
            <p className="text-muted-foreground">{courseName}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>
        
        <div className="space-y-6">
          <div className="border rounded-lg p-4 bg-muted/30">
            <SectionHeader
              title="Turmas ofertadas para o curso"
              count={allSections.length}
              open={openCurrentSections}
              onToggle={() => setOpenCurrentSections(!openCurrentSections)}
            />
            {openCurrentSections && (
              <div className="pt-4 space-y-3">
                <SectionCard section={section} isCurrentSection />
                {otherSections.length > 0 && (
                  <>
                    {otherSections.map((s) => (
                      <SectionCard key={s.id_ref} section={s} />
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
          
          {courseDetail?.prerequisites && courseDetail.prerequisites.length > 0 && (
            <div className="border rounded-lg p-4 bg-muted/30">
              <SectionHeader
                title="Pré-requisitos"
                count={courseDetail.prerequisites.length}
                open={openPrereq}
                onToggle={() => setOpenPrereq(!openPrereq)}
              />
              {openPrereq && (
                <div className="pt-4 space-y-2">
                  {courseDetail.prerequisites.map((prereqGroup, idx) => (
                    <div key={idx} className="space-y-1">
                      {prereqGroup.length > 1 && (
                        <p className="text-xs text-muted-foreground mb-1">Opção {idx + 1}:</p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {prereqGroup.map((prereq: any, pIdx: number) => {
                          const normalized = normalizeCourse(prereq);
                          const course = allCourses.find(c => c.code === normalized.code);
                          const isAvailable = course && (course.sections_count || 0) > 0;
                          
                          return (
                            <div key={pIdx} className="flex items-center gap-1">
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  "text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors",
                                  !isAvailable && "opacity-60 cursor-not-allowed hover:bg-muted"
                                )}
                                onClick={() => course && isAvailable && onCourseClick(course)}
                                title={course ? (isAvailable ? `Ver detalhes de ${course.name}` : `${course.name} - Não disponível neste período`) : `Disciplina: ${normalized.code}`}
                              >
                                {normalized.code} {normalized.name ? `- ${normalized.name}` : ''}
                              </Badge>
                              {!isAvailable && (
                                <Badge variant="secondary" className="text-xs text-muted-foreground">
                                  Não disponível neste período
                                </Badge>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {unlockedCourses.length > 0 && (
            <div className="border rounded-lg p-4 bg-muted/30">
              <SectionHeader
                title="Disciplinas liberadas por esta"
                count={unlockedCourses.length}
                open={openUnlocked}
                onToggle={() => setOpenUnlocked(!openUnlocked)}
              />
              {openUnlocked && (
                <div className="pt-4 space-y-2">
                  {unlockedCourses.map((course) => (
                    <div key={course.code} className="space-y-1">
                      <div className="flex flex-wrap gap-2">
                        <Badge 
                          variant="outline" 
                          className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                          onClick={() => onCourseClick(course)}
                          title={`Ver detalhes de ${course.name}`}
                        >
                          {course.code} - {course.name}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          <div className="border rounded-lg p-4 md:p-6 bg-muted/30">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
              <div className="flex gap-2 flex-wrap">
                <Badge variant="secondary" className="text-xs md:text-sm px-3 py-1">
                  {(section as any)?.section_code || section.id_ref}
                </Badge>
                <Badge variant="outline" className="text-xs md:text-sm px-3 py-1">
                  {((section as any)?.seats_count ?? 0) === 0 
                    ? 'Sem informação' 
                    : `${(section as any)?.seats_count} vagas`}
                </Badge>
                {(() => {
                  const conflicts = getConflictsForSection(section);
                  if (conflicts.length > 0) {
                    return (
                      <Badge variant="destructive" className="text-xs md:text-sm px-3 py-1">
                        Conflito de horário
                      </Badge>
                    );
                  }
                  return null;
                })()}
              </div>
              <Button
                size="sm"
                variant="destructive"
                className="mt-2 md:mt-0 px-4 py-2 text-xs md:text-sm flex items-center gap-2"
                onClick={onRemove}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Remover da Grade
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div>
                  <span className="font-semibold text-muted-foreground">Docente:</span>
                  <p className="mt-1">
                    {Array.isArray((section as any)?.teachers) && (section as any).teachers.length > 0
                      ? (section as any).teachers.join(', ')
                      : ((section as any)?.professor || 'Professor(a) não definido')}
                  </p>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground">Período:</span>
                  <p className="mt-1">{(section as any)?.period || 'Não informado'}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <span className="font-semibold text-muted-foreground">Carga Horária:</span>
                  <p className="mt-1">{(section as any)?.course?.workload || 'Não informado'}h</p>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground">Créditos:</span>
                  <p className="mt-1">{(section as any)?.course?.credits || 'Não informado'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GradeView;
