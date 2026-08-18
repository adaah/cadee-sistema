import { TrendingUp } from 'lucide-react';
import { InfoPopup } from '@/components/ui/info-popup';
import { cn } from '@/lib/utils';

export type ProgressCategory = 'mandatory' | 'elective' | 'complementary' | 'general';

interface ProgressCardProps {
  title: string;
  current: number;
  total: number;
  showInfo?: boolean;
  infoText?: string;
  isEstimated?: boolean;
  category?: ProgressCategory;
  className?: string;
}

const CATEGORY_STYLES: Record<ProgressCategory, { bar: string; excessText: string }> = {
  mandatory: {
    bar: 'bg-blue-500',
    excessText: 'text-blue-600 dark:text-blue-400',
  },
  elective: {
    bar: 'bg-purple-500',
    excessText: 'text-purple-600 dark:text-purple-400',
  },
  complementary: {
    bar: 'bg-emerald-500',
    excessText: 'text-emerald-600 dark:text-emerald-400',
  },
  general: {
    bar: 'bg-green-500',
    excessText: 'text-green-600 dark:text-green-400',
  },
};

export function ProgressCard({
  title,
  current,
  total,
  showInfo = false,
  infoText = '',
  isEstimated = false,
  category,
  className,
}: ProgressCardProps) {
  const rawPercentage = total > 0 ? (current / total) * 100 : 0;
  const percentage = Math.min(100, Math.round(rawPercentage));
  const excess = current > total ? current - total : 0;

  const inferredCategory: ProgressCategory =
    category ||
    (title.toLowerCase().includes('obrigat')
      ? 'mandatory'
      : title.toLowerCase().includes('optat')
      ? 'elective'
      : title.toLowerCase().includes('comp')
      ? 'complementary'
      : 'general');

  const styles = CATEGORY_STYLES[inferredCategory];

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
          {showInfo && (
            <InfoPopup
              iconClassName="w-3.5 h-3.5"
              content={infoText}
            />
          )}
          {isEstimated && (
            <InfoPopup
              customTrigger={
                <div className="w-3.5 h-3.5 rounded-full bg-amber-500 flex items-center justify-center">
                  <TrendingUp className="w-2 h-2 text-white" />
                </div>
              }
              content="Valor estimado. Importe seu histórico para dados precisos."
            />
          )}
        </div>
        <span className="text-sm font-semibold text-foreground">
          {percentage}%
        </span>
      </div>

      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            isEstimated ? 'bg-amber-500' : styles.bar
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{Math.min(current, total)} / {total} horas</span>
        {excess > 0 ? (
          <span className={cn('font-medium', styles.excessText)}>
            +{excess}h excedentes
          </span>
        ) : isEstimated ? (
          <span className="text-amber-600 dark:text-amber-400 font-medium">
            Estimado
          </span>
        ) : null}
      </div>
    </div>
  );
}
