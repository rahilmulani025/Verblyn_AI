import { supabase } from '@/integrations/supabase/client';
import { analytics } from '@/lib/analytics';

export type BetaFeedbackRating = 'very_useful' | 'useful' | 'not_useful';
export type DifficultyPerception = 'too_easy' | 'just_right' | 'too_hard';

export interface SubmitFeedbackInput {
  attemptId?: string;
  challengeId?: string;
  rating: BetaFeedbackRating;
  difficultyPerception?: DifficultyPerception;
  feedbackText?: string;
}

export const feedbackApi = {
  /**
   * Submits user feedback on challenge or AI coaching.
   */
  async submitFeedback(input: SubmitFeedbackInput): Promise<boolean> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;

      if (userId) {
        await supabase.from('beta_feedback').insert({
          user_id: userId,
          attempt_id: input.attemptId || null,
          challenge_id: input.challengeId || null,
          rating: input.rating,
          difficulty_perception: input.difficultyPerception || null,
          feedback_text: input.feedbackText?.trim() || null,
        });
      }

      analytics.track('feedback_submitted', {
        rating: input.rating,
        difficulty_perception: input.difficultyPerception,
        challenge_id: input.challengeId,
        has_text: Boolean(input.feedbackText?.trim()),
      });

      return true;
    } catch (err) {
      console.error('Error submitting feedback:', err);
      return false;
    }
  },
};
