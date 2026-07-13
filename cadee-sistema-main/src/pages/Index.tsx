import { useMemo, useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useMySections } from '@/hooks/useMySections';
import { MainLayout } from '@/components/layout/MainLayout';
import { useMyPrograms } from '@/hooks/useMyPrograms';
import { ScheduleGrid } from '@/components/planner/ScheduleGrid';
import { ScheduleSummary } from '@/components/planner/ScheduleSummary';
import { MobileSchedule } from '@/components/planner/MobileSchedule';
import { useIsMobile } from '@/hooks/use-mobile';
import { Calendar, BookOpen, BarChart3, X, Sparkles, Settings, GraduationCap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ProgressView } from '@/components/progress/ProgressView';
import { AnimatePresence, motion } from 'framer-motion';
import { useMode } from '@/hooks/useMode';

const Index = () => {
  const { completedDisciplines } = useApp();
  const { mySections } = useMySections();
  const { myPrograms } = useMyPrograms();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<'schedule' | 'progress'>('schedule');
  const { mode, setMode, isFull, isSimplified } = useMode();
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  useEffect(() => {
    const hasVisited = localStorage.getItem('firstVisit');
    if (!hasVisited) {
      setShowWelcomeModal(true);
    }
  }, []);

  // Get unique scheduled disciplines
  const scheduledCount = useMemo(() => {
    const unique = new Set(mySections.map(s => (s as any)?.course?.code || (s as any)?.course_code));
    unique.delete(undefined as unknown as string);
    return unique.size;
  }, [mySections]);

  // Calculate total workload
  const totalWorkload = useMemo(() => {
    return mySections.reduce((sum, section) => {
      const workload = (section as any)?.course?.workload || (section as any)?.workload || 0;
      return sum + (Number(workload) || 0);
    }, 0);
  }, [mySections]);

  const renderTabContent = () => {
    if (activeTab === 'progress') {
      return <ProgressView />;
    }

    // Schedule view (default) - Sem grade, apenas resumo
    return <ScheduleSummary />;
  };

  return (
    <MainLayout>
      <div className="p-6 max-w-7xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {activeTab === 'schedule' ? 'Resumo do Semestre' : 'Meu Progresso'}
              </h1>
              {myPrograms.length > 0 && (
                <div className="flex items-center gap-2 text-muted-foreground text-sm mt-1">
                  <GraduationCap className="w-4 h-4" />
                  <span>UFBA • {myPrograms[0]?.title || 'Seu Curso'} • Noturno</span>
                </div>
              )}
            </div>
            
            {/* Tabs */}
            <div className="inline-flex items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground">
              <button
                onClick={() => setActiveTab('schedule')}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
                  activeTab === 'schedule' 
                    ? 'bg-background text-foreground shadow' 
                    : 'hover:bg-background/50 hover:text-foreground'
                }`}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Grade
              </button>
              <button
                onClick={() => setActiveTab('progress')}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
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

        {/* Quick Stats - Only show on schedule tab */}
        {activeTab === 'schedule' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <BookOpen className="w-4 h-4" />
                <span className="text-xs">Disciplinas</span>
              </div>
              <p className="text-2xl font-bold text-card-foreground">{scheduledCount}</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Calendar className="w-4 h-4" />
                <span className="text-xs">Carga Horária</span>
              </div>
              <p className="text-2xl font-bold text-card-foreground">{totalWorkload}h</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <span className="text-xs">Cursadas</span>
              </div>
              <p className="text-2xl font-bold text-success">{completedDisciplines.length}</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-4">
              <Link to="/planejador" className="text-xs text-primary hover:underline flex items-center">
                {activeTab === 'schedule' ? 'Editar Grade' : 'Ver Grade'}
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1">
                  <path d="M5 12h14"/>
                  <path d="m12 5 7 7-7 7"/>
                </svg>
              </Link>
            </div>
          </div>
        )}

        {/* Tab Content */}
        {renderTabContent()}
      </div>

      {/* Modal de Boas-Vindas (primeira visita) */}
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
                    <p className="text-sm text-muted-foreground">Seu planejador semestral inteligente</p>
                  </div>
                </div>
                <button onClick={() => setShowWelcomeModal(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 mb-6">
                <p className="text-sm text-foreground leading-relaxed">
                  O CADEE te ajuda a montar sua grade de horários de forma visual e inteligente. 
                  Compare turmas, veja conflitos em tempo real e planeje seu semestre com tranquilidade.
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
