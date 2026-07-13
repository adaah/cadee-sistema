import { Progress } from '@/components/ui/progress';
import { Info, TrendingUp } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ProgressCardProps {
  title: string;
  current: number;
  total: number;
  showInfo?: boolean;
  infoText?: string;
  isEstimated?: boolean;
}

export function ProgressCard({ title, current, total, showInfo = false, infoText = '', isEstimated = false }: ProgressCardProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
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
          {isEstimated && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-3.5 h-3.5 rounded-full bg-amber-500 flex items-center justify-center">
                    <TrendingUp className="w-2 h-2 text-white" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs max-w-[200px]">Valor estimado. Importe seu histórico para dados precisos.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <span className="text-sm font-medium text-foreground">
          {percentage}%
        </span>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
        <span>{current} / {total} horas</span>
        {isEstimated && (
          <span className="text-amber-600 dark:text-amber-400 font-medium">
            Estimado
          </span>
        )}
      </div>
      <Progress value={percentage} className={`h-2 ${isEstimated ? '[&>div]:bg-amber-500' : ''}`} />
    </div>
  );
}
