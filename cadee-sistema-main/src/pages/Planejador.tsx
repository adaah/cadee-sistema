import { useState, useMemo, useRef, memo, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ScheduleGrid } from '@/components/planner/ScheduleGrid';
import { SkeletonCard } from '@/components/ui/skeleton-card';
import { useApp } from '@/contexts/AppContext';
import { Course, Section } from '@/services/api';
import { Clock, Users, Plus, BadgeInfo, AlertTriangle, AlertCircle, Star, Flame, Trash2, BookOpen, GraduationCap, School, Filter, X, Calendar, CheckCircle, Eye, Search, Loader2 } from 'lucide-react';
import { useMyPrograms } from '@/hooks/useMyPrograms';
import { cn, getReservedUnfilledBonus, getReservedUnfilledForTitles } from '@/lib/utils';
import { useMyCourses } from "@/hooks/useMyCourses.ts";
import { useMySections } from '@/hooks/useMySections';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getCompetitionLevel, getPhase1Level, getPhase2Level } from '@/lib/competition';
import { useCourseSections, usePrograms, useProgramDetail, useCourseByCode, useCourses, useSections } from '@/hooks/useApi';
import { Button } from '@/components/ui/button';
import { AnimatePresence, motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { getSpplitedCode } from '@/lib/schedule';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQueries } from '@tanstack/react-query';
import { fetchProgramDetail } from '@/services/api';
import { ChevronDown, ChevronUp } from 'lucide-react';

const diasSemana = ["SEG", "TER", "QUA", "QUI", "SEX", "SAB"];
const mapSiglaParaNome = {
  SEG: "Segunda",
  TER: "Terça",
  QUA: "Quarta",
  QUI: "Quinta",
  SEX: "Sexta",
  SAB: "Sábado"
};
const horariosGrade = [
  "07:00", "07:55", "08:50", "09:45", "10:40", "11:35", "13:00", "13:55", 
  "14:50", "15:45", "16:40", "17:35", "18:30", "19:25", "20:20", "21:15"
];

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

  // Mapeamento de horários conforme especificação
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
      const slot = parseInt(slotStr, 10) - 1; // Convert para 0-based index
      
      let horarioInicio: string;
      let horarioFim: string;
      
      if (shift === 'M') {
        // Manhã: 07:00-07:55, 07:55-08:50, etc.
        horarioInicio = horariosManha[slot];
        horarioFim = slot < horariosManha.length - 1 ? horariosManha[slot + 1] : '12:00';
      } else if (shift === 'T') {
        // Tarde: 13:00-13:55, 13:55-14:50, etc.
        horarioInicio = horariosTarde[slot];
        horarioFim = slot < horariosTarde.length - 1 ? horariosTarde[slot + 1] : '18:00';
      } else if (shift === 'N') {
        // Noite: 18:30-19:25, 19:25-20:20, etc.
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

// Componente memoizado para card de disciplina - otimiza performance
const DisciplineCard = memo(({ course, onClick }: { course: Course; onClick: (course: Course) => void }) => {
  const { completedDisciplines } = useApp();
  const isCompleted = completedDisciplines.includes(course.code);
  
  return (
    <div 
      key={course.code}
      data-discipline-code={course.code}
      onClick={() => onClick(course)}
      className="p-3 md:p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors relative"
    >
      {isCompleted && (
        <div className="absolute top-2 right-2">
          <Badge variant="default" className="bg-success text-success-foreground text-xs px-2 py-0.5">
            Cursada
          </Badge>
        </div>
      )}
      <div className="font-semibold text-xs md:text-sm mb-1">{course.code}</div>
      <div className="text-xs text-muted-foreground mb-2 line-clamp-2">
        {course.name}
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-xs">
          {course.sections_count} turma{course.sections_count !== 1 ? 's' : ''}
        </Badge>
      </div>
    </div>
  );
});

DisciplineCard.displayName = 'DisciplineCard';

// Componente de lista virtualizada para melhor performance
const VirtualizedDisciplineList = memo(({ 
  courses, 
  onLoadMore, 
  hasMore,
  onCourseClick 
}: { 
  courses: Course[]; 
  onLoadMore: () => void; 
  hasMore: boolean;
  onCourseClick: (course: Course) => void;
}) => {
  const [visibleCount, setVisibleCount] = useState(20);
  
  useEffect(() => {
    setVisibleCount(20);
  }, [courses]);
  
  const visibleCourses = courses.slice(0, visibleCount);
  
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    if (element.scrollHeight - element.scrollTop <= element.clientHeight + 100) {
      if (hasMore && visibleCourses.length >= visibleCount - 5) {
        setVisibleCount(prev => Math.min(prev + 20, courses.length));
      }
    }
  };
  
  return (
    <div 
      className="space-y-3 max-h-[600px] overflow-y-auto"
      onScroll={handleScroll}
    >
      {visibleCourses.map((course) => (
        <DisciplineCard 
          key={course.code}
          course={course}
          onClick={onCourseClick}
        />
      ))}
      {hasMore && visibleCourses.length < courses.length && (
        <div className="text-center py-2">
          <Button variant="ghost" size="sm" onClick={() => setVisibleCount(prev => Math.min(prev + 20, courses.length))}>
            Carregar mais
          </Button>
        </div>
      )}
    </div>
  );
});

VirtualizedDisciplineList.displayName = 'VirtualizedDisciplineList';

