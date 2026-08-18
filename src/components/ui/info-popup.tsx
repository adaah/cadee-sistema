import * as React from 'react';
import { Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface InfoPopupProps {
  content: React.ReactNode;
  title?: string;
  className?: string;
  iconClassName?: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  customTrigger?: React.ReactNode;
  autoCloseDelay?: number;
}

export function InfoPopup({
  content,
  title,
  className,
  iconClassName,
  side = 'top',
  align = 'center',
  customTrigger,
  autoCloseDelay = 4000,
}: InfoPopupProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  const clearTimer = React.useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  React.useEffect(() => {
    if (isOpen && autoCloseDelay > 0) {
      clearTimer();
      timerRef.current = setTimeout(() => {
        setIsOpen(false);
      }, autoCloseDelay);
    } else {
      clearTimer();
    }

    return () => clearTimer();
  }, [isOpen, autoCloseDelay, clearTimer]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      clearTimer();
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Informações"
          className={cn(
            "inline-flex items-center justify-center p-0.5 rounded-full text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors cursor-pointer touch-manipulation",
            className
          )}
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen((prev) => !prev);
          }}
        >
          {customTrigger || <Info className={cn("w-3.5 h-3.5", iconClassName)} />}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        sideOffset={6}
        className="w-auto max-w-[280px] p-3 text-xs leading-relaxed shadow-lg border border-border bg-popover text-popover-foreground z-50 rounded-lg animate-in fade-in-0 zoom-in-95"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {title && <p className="font-semibold text-foreground mb-1">{title}</p>}
        <div className="text-muted-foreground">{content}</div>
      </PopoverContent>
    </Popover>
  );
}
