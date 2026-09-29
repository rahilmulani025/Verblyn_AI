import React from 'react';
import { Challenge } from '@/features/challenges/challenge.types';
import { Clock, Sparkles, ChevronRight, Target } from 'lucide-react';

interface ChallengeCardProps {
  challenge: Challenge;
  onSelect: (id: string) => void;
  isDaily?: boolean;
}

export const ChallengeCard: React.FC<ChallengeCardProps> = ({
  challenge,
  onSelect,
  isDaily,
}) => {
  return (
    <div
      onClick={() => onSelect(challenge.id)}
      className="p-4 rounded-xl bg-card border border-border/70 hover:border-primary/40 active:bg-secondary/40 transition-all cursor-pointer flex flex-col gap-2.5 group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            {isDaily ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                <Sparkles className="w-3 h-3" /> Daily Mission
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary uppercase tracking-wider">
                <Target className="w-3 h-3" /> {challenge.targetSkill}
              </span>
            )}
          </div>
          <h3 className="font-bold text-foreground group-hover:text-primary transition-colors text-sm">
            {challenge.title}
          </h3>
        </div>
        <span className="text-[11px] px-2 py-0.5 rounded-md bg-secondary text-muted-foreground font-semibold shrink-0">
          {challenge.difficultyLabel}
        </span>
      </div>

      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
        {challenge.shortDescription || challenge.whyItMatters}
      </p>

      <div className="flex items-center justify-between pt-1.5 border-t border-border/40 text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {challenge.durationSeconds}s
          </span>
          <span className="text-amber-400 font-bold">+{challenge.xpReward} XP</span>
        </div>
        <div className="flex items-center text-primary text-xs font-semibold group-hover:translate-x-0.5 transition-transform">
          Start Drill <ChevronRight className="w-4 h-4 ml-0.5" />
        </div>
      </div>
    </div>
  );
};
