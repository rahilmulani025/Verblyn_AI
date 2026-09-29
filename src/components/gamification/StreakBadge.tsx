import React from 'react';
import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StreakBadgeProps {
  streak: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const StreakBadge: React.FC<StreakBadgeProps> = ({ streak, className, size = 'md' }) => {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full bg-orange-500/10 border border-orange-500/25 text-orange-400 font-bold',
        size === 'sm' && 'px-2 py-0.5 text-xs',
        size === 'md' && 'px-3 py-1 text-sm',
        size === 'lg' && 'px-4 py-1.5 text-base',
        className
      )}
    >
      <Flame
        className={cn(
          'fill-orange-400 text-orange-400',
          size === 'sm' && 'w-3.5 h-3.5',
          size === 'md' && 'w-4 h-4',
          size === 'lg' && 'w-5 h-5'
        )}
      />
      <span>{streak} Day Streak</span>
    </div>
  );
};
