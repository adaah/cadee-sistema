import { X, Check, ChevronDown, ChevronUp, Clock, Star } from 'lucide-react';
import { Course, parseSigaaSchedule } from '@/services/api';
import type { Section } from '@/services/api';
import { useCourseSections, useCourseByCode, useCourses } from '@/hooks/useApi';
import { useApp } from '@/contexts/AppContext';
import { useMySections } from '@/hooks/useMySections';
import { cn, getFreeSeats } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useFavoriteCourses } from '@/hooks/useFavoriteCourses';
import { useEffect, useRef, useState } from 'react';
import { LargeDisciplineCard } from '@/components/disciplines/LargeDisciplineCard';
import { SectionCard } from '@/components/disciplines/SectionCard';
import { BreadcrumbTags } from '@/components/disciplines/BreadcrumbTags';
import { Badge } from '@/components/ui/badge';
import { motion, useAnimationControls } from 'motion/react';
import { FavoriteButton } from '@/components/common/FavoriteButton';
// Extracted component to keep identity stable across renders
function CompletedButton({
  completed,
  onClick,
  onRestrictedAction,
  course,
  isAvailable,
  isBlocked,
}: { 
  completed: boolean; 
  onClick: () => void;
  onRestrictedAction?: (type: 'completed' | 'favorite', course: Course) => void;
  course?: Course;
  isAvailable?: boolean;
  isBlocked?: boolean;
}) {
  const controls = useAnimationControls();
  const didMount = useRef(false);

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return; // avoid animating on first mount
    }
    // Refined symmetric elastic: expand horizontally from center, slight vertical counter-stretch
    const scaleX = [1, 1.18, 0.92, 1.06, 1];
    const scaleY = [1, 0.92, 1.06, 0.98, 1];
    controls.start({
      scaleX,
      scaleY,
      transition: {
        duration: 0.6,
        times: [0, 0.35, 0.6, 0.85, 1],
        ease: [0.22, 1, 0.36, 1],
      },
    });
  }, [completed, controls]);

  const handleClick = () => {
    // Se já está cursada, permite desmarcar diretamente
    if (completed) {
      onClick();
    } else if (onRestrictedAction && course) {
      // Se não está cursada, verifica se está bloqueada
      onRestrictedAction('completed', course);
    } else {
      onClick();
    }
  };

  return (
    <motion.button
      onClick={handleClick}
      animate={controls}
      whileHover={{ scale: 1.02 }}
      className={cn(
        'mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium origin-center transform-gpu will-change-transform',
        completed 
          ? 'bg-success text-success-foreground' 
          : isAvailable
          ? 'bg-warning/10 text-warning border border-warning/30 hover:bg-warning/20'
          : isBlocked
          ? 'dark:bg-gray-700 dark:text-gray-300 bg-gray-200 text-gray-600 border border-gray-400'
          : 'bg-muted text-muted-foreground hover:bg-muted/80',
      )}
    >
      {completed ? (
        <Check className="w-4 h-4" />
      ) : (
        <span className="block w-4 h-4 rounded-full border border-current" />
      )}
      <span>{completed ? 'Cursada' : 'Marcar como cursada'}</span>
    </motion.button>
  );
}

interface DisciplineDetailProps {
  discipline: Course;
  onClose: () => void;
  onRestrictedAction?: (type: 'completed' | 'favorite', course: Course) => void;
}

