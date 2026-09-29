import { supabase } from '@/integrations/supabase/client';
import { UserProgressMetrics } from './progress.types';

export const progressApi = {
  /**
   * Fetches the user's progress metrics using V1 user_streaks, user_skills, and challenge_attempts,
   * falling back to legacy tables if V1 records are absent.
   */
  async getProgress(): Promise<UserProgressMetrics> {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;

    if (!userId) {
      return {
        totalSessions: 0,
        currentStreak: 0,
        bestStreak: 0,
        avgConfidenceScore: 0,
        avgFluencyScore: 0,
        avgGrammarScore: 0,
        avgVocabularyScore: 0,
        overallMasteryScore: 0,
        skills: [],
        activeWeaknesses: [],
        improvingWeaknesses: [],
        recentSessions: [],
      };
    }

    // 1. Authoritative V1 Streak
    let currentStreak = 0;
    let bestStreak = 0;
    const { data: streakRow } = await supabase
      .from('user_streaks')
      .select('current_streak, longest_streak')
      .eq('user_id', userId)
      .maybeSingle();

    if (streakRow) {
      currentStreak = streakRow.current_streak || 0;
      bestStreak = streakRow.longest_streak || 0;
    }

    // 2. Authoritative V1 Skills
    let avgConfidence = 0;
    let avgFluency = 0;
    let avgGrammar = 0;
    let avgVocabulary = 0;
    let avgClarity = 0;

    const { data: userSkills } = await supabase
      .from('user_skills')
      .select('skill_name, current_score, baseline_score, best_score, trend')
      .eq('user_id', userId);

    const skillsMap: Record<string, { current: number; baseline: number; best: number; trend: 'improving' | 'steady' | 'declining' }> = {
      Fluency: { current: 70, baseline: 70, best: 70, trend: 'steady' },
      Clarity: { current: 70, baseline: 70, best: 70, trend: 'steady' },
      Vocabulary: { current: 70, baseline: 70, best: 70, trend: 'steady' },
      Grammar: { current: 70, baseline: 70, best: 70, trend: 'steady' },
      Confidence: { current: 70, baseline: 70, best: 70, trend: 'steady' },
    };

    if (userSkills && userSkills.length > 0) {
      userSkills.forEach((us) => {
        const name = us.skill_name || 'Fluency';
        const current = us.current_score || 70;
        const baseline = us.baseline_score || 70;
        const best = us.best_score || current;
        const trend = (us.trend as 'improving' | 'steady' | 'declining') || (current > baseline ? 'improving' : 'steady');

        skillsMap[name] = { current, baseline, best, trend };

        if (name === 'Confidence') avgConfidence = current;
        if (name === 'Fluency') avgFluency = current;
        if (name === 'Grammar') avgGrammar = current;
        if (name === 'Vocabulary') avgVocabulary = current;
        if (name === 'Clarity') avgClarity = current;
      });
    }

    const skills: UserProgressMetrics['skills'] = Object.entries(skillsMap).map(([name, data]) => ({
      skillName: name,
      currentScore: data.current,
      baselineScore: data.baseline,
      bestScore: data.best,
      trend: data.trend,
      improvementDelta: data.current - data.baseline,
    }));

    // 2b. Authoritative V1 Weaknesses
    const { data: rawWeaknesses } = await supabase
      .from('user_weaknesses')
      .select('*')
      .eq('user_id', userId)
      .order('occurrence_count', { ascending: false });

    const activeWeaknesses: UserProgressMetrics['activeWeaknesses'] = [];
    const improvingWeaknesses: UserProgressMetrics['improvingWeaknesses'] = [];

    (rawWeaknesses || []).forEach((w) => {
      const item = {
        id: w.id,
        label: w.weakness_label || 'Communication Pattern',
        type: w.weakness_type || 'filler_dependency',
        skillName: w.skill_name || 'Fluency',
        status: (w.status as 'ACTIVE' | 'IMPROVING' | 'RESOLVED') || (w.resolved ? 'RESOLVED' : 'ACTIVE'),
        occurrenceCount: w.occurrence_count || 1,
        confidence: w.confidence_level || 75,
        evidenceSummary: w.evidence_summary || undefined,
        lastDetectedAt: w.last_detected_at || w.created_at,
      };

      if (item.status === 'ACTIVE') {
        activeWeaknesses.push(item);
      } else if (item.status === 'IMPROVING') {
        improvingWeaknesses.push(item);
      }
    });

    // Determine current primary focus
    let currentFocus: UserProgressMetrics['currentFocus'] = undefined;
    if (activeWeaknesses.length > 0) {
      const primary = activeWeaknesses[0];
      currentFocus = {
        label: `Reduce ${primary.label}`,
        reason: `Detected across ${primary.occurrenceCount} recent speaking challenge${primary.occurrenceCount > 1 ? 's' : ''}.`,
      };
    } else if (improvingWeaknesses.length > 0) {
      const primary = improvingWeaknesses[0];
      const delta = skills.find((s) => s.skillName.toLowerCase() === primary.skillName.toLowerCase())?.improvementDelta || 6;
      currentFocus = {
        label: `Mastering ${primary.label}`,
        reason: `Your ${primary.skillName.toLowerCase()} improved from baseline by +${Math.max(1, delta)} points.`,
        improvingDelta: delta,
      };
    } else {
      currentFocus = {
        label: 'Pacing & Continuous Flow',
        reason: 'Daily deliberate practice to maintain consistent delivery cadence.',
      };
    }

    // 3. Authoritative V1 Attempts / Sessions
    let recentSessions: UserProgressMetrics['recentSessions'] = [];
    let totalSessions = 0;

    const { data: attempts, count: attemptCount } = await supabase
      .from('challenge_attempts')
      .select(
        `
        id,
        duration_seconds,
        completed_at,
        created_at,
        challenges (title),
        attempt_analysis (overall_score)
      `,
        { count: 'exact' }
      )
      .eq('user_id', userId)
      .eq('status', 'COMPLETED')
      .order('created_at', { ascending: false })
      .limit(10);

    if (attempts && attempts.length > 0) {
      totalSessions = attemptCount || attempts.length;
      recentSessions = attempts.map((att) => {
        const challengeTitle = (att.challenges as { title?: string } | null)?.title || 'Speech Challenge';
        const analysisList = att.attempt_analysis as Array<{ overall_score?: number }> | null;
        const score = analysisList && analysisList.length > 0 ? analysisList[0].overall_score || 0 : 0;
        return {
          id: att.id,
          topic: challengeTitle,
          date: att.completed_at || att.created_at,
          durationSeconds: att.duration_seconds || 0,
          score,
        };
      });
    }

    // Fallback to legacy if no V1 attempts found
    if (recentSessions.length === 0) {
      const { data: legacyProgress } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (legacyProgress) {
        if (currentStreak === 0) currentStreak = legacyProgress.current_streak || 0;
        if (bestStreak === 0) bestStreak = legacyProgress.current_streak || 0;
        if (totalSessions === 0) totalSessions = legacyProgress.total_sessions || 0;
        if (avgConfidence === 0) avgConfidence = Number(legacyProgress.avg_confidence_score || 0);
        if (avgFluency === 0) avgFluency = Number(legacyProgress.avg_fluency_score || 0);
        if (avgGrammar === 0) avgGrammar = Number(legacyProgress.avg_grammar_score || 0);
        if (avgVocabulary === 0) avgVocabulary = Number(legacyProgress.avg_vocabulary_score || 0);
      }

      const { data: legacySessions } = await supabase
        .from('speaking_sessions')
        .select('id, topic, created_at, duration_seconds, confidence_score, fluency_score, grammar_score, vocabulary_score')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (legacySessions && legacySessions.length > 0) {
        recentSessions = legacySessions.map((s) => {
          const scores = [s.confidence_score, s.fluency_score, s.grammar_score, s.vocabulary_score].filter(
            (val): val is number => val !== null && val !== undefined
          );
          const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
          return {
            id: s.id,
            topic: s.topic,
            date: s.created_at,
            durationSeconds: s.duration_seconds || 0,
            score: avg,
          };
        });
      }
    }

    const validScores = [avgConfidence, avgFluency, avgGrammar, avgVocabulary, avgClarity].filter((s) => s > 0);
    const overallMasteryScore =
      validScores.length > 0 ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : 0;

    return {
      totalSessions,
      currentStreak,
      bestStreak: Math.max(bestStreak, currentStreak),
      avgConfidenceScore: Math.round(avgConfidence),
      avgFluencyScore: Math.round(avgFluency),
      avgGrammarScore: Math.round(avgGrammar),
      avgVocabularyScore: Math.round(avgVocabulary),
      overallMasteryScore,
      skills,
      activeWeaknesses,
      improvingWeaknesses,
      currentFocus,
      recentSessions,
    };
  },
};