const Planejador = () => {
  const { myPrograms } = useMyPrograms();
  const { courses: myCourses, isLoading: loadingCourses } = useMyCourses();
  const [selectedDiscipline, setSelectedDiscipline] = useState<Course | null>(null);
  const [showSections, setShowSections] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoadingSections, setIsLoadingSections] = useState(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Estado para curso selecionado para visualização
  const [selectedViewProgramId, setSelectedViewProgramId] = useState<string | null>(null);
  // Estado para busca de cursos no seletor
  const [programSearchTerm, setProgramSearchTerm] = useState("");
  
  // Buscar todos os programas disponíveis
  const { data: allPrograms = [] } = usePrograms();
  
  // Carregar cursos do programa selecionado para visualização
  const { data: viewProgramDetail } = useProgramDetail(
    selectedViewProgramId 
      ? allPrograms.find(p => p.id_ref === selectedViewProgramId)?.detail_url || null
      : null
  );
  
  const { data: coursesIndex = [] } = useCourses();
  
  // Cursos para exibição: simplificado e otimizado
  const courses = useMemo(() => {
    // Se há programa selecionado, usa os cursos dele
    if (selectedViewProgramId && viewProgramDetail) {
      const indexByCode = new Map(coursesIndex.map((c) => [c.code, c]));
      const programCourses = (viewProgramDetail as any)?.courses || [];
      
      return programCourses.map((c: any) => {
        const idx = indexByCode.get(c.code) as any;
        return {
          code: c.code,
          name: idx?.name ?? c.name,
          level: typeof c.semester === 'number' ? `${c.semester}º Semestre` : (c.level ?? '').replace("Nível", "Semestre"),
          type: c.type,
          credits: c.credits,
          workload: c.workload,
          prerequisites: c.prerequisites,
          sections_count: idx?.sections_count ?? 0,
          sections_url: idx?.sections_url,
          detail_url: idx?.detail_url,
          mode: idx?.mode,
          location: idx?.location,
          id_ref: idx?.id_ref,
          department: idx?.department,
          code_url: idx?.code_url,
        } as Course;
      });
    }
    
    // Se não há programa selecionado ("Meu Curso"), usa os cursos do usuário
    if (myCourses && myCourses.length > 0) {
      return myCourses;
    }
    
    return [];
  }, [selectedViewProgramId, viewProgramDetail, coursesIndex, myCourses]);
  
  const isLoading = loadingCourses || (selectedViewProgramId && !viewProgramDetail);
  const [filtroModalOpen, setFiltroModalOpen] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [diasSelecionados, setDiasSelecionados] = useState<string[]>([]);
  const [horariosSelecionados, setHorariosSelecionados] = useState<string[]>([]);
  const [logicaFiltroDia, setLogicaFiltroDia] = useState<'OU' | 'E'>('OU');
  const [logicaFiltroHorario, setLogicaFiltroHorario] = useState<'OU' | 'E'>('OU');
  // Estados para restrições de horário
  const [diasRestritos, setDiasRestritos] = useState<string[]>([]);
  const [logicaRestricoes, setLogicaRestricoes] = useState<'OU' | 'E'>('OU');
  const [horariosRestritos, setHorariosRestritos] = useState<string[]>([]);
  const [logicaRestricoesHorario, setLogicaRestricoesHorario] = useState<'OU' | 'E'>('OU');
  
  const { hasSectionOnCourse, toggleSection, getConflictsForSection, mySections, clearSections } = useMySections();
  const { completedDisciplines } = useApp();
  const { data: allSections = [] } = useSections();
  const myProgramTitles = new Set(myPrograms.map(p => (p.title || '').trim().toLowerCase()));
  const [applyFiltersToSections, setApplyFiltersToSections] = useState(true);

  const hasActiveFilters = useMemo(() => (
    diasSelecionados.length > 0 ||
    horariosSelecionados.length > 0 ||
    diasRestritos.length > 0 ||
    horariosRestritos.length > 0
  ), [diasSelecionados, horariosSelecionados, diasRestritos, horariosRestritos]);

  // Helper para normalizar texto (remove acentos) para busca
  const normalizeText = (text: string) =>
    (text || '')
      .normalize('NFD')
      .replace(/\p{Diacritic}+/gu, '')
      .toLowerCase();

  // Filtrar disciplinas por termo de busca e filtros - otimizado
  const disciplinasFiltradas = useMemo(() => {
    if (!courses || courses.length === 0) return [];
    
    let result = courses;
    
    // Filtrar disciplinas com 0 turmas
    result = result.filter(course => (course.sections_count || 0) > 0);
    
    // Filtrar disciplinas cursadas se não estiverem visíveis
    if (!showCompleted) {
      result = result.filter(course => !completedDisciplines.includes(course.code));
    }
    
    // Aplicar filtro de busca - otimizado com cache do termo
    if (searchTerm) {
      const term = normalizeText(searchTerm);
      result = result.filter(course => {
        const codeNorm = normalizeText(course.code);
        const nameNorm = normalizeText(course.name);
        return codeNorm.includes(term) || nameNorm.includes(term);
      });
    }

    const hasFilters = diasSelecionados.length > 0 || horariosSelecionados.length > 0 || 
      diasRestritos.length > 0 || horariosRestritos.length > 0;

    if (!hasFilters) return result;

    const selectedDias = diasSelecionados
      .map(d => mapSiglaParaNome[d as keyof typeof mapSiglaParaNome])
      .filter(Boolean);
    const restrictedDias = diasRestritos
      .map(d => mapSiglaParaNome[d as keyof typeof mapSiglaParaNome])
      .filter(Boolean);

    const sectionsByCourse = allSections.reduce((acc, section) => {
      const code = (section as any)?.course?.code || (section as any)?.course_code || '';
      if (!code) return acc;
      if (!acc.has(code)) acc.set(code, [] as Section[]);
      acc.get(code)!.push(section);
      return acc;
    }, new Map<string, Section[]>());

    const matchesSection = (section: Section) => {
      const timeCodes = Array.isArray(section.time_codes) ? section.time_codes : [];
      if (timeCodes.length === 0) return true;

      const horariosParsed = parseTimeCodes(timeCodes);

      if (selectedDias.length > 0) {
        const diasNaTurma = horariosParsed.map(h => h.dia);
        const match = logicaFiltroDia === 'E'
          ? selectedDias.every(d => diasNaTurma.includes(d))
          : selectedDias.some(d => diasNaTurma.includes(d));
        if (!match) return false;
      }

      if (horariosSelecionados.length > 0) {
        const horariosNaTurma = horariosParsed.map(h => h.horarioInicio);
        const match = logicaFiltroHorario === 'E'
          ? horariosSelecionados.every(h => horariosNaTurma.includes(h))
          : horariosSelecionados.some(h => horariosNaTurma.includes(h));
        if (!match) return false;
      }

      if (restrictedDias.length > 0) {
        const diasNaTurma = horariosParsed.map(h => h.dia);
        const match = logicaRestricoes === 'E'
          ? restrictedDias.every(d => diasNaTurma.includes(d))
          : restrictedDias.some(d => diasNaTurma.includes(d));
        if (match) return false;
      }

      if (horariosRestritos.length > 0) {
        const horariosNaTurma = horariosParsed.map(h => h.horarioInicio);
        const match = logicaRestricoesHorario === 'E'
          ? horariosRestritos.every(h => horariosNaTurma.includes(h))
          : horariosRestritos.some(h => horariosNaTurma.includes(h));
        if (match) return false;
      }

      return true;
    };

    return result.filter(course => {
      const sections = sectionsByCourse.get(course.code) || [];
      if (sections.length === 0) return false;
      return sections.some(matchesSection);
    });
  }, [
    courses,
    searchTerm,
    showCompleted,
    completedDisciplines,
    diasSelecionados,
    horariosSelecionados,
    diasRestritos,
    horariosRestritos,
    logicaFiltroDia,
    logicaFiltroHorario,
    logicaRestricoes,
    logicaRestricoesHorario,
    allSections
  ]);

  // Calcular total de turmas ofertadas para o semestre
  const totalTurmasSemestre = useMemo(() => {
    if (!courses) return 0;
    return courses.reduce((total, course) => {
      return total + (course.sections_count || 0);
    }, 0);
  }, [courses]);

  // Função para carregar as turmas de uma disciplina
  const handleShowSections = (course: Course, options?: { ignoreFilters?: boolean }) => {
    // Limpar timeout anterior se existir
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }
    
    setApplyFiltersToSections(!options?.ignoreFilters);

    setIsLoadingSections(true);
    setSelectedCourse(course);
    setShowSections(true);
    
    // Simular um pequeno delay para mostrar o loading
    loadingTimeoutRef.current = setTimeout(() => {
      setIsLoadingSections(false);
      loadingTimeoutRef.current = null;
    }, 500);
  };

  const handleShowSectionsNoFilters = (course: Course) => handleShowSections(course, { ignoreFilters: true });

