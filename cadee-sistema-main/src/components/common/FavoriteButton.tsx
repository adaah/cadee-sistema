import { cn } from '@/lib/utils';
import { Heart } from 'lucide-react';
import { motion, useAnimationControls } from 'motion/react';
import React from 'react';

type FavoriteButtonProps = {
  active: boolean;
  onToggle: () => void;
  className?: string;
  iconClassName?: string;
  ariaLabelActive?: string;
  ariaLabelInactive?: string;
};

export function FavoriteButton({
  active,
  onToggle,
  className,
  iconClassName,
  ariaLabelActive = 'Remover dos favoritos',
  ariaLabelInactive = 'Adicionar aos favoritos',
}: FavoriteButtonProps) {
  const controls = useAnimationControls();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle();
    controls.start({
      scale: [1, 1.22, 1],
      transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] },
    });
  };

  return (
    <motion.button
      onClick={handleClick}
      className={cn(
        'p-2 rounded-lg transition-colors',
        active ? 'text-rose-600 bg-rose-500/10' : 'text-muted-foreground hover:bg-muted',
        className,
      )}
      aria-label={active ? ariaLabelActive : ariaLabelInactive}
      whileHover={{ scale: 1.12 }}
      whileTap={{ scale: 0.95 }}
    >
      <motion.span animate={controls} className="inline-flex">
        <Heart className={cn('w-4 h-4', active && 'fill-current', iconClassName)} />
      </motion.span>
    </motion.button>
  );
}

