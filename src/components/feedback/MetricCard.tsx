import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  status?: 'success' | 'warning' | 'neutral';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  sublabel,
  status = 'neutral',
}) => {
  return (
    <Card className="border border-border/60 bg-card/80">
      <CardContent className="p-3.5 flex flex-col justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <div className="flex items-baseline gap-1 mt-1">
          <span
            className={cn(
              'text-xl font-bold tracking-tight',
              status === 'success' && 'text-emerald-400',
              status === 'warning' && 'text-amber-400',
              status === 'neutral' && 'text-foreground'
            )}
          >
            {value}
          </span>
          {sublabel && <span className="text-[11px] text-muted-foreground">{sublabel}</span>}
        </div>
      </CardContent>
    </Card>
  );
};
