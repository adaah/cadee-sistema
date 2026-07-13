import { Clock, Check, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApp } from '@/contexts/AppContext';
import { useFavoriteCourses } from '@/hooks/useFavoriteCourses';
import { Course } from '@/services/api';
import { FavoriteButton } from '@/components/common/FavoriteButton';

interface LargeDisciplineCardProps {
  // Código da disciplina (obrigatório em ambos os casos)
  code: string;
  // Se "synced" verdadeiro, exibe nome, favoritos e contador de turmas
  synced?: boolean;
  // Nome quando sincronizada
  name?: string;
  // Resumo (opcional) para obter dados como sections_count
  summary?: Partial<Course> | null;
  // Clique habilitado apenas quando synced
  onClick?: () => void;
}

export function LargeDisciplineCard({ code, synced = false, name, summary, onClick }: LargeDisciplineCardProps) {
  const { completedDisciplines, toggleCompletedDiscipline } = useApp();
  const { isFavorite, toggleFavorite } = useFavoriteCourses();

  const isCompleted = completedDisciplines.includes(code);
  const favorite = isFavorite(code);
  const sectionsCount = (summary as any)?.sections_count ?? 0;

  if (!synced) {
    return (
      <div
        className={cn(
          'group relative bg-card rounded-xl border border-border px-5 py-4',
          'flex flex-col gap-2 opacity-90',
        )}
      >
        <div className="flex items-center justify-between">
          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted text-muted-foreground">{code}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleCompletedDiscipline(code);
            }}
            className={cn(
              'p-2 rounded-lg transition-colors',
              isCompleted ? 'text-success bg-success/10' : 'text-muted-foreground hover:bg-muted',
            )}
            aria-label={isCompleted ? 'Desmarcar como cursada' : 'Marcar como cursada'}
          >
            {isCompleted ? (
              <Check className="w-4 h-4" />
            ) : (
              <span className="block w-4 h-4 rounded-full border border-current" />
            )}
          </button>
        </div>

        <h3 className="font-semibold text-card-foreground text-sm">Não Disponível</h3>
        <p className="text-xs text-muted-foreground">Essa disciplina ainda não está sincronizada.</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group relative bg-card rounded-xl border border-border px-5 py-4 cursor-pointer',
        'flex h-full flex-col transition-all duration-200 hover:shadow-card-hover hover:scale-[1.01]',
        isCompleted && 'border-success/50 bg-success/5',
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted text-muted-foreground">{code}</span>
        <div className="flex items-center gap-1">
          <FavoriteButton active={favorite} onToggle={() => toggleFavorite(code)} />
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleCompletedDiscipline(code);
            }}
            className={cn('p-2 rounded-lg transition-colors', isCompleted ? 'text-success bg-success/10' : 'text-muted-foreground hover:bg-muted')}
            aria-label={isCompleted ? 'Desmarcar como cursada' : 'Marcar como cursada'}
          >
            {isCompleted ? <Check className="w-4 h-4" /> : <span className="block w-4 h-4 rounded-full border border-current" />}
          </button>
        </div>
      </div>

      <div className="flex-1">
        <h3 className="font-semibold text-card-foreground mb-2 text-sm md:text-base line-clamp-2">{name ?? code}</h3>
        {typeof (summary as any)?.workload === 'number' && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>{(summary as any).workload}h</span>
          </div>
        )}
      </div>

      <div className="mt-2 pt-1 border-t border-border">
        <div className="flex items-center justify-between">
          {isCompleted && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-success/10 text-success text-[10px] sm:text-xs font-medium">Cursada</span>
          )}
          <div className="flex-1" />
          <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>{sectionsCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
