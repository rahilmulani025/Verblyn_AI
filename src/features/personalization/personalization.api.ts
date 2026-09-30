/**
 * Personalization State Gathering API
 * Assembles user state from authoritative Supabase tables:
 * - profiles (profession, institution, primaryGoal)
 * - user_skills (current_score per skill)
 * - user_weaknesses (active weaknesses with occurrence count)
 * - challenge_attempts (recent 5 completed attempts for anti-repetition)
 */

import { supabase } from '@/integrations/supabase/client';
import { profileApi } from '@/features/profile/profile.api';
import { progressApi } from '@/features/progress/progress.api';
import { TargetSkill } from '@/features/challenges/challenge.types';
import { UserPersonalizationState, TrainingPlan } from './personalization.types';
import { trainingPolicy } from './trainingPolicy';

export const personalizationApi = {
  /**
   * Builds the comprehensive personalization state for the active authenticated user.
   */
  async getUserPersonalizationState(): Promise<UserPersonalizationState | null> {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (!user) return null;

    try {
      const [profile, progress] = await Promise.all([
        profileApi.getProfile(),
        progressApi.getProgress(),
      ]);

      const skillsRecord: Record<TargetSkill, number> = {
        Fluency: 70,
        Clarity: 70,
        Vocabulary: 70,
        Grammar: 70,
        Confidence: 70,
      };

      (progress?.skills || []).forEach((s) => {
        if (s.skillName in skillsRecord) {
          skillsRecord[s.skillName as TargetSkill] = s.currentScore;
        }
      });

      const activeWeaknesses = (progress?.activeWeaknesses || []).map((w) => ({
        type: w.type,
        label: w.label,
        skillName: w.skillName,
        occurrenceCount: w.occurrenceCount,
      }));

      const recentAttempts = (progress?.recentSessions || []).slice(0, 5).map((s) => ({
        challengeId: s.id,
        title: s.topic,
        targetSkill: 'Fluency',
        completedAt: s.date,
        score: s.score,
      }));

      return {
        userId: user.id,
        fullName: profile?.fullName || undefined,
        profession: profile?.profession || undefined,
        institution: profile?.institution || undefined,
        primaryGoal: profile?.primaryGoal || undefined,
        targetRole: profile?.profession === 'student' ? 'Campus Placement Candidate' : profile?.profession || undefined,
        skills: skillsRecord,
        activeWeaknesses,
        recentAttempts,
      };
    } catch (err) {
      console.warn('Error fetching personalization state, falling back to defaults:', err);
      return null;
    }
  },

  /**
   * Generates a tailored training plan for the active user using deterministic policy.
   */
  async getActiveTrainingPlan(): Promise<TrainingPlan> {
    const state = await this.getUserPersonalizationState();
    if (!state) {
      return trainingPolicy.generateTrainingPlan({
        userId: 'guest',
        skills: { Fluency: 70, Clarity: 70, Vocabulary: 70, Grammar: 70, Confidence: 70 },
        activeWeaknesses: [],
        recentAttempts: [],
        primaryGoal: 'CAMPUS_PLACEMENTS',
      });
    }

    return trainingPolicy.generateTrainingPlan(state);
  },
};
