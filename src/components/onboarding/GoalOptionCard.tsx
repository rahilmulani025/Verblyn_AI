import React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface GoalOptionCardProps {
  id: string;
  title: string;
  description: string;
  category?: string;
  selected: boolean;
  onSelect: (id: string) => void;
}

export const GoalOptionCard: React.FC<GoalOptionCardProps> = ({
  id,
  title,
  description,
  category,
  selected,
  onSelect,
}) => {
  return (
    <div
      onClick={() => onSelect(id)}
      className={cn(
        'p-4 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 text-left min-h-[56px] touch-target',
        selected
          ? 'bg-primary/10 border-primary shadow-sm'
          : 'bg-card border-border/70 hover:border-border active:bg-secondary/40'
      )}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
    >
      <div className="space-y-1">
        {category && (
          <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">
            {category}
          </span>
        )}
        <h4 className="text-sm font-semibold text-foreground leading-snug">{title}</h4>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>

      <div
        className={cn(
          'w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 border transition-colors',
          selected
            ? 'bg-primary border-primary text-primary-foreground'
            : 'border-muted-foreground/30 bg-secondary/50'
        )}
      >
        {selected && <Check className="w-3 h-3 stroke-[3]" />}
      </div>
    </div>
  );
};
