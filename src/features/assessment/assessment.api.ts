import { supabase } from '@/integrations/supabase/client';
import { profileApi } from '@/features/profile/profile.api';
import {
  BaselineAssessmentPrompt,
  BaselineAssessmentResult,
  BaselineSkillBreakdown,
} from './assessment.types';
import { SpeechMetricsSummary } from '@/lib/metrics';

export const assessmentApi = {
  getBaselinePrompt(): BaselineAssessmentPrompt {
    return {
      id: 'baseline-self-intro-60',
      title: 'Initial Voice & Clarity Baseline',
      topic: 'Personal Intro & Current Focus',
      prompt: 'Tell me about yourself and what you are currently working toward.',
      instructions: [
        'State who you are and what your current studies or projects involve.',
        'Highlight 1 key ambition or goal that drives you.',
        'Speak naturally and steadily for up to 60 seconds.',
      ],
      targetDurationSeconds: 60,
    };
  },

  /**
   * Deterministically calculates the 5 core baseline skills from speech metrics.
   */
  calculateBaselineSkills(metrics: SpeechMetricsSummary): BaselineSkillBreakdown {
    if (metrics.wordCount === 0) {
      return {
        overallScore: 0,
        fluency: 0,
        clarity: 0,
        vocabulary: 0,
        grammar: 0,
        confidence: 0,
      };
    }

    // 1. Fluency: Pacing closeness to optimal 135-145 WPM
    const targetWpm = 140;
    const wpmDiff = Math.abs(metrics.wpm - targetWpm);
    const fluency = Math.max(30, Math.min(98, Math.round(96 - wpmDiff * 0.75)));

    // 2. Grammar / Conciseness: Penalized by filler words & repeated words
    const fillerPenalty = Math.min(45, Math.round(metrics.fillerStats.fillerPercentage * 4.5));
    const repetitionPenalty = Math.min(15, metrics.repetitionStats.total * 5);
    const grammar = Math.max(30, Math.min(98, 95 - fillerPenalty - repetitionPenalty));

    // 3. Vocabulary: Based on lexical diversity (TTR)
    const diversityBonus = Math.round(metrics.vocabularyDiversity * 50);
    const lengthBonus = Math.min(45, Math.round(metrics.wordCount * 0.6));
    const vocabulary = Math.max(30, Math.min(98, diversityBonus + lengthBonus));

    // 4. Clarity: Average sentence length moderation (ideal 12-18 words) + structural cohesion
    const avgLenDiff = Math.abs(metrics.averageSentenceLength - 14);
    const clarity = Math.max(30, Math.min(98, Math.round(92 - avgLenDiff * 2.2)));

    // 5. Confidence: Steady pacing delivery & filler-free discipline (linguistic/delivery confidence)
    const confidence = Math.max(30, Math.min(98, Math.round(fluency * 0.5 + grammar * 0.5)));

    // Overall composite score
    const overallScore = Math.round(
      fluency * 0.25 + clarity * 0.25 + vocabulary * 0.2 + grammar * 0.15 + confidence * 0.15
    );

    return {
      overallScore,
      fluency,
      clarity,
      vocabulary,
      grammar,
      confidence,
    };
  },

  /**
   * Generates strength and focus observations from metrics and scores.
   */
  generateObservations(metrics: SpeechMetricsSummary, scores: BaselineSkillBreakdown) {
    // 1. Strength
    let strengthObservation = 'Consistent vocal delivery with steady conversational cadence.';
    if (metrics.fillerStats.total === 0 && metrics.wordCount >= 20) {
      strengthObservation = 'Exceptional verbal discipline with zero filler pauses detected.';
    } else if (metrics.wpm >= 125 && metrics.wpm <= 155) {
      strengthObservation = `Optimal pacing rhythm at ${metrics.wpm} WPM, ideal for listener comprehension.`;
    } else if (metrics.vocabularyDiversity >= 0.7) {
      strengthObservation = 'High lexical variety, expressing complex thoughts without repetitive phrasing.';
    }

    // 2. First Focus
    const skillList = [
      { name: 'Pacing & Cadence', score: scores.fluency, tip: 'Practice speaking within the 130-150 WPM sweet spot.' },
      { name: 'Filler Word Elimination', score: scores.grammar, tip: 'Replace filler sounds with 1-second deliberate pauses.' },
      { name: 'Sentence Framing & Clarity', score: scores.clarity, tip: 'Keep sentences concise (12-16 words per thought).' },
      { name: 'Vocabulary Breadth', score: scores.vocabulary, tip: 'Incorporate precise action verbs in your explanations.' },
    ];

    skillList.sort((a, b) => a.score - b.score);
    const lowest = skillList[0];
    const firstFocusArea = lowest.name;
    const recommendedDrillTitle = lowest.tip;

    return {
      strengthObservation,
      firstFocusArea,
      recommendedDrillTitle,
    };
  },

  /**
   * Saves the baseline assessment attempt and updates progress & profile flags.
   */
  async submitAssessment(data: {
    transcript: string;
    durationSeconds: number;
    metrics: SpeechMetricsSummary;
    scores: BaselineSkillBreakdown;
    strengthObservation: string;
    firstFocusArea: string;
    recommendedDrillTitle: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        return { success: false, error: 'User session not found. Please log in again.' };
      }

      const userId = authData.user.id;

      // 1. Save attempt record in speaking_sessions
      const { error: sessionError } = await supabase.from('speaking_sessions').insert({
        user_id: userId,
        topic: 'Baseline Assessment',
        transcript: data.transcript,
        duration_seconds: data.durationSeconds,
        confidence_score: data.scores.confidence,
        fluency_score: data.scores.fluency,
        grammar_score: data.scores.grammar,
        vocabulary_score: data.scores.vocabulary,
        feedback: {
          assessment_type: 'baseline',
          metrics: data.metrics,
          scores: data.scores,
          strength: data.strengthObservation,
          first_focus: data.firstFocusArea,
          recommended_drill: data.recommendedDrillTitle,
          completed_at: new Date().toISOString(),
        },
      });

      if (sessionError) {
        console.error('Error inserting baseline session:', sessionError);
        return { success: false, error: 'Could not record baseline session.' };
      }

      // 2. Persist baseline skills to user_progress (idempotent upsert)
      const { data: existingProgress } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      const today = new Date().toISOString().split('T')[0];

      if (existingProgress) {
        await supabase
          .from('user_progress')
          .update({
            total_sessions: Math.max(1, existingProgress.total_sessions || 1),
            avg_fluency_score: data.scores.fluency,
            avg_grammar_score: data.scores.grammar,
            avg_vocabulary_score: data.scores.vocabulary,
            avg_confidence_score: data.scores.confidence,
            best_fluency_score: Math.max(existingProgress.best_fluency_score || 0, data.scores.fluency),
            best_grammar_score: Math.max(existingProgress.best_grammar_score || 0, data.scores.grammar),
            best_vocabulary_score: Math.max(existingProgress.best_vocabulary_score || 0, data.scores.vocabulary),
            best_confidence_score: Math.max(existingProgress.best_confidence_score || 0, data.scores.confidence),
            current_streak: Math.max(1, existingProgress.current_streak || 1),
            last_practice_date: today,
          })
          .eq('user_id', userId);
      } else {
        await supabase.from('user_progress').insert({
          user_id: userId,
          total_sessions: 1,
          avg_fluency_score: data.scores.fluency,
          avg_grammar_score: data.scores.grammar,
          avg_vocabulary_score: data.scores.vocabulary,
          avg_confidence_score: data.scores.confidence,
          best_fluency_score: data.scores.fluency,
          best_grammar_score: data.scores.grammar,
          best_vocabulary_score: data.scores.vocabulary,
          best_confidence_score: data.scores.confidence,
          current_streak: 1,
          last_practice_date: today,
        });
      }

      // 3. Authoritative V1 user_skills initial seeding with baseline scores
      const skillList = [
        { name: 'Fluency', score: data.scores.fluency },
        { name: 'Clarity', score: data.scores.clarity },
        { name: 'Vocabulary', score: data.scores.vocabulary },
        { name: 'Grammar', score: data.scores.grammar },
        { name: 'Confidence', score: data.scores.confidence },
      ];

      for (const s of skillList) {
        await supabase.from('user_skills').upsert({
          user_id: userId,
          skill_name: s.name,
          baseline_score: s.score,
          current_score: s.score,
          best_score: s.score,
          trend: 'steady',
          last_assessed_at: new Date().toISOString(),
        });
      }

      // 4. Seed user_streaks (1 Day active on baseline completion)
      await supabase.from('user_streaks').upsert({
        user_id: userId,
        current_streak: 1,
        longest_streak: 1,
        last_activity_date: today,
        updated_at: new Date().toISOString(),
      });

      // 5. Seed baseline_completed XP event
      await supabase.from('xp_events').upsert({
        user_id: userId,
        event_type: 'baseline_completed',
        xp_amount: 50,
        metadata: { overall_score: data.scores.overallScore },
      });

      // 6. Mark baseline completed in profile metadata and profiles table
      const profileOk = await profileApi.updateProfile({
        baselineCompleted: true,
        communicationStyleFocus: [data.firstFocusArea],
      });

      if (!profileOk) {
        return { success: false, error: 'Could not finalize baseline status in profile.' };
      }

      return { success: true };
    } catch (err) {
      console.error('Failed to submit baseline assessment:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to save baseline assessment.',
      };
    }
  },
};
