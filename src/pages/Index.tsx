import { useMemo, useState, useEffect } from 'react';
import { useMySections } from '@/hooks/useMySections';
import { MainLayout } from '@/components/layout/MainLayout';
import { useMyPrograms } from '@/hooks/useMyPrograms';
import { useMyCourses } from '@/hooks/useMyCourses';
import { ScheduleSummary } from '@/components/planner/ScheduleSummary';
import { useCurrentTerm } from '@/hooks/useCurrentTerm';
import { useSemesterTransition } from '@/hooks/useSemesterTransition';
import { Calendar, BookOpen, BarChart3, X, Sparkles, GraduationCap, Clock, AlertTriangle, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ProgressView } from '@/components/progress/ProgressView';
import { AnimatePresence, motion } from 'framer-motion';
import { useMode } from '@/hooks/useMode';
import { sumWorkloadByCategory } from '@/lib/semester';

const Index = () => {
  const { mySections } = useMySections();
  const { myPrograms } = useMyPrograms();
  const { courses } = useMyCourses();
  const { currentTerm } = useCurrentTerm();
  const { pendingTransition, planningTerm, canAdvance, advanceToNewSemester, unresolvedCodes } = useSemesterTransition();
  const [activeTab, setActiveTab] = useState<'schedule' | 'progress'>('schedule');
  const { setMode, isFull, isSimplified } = useMode();
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [hasImportedHistory, setHasImportedHistory] = useState(false);

  useEffect(() => {
    const hasVisited = localStorage.getItem('firstVisit');
    if (!hasVisited) {
      setShowWelcomeModal(true);
    }
  }, []);

  useEffect(() => {
    const savedData = localStorage.getItem('progressData');
    setHasImportedHistory(!!savedData);
  }, []);

  const coursesByCode = useMemo(
    () => new Map(courses.map((c) => [c.code, c])),
    [courses]
  );

  const plannedDisciplines = useMemo(() => {
    const unique = new Map<string, typeof mySections[0]>();
    for (const s of mySections) {
      const code = s.course?.code || (s as { course_code?: string }).course_code;
      if (code) unique.set(code, s);
    }
    return [...unique.entries()];
  }, [mySections]);

  const scheduledCount = plannedDisciplines.length;

  const workloadBreakdown = useMemo(() => {
    const plannedCourses = plannedDisciplines
      .map(([code]) => coursesByCode.get(code))
      .filter((c): c is NonNullable<typeof c> => !!c);
    const byCategory = sumWorkloadByCategory(plannedCourses);
    return {
      mandatory: byCategory.mandatory,
      elective: byCategory.elective,
      complementary: byCategory.complementary,
      total: byCategory.mandatory + byCategory.elective + byCategory.complementary,
    };
  }, [plannedDisciplines, coursesByCode]);

  const renderTabContent = () => {
    if (activeTab === 'progress') {
      return <ProgressView />;
    }
    return <ScheduleSummary />;
  };

  return (
    <MainLayout>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                  {activeTab === 'schedule' ? 'Controle do Semestre' : 'Meu Progresso'}
                </h1>
                {currentTerm && activeTab === 'schedule' && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                    {pendingTransition ? planningTerm : currentTerm}
                  </span>
                )}
              </div>
              {myPrograms.length > 0 && (
                <div className="flex items-center gap-2 text-muted-foreground text-sm mt-1">
                  <GraduationCap className="w-4 h-4 shrink-0" />
                  <span className="truncate">UFBA • {myPrograms[0]?.title || 'Seu Curso'}</span>
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="inline-flex items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground w-full sm:w-auto">
              <button
                onClick={() => setActiveTab('schedule')}
                className={`flex-1 sm:flex-none inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                  activeTab === 'schedule'
                    ? 'bg-background text-foreground shadow'
                    : 'hover:bg-background/50 hover:text-foreground'
                }`}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Planejamento
              </button>
              <button
                onClick={() => setActiveTab('progress')}
                className={`flex-1 sm:flex-none inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                  activeTab === 'progress'
                    ? 'bg-background text-foreground shadow'
                    : 'hover:bg-background/50 hover:text-foreground'
                }`}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Progresso
              </button>
            </div>
          </div>
        </div>

        {/* Dashboard do semestre atual */}
        {activeTab === 'schedule' && (
          <>
            {pendingTransition && (
              <div className="mb-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                      Novo semestre {currentTerm} disponível
                    </p>
                    <p className="text-xs text-amber-800 dark:text-amber-200 mt-1">
                      Finalize a grade do semestre {planningTerm}: remova as turmas ou marque o resultado de cada disciplina.
                      {unresolvedCodes.length > 0 && (
                        <> Faltam <strong>{unresolvedCodes.length}</strong> disciplina{unresolvedCodes.length > 1 ? 's' : ''}.</>
                      )}
                    </p>
                    {canAdvance && (
                      <button
                        onClick={advanceToNewSemester}
                        className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90"
                      >
                        Iniciar semestre {currentTerm}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {isFull && !hasImportedHistory && (
              <div className="mb-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 p-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                      Importe seu histórico escolar
                    </p>
                    <p className="text-xs text-blue-800 dark:text-blue-200 mt-1">
                      Para aproveitar ao máximo a experiência completa, vá até a tela de Progresso e importe seu histórico do SIGAA para acompanhar seu progresso e pré-requisitos automaticamente.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
              <div className="bg-card rounded-xl border border-border p-3 sm:p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <BookOpen className="w-4 h-4 shrink-0" />
                  <span className="text-xs">Disciplinas Planejadas</span>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-card-foreground">{scheduledCount}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">na grade do semestre</p>
              </div>

              <div className="bg-card rounded-xl border border-border p-3 sm:p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span className="text-xs">Carga Horária</span>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-card-foreground">{workloadBreakdown.total}h</p>
                <div className="mt-1.5 space-y-0.5">
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    <span className="font-semibold text-blue-600 dark:text-blue-400">{workloadBreakdown.mandatory}h</span>
                    {' '}obrigatórias
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    <span className="font-semibold text-purple-600 dark:text-purple-400">{workloadBreakdown.elective}h</span>
                    {' '}optativas
                  </p>
                  {workloadBreakdown.complementary > 0 && (
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      <span className="font-semibold text-green-600 dark:text-green-400">{workloadBreakdown.complementary}h</span>
                      {' '}complementares
                    </p>
                  )}
                </div>
              </div>
            </div>

            {scheduledCount === 0 ? (
              <div className="bg-card rounded-xl border border-dashed border-border p-8 text-center">
                <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <Plus className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Nenhuma disciplina planejada</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                  Adicione disciplinas no Planejador para montar sua grade do semestre {currentTerm || 'atual'}.
                </p>
                <Link
                  to="/planejador"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90"
                >
                  Ir para o Planejador
                </Link>
              </div>
            ) : (
              !pendingTransition && (
              <div className="mb-4 flex justify-end">
                <Link
                  to="/planejador"
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                >
                  Editar grade no Planejador
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </Link>
              </div>
              )
            )}
          </>
        )}

        {renderTabContent()}
      </div>

      {/* Modal de Boas-Vindas */}
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
              className="w-full max-w-md bg-card rounded-2xl shadow-xl border border-border/60 p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-foreground">Bem-vindo ao CADEE!</p>
                    <p className="text-sm text-muted-foreground">Seu controle de planejamento semestral</p>
                  </div>
                </div>
                <button onClick={() => setShowWelcomeModal(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 mb-6">
                <p className="text-sm text-foreground leading-relaxed">
                  O CADEE te ajuda a montar e acompanhar sua grade do semestre {currentTerm || 'atual'}.
                  Planeje disciplinas, acompanhe carga horária e marque resultados ao final do período.
                </p>
                {isFull && (
                  <p className="text-sm text-muted-foreground">
                    No modo completo, você também pode gerenciar sua formação: registrar disciplinas já cursadas,
                    acompanhar seu progresso e planejar os semestres futuros.
                  </p>
                )}
              </div>

              <div className="flex gap-3 justify-end">
                {isSimplified && (
                  <button
                    onClick={() => {
                      setMode('full');
                      setShowWelcomeModal(false);
                      localStorage.setItem('firstVisit', 'true');
                    }}
                    className="px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-muted"
                  >
                    Mudar para modo completo
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowWelcomeModal(false);
                    localStorage.setItem('firstVisit', 'true');
                  }}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90"
                >
                  Continuar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </MainLayout>
  );
};

export default Index;