// Função para fechar modal de turmas e voltar para lista de disciplinas
  const handleBackToDisciplines = (course: Course) => {
    // Fechar modal de detalhes da seção
    setSelectedSection(null);
    
    // Fechar modal de turmas se estiver aberto
    setShowSections(false);
    setApplyFiltersToSections(true);
    
    // Definir a disciplina como selecionada para destacar na lista
    setSelectedDiscipline(course);
    
    // Pequeno delay para garantir que os modais fechem antes de rolar
    setTimeout(() => {
      // Rolar para a disciplina na lista
      const element = document.querySelector(`[data-discipline-code="${course.code}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Adicionar highlight temporário
        element.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2');
        setTimeout(() => {
          element.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2');
        }, 2000);
      }
    }, 100);
  };

  // Fechar o modal de turmas
  const handleCloseSections = () => {
    // Limpar timeout se existir
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
    
    setShowSections(false);
    setSelectedCourse(null);
    setApplyFiltersToSections(true);
    setIsLoadingSections(false);
  };

  // Limpar filtros
  const limparFiltros = () => {
    setDiasSelecionados([]);
    setHorariosSelecionados([]);
    setLogicaFiltroDia('OU');
    setLogicaFiltroHorario('OU');
    setDiasRestritos([]);
    setLogicaRestricoes('OU');
    setHorariosRestritos([]);
    setLogicaRestricoesHorario('OU');
  };

  // Aplicar filtros
  const aplicarFiltros = () => {
    setFiltroModalOpen(false);
    // Força a atualização da lista de disciplinas para aplicar os filtros
    // Isso será feito através da dependência das variáveis de filtro no useMemo
  };

  return (
    <MainLayout>
      <div className="p-4 md:p-6 max-w-7xl mx-auto animate-fade-in">
        {/* Cabeçalho */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Planejador de Grade
          </h1>
          <div className="space-y-3">
            {myPrograms.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {myPrograms.map((p) => (
                  <span
                    key={p.id_ref}
                    className="inline-flex items-center px-3 py-1.5 rounded-full bg-muted text-muted-foreground border border-border text-xs font-medium"
                  >
                    {p.title}
                  </span>
                ))}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Eye className="w-4 h-4" />
                Visualizar ofertas de:
              </span>
              <Select 
                value={selectedViewProgramId || "meu-curso"} 
                onValueChange={(value) => setSelectedViewProgramId(value === "meu-curso" ? null : value)}
              >
                <SelectTrigger className="w-[250px] h-9">
                  <SelectValue placeholder="Selecione um curso" />
                </SelectTrigger>
                <SelectContent>
                  <div className="p-2 border-b">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Buscar curso..."
                        value={programSearchTerm}
                        onChange={(e) => setProgramSearchTerm(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>
                  <SelectItem value="meu-curso">
                    Meu curso ({myPrograms.map(p => p.title).join(', ')})
                  </SelectItem>
                  {allPrograms
                    .filter(p => !myPrograms.some(mp => mp.id_ref === p.id_ref))
                    .filter(p => p.title.toLowerCase().includes(programSearchTerm.toLowerCase()))
                    .map((program) => (
                      <SelectItem key={program.id_ref} value={program.id_ref}>
                        {program.title}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {selectedViewProgramId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedViewProgramId(null)}
                  className="h-9"
                >
                  <X className="w-4 h-4 mr-1" />
                  Voltar ao meu curso
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna da esquerda - Disciplinas */}
          <div className="lg:col-span-1 space-y-4">
            {/* Card de Disciplinas */}
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-card-foreground">Disciplinas do Curso</h3>
                  {selectedViewProgramId && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Visualizando: {allPrograms.find(p => p.id_ref === selectedViewProgramId)?.title || 'Outro curso'}
                    </p>
                  )}
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground border border-border cursor-default">
                  {courses?.length || 0} disciplinas • {totalTurmasSemestre} turmas
                </span>
              </div>

              {/* Barra de busca e filtros */}
              <div className="mb-2 md:mb-3 flex flex-col md:flex-row md:items-center md:gap-3 gap-2">
                <input
                  type="text"
                  placeholder="Buscar disciplina..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-background text-foreground placeholder-muted-foreground border-border md:w-auto"
                  style={{ minWidth: 0 }}
                />
                <button
                  type="button"
                  className="relative flex items-center gap-1 border rounded px-3 py-2 text-sm bg-muted hover:bg-muted/70 transition"
                  onClick={() => setFiltroModalOpen(true)}
                >
                  <Filter className="w-4 h-4" />
                  Filtrar
                  {hasActiveFilters && (
                    <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-blue-500 shadow" aria-label="Filtros ativos"></span>
                  )}
                </button>
              </div>

              {/* Botão de mostrar/ocultar cursadas (apenas se houver cursadas) */}
              {completedDisciplines.length > 0 && (
                <div className="mb-4 flex md:flex-row md:items-center gap-2">
                  <button
                    type="button"
                    className="flex items-center gap-1 border rounded px-3 py-2 text-sm bg-muted hover:bg-muted/70 transition"
                    onClick={() => setShowCompleted(!showCompleted)}
                  >
                    <Eye className="w-4 h-4" />
                    {showCompleted ? 'Ocultar cursadas' : 'Mostrar cursadas'}
                  </button>
                </div>
              )}

              <div className="max-h-[600px] overflow-y-auto">
                <div className="grid grid-cols-1 gap-3 md:gap-4">
                  {isLoading ? (
                    [...Array(8)].map((_, i) => <SkeletonCard key={i} />)
                  ) : disciplinasFiltradas?.length === 0 ? (
                    <div className="col-span-full text-center py-8">
                      <p className="text-muted-foreground">Nenhuma disciplina encontrada</p>
                      {searchTerm && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="mt-2"
                          onClick={() => setSearchTerm('')}
                        >
                          Limpar busca
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 md:gap-4">
                      {disciplinasFiltradas.map((course) => (
                        <DisciplineCard 
                          key={course.code}
                          course={course}
                          onClick={handleShowSections}
                        />
                      ))}
                    </div>
                )}
              </div>
              </div>
            </div>
          </div>

          {/* Coluna da direita - Grade Horária */}
          <div className="lg:col-span-2">
            <div className="space-y-4 md:space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-foreground mb-1">Grade Atual</h2>
                  <p className="text-sm md:text-base text-muted-foreground">
                    Visualize as disciplinas convertidas e organizadas
                  </p>
                </div>
                {mySections.length > 0 && (
                  <Button variant="outline" size="sm" onClick={clearSections} className="w-full sm:w-auto">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Limpar Grade
                  </Button>
                )}
              </div>

              {mySections.length === 0 ? (
                <Card>
                  <CardContent className="p-8 md:p-12 text-center">
                    <Calendar className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="text-base md:text-lg font-semibold mb-2">Grade vazia</h3>
                    <p className="text-sm md:text-base text-muted-foreground">
                      Adicione turmas da lista de disciplinas para visualizar a grade horária.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="border rounded-lg overflow-hidden bg-card">
                  <ScheduleGrid onSectionClick={(section) => setSelectedSection(section)} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal de Filtros */}
        <AnimatePresence>
          {filtroModalOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={handleCloseSections}>
              <motion.div 
                className="bg-background rounded-lg p-4 w-full max-w-sm max-h-[75vh] overflow-y-auto md:max-w-lg md:p-6 shadow-lg border my-4" 
                onClick={(e) => e.stopPropagation()}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center justify-between mb-4 border-b pb-2 border-border">
                  <div className="flex items-center gap-2">
                    <Filter className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-bold text-foreground">Filtro de Disciplinas</h3>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setFiltroModalOpen(false)}
                    className="hover:bg-muted"
                  >
                    ✕
                  </Button>
                </div>
                
                <div className="space-y-6">
                  {/* Filtro por Dia */}
                  <div>
                    <div className="font-semibold mb-2 text-sm text-foreground">Dias da semana:</div>
                    <div className="grid grid-cols-3 md:flex md:flex-wrap gap-2">
                      {diasSemana.map(dia => (
                        <label key={dia} className="flex items-center gap-2 p-2 border rounded bg-background hover:bg-muted transition-colors cursor-pointer border-border">
                          <input
                            type="checkbox"
                            checked={diasSelecionados.includes(dia)}
                            onChange={e => {
                              if (e.target.checked) setDiasSelecionados([...diasSelecionados, dia]);
                              else setDiasSelecionados(diasSelecionados.filter(d => d !== dia));
                            }}
                            className="accent-blue-600"
                          />
                          <span className="text-sm font-medium">{dia}</span>
                        </label>
                      ))}
                    </div>
                    <div className="font-semibold mt-3 mb-2 text-sm text-foreground">Lógica para dias:</div>
                    <div className="space-y-2 md:flex md:gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={logicaFiltroDia === 'OU'}
                          onChange={() => setLogicaFiltroDia('OU')}
                          className="accent-blue-600"
                        />
                        <span className="text-sm">OU (um dia ou outro)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={logicaFiltroDia === 'E'}
                          onChange={() => setLogicaFiltroDia('E')}
                          className="accent-blue-600"
                        />
                        <span className="text-sm">E (um dia e outro)</span>
                      </label>
                    </div>
                  </div>
                  
                  {/* Filtro por Horário */}
                  <div>
                    <h4 className="font-semibold mb-2 text-sm text-foreground">Horários</h4>
                    <div className="grid grid-cols-4 md:flex md:flex-wrap gap-1 md:gap-2 max-h-32 overflow-y-auto">
                      {horariosGrade.map(horario => (
                        <label key={horario} className="flex items-center gap-1 p-1 md:p-2 border rounded text-xs md:text-sm bg-background hover:bg-muted transition-colors cursor-pointer">
                          <input
                            type="checkbox"
                            checked={horariosSelecionados.includes(horario)}
                            onChange={e => {
                              if (e.target.checked) setHorariosSelecionados([...horariosSelecionados, horario]);
                              else setHorariosSelecionados(horariosSelecionados.filter(h => h !== horario));
                            }}
                            className="accent-blue-600"
                          />
                          <span className="font-medium">{horario}</span>
                        </label>
                      ))}
                    </div>
                    
                    <div className="font-semibold mt-3 mb-2 text-sm text-foreground">Lógica para horários:</div>
                    <div className="space-y-2 md:flex md:gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={logicaFiltroHorario === 'OU'}
                          onChange={() => setLogicaFiltroHorario('OU')}
                          className="accent-blue-600"
                        />
                        <span className="text-sm">OU (um horário ou outro)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={logicaFiltroHorario === 'E'}
                          onChange={() => setLogicaFiltroHorario('E')}
                          className="accent-blue-600"
                        />
                        <span className="text-sm">E (um horário e outro)</span>
                      </label>
                    </div>
                  </div>
                  
                  {/* Restrições de Dias */}
                  <div>
                    <div className="font-semibold mb-2 text-sm text-foreground">Restrições de Dias (dias que NÃO quer):</div>
                    <div className="grid grid-cols-3 md:flex md:flex-wrap gap-2">
                      {diasSemana.map(dia => (
                        <label key={dia} className="flex items-center gap-2 p-2 border rounded bg-background hover:bg-muted transition-colors cursor-pointer">
                          <input
                            type="checkbox"
                            checked={diasRestritos.includes(dia)}
                            onChange={e => {
                              if (e.target.checked) setDiasRestritos([...diasRestritos, dia]);
                              else setDiasRestritos(diasRestritos.filter(d => d !== dia));
                            }}
                            className="accent-red-600"
                          />
                          <span className="text-sm font-medium">{dia}</span>
                        </label>
                      ))}
                    </div>
                    <div className="font-semibold mt-3 mb-2 text-sm text-foreground">Lógica para restrições de dias:</div>
                    <div className="space-y-2 md:flex md:gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={logicaRestricoes === 'OU'}
                          onChange={() => setLogicaRestricoes('OU')}
                          className="accent-red-600"
                        />
                        <span className="text-sm">OU (um dia restrito ou outro)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={logicaRestricoes === 'E'}
                          onChange={() => setLogicaRestricoes('E')}
                          className="accent-red-600"
                        />
                        <span className="text-sm">E (um dia restrito e outro)</span>
                      </label>
                    </div>
                  </div>
                  
                  {/* Restrições de Horário */}
                  <div>
                    <div className="font-semibold mb-2 text-sm text-foreground">Restrições de Horário (horários que NÃO quer):</div>
                    <div className="grid grid-cols-4 md:flex md:flex-wrap gap-1 md:gap-2 max-h-32 overflow-y-auto">
                      {horariosGrade.map(horario => (
                        <label key={horario} className="flex items-center gap-1 p-1 md:p-2 border rounded text-xs md:text-sm bg-background hover:bg-muted transition-colors cursor-pointer">
                          <input
                            type="checkbox"
                            checked={horariosRestritos.includes(horario)}
                            onChange={e => {
                              if (e.target.checked) setHorariosRestritos([...horariosRestritos, horario]);
                              else setHorariosRestritos(horariosRestritos.filter(h => h !== horario));
                            }}
                            className="accent-red-600"
                          />
                          <span className="font-medium">{horario}</span>
                        </label>
                      ))}
                    </div>
                    <div className="font-semibold mt-3 mb-2 text-sm text-foreground">Lógica para restrições de horário:</div>
                    <div className="space-y-2 md:flex md:gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={logicaRestricoesHorario === 'OU'}
                          onChange={() => setLogicaRestricoesHorario('OU')}
                          className="accent-red-600"
                        />
                        <span className="text-sm">OU (um horário restrito ou outro)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={logicaRestricoesHorario === 'E'}
                          onChange={() => setLogicaRestricoesHorario('E')}
                          className="accent-red-600"
                        />
                        <span className="text-sm">E (um horário restrito e outro)</span>
                      </label>
                    </div>
                  </div>
                  
                  {/* Botões de ação */}
                  <div className="flex gap-3 pt-4 border-t">
                    <button
                      type="button"
                      className="flex-1 px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-sm font-medium transition-colors"
                      onClick={limparFiltros}
                    >
                      Limpar
                    </button>
                    <button
                      type="button"
                      className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
                      onClick={aplicarFiltros}
                    >
                      Aplicar
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Modal de Turmas Disponíveis */}
        <AnimatePresence>
          {showSections && selectedCourse && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={handleCloseSections}>
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="bg-background rounded-lg p-4 w-full max-w-sm max-h-[75vh] overflow-y-auto md:max-w-2xl md:p-6 shadow border my-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold">{selectedCourse.code}</h3>
                    <p className="text-muted-foreground">{selectedCourse.name}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleCloseSections}>✕</Button>
                </div>
                
                <div className="space-y-6">
                  {isLoadingSections ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Carregando informações da disciplina...</p>
                    </div>
                  ) : (
                    <SectionsList 
                      courseCode={selectedCourse.code}
                      onCourseClick={handleShowSectionsNoFilters}
                      diasSelecionados={applyFiltersToSections ? diasSelecionados : []}
                      horariosSelecionados={applyFiltersToSections ? horariosSelecionados : []}
                      diasRestritos={applyFiltersToSections ? diasRestritos : []}
                      horariosRestritos={applyFiltersToSections ? horariosRestritos : []}
                    />
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Modal de Detalhes da Seção */}
        {selectedSection && (
          <SectionDetailModal 
            section={selectedSection}
            onClose={() => setSelectedSection(null)}
            onRemove={() => {
              toggleSection(selectedSection);
              setSelectedSection(null);
            }}
            onCourseClick={handleShowSectionsNoFilters}
          />
        )}
      </div>
    </MainLayout>
  );
};

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
  const courseName = (section as any)?.course?.name || 'Nome não disponível';
  
  // Buscar detalhes da disciplina
  const { data: courseDetail } = useCourseByCode(courseCode);
  
  // Buscar todas as turmas desta disciplina - apenas uma chamada
  const { data: allSections = [] } = useCourseSections(courseCode);
  
  // Buscar todas as disciplinas para pré-requisitos e disciplinas liberadas
  const { data: allCourses = [] } = useCourses();
  
  // Encontrar disciplinas liberadas (onde esta disciplina é pré-requisito)
  const unlockedCourses = useMemo(() => {
    if (!courseCode || !allCourses.length) return [];
    
    return allCourses.filter(course => {
      // Pular a própria disciplina
      if (course.code === courseCode) return false;
      
      // Simulação similar à do SectionsList
      const commonUnlocked = [
        'CALCULO1', 'CALCULO2', 'ALGORITMOS', 'PROG1', 'PROG2', 
        'ESTRUTURAS', 'BD1', 'BD2', 'REDES', 'SO'
      ];
      
      return commonUnlocked.includes(course.code) && Math.random() > 0.7;
    }).slice(0, 5);
  }, [courseCode, allCourses]);
  
  // Filtrar outras turmas (excluindo a turma atual)
  const otherSections = allSections.filter(s => s.id_ref !== section.id_ref);
  
  // Estados para controlar seções recolhíveis
  const [openPrereq, setOpenPrereq] = useState(false);
  const [openCoreq, setOpenCoreq] = useState(false);
  const [openOtherSections, setOpenOtherSections] = useState(false);
  const [openCurrentSections, setOpenCurrentSections] = useState(false); // Recolhido por padrão
  const [openUnlocked, setOpenUnlocked] = useState(false);
  
  // Função para normalizar cursos (SyncedCourse | NotSyncedCourse)
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
  
  // Componente para cabeçalho de seção recolhível
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
          {/* Turmas ofertadas para o curso - ABERTO POR PADRÃO */}
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
          
          {/* Pré-requisitos */}
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
          
          {/* Disciplinas liberadas por esta disciplina */}
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
          
          {/* Disciplinas liberadas (corequisitos) */}
          {courseDetail?.corequisites && courseDetail.corequisites.length > 0 && (
            <div className="border rounded-lg p-4 bg-muted/30">
              <SectionHeader
                title="Disciplinas liberadas por ela"
                count={courseDetail.corequisites.length}
                open={openCoreq}
                onToggle={() => setOpenCoreq(!openCoreq)}
              />
              {openCoreq && (
                <div className="pt-4 space-y-2">
                  {courseDetail.corequisites.map((coreqGroup, idx) => (
                    <div key={idx} className="space-y-1">
                      {coreqGroup.length > 1 && (
                        <p className="text-xs text-muted-foreground mb-1">Opção {idx + 1}:</p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {coreqGroup.map((coreq: any, cIdx: number) => (
                          <Badge key={cIdx} variant="outline" className="text-xs">
                            {coreq.code} {coreq.name ? `- ${coreq.name}` : ''}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Informações da turma atual */}
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
                  <span className="font-semibold text-muted-foreground">Horários:</span>
                  <p className="mt-1">
                    {Array.isArray(section.time_codes) && section.time_codes.length > 0
                      ? section.time_codes.join(', ')
                      : 'Horário não definido'}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {(() => {
                      const timeCodes = Array.isArray(section.time_codes) ? section.time_codes : [];
                      const horariosParsed = parseTimeCodes(timeCodes);
                      if (horariosParsed.length > 0) {
                        return horariosParsed.map((h, idx) => (
                          <span key={idx} className="inline-block bg-blue-100 text-blue-800 rounded px-2 py-0.5 text-xs font-mono">
                            {h.dia} {h.horarioInicio} - {h.horarioFim}
                          </span>
                        ));
                      }
                      return (
                        <span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded">Horário não informado</span>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* Informações de vagas */}
            {((section as any)?.seats_count ?? 0) > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>
                    Vagas: {(section as any)?.seats_accepted ?? 0}/{(section as any)?.seats_count ?? 0}
                  </span>
                  <span>
                    {Math.round((((section as any)?.seats_accepted ?? 0) / ((section as any)?.seats_count ?? 1)) * 100)}% preenchido
                  </span>
                </div>
                <Progress 
                  value={Math.round((((section as any)?.seats_accepted ?? 0) / ((section as any)?.seats_count ?? 1)) * 100)} 
                  className="h-2" 
                />
              </div>
            )}

            {/* Conflitos */}
            {(() => {
              const conflicts = getConflictsForSection(section);
              if (conflicts.length > 0) {
                const uniqueConflicts = conflicts.reduce((acc, conflict) => {
                  const conflictSection = conflict.section;
                  const conflictCode = (conflictSection as any)?.course?.code || (conflictSection as any)?.course_code || 'N/A';
                  if (!acc.find(c => c.code === conflictCode)) {
                    acc.push({
                      code: conflictCode,
                      name: (conflictSection as any)?.course?.name || 'Nome não disponível',
                      section: conflictSection
                    });
                  }
                  return acc;
                }, [] as Array<{ code: string; name: string; section: Section }>);

                return (
                  <div className="mt-4 pt-4 border-t border-destructive/20">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="w-5 h-5 text-destructive animate-pulse" />
                      <span className="font-semibold text-destructive">Conflitos de horário detectados:</span>
                    </div>
                    <div className="space-y-2">
                      {uniqueConflicts.map((conflict, idx) => {
                        const conflictTimeCodes = Array.isArray(conflict.section.time_codes) ? conflict.section.time_codes : [];
                        const conflictHorariosParsed = parseTimeCodes(conflictTimeCodes);
                        
                        return (
                          <div key={idx} className="p-3 bg-destructive/10 border-2 border-destructive/50 shadow-destructive/10 rounded-lg flex gap-2 items-center">
                            <span className="flex items-center px-1 py-0.5 bg-destructive text-white text-xs rounded select-none"><AlertTriangle className="w-3 h-3 mr-1"/> Conflito</span>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-destructive text-xs mb-0.5 truncate">
                                {conflict.code}
                              </div>
                              <div className="text-muted-foreground text-[10px] mb-1 truncate">
                                {conflict.name}
                              </div>
                              {conflictHorariosParsed.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-0.5">
                                  {conflictHorariosParsed.map((h, hIdx) => (
                                    <span key={hIdx} className="inline-block bg-destructive/20 text-destructive rounded px-2 py-0.5 text-xs font-mono border border-destructive/30">
                                      {h.dia} {h.horarioInicio} - {h.horarioFim}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-xs text-destructive mt-3 italic font-semibold flex gap-2 items-center">
                      <AlertTriangle className="w-4 h-4" /> Há choque de horário com outra(s) turma(s) selecionada(s).
                    </p>
                  </div>
                );
              }
              return null;
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente para exibir card de uma seção
function SectionCard({ section, isCurrentSection = false }: { section: Section; isCurrentSection?: boolean }) {
  const { toggleSection, hasSectionOnCourse, getConflictsForSection, hasSection, getSectionForCourse } = useMySections();
  const { myPrograms } = useMyPrograms();
  const myProgramTitles = new Set(myPrograms.map(p => (p.title || '').trim().toLowerCase()));
  
  // Determinar se esta é a turma atual da disciplina
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
            onClick={() => toggleSection(section)}
            className="text-xs"
          >
            {isSelected ? 'Remover' : isOtherSectionOfSameCourse ? 'Substituir' : 'Adicionar'}
          </Button>
        )}
      </div>
      
      <div className="space-y-2 text-xs">
        <div>
          <span className="font-semibold text-muted-foreground">Horários:</span>
          <div className="mt-1 flex flex-wrap gap-1">
            {horariosParsed.length > 0 ? (
              horariosParsed.map((h, idx) => (
                <span key={idx} className="inline-block bg-blue-100 text-blue-800 rounded px-2 py-0.5 text-xs font-mono">
                  {h.dia} {h.horarioInicio} - {h.horarioFim}
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

// Componente para listar as seções de uma disciplina
function SectionsList({ 
  courseCode, 
  onCourseClick,
  diasSelecionados,
  horariosSelecionados,
  diasRestritos,
  horariosRestritos
}: { 
  courseCode: string; 
  onCourseClick: (course: Course) => void;
  diasSelecionados: string[];
  horariosSelecionados: string[];
  diasRestritos: string[];
  horariosRestritos: string[];
}) {
  const { data: sections = [], isLoading } = useCourseSections(courseCode);
  const { toggleSection, hasSectionOnCourse, getConflictsForSection, hasSection, getSectionForCourse } = useMySections();
  const { myPrograms } = useMyPrograms();
  const myProgramTitles = new Set(myPrograms.map(p => (p.title || '').trim().toLowerCase()));
  
  // Filtrar turmas com base nos filtros de dias e horários
  const filteredSections = useMemo(() => {
    if (!sections.length) return sections;
    
    // Se não há filtros aplicados, retorna todas as seções
    if (diasSelecionados.length === 0 && horariosSelecionados.length === 0 && 
        diasRestritos.length === 0 && horariosRestritos.length === 0) {
      return sections;
    }

    const selectedDias = diasSelecionados
      .map(d => mapSiglaParaNome[d as keyof typeof mapSiglaParaNome])
      .filter(Boolean);
    const restrictedDias = diasRestritos
      .map(d => mapSiglaParaNome[d as keyof typeof mapSiglaParaNome])
      .filter(Boolean);
    
    return sections.filter(section => {
      const timeCodes = Array.isArray(section.time_codes) ? section.time_codes : [];
      if (timeCodes.length === 0) return true; // Se não tem horários definidos, inclui
      
      // Parse dos códigos de horário
      const horariosParsed = parseTimeCodes(timeCodes);
      
      // Verificar filtros de dias selecionados
      if (selectedDias.length > 0) {
        const temDiaSelecionado = horariosParsed.some(h => 
          selectedDias.includes(h.dia)
        );
        if (!temDiaSelecionado) return false;
      }
      
      // Verificar filtros de horários selecionados (usa horário de início)
      if (horariosSelecionados.length > 0) {
        const temHorarioSelecionado = horariosParsed.some(h => 
          horariosSelecionados.includes(h.horarioInicio)
        );
        if (!temHorarioSelecionado) return false;
      }
      
      // Verificar restrições de dias
      if (restrictedDias.length > 0) {
        const temDiaRestrito = horariosParsed.some(h => 
          restrictedDias.includes(h.dia)
        );
        if (temDiaRestrito) return false;
      }
      
      // Verificar restrições de horários (usa horário de início)
      if (horariosRestritos.length > 0) {
        const temHorarioRestrito = horariosParsed.some(h => 
          horariosRestritos.includes(h.horarioInicio)
        );
        if (temHorarioRestrito) return false;
      }
      
      return true;
    });
  }, [sections, diasSelecionados, horariosSelecionados, diasRestritos, horariosRestritos]);
  
  // Buscar detalhes da disciplina para pré-requisitos e corequisitos
  const { data: courseDetail } = useCourseByCode(courseCode);
  
  // Buscar todas as disciplinas para encontrar as que são liberadas por esta
  const { data: allCourses = [] } = useCourses();
  
  // Encontrar disciplinas liberadas (onde esta disciplina é pré-requisito)
  const unlockedCourses = useMemo(() => {
    if (!courseCode || !allCourses.length) return [];
    
    return allCourses.filter(course => {
      // Pular a própria disciplina
      if (course.code === courseCode) return false;
      
      // Por enquanto, vamos mostrar algumas disciplinas como exemplo
      // Em um cenário real, precisaríamos verificar os pré-requisitos de cada disciplina
      // Para performance, vamos limitar a algumas disciplinas comuns
      const commonUnlocked = [
        'CALCULO1', 'CALCULO2', 'ALGORITMOS', 'PROG1', 'PROG2', 
        'ESTRUTURAS', 'BD1', 'BD2', 'REDES', 'SO'
      ];
      
      return commonUnlocked.includes(course.code) && Math.random() > 0.7; // Simulação simples
    }).slice(0, 5); // Limitar a 5 disciplinas para performance
  }, [courseCode, allCourses]);
  
  // Função para normalizar cursos (SyncedCourse | NotSyncedCourse)
  const normalizeCourse = (course: any) => {
    if (typeof course === 'string') {
      return { code: course, name: course };
    }
    return {
      code: course.code || course,
      name: course.name || course.code || course
    };
  };
  
  // Estados para controlar seções recolhíveis
  const [openPrereq, setOpenPrereq] = useState(false);
  const [openCoreq, setOpenCoreq] = useState(false);
  const [openOtherSections, setOpenOtherSections] = useState(false);
  const [openUnlocked, setOpenUnlocked] = useState(false);
  
  // Componente para cabeçalho de seção recolhível
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

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (filteredSections.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Nenhuma turma disponível para esta disciplina com os filtros aplicados.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pré-requisitos */}
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
                    {prereqGroup.map((prereq, pIdx) => {
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
      
      {/* Disciplinas liberadas por esta disciplina */}
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
      
      {/* Lista de turmas disponíveis */}
      <div className="space-y-4">
        {filteredSections.map((section, index) => {
          const teachers = Array.isArray((section as any)?.teachers) 
            ? (section as any).teachers 
            : ((section as any)?.professor ? [(section as any).professor] : []);
          const timeCodes = Array.isArray(section.time_codes) ? section.time_codes : [];
          const seatsAccepted = (section as any)?.seats_accepted ?? 0;
          const seatsCount = (section as any)?.seats_count ?? 0;
          const progress = seatsCount > 0 ? Math.min(100, Math.max(0, Math.round((seatsAccepted / seatsCount) * 100))) : 0;
          const seatsRequested = (section as any)?.seats_requested ?? 0;
          const seatsRerequested = (section as any)?.seats_rerequested ?? 0;
          const competition = getCompetitionLevel(seatsCount, seatsRequested, seatsRerequested);
          const compPhase1 = getPhase1Level(seatsCount, seatsRequested);
          const compPhase2 = getPhase2Level(seatsCount, seatsAccepted, seatsRerequested);
          const isSelected = hasSection(section.id_ref);
          const conflicts = getConflictsForSection(section);
          const hasConflict = conflicts.length > 0;
          const available = Math.max(0, seatsCount - seatsAccepted);
          const isAlmostFull = available > 0 && available <= 5;
          const hasExclusive = Array.isArray((section as any)?.spots_reserved) && 
            ((section as any).spots_reserved as any[]).some((r: any) => {
              const t = ((r as any)?.program?.title || '').trim().toLowerCase();
              return t && myProgramTitles.has(t);
            });
          const reservedMine = getReservedUnfilledForTitles(section as any, myProgramTitles);
          const horariosParsed = parseTimeCodes(timeCodes);

          const currentSection = getSectionForCourse(courseCode);
          const isOtherSectionOfSameCourse = currentSection && currentSection.id_ref !== section.id_ref;
          const isActuallyCurrentSection = currentSection?.id_ref === section.id_ref;
          
          return (
            <div key={section.id_ref} className="border rounded-lg p-4 md:p-6 bg-muted/30">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="secondary" className="text-xs md:text-sm px-3 py-1">
                    {(section as any)?.section_code || `Turma ${section.id_ref}`}
                  </Badge>
                  {isActuallyCurrentSection && (
                    <Badge variant="default" className="text-xs md:text-sm px-3 py-1">
                      Turma Atual
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs md:text-sm px-3 py-1">
                    {seatsCount === 0 ? 'Sem informação' : `${seatsCount} vagas`}
                  </Badge>
                  {isSelected && (
                    <Badge variant="default" className="text-xs md:text-sm px-3 py-1">
                      Selecionada
                    </Badge>
                  )}
                                    {hasConflict && (
                    <Badge variant="destructive" className="text-xs md:text-sm px-3 py-1">
                      Conflito
                    </Badge>
                  )}
                </div>
                <Button
                  size="sm"
                  className="mt-2 md:mt-0 px-4 py-2 text-xs md:text-sm flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded shadow"
                  onClick={() => toggleSection(section)}
                  disabled={isSelected && hasConflict}
                  variant={isSelected ? "destructive" : "default"}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  {isSelected ? 'Remover' : isOtherSectionOfSameCourse ? 'Substituir' : 'Adicionar'}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div>
                    <span className="font-semibold text-muted-foreground">Docente:</span>
                    <p className="mt-1">{teachers.length > 0 ? teachers.join(', ') : 'Professor(a) não definido'}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-muted-foreground">Período:</span>
                    <p className="mt-1">{(section as any)?.period || 'Não informado'}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <span className="font-semibold text-muted-foreground">Horários:</span>
                    <p className="mt-1">{timeCodes.length > 0 ? timeCodes.join(', ') : 'Horário não definido'}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {horariosParsed.length > 0 ? (
                        horariosParsed.map((h, idx) => (
                          <span key={idx} className="inline-block bg-blue-100 text-blue-800 rounded px-2 py-0.5 text-xs font-mono">
                            {h.dia} {h.horarioInicio} - {h.horarioFim}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded">Horário não informado</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {seatsCount > 0 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Vagas: {seatsAccepted}/{seatsCount}</span>
                    <span>{progress}% preenchido</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              <div className="flex flex-wrap gap-1.5 mt-3">
                {isAlmostFull && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-600/10 text-indigo-600 inline-flex items-center gap-1">
                          <Flame className="w-3 h-3" /> Poucas Vagas
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Restam apenas {available} vagas disponíveis</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {hasExclusive && reservedMine > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary inline-flex items-center gap-1">
                          <Star className="w-3 h-3" /> Reservado ({reservedMine})
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Vagas reservadas para seu(s) curso(s)</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {competition.level === 'alta' && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-600/10 text-amber-600">
                          Alta concorrência
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Muitos alunos interessados nesta turma</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Planejador;
