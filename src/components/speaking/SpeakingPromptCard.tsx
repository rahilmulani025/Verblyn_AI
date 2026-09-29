import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface SpeakingPromptCardProps {
  title: string;
  prompt: string;
  instructions?: string[];
  targetSeconds?: number;
}

export const SpeakingPromptCard: React.FC<SpeakingPromptCardProps> = ({
  title,
  prompt,
  instructions,
  targetSeconds,
}) => {
  return (
    <Card className="border border-border/70 bg-card/90 shadow-sm">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-semibold uppercase tracking-wider text-primary">Prompt Drill</span>
          {targetSeconds && <span>Target: {targetSeconds}s</span>}
        </div>
        <h2 className="text-lg font-bold text-foreground leading-snug">{title}</h2>
        <div className="p-3 rounded-lg bg-secondary/60 border border-border/40 text-sm font-medium text-foreground leading-relaxed">
          "{prompt}"
        </div>
        {instructions && instructions.length > 0 && (
          <div className="space-y-1 pt-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Key Guidelines</span>
            <ul className="text-xs text-muted-foreground space-y-1 pl-4 list-disc">
              {instructions.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
