import React from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface XpCounterProps {
  xp: number;
  className?: string;
}

export const XpCounter: React.FC<XpCounterProps> = ({ xp, className }) => {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 text-sm font-bold',
        className
      )}
    >
      <Sparkles className="w-4 h-4 text-amber-300" />
      <span>{xp} XP</span>
    </div>
  );
};
