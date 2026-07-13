import { ProgressCard } from './ProgressCard';
import { AdvancedSemesterGrid } from './AdvancedSemesterGrid';
import { useApp } from '@/contexts/AppContext';
import { useMyPrograms } from '@/hooks/useMyPrograms';
import { useMyCourses } from '@/hooks/useMyCourses';
import { fetchProgramDetail, type ProgramDetail } from '@/services/api';
import { parseCompleteHistory, type WorkloadData } from '@/utils/historyParser';
import { GraduationCap, BookOpen, Clock, Info, Upload, X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AnimatePresence, motion } from 'framer-motion';
import { useState, useEffect, useMemo } from 'react';

export function ProgressView() {
  const { completedDisciplines, toggleCompletedDiscipline } = useApp();
  const { myPrograms } = useMyPrograms();
  const { courses, isLoading: coursesLoading } = useMyCourses();
  
  // Estados para importação de histórico
  const [showImportModal, setShowImportModal] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [hasDismissedWelcome, setHasDismissedWelcome] = useState(false);
  const [importText, setImportText] = useState('');
  const [parsedCodes, setParsedCodes] = useState<string[]>([]);
  const [parsedSemesters, setParsedSemesters] = useState<Map<string, { approved: number, failed: number, dropped: number, notDone: number }>>(new Map());
  const [parsedWorkload, setParsedWorkload] = useState<WorkloadData | null>(null);
  const [disciplinesBySemester, setDisciplinesBySemester] = useState<Map<string, { approved: string[], total: string[] }>>(new Map());
  const [importError, setImportError] = useState<string>('');
  const [isParsing, setIsParsing] = useState(false);
  
  // Estado para dados do programa
  const [programDetail, setProgramDetail] = useState<ProgramDetail | null>(null);
  const [loadingProgram, setLoadingProgram] = useState(false);
  const [courseLevels, setCourseLevels] = useState<string[]>([]); // Níveis/semestres do curso

  // Função para extrair níveis únicos das disciplinas
  const extractCourseLevels = (coursesList: any[]) => {
    if (!coursesList || !Array.isArray(coursesList)) return [];
    
    const levels = new Set<string>();
    coursesList.forEach(course => {
      if (course.level && course.type !== 'OPT' && course.type !== 'OPTATIVO') {
        levels.add(course.level);
      }
    });
    
    return Array.from(levels).sort((a, b) => {
      // Ordena numericamente: "1º Período", "2º Período", etc.
      const aNum = parseInt(a.match(/(\d+)/)?.[1] || '0');
      const bNum = parseInt(b.match(/(\d+)/)?.[1] || '0');
      return aNum - bNum;
    });
  };

  // Carregar níveis do curso quando as disciplinas carregarem
  useEffect(() => {
    if (courses && courses.length > 0) {
      const levels = extractCourseLevels(courses);
      setCourseLevels(levels);
    }
  }, [courses]);

  // Carregar dados salvos do localStorage ao iniciar
  useEffect(() => {
    const savedData = localStorage.getItem('progressData');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setParsedCodes(parsed.codes || []);
        setParsedSemesters(new Map(parsed.semesters || []));
        setParsedWorkload(parsed.workload || null);
        setDisciplinesBySemester(new Map(parsed.disciplinesBySemester || []));
      } catch (error) {
        console.error('Erro ao carregar dados do localStorage:', error);
      }
    }
  }, []);

  // Salvar dados no localStorage sempre que forem atualizados
  useEffect(() => {
    const dataToSave = {
      codes: parsedCodes,
      semesters: Array.from(parsedSemesters.entries()),
      workload: parsedWorkload,
      disciplinesBySemester: Array.from(disciplinesBySemester.entries())
    };
    localStorage.setItem('progressData', JSON.stringify(dataToSave));
  }, [parsedCodes, parsedSemesters, parsedWorkload, disciplinesBySemester]);

  // Função para limpar todos os dados salvos
  const clearSavedData = () => {
    localStorage.removeItem('progressData');
    setParsedCodes([]);
    setParsedSemesters(new Map());
    setParsedWorkload(null);
    setDisciplinesBySemester(new Map());
    setImportText('');
    setImportError('');
  };

  const handleParseImport = (text: string) => {
    setImportError('');
    const result = parseCompleteHistory(text);
    
    setParsedCodes(result.codes);
    setParsedSemesters(result.semesters);
    setParsedWorkload(result.workload);
    setDisciplinesBySemester(result.disciplinesBySemester);
    setImportText(text);
    
    if (result.codes.length === 0 && !result.workload) {
      setImportError('Não foi possível encontrar disciplinas com status aprovado ou tabela de carga horária. Confira o texto ou tente outro arquivo.');
    }
  };
  
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsParsing(true);
    setImportError('');
    
    try {
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        const pdfjs = await import('pdfjs-dist');
        const { getDocument, GlobalWorkerOptions } = pdfjs as any;
        
        // Configurar o worker corretamente para Vite
        const workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
        GlobalWorkerOptions.workerSrc = workerSrc;

        const data = await file.arrayBuffer();
        const pdf = await getDocument({ 
          data,
          // Desabilitar worker para evitar problemas de CORS
          disableWorker: true,
        }).promise;
        
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const strings = content.items.map((item: any) => item.str || '').join(' ');
          fullText += strings + '\n';
        }
        
        handleParseImport(fullText);
      } else {
        const text = await file.text();
        handleParseImport(text);
      }
    } catch (err) {
      console.error('Erro ao processar PDF:', err);
      setImportError('Não foi possível ler o PDF. Tente copiar e colar o texto do histórico como alternativa.');
    } finally {
      setIsParsing(false);
      if (event.target) event.target.value = '';
    }
  };
  
  const handleApplyImport = () => {
    if (parsedCodes.length === 0 && !parsedWorkload) {
      setImportError('Nenhum código aprovado ou dados de carga horária encontrados para aplicar.');
      return;
    }
    
    // Aplicar códigos ao contexto global
    parsedCodes.forEach(code => {
      if (!completedDisciplines.includes(code)) {
        toggleCompletedDiscipline(code);
      }
    });
    
    // Resetar o estado de dispensado do modal já que agora tem dados
    setHasDismissedWelcome(false);
    
    // Manter os dados de carga horária extraídos para uso nas métricas
    // parsedWorkload já está no estado, não precisa limpar aqui
    
    setShowImportModal(false);
    // Não limpar os dados parseados para que possam ser usados nas métricas
    setImportText('');
    setImportError('');
  };
  
  // Carregar dados do programa quando houver programas selecionados
  useEffect(() => {
    const loadProgramDetail = async () => {
      if (myPrograms.length > 0) {
        setLoadingProgram(true);
        try {
          const program = myPrograms[0]; // Usar o primeiro programa selecionado
          if (program.detail_url) {
            const detail = await fetchProgramDetail(program.detail_url);
            setProgramDetail(detail);
          }
        } catch (error) {
          console.error('Erro ao carregar detalhes do programa:', error);
        } finally {
          setLoadingProgram(false);
        }
      }
    };

    loadProgramDetail();
  }, [myPrograms]);

  // Determinar se há dados importados (considera workload ou códigos/semestres carregados do histórico)
  const hasImportedData = !!parsedWorkload || parsedCodes.length > 0 || parsedSemesters.size > 0;

  // Mostrar modal de boas-vindas se não houver dados importados e usuário não tiver dispensado
  useEffect(() => {
    // Só mostra o modal se não tiver dados importados E não tiver dispensado anteriormente
    if (!hasImportedData && !hasDismissedWelcome) {
      // Pequeno delay para garantir que os dados do localStorage foram carregados
      const timer = setTimeout(() => {
        if (!hasImportedData && !hasDismissedWelcome) {
          setShowWelcomeModal(true);
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [hasImportedData, hasDismissedWelcome]);

  // Calcular métricas baseadas apenas no histórico importado
  const calculateProgressMetrics = () => {
    // Se tiver dados de carga horária do histórico, usa esses dados
    if (parsedWorkload) {
      return {
        totalHours: parsedWorkload.total.completed,
        mandatory: {
          completed: parsedWorkload.mandatory.completed,
          total: parsedWorkload.mandatory.required
        },
        electives: {
          completed: parsedWorkload.elective.completed,
          total: parsedWorkload.elective.required
        },
        complementary: {
          completed: parsedWorkload.complementary.completed,
          total: parsedWorkload.complementary.required
        },
        totalSemesters: parsedSemesters.size || 8
      };
    }

    // Se não tiver dados do histórico, retorna valores zerados
    return {
      totalHours: 0,
      mandatory: { completed: 0, total: 0 },
      electives: { completed: 0, total: 0 },
      complementary: { completed: 0, total: 0 },
      totalSemesters: 8
    };
  };

  const progressData = useMemo(() => calculateProgressMetrics(), [parsedWorkload, parsedSemesters]);

  const totalRequiredHours = progressData.mandatory.total + progressData.electives.total + progressData.complementary.total;
  const overallProgress = totalRequiredHours > 0 
    ? (progressData.totalHours / totalRequiredHours) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header with program info */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Progresso</h1>
          </div>
          <div className="flex items-center gap-2">
            {hasImportedData && (
              <button
                onClick={() => {
                  if (confirm('Tem certeza que deseja limpar todos os dados importados?')) {
                    clearSavedData();
                  }
                }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-medium hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/20 sm:flex hidden"
              >
                <X className="w-3.5 h-3.5" />
                <span>Limpar dados</span>
              </button>
            )}
            <button
              onClick={() => setShowImportModal(true)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted ${
                hasImportedData ? 'p-1.5 sm:p-2 sm:px-3' : ''
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              {hasImportedData && <span className="hidden sm:inline">Importar histórico</span>}
            </button>
            {hasImportedData && (
              <button
                onClick={() => {
                  if (confirm('Tem certeza que deseja limpar todos os dados importados?')) {
                    clearSavedData();
                  }
                }}
                className="inline-flex items-center gap-2 px-2 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-medium hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/20 sm:hidden"
              >
                <X className="w-3.5 h-3.5" />
                <span>Limpar</span>
              </button>
            )}
          </div>
        </div>
        
        {/* Aviso sobre necessidade de importar histórico */}
        {!hasImportedData && (
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">i</span>
              </div>
              <div className="text-sm">
                <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">
                  Importe seu histórico acadêmico
                </p>
                <p className="text-blue-700 dark:text-blue-300">
                  Para visualizar seu progresso no curso, 
                  <button 
                    onClick={() => {
                      setShowWelcomeModal(false);
                      setShowImportModal(true);
                    }}
                    className="underline font-medium hover:text-blue-800 dark:hover:text-blue-100 ml-1"
                  >
                    importe seu histórico acadêmico
                  </button>.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Overall Progress */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">Progresso Geral</h2>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs max-w-[200px]">Progresso total baseado nas horas cursadas em relação às horas exigidas do curso.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-foreground">
              {overallProgress.toFixed(2)}%
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
          <span>{progressData.totalHours} / {totalRequiredHours} horas</span>
        </div>
        <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-green-500 rounded-full transition-all duration-500"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      {/* Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ProgressCard 
          title="Obrigatórias" 
          current={progressData.mandatory.completed} 
          total={progressData.mandatory.total}
          showInfo
          infoText="Horas de disciplinas obrigatórias do curso."
        />
        <ProgressCard 
          title="Optativas" 
          current={progressData.electives.completed} 
          total={progressData.electives.total}
          showInfo
          infoText="Horas de disciplinas optativas."
        />
        <ProgressCard 
          title="Complementares" 
          current={progressData.complementary.completed} 
          total={progressData.complementary.total}
          showInfo
          infoText="Horas de atividades complementares."
        />
      </div>

      {/* Stats - Movido para antes do Progresso por Semestre para mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-lg border border-border p-4 flex items-center gap-3">
          <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/50">
            <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Disciplinas Cursadas</p>
            <p className="text-xl font-semibold">{completedDisciplines.length}</p>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3.5 h-3.5 text-muted-foreground ml-auto" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs max-w-[200px]">Total de disciplinas que você marcou como concluídas na tela Disciplinas.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <div className="bg-card rounded-lg border border-border p-4 flex items-center gap-3">
          <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/50">
            <Clock className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Horas Concluídas</p>
            <p className="text-xl font-semibold">{progressData.totalHours}</p>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3.5 h-3.5 text-muted-foreground ml-auto" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs max-w-[200px]">Total de horas cursadas com base no histórico acadêmico importado.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <div className="bg-card rounded-lg border border-border p-4 flex items-center gap-3">
          <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/50">
            <GraduationCap className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Semestres</p>
            <p className="text-xl font-semibold">{courseLevels.length}</p>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3.5 h-3.5 text-muted-foreground ml-auto" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs max-w-[200px]">Total de semestres/períodos do seu curso baseado na estrutura curricular.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Advanced Semester Grid */}
      <AdvancedSemesterGrid 
        courses={courses}
        completedDisciplines={completedDisciplines}
        courseLevels={courseLevels}
        showInfo
        infoText="Progresso real por semestre baseado nas disciplinas obrigatórias do curso e nas que você já concluiu."
      />

      {/* Aproveitamento Section */}
      <div className="bg-card rounded-lg border border-border p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-foreground">Aproveitamento</h3>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3.5 h-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs max-w-[250px]">Visualização detalhada do aproveitamento por semestre cursado, mostrando disciplinas aprovadas, reprovadas, trancadas e não cursadas.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        
        <div className="space-y-3">
          {/* Semestres cursados com aproveitamento real */}
          {Array.from(parsedSemesters.entries())
            .sort(([a], [b]) => a.localeCompare(b)) // Ordenar por semestre
            .map(([semester, data]) => {
              const total = data.approved + data.failed + data.dropped + data.notDone;
              
              return (
                <div key={semester} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{semester}</span>
                    <span className="text-muted-foreground">
                      {data.approved}/{total} disciplinas
                    </span>
                  </div>
                  <div className="grid grid-cols-8 gap-1">
                    {Array.from({ length: total }).map((_, index) => {
                      let colorClass: string;
                      let title: string;
                      
                      if (index < data.approved) {
                        colorClass = 'bg-green-500';
                        title = 'Aprovação';
                      } else if (index < data.approved + data.failed) {
                        colorClass = 'bg-red-500';
                        title = 'Reprovação';
                      } else if (index < data.approved + data.failed + data.dropped) {
                        colorClass = 'bg-gray-700';
                        title = 'Trancamento';
                      } else {
                        colorClass = 'bg-gray-300';
                        title = 'Não feito';
                      }
                      
                      return (
                        <div 
                          key={index}
                          className={`h-4 rounded-sm ${colorClass}`}
                          title={title}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          
          {/* Se não tiver dados importados, mostrar vazio para usuário novo */}
          {parsedSemesters.size === 0 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <GraduationCap className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-2">Nenhum dado de aproveitamento encontrado</p>
              <p className="text-sm text-muted-foreground">Importe seu histórico para visualizar seu aproveitamento por semestre</p>
            </div>
          )}
          
          {/* Estatísticas gerais */}
          <div className="pt-3 border-t border-border">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-sm" />
                <span className="text-muted-foreground">Aprovação/Dispensa</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-sm" />
                <span className="text-muted-foreground">Reprovação</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-700 rounded-sm" />
                <span className="text-muted-foreground">Trancamento</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-300 rounded-sm" />
                <span className="text-muted-foreground">Não feito</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Boas-vindas/Importação Obrigatória */}
      <AnimatePresence>
        {showWelcomeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowWelcomeModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ duration: 0.18 }}
              className="w-full max-w-md bg-card rounded-2xl shadow-xl border border-border/60 p-6 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    Bem-vindo à tela de Progresso
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Para visualizar seu progresso acadêmico com dados precisos, 
                    você precisa importar seu histórico acadêmico.
                  </p>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-2">
                    📊 O que será extraído:
                  </div>
                  <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                    <div>• Horas obrigatórias concluídas</div>
                    <div>• Horas optativas concluídas</div>
                    <div>• Horas complementares concluídas</div>
                    <div>• Semestres cursados</div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setShowWelcomeModal(false);
                      setHasDismissedWelcome(true);
                    }}
                    className="flex-1 px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-muted"
                  >
                    Agora não
                  </button>
                  <button
                    onClick={() => {
                      setShowWelcomeModal(false);
                      setShowImportModal(true);
                    }}
                    className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
                  >
                    Importar histórico
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Importar Histórico */}
      <AnimatePresence>
        {showImportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowImportModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ duration: 0.18 }}
              className="w-full max-w-2xl bg-card rounded-2xl shadow-xl border border-border/60 p-6 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Upload className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-foreground">Importar histórico para progresso</p>
                    <p className="text-sm text-muted-foreground">
                      Envie o PDF ou cole o texto do histórico para calcular seu progresso real no curso.
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowImportModal(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2 px-4 py-3 border rounded-lg cursor-pointer hover:bg-muted">
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">Selecionar PDF</span>
                  <input type="file" accept=".pdf,text/plain" className="hidden" onChange={handleFileChange} />
                </label>

                <textarea
                  className="w-full min-h-[140px] rounded-lg border border-border bg-background p-3 text-sm"
                  placeholder="Cole aqui o texto do histórico (Ctrl+A, Ctrl+C no PDF aberto)"
                  value={importText}
                  onChange={(e) => handleParseImport(e.target.value)}
                />

                {isParsing && <p className="text-sm text-muted-foreground">Lendo PDF...</p>}
                {importError && <p className="text-sm text-destructive">{importError}</p>}

                {/* Métricas de Progresso do Curso - só mostra quando há dados importados */}
                {(parsedWorkload || parsedCodes.length > 0) && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-foreground">
                      Métricas do Curso
                    </p>
                    
                    {/* Se encontrou dados de carga horária do histórico, mostra os dados reais */}
                    {parsedWorkload ? (
                      <div className="space-y-3">
                        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                          <div className="text-xs text-green-600 dark:text-green-400 font-medium mb-2">
                            Dados Extraídos do Histórico
                          </div>
                          <div className="grid grid-cols-1 gap-3">
                            {/* Obrigatórias */}
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Obrigatórias:</span>
                              <div className="text-right">
                                <span className="text-lg font-bold text-blue-700 dark:text-blue-300">
                                  {parsedWorkload.mandatory.completed}h
                                </span>
                                <span className="text-xs text-muted-foreground ml-1">
                                  / {parsedWorkload.mandatory.required}h
                                </span>
                              </div>
                            </div>
                            
                            {/* Optativas */}
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Optativas:</span>
                              <div className="text-right">
                                <span className="text-lg font-bold text-purple-700 dark:text-purple-300">
                                  {parsedWorkload.elective.completed}h
                                </span>
                                <span className="text-xs text-muted-foreground ml-1">
                                  / {parsedWorkload.elective.required}h
                                </span>
                              </div>
                            </div>
                            
                            {/* Complementares */}
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-green-700 dark:text-green-300">Complementares:</span>
                              <div className="text-right">
                                <span className="text-lg font-bold text-green-700 dark:text-green-300">
                                  {parsedWorkload.complementary.completed}h
                                </span>
                                <span className="text-xs text-muted-foreground ml-1">
                                  / {parsedWorkload.complementary.required}h
                                </span>
                              </div>
                            </div>
                            
                            {/* Total */}
                            <div className="border-t pt-2 mt-2">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-semibold text-foreground">Total:</span>
                                <div className="text-right">
                                  <span className="text-xl font-bold text-foreground">
                                    {parsedWorkload.total.completed}h
                                  </span>
                                  <span className="text-sm text-muted-foreground ml-1">
                                    / {parsedWorkload.total.required}h
                                  </span>
                                </div>
                              </div>
                              {/* Barra de progresso real */}
                              <div className="mt-2">
                                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-green-500 rounded-full transition-all duration-500"
                                    style={{ width: `${Math.round((parsedWorkload.total.completed / parsedWorkload.total.required) * 100)}%` }}
                                  />
                                </div>
                                <div className="text-xs text-muted-foreground mt-1 text-right">
                                  {Math.round((parsedWorkload.total.completed / parsedWorkload.total.required) * 100)}% concluído
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Se não encontrou dados de carga horária, mostra estimativa baseada em disciplinas */
                      <div className="space-y-3">
                        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                          <div className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-2">
                            Estimativa Baseada em Disciplinas
                          </div>
                          <div className="text-xs text-amber-700 dark:text-amber-300 mb-2">
                            Tabela de carga horária não encontrada. Calculando com base nas disciplinas aprovadas.
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                            <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">
                              Horas Obrigatórias
                            </div>
                            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                              {Math.floor(parsedCodes.length * 0.7 * 60)}h
                            </div>
                          </div>
                          
                          <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
                            <div className="text-xs text-purple-600 dark:text-purple-400 font-medium mb-1">
                              Horas Optativas
                            </div>
                            <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                              {Math.floor(parsedCodes.length * 0.2 * 60)}h
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                            <div className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">
                              Horas Complementares
                            </div>
                            <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                              {Math.floor(parsedCodes.length * 0.1 * 60)}h
                            </div>
                          </div>
                        </div>

                        {/* Taxa de Aproveitamento */}
                        {parsedCodes.length > 0 && (
                          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                            <div className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-1">
                              Aproveitamento Estimado
                            </div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                                {Math.round((parsedCodes.length / (parsedSemesters.size * 6 || 1)) * 100)}%
                              </span>
                              <span className="text-xs text-amber-600 dark:text-amber-400">
                                ({parsedCodes.length} disciplinas em {parsedSemesters.size} semestres)
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    // Mantém dados já importados; limpa apenas campos temporários
                    setImportText('');
                    setImportError('');
                  }}
                  className="px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleApplyImport}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90"
                  disabled={isParsing}
                >
                  Aplicar e calcular progresso
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
