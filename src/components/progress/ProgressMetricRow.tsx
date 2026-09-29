import React from 'react';
import { Progress } from '@/components/ui/progress';

interface ProgressMetricRowProps {
  label: string;
  score: number;
  description?: string;
}

export const ProgressMetricRow: React.FC<ProgressMetricRowProps> = ({
  label,
  score,
  description,
}) => {
  return (
    <div className="p-3.5 rounded-xl bg-card border border-border/60 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-sm font-bold text-primary">{score}%</span>
      </div>
      <Progress value={score} className="h-2 bg-secondary" />
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  );
};
