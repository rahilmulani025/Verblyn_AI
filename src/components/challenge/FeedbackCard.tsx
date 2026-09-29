import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { feedbackApi, BetaFeedbackRating, DifficultyPerception } from '@/features/feedback/feedback.api';
import { ThumbsUp, Smile, ThumbsDown, Check, Send } from 'lucide-react';

interface FeedbackCardProps {
  attemptId?: string;
  challengeId?: string;
}

export const FeedbackCard: React.FC<FeedbackCardProps> = ({ attemptId, challengeId }) => {
  const [rating, setRating] = useState<BetaFeedbackRating | null>(null);
  const [difficulty, setDifficulty] = useState<DifficultyPerception | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (selectedRating: BetaFeedbackRating) => {
    setRating(selectedRating);
    setSubmitting(true);
    await feedbackApi.submitFeedback({
      attemptId,
      challengeId,
      rating: selectedRating,
      difficultyPerception: difficulty || undefined,
      feedbackText: feedbackText.trim() || undefined,
    });
    setSubmitting(false);
    setSubmitted(true);
  };

  const handleDetailedSubmit = async () => {
    if (!rating) return;
    setSubmitting(true);
    await feedbackApi.submitFeedback({
      attemptId,
      challengeId,
      rating,
      difficultyPerception: difficulty || undefined,
      feedbackText: feedbackText.trim() || undefined,
    });
    setSubmitting(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <Card className="border border-emerald-500/30 bg-emerald-500/5">
        <CardContent className="p-3 text-center text-xs text-emerald-400 font-semibold flex items-center justify-center gap-1.5">
          <Check className="w-4 h-4" /> Thank you for helping shape Verblyn!
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border/70 bg-card">
      <CardContent className="p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Was this feedback helpful?
          </span>
          <span className="text-[10px] text-muted-foreground">Beta Feedback</span>
        </div>

        {/* 3 Simple Rating Pills */}
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => handleSubmit('very_useful')}
            className={`p-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1 transition-colors touch-target ${
              rating === 'very_useful'
                ? 'bg-primary/20 border-primary text-primary'
                : 'bg-secondary/40 border-border/60 hover:bg-secondary text-foreground'
            }`}
          >
            <ThumbsUp className="w-3.5 h-3.5 text-emerald-400" /> Very useful
          </button>

          <button
            type="button"
            onClick={() => handleSubmit('useful')}
            className={`p-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1 transition-colors touch-target ${
              rating === 'useful'
                ? 'bg-primary/20 border-primary text-primary'
                : 'bg-secondary/40 border-border/60 hover:bg-secondary text-foreground'
            }`}
          >
            <Smile className="w-3.5 h-3.5 text-amber-400" /> Useful
          </button>

          <button
            type="button"
            onClick={() => handleSubmit('not_useful')}
            className={`p-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1 transition-colors touch-target ${
              rating === 'not_useful'
                ? 'bg-primary/20 border-primary text-primary'
                : 'bg-secondary/40 border-border/60 hover:bg-secondary text-foreground'
            }`}
          >
            <ThumbsDown className="w-3.5 h-3.5 text-rose-400" /> Not useful
          </button>
        </div>

        {/* Optional text area if rating was clicked */}
        {rating && !submitted && (
          <div className="space-y-2 pt-1 border-t border-border/30 animate-in fade-in duration-200">
            <input
              type="text"
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="What could be improved? (optional)"
              className="w-full px-3 py-1.5 rounded-md bg-secondary/50 border border-border/70 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <Button
              type="button"
              size="sm"
              onClick={handleDetailedSubmit}
              disabled={submitting}
              className="w-full min-h-[36px] text-xs font-semibold gap-1.5"
            >
              <Send className="w-3.5 h-3.5" /> Send Feedback
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
