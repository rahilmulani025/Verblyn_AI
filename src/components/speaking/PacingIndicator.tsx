import React from 'react';
import { cn } from '@/lib/utils';

interface PacingIndicatorProps {
  wpm: number;
  className?: string;
}

export const PacingIndicator: React.FC<PacingIndicatorProps> = ({ wpm, className }) => {
  let status = 'Good';
  let badgeColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';

  if (wpm === 0) {
    status = 'Waiting';
    badgeColor = 'text-muted-foreground bg-secondary border-border/40';
  } else if (wpm < 115) {
    status = 'Slow pace';
    badgeColor = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
  } else if (wpm > 165) {
    status = 'Fast pace';
    badgeColor = 'text-rose-400 bg-rose-500/10 border-rose-500/20';
  }

  return (
    <div className={cn('inline-flex items-center gap-2 text-xs', className)}>
      <span className="text-muted-foreground">Pacing:</span>
      <span className={cn('px-2 py-0.5 rounded-md border font-medium', badgeColor)}>
        {wpm > 0 ? `${wpm} WPM (${status})` : 'Ready'}
      </span>
    </div>
  );
};