export function DisciplineDetail({ discipline, onClose, onRestrictedAction }: DisciplineDetailProps) {
  const { completedDisciplines, toggleCompletedDiscipline } = useApp();
  const { mySections, toggleSection } = useMySections();
  // Estado local para navegação dentro do drawer
  const [stack, setStack] = useState<{ code: string }[]>([{ code: discipline.code }]);
  const currentCode = stack[stack.length - 1]?.code || discipline.code;

  const { data: sections = [], isLoading } = useCourseSections(currentCode);
  const { data: currentDetail } = useCourseByCode(currentCode);
  const { data: allCourses = [] } = useCourses();
  const currentName = currentDetail?.name ?? discipline.name;

  // estados de colapso
  const [openClasses, setOpenClasses] = useState(false);
  const [openPrereq, setOpenPrereq] = useState(false);
  const [openCoreq, setOpenCoreq] = useState(false);
  const [openEquiv, setOpenEquiv] = useState(false);

  // seleção de opção para arrays de arrays
  const [prereqOptionIndex, setPrereqOptionIndex] = useState(0);
  const [coreqOptionIndex, setCoreqOptionIndex] = useState(0);

  // quando o discipline externo muda (abrir novo drawer), resetar stack
  useEffect(() => {
    setStack([{ code: discipline.code }]);
    setPrereqOptionIndex(0);
    setCoreqOptionIndex(0);
    setOpenClasses(false);
    setOpenPrereq(false);
    setOpenCoreq(false);
    setOpenEquiv(false);
  }, [discipline.code]);

  // Ao navegar para outra disciplina dentro do drawer, colapsar tudo por padrão
  useEffect(() => {
    setOpenClasses(false);
    setOpenPrereq(false);
    setOpenCoreq(false);
    setOpenEquiv(false);
    setPrereqOptionIndex(0);
    setCoreqOptionIndex(0);
  }, [currentCode]);
  const { isFavorite, toggleFavorite } = useFavoriteCourses();

  const handleAddClass = (section: Section) => {
    const isAlreadyAdded = mySections.some((s) => s.id_ref === section.id_ref);
    toggleSection(section);
    toast({
      title: isAlreadyAdded ? 'Turma removida' : 'Turma adicionada!',
      description: `${currentName} (${(section as any).section_code || section.id_ref}) ${isAlreadyAdded ? 'removida da' : 'foi adicionada à'} sua lista.`,
      variant: isAlreadyAdded ? 'default' : 'default',
    });
  };

  const isCompleted = completedDisciplines.includes(currentCode);
  
  // Verificar se disciplina está disponível ou bloqueada
  const currentCourse: Course = {
    code: currentCode,
    name: currentName,
    prerequisites: currentDetail?.prerequisites || [],
    mode: currentDetail?.mode || '',
    id_ref: currentDetail?.id_ref || '',
    location: currentDetail?.location || '',
    department: currentDetail?.department || '',
    type: currentDetail?.type || '',
    credits: currentDetail?.credits || 0,
    workload: currentDetail?.workload || 0,
    sections_count: currentDetail?.sections_count || 0,
    sections_url: currentDetail?.sections_url || '',
    detail_url: currentDetail?.detail_url || ''
  };
  
  // Importar a lógica de verificação de pré-requisitos
  const hasAllPrereqsDone = (course: Course) => {
    if (!course.prerequisites || course.prerequisites.length === 0) return true;
    
    // Se não há pré-requisitos ou é array vazio, está disponível
    if (course.prerequisites.length === 0) return true;
    
    // Verificar se ALGUMA das opções de pré-requisitos está completamente atendida
    for (const option of course.prerequisites) {
      if (!option || option.length === 0) continue;
      
      // Se todos os pré-requisitos desta opção estão concluídos
      if (option.every(prereq => completedDisciplines.includes(prereq.code || prereq))) {
        return true;
      }
    }
    
    return false;
  };
  
  const isAvailable = !isCompleted && hasAllPrereqsDone(currentCourse);
  const isBlocked = !isCompleted && !isAvailable;

  // Local UI components (small and focused)
  const SectionHeader = ({
    title,
    count,
    open,
    onToggle,
  }: { title: string; count?: number; open: boolean; onToggle: () => void }) => (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <h3
          className="font-semibold text-card-foreground cursor-pointer select-none"
          onClick={onToggle}
        >
          {title}
        </h3>
        {typeof count === 'number' && (
          <Badge variant="secondary" className="px-2 py-0.5">
            {count}
          </Badge>
        )}
      </div>
      <button
        type="button"
        onClick={onToggle}
        className="px-2 py-1 rounded-md text-sm text-muted-foreground hover:bg-muted"
        aria-label={open ? 'Recolher' : 'Expandir'}
      >
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
    </div>
  );

  const CollapseAnimated: React.FC<{ open: boolean; children: React.ReactNode }> = ({ open, children }) => (
    <>{open ? <div className="pt-2">{children}</div> : null}</>
  );

  

  return (
    <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-end">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative w-full max-w-lg h-full bg-card shadow-elevated overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border p-6 z-10">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="mb-3">
            <BreadcrumbTags
              items={stack}
              onSelectIndex={(idx) => {
                // voltar para um nível do breadcrumb
                setStack((prev) => prev.slice(0, idx + 1));
              }}
            />
          </div>
          
          <div className="flex items-center justify-between gap-3 pr-10">
            <h2 className="text-xl font-bold text-card-foreground">{currentName}</h2>
            <FavoriteButton
              active={isFavorite(currentCode)}
              onToggle={() => toggleFavorite(currentCode)}
              iconClassName="w-5 h-5"
            />
          </div>

          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
            {typeof (currentDetail as any)?.workload === 'number' && (
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{(currentDetail as any)?.workload}h</span>
              </div>
            )}
            {typeof (currentDetail as any)?.credits === 'number' && (
              <span>{(currentDetail as any)?.credits} créditos</span>
            )}
            {(currentDetail as any)?.semester && <span>{(currentDetail as any)?.semester}º Semestre</span>}
          </div>

          <CompletedButton 
            completed={isCompleted} 
            onClick={() => toggleCompletedDiscipline(currentCode)} 
            onRestrictedAction={onRestrictedAction}
            course={currentCourse}
            isAvailable={isAvailable}
            isBlocked={isBlocked}
          />
        </div>

        <div className="p-6 space-y-6">
          {currentDetail?.description && (
            <div>
              <h3 className="font-semibold text-card-foreground mb-2">Ementa</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {currentDetail.description}
              </p>
            </div>
          )}

          {/* Turmas Disponíveis com collapse */}
          <div className="space-y-3">
            <SectionHeader
              title="Turmas Disponíveis"
              count={sections.length}
              open={openClasses}
              onToggle={() => setOpenClasses((v) => !v)}
            />

            <CollapseAnimated open={openClasses}>
                {isLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="p-4 rounded-xl border-2 border-border bg-muted/50">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="h-4 w-40 bg-muted rounded" />
                            <div className="h-3 w-48 bg-muted rounded" />
                            <div className="h-3 w-32 bg-muted rounded" />
                          </div>
                          <div className="h-9 w-24 bg-muted rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : sections.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Nenhuma turma disponível para esta disciplina no momento.</p>
                ) : (
                  <div className="space-y-3">
                    {[...sections]
                      .sort((a, b) => getFreeSeats(b) - getFreeSeats(a))
                      .map((section) => {
                      const isAdded = mySections.some((s) => s.id_ref === section.id_ref);
                      return (
                        <SectionCard
                          key={section.id_ref}
                          section={section}
                          isAdded={isAdded}
                          onAdd={() => handleAddClass(section)}
                          onNavigateCourse={(code) => setStack((prev) => [...prev, { code }])}
                        />
                      );
                    })}
                  </div>
                )}
            </CollapseAnimated>
          </div>

          {/* Pré-requisitos */}
          {(currentDetail?.prerequisites?.length || 0) > 0 && (
            <div className="space-y-3">
              <SectionHeader
                title="Pré-requisitos"
                count={currentDetail?.prerequisites?.length}
                open={openPrereq}
                onToggle={() => setOpenPrereq((v) => !v)}
              />

              <CollapseAnimated open={openPrereq}>
                  {(() => {
                    const options = currentDetail?.prerequisites || [];
                    const remainingCounts = options.map((opt) => {
                      const list = opt || [];
                      return list.reduce((acc, item) => {
                        const code = (item as any)?.code;
                        return acc + (code && !completedDisciplines.includes(code) ? 1 : 0);
                      }, 0);
                    });
                    const minRemaining = remainingCounts.length > 0 ? Math.min(...remainingCounts) : 0;
                    return (
                      <div className="flex items-center gap-2 flex-wrap mb-3">
                        {options.map((_, i) => (
                          <button
                            key={`pr-option-${i}`}
                            className={cn(
                              'px-3 py-1.5 rounded-full text-xs font-medium transition-all inline-flex items-center gap-1',
                              prereqOptionIndex === i
                                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                                : 'bg-muted text-muted-foreground hover:bg-accent',
                            )}
                            onClick={() => setPrereqOptionIndex(i)}
                          >
                            {`Opção ${i + 1}`}
                            {remainingCounts[i] === minRemaining && (
                              <Star className="w-3 h-3 text-yellow-500" />
                            )}
                          </button>
                        ))}
                      </div>
                    );
                  })()}

                  <div className="grid grid-cols-1 gap-3">
                    {(currentDetail!.prerequisites![prereqOptionIndex] || []).map((pr) => {
                      const synced = !!(pr as any).name;
                      const code = pr.code;
                      const name = (pr as any).name as string | undefined;
                      const summary = allCourses.find((c) => c.code === code) || null;
                      return (
                        <LargeDisciplineCard
                          key={`pre-${code}`}
                          code={code}
                          synced={synced}
                          name={name}
                          summary={summary}
                          onClick={synced ? () => setStack((prev) => [...prev, { code }]) : undefined}
                        />
                      );
                    })}
                  </div>
              </CollapseAnimated>
            </div>
          )}

          {/* Correquisitos */}
          {(currentDetail?.corequisites?.length || 0) > 0 && (
            <div className="space-y-3">
              <SectionHeader
                title="Correquisitos"
                count={currentDetail?.corequisites?.length}
                open={openCoreq}
                onToggle={() => setOpenCoreq((v) => !v)}
              />

              <CollapseAnimated open={openCoreq}>
                  {(currentDetail?.corequisites?.length || 0) > 1 && (
                    <div className="flex items-center gap-2 flex-wrap mb-3">
                      {currentDetail!.corequisites!.map((_, i) => (
                        <button
                          key={`co-option-${i}`}
                          className={cn(
                            'px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                            coreqOptionIndex === i
                              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                              : 'bg-muted text-muted-foreground hover:bg-accent',
                          )}
                          onClick={() => setCoreqOptionIndex(i)}
                        >
                          {`Opção ${i + 1}`}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-3">
                    {(currentDetail!.corequisites![coreqOptionIndex] || []).map((co) => {
                      const synced = !!(co as any).name;
                      const code = co.code;
                      const name = (co as any).name as string | undefined;
                      const summary = allCourses.find((c) => c.code === code) || null;
                      return (
                        <LargeDisciplineCard
                          key={`co-${code}`}
                          code={code}
                          synced={synced}
                          name={name}
                          summary={summary}
                          onClick={synced ? () => setStack((prev) => [...prev, { code }]) : undefined}
                        />
                      );
                    })}
                  </div>
              </CollapseAnimated>
            </div>
          )}

          {/* Equivalentes */}
          {(currentDetail?.equivalences?.length || 0) > 0 && (() => {
            // Flatten + dedupe por código
            const flat = (currentDetail?.equivalences || []).flat();
            const seen = new Set<string>();
            const unique = flat.filter((eq) => {
              if (!eq?.code) return false;
              if (seen.has(eq.code)) return false;
              seen.add(eq.code);
              return true;
            });
            if (unique.length === 0) return null;
            return (
              <div className="space-y-3">
                <SectionHeader
                  title="Equivalentes"
                  count={unique.length}
                  open={openEquiv}
                  onToggle={() => setOpenEquiv((v) => !v)}
                />
                <CollapseAnimated open={openEquiv}>
                  <div className="grid grid-cols-1 gap-3">
                    {unique.map((eq) => {
                      const synced = !!(eq as any).name;
                      const code = eq.code;
                      const name = (eq as any).name as string | undefined;
                      const summary = allCourses.find((c) => c.code === code) || null;
                      return (
                        <LargeDisciplineCard
                          key={`eq-${code}`}
                          code={code}
                          synced={synced}
                          name={name}
                          summary={summary}
                          onClick={synced ? () => setStack((prev) => [...prev, { code }]) : undefined}
                        />
                      );
                    })}
                  </div>
                </CollapseAnimated>
              </div>
            );
          })()}
          
        </div>
      </div>
    </div>
  );
}
