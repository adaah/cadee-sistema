import { Clock, Check, Users, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '@/contexts/AppContext';
import { cn } from '@/lib/utils';
import { Course } from '@/services/api';
import { useMode } from '@/hooks/useMode';
import { useFavoriteCourses } from '@/hooks/useFavoriteCourses';
import { FavoriteButton } from '@/components/common/FavoriteButton';

interface DisciplineCardProps {
  discipline: Course;
  onClick: () => void;
  available?: boolean;
  blocked?: boolean;
  onRestrictedAction?: (type: 'completed' | 'favorite', course: Course) => void;
}

export function DisciplineCard({ discipline, onClick, available, blocked, onRestrictedAction }: DisciplineCardProps) {
  const { completedDisciplines, toggleCompletedDiscipline } = useApp();
  const { isSimplified } = useMode();
  const { isFavorite, toggleFavorite } = useFavoriteCourses();

  const isCompleted = completedDisciplines.includes(discipline.code);
  const favorite = isFavorite(discipline.code);
  const showCompletedStyles = isCompleted;
  const showBlocked = !!blocked;
  const showAvailable = !!available;

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRestrictedAction) {
      onRestrictedAction('favorite', discipline);
    } else {
      toggleFavorite(discipline.code);
    }
  };

  const handleCompletedClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Se já está cursada, permite desmarcar diretamente sem modal
    if (isCompleted) {
      toggleCompletedDiscipline(discipline.code);
    } else if (onRestrictedAction) {
      onRestrictedAction('completed', discipline);
    } else {
      toggleCompletedDiscipline(discipline.code);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={cn(
        "group relative bg-card rounded-xl border border-border px-4 pt-4 pb-3 sm:px-5 sm:pt-5 sm:pb-4 cursor-pointer",
        "flex h-full flex-col",
        "transition-all duration-200 hover:shadow-card-hover hover:scale-[1.02]",
        showCompletedStyles && "border-success/50 bg-success/5",
        !showCompletedStyles && showAvailable && "bg-warning/10 border-warning hover:bg-warning/20",
        !showCompletedStyles && showBlocked && "dark:bg-gray-800/50 bg-muted/30 border-gray-400 opacity-60"
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-1 sm:mb-2">
        <span
          className={cn(
            "px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-semibold",
            showCompletedStyles
              ? "bg-success/10 text-success"
              : showAvailable
              ? "bg-warning/10 text-warning"
              : showBlocked
              ? "dark:bg-gray-700 dark:text-gray-300 bg-gray-200 text-gray-600"
              : "bg-muted text-muted-foreground"
          )}
        >
          {discipline.code}
        </span>
        <div className="flex items-center gap-1">
          <motion.button
            onClick={handleCompletedClick}
            className={cn(
              "p-2 rounded-lg transition-colors",
              isCompleted
                ? "text-success bg-success/10"
                : "text-muted-foreground hover:bg-muted"
            )}
            whileHover={{ scale: 1.08 }}
          >
            <span className="relative block w-4 h-4">
              {/* Static circle border always present */}
              <span className="absolute inset-0 rounded-full border border-current" />
              <AnimatePresence mode="wait" initial={false}>
                {isCompleted && (
                  <motion.span
                    key="check"
                    className="absolute inset-0 flex items-center justify-center"
                    initial={{ opacity: 0, scale: 0.6, rotate: -180 }}
                    animate={{ opacity: 1, scale: [0.6, 1.1, 1], rotate: 0 }}
                    exit={{ opacity: 0, scale: 0.7, rotate: -180 }}
                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </motion.span>
                )}
              </AnimatePresence>
            </span>
          </motion.button>
        </div>
      </div>

      <div className="flex-1">
        <h3 className="font-semibold text-card-foreground mb-2 line-clamp-2 text-[11px] sm:text-sm md:text-base">
          {discipline.name}
        </h3>

        <div className="flex items-center gap-4 text-[11px] sm:text-sm text-muted-foreground">
          {typeof (discipline as any).workload === 'number' && (
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{(discipline as any).workload}h</span>
            </div>
          )}
          {typeof (discipline as any).credits === 'number' && (
            <span>{(discipline as any).credits} créditos</span>
          )}
        </div>

        {(discipline as any).prerequisites?.length > 0 && (
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-2 truncate">
            Pré-req: {(discipline as any).prerequisites?.join(', ')}
          </p>
        )}
      </div>

      {/* Rodapé compacto com status e contador de turmas */}
      <div className="mt-2 pt-1 border-t border-border">
        <div className="flex items-center justify-between">
          {/* Reserve space to avoid layout shift (empty component) */}
          <div className="h-5 sm:h-6 flex items-center">
            <AnimatePresence mode="popLayout" initial={false}>
              {isCompleted && (
                <motion.span
                  key="tag-cursada"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.25 }}
                  className="inline-flex items-center px-2 py-0.5 rounded-md bg-success/10 text-success text-[10px] sm:text-xs font-medium"
                >
                  Cursada
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>{(discipline as any).sections_count ?? 0}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
