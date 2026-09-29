import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';
import {
  AttemptStatus,
  Challenge,
  ChallengeAttempt,
  ChallengeScoreBreakdown,
  WeaknessCandidate,
  XpBreakdown,
} from './challenge.types';
import { SpeechMetricsSummary } from '@/lib/metrics';
import { challengeApi } from './challenge.api';
import { profileApi } from '@/features/profile/profile.api';

interface RpcCompletionResult {
  status: string;
  attempt_id: string;
  earned_xp: {
    base: number;
    dailyBonus: number;
    weaknessBonus: number;
    personalBestBonus: number;
    total: number;
  };
  streak: number;
}

export interface SubmitAttemptInput {
  attemptId?: string;
  challenge: Challenge;
  transcript: string;
  durationSeconds: number;
  metrics: SpeechMetricsSummary;
  isDailyMission?: boolean;
}

export const attemptApi = {
  /**
   * Initializes a new challenge attempt record in challenge_attempts table.
   */
  async createAttempt(challengeId: string): Promise<{ attemptId: string } | null> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      if (!userId) return null;

      const { data, error } = await supabase
        .from('challenge_attempts')
        .insert({
          user_id: userId,
          challenge_id: challengeId,
          status: 'STARTED',
          started_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) {
        console.warn('Error inserting challenge_attempts, generating client UUID:', error);
        return { attemptId: crypto.randomUUID() };
      }

      return { attemptId: data.id };
    } catch (err) {
      console.error('Error creating attempt:', err);
      return { attemptId: crypto.randomUUID() };
    }
  },

  /**
   * Challenge-specific deterministic evaluation formula.
   */
  evaluateChallengeMetrics(
    challenge: Challenge,
    metrics: SpeechMetricsSummary
  ): {
    scores: ChallengeScoreBreakdown;
    whatYouDidWell: string[];
    improveNext: string[];
  } {
    const whatYouDidWell: string[] = [];
    const improveNext: string[] = [];

    const targetWpm = 140;
    const wpmDiff = Math.abs(metrics.wpm - targetWpm);
    let fluency = Math.max(35, Math.min(98, Math.round(96 - wpmDiff * 0.7)));

    let grammar = Math.max(
      35,
      Math.min(
        98,
        Math.round(
          95 -
            metrics.fillerStats.fillerPercentage * 4.5 -
            metrics.repetitionStats.total * 4
        )
      )
    );

    let vocabulary = Math.max(
      35,
      Math.min(98, Math.round(metrics.vocabularyDiversity * 55 + Math.min(40, metrics.wordCount * 0.6)))
    );

    const avgLenDiff = Math.abs(metrics.averageSentenceLength - 14);
    let clarity = Math.max(35, Math.min(98, Math.round(92 - avgLenDiff * 2.2)));

    let confidence = Math.max(35, Math.min(98, Math.round(fluency * 0.5 + grammar * 0.5)));

    // Challenge-Specific Evidence Interpretation
    if (challenge.challengeType === 'timed_speaking' || challenge.id.includes('filler')) {
      if (metrics.fillerStats.total === 0 && metrics.wordCount > 10) {
        fluency = Math.min(98, fluency + 5);
        grammar = Math.min(98, grammar + 5);
        whatYouDidWell.push('Flawless verbal discipline: zero filler words detected during speech.');
      } else if (metrics.fillerStats.total > 0) {
        grammar = Math.max(30, grammar - 5);
        improveNext.push(
          `Eliminate ${metrics.fillerStats.total} verbal pause (${Object.keys(metrics.fillerStats.breakdown).join(', ')}) with a 1-second silent breath.`
        );
      }
    } else if (challenge.challengeType === 'explain_simply') {
      if (metrics.averageSentenceLength <= 15 && metrics.wordCount > 15) {
        clarity = Math.min(98, clarity + 6);
        whatYouDidWell.push('Crisp sentence structuring kept explanations concise and easy to follow.');
      } else if (metrics.averageSentenceLength > 18) {
        clarity = Math.max(30, clarity - 6);
        improveNext.push('Sentences ran slightly long. Break multi-clause ideas into two short sentences.');
      }
    } else if (challenge.targetSkill === 'Vocabulary') {
      if (metrics.vocabularyDiversity >= 0.65 && metrics.wordCount > 15) {
        vocabulary = Math.min(98, vocabulary + 6);
        whatYouDidWell.push('Rich lexical variety demonstrated with descriptive, non-repetitive vocabulary.');
      } else if (metrics.vocabularyDiversity < 0.5) {
        vocabulary = Math.max(30, vocabulary - 5);
        improveNext.push('Incorporate more varied, precise descriptors instead of repeating common words.');
      }
    } else if (challenge.targetSkill === 'Confidence' || challenge.challengeType === 'concise_answer') {
      if (metrics.wpm >= 125 && metrics.wpm <= 155 && metrics.fillerStats.total === 0) {
        confidence = Math.min(98, confidence + 6);
        whatYouDidWell.push('Firm, assertive pacing without hesitant pause sounds.');
      } else if (metrics.wpm < 120 && metrics.wordCount > 5) {
        confidence = Math.max(30, confidence - 4);
        improveNext.push('Increase delivery tempo toward 135 WPM to convey stronger conviction.');
      }
    }

    if (whatYouDidWell.length === 0) {
      whatYouDidWell.push('Steady vocal capture with consistent spoken output.');
    }
    if (improveNext.length === 0) {
      improveNext.push('Maintain daily drill consistency to build natural conversational reflexes.');
    }

    const overallScore = Math.round(
      fluency * 0.25 + clarity * 0.25 + vocabulary * 0.2 + grammar * 0.15 + confidence * 0.15
    );

    return {
      scores: {
        overallScore,
        fluency,
        clarity,
        vocabulary,
        grammar,
        confidence,
      },
      whatYouDidWell,
      improveNext,
    };
  },

  /**
   * Persists a completed challenge attempt using authoritative V1 tables:
   * challenge_attempts, speech_metrics, attempt_analysis, xp_events, user_skills, user_streaks.
   */
  async submitChallengeAttempt(input: SubmitAttemptInput): Promise<ChallengeAttempt | null> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user) return null;

      const userId = user.id;
      const today = new Date().toISOString().split('T')[0];
      const profile = await profileApi.getProfile();

      // 1. Evaluate Metrics
      const evaluation = this.evaluateChallengeMetrics(input.challenge, input.metrics);

      // 2. Fetch User Progress for Personal Best check
      const { data: progress } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      const previousBestScore = Math.max(
        progress?.best_fluency_score || 0,
        progress?.best_grammar_score || 0,
        progress?.best_vocabulary_score || 0,
        progress?.best_confidence_score || 0
      );

      const isPersonalBest = evaluation.scores.overallScore > previousBestScore && previousBestScore > 0;
      const isWeaknessTarget = Boolean(
        input.challenge.targetWeakness &&
          profile?.communicationStyleFocus?.includes(input.challenge.targetWeakness)
      );

      // Ensure attempt ID exists
      let attemptId = input.attemptId;
      if (!attemptId) {
        const created = await this.createAttempt(input.challenge.id);
        attemptId = created?.attemptId || crypto.randomUUID();
      }

      // A. Pre-save attempt with status 'ANALYZING'
      await supabase.from('challenge_attempts').upsert({
        id: attemptId,
        user_id: userId,
        challenge_id: input.challenge.id,
        status: 'ANALYZING',
        duration_seconds: input.durationSeconds,
        transcript: input.transcript,
        word_count: input.metrics.wordCount,
        words_per_minute: input.metrics.wpm,
      });

      // B. Invoke Supabase Edge Function: analyze-attempt
      try {
        const { data: edgeData, error: edgeErr } = await supabase.functions.invoke('analyze-attempt', {
          body: {
            attempt_id: attemptId,
            is_daily_mission: Boolean(input.isDailyMission),
            is_weakness: isWeaknessTarget,
            is_personal_best: previousBestScore > 0,
          },
        });

        if (!edgeErr && edgeData && (edgeData.status === 'COMPLETED' || edgeData.status === 'ALREADY_COMPLETED')) {
          const analysis = edgeData.analysis;
          const prog = edgeData.progression;

          const scores: ChallengeScoreBreakdown = {
            overallScore: analysis.overall_score || 78,
            fluency: analysis.skills?.fluency || 75,
            clarity: analysis.skills?.clarity || 75,
            vocabulary: analysis.skills?.vocabulary || 75,
            grammar: analysis.skills?.grammar || 75,
            confidence: analysis.skills?.confidence || 75,
          };

          const rawStrengths = Array.isArray(analysis.strengths) ? analysis.strengths : [];
          const rawImprovements = Array.isArray(analysis.improvements) ? analysis.improvements : [];

          const whatYouDidWell: string[] = rawStrengths
            .map((s: unknown) =>
              typeof s === 'string'
                ? s
                : (s as { detail?: string; title?: string })?.detail || (s as { title?: string })?.title || ''
            )
            .filter(Boolean);

          const improveNext: string[] = rawImprovements
            .map((s: unknown) =>
              typeof s === 'string'
                ? s
                : (s as { action?: string; detail?: string; title?: string })?.action ||
                  (s as { detail?: string })?.detail ||
                  ''
            )
            .filter(Boolean);

          const weaknessCandidates = Array.isArray(analysis.weakness_candidates) ? analysis.weakness_candidates : [];
          const primaryWeakness = weaknessCandidates.length > 0 ? weaknessCandidates[0] : undefined;

          const recommendation = challengeApi.getRecommendedNextChallenge(
            input.challenge.id,
            scores,
            profile?.primaryGoal || undefined,
            primaryWeakness
          );

          return {
            id: attemptId,
            challengeId: input.challenge.id,
            userId,
            status: 'COMPLETED',
            startedAt: new Date(Date.now() - input.durationSeconds * 1000).toISOString(),
            completedAt: new Date().toISOString(),
            durationSeconds: input.durationSeconds,
            transcript: input.transcript,
            metrics: input.metrics,
            scores,
            whatYouDidWell: whatYouDidWell.length > 0 ? whatYouDidWell : evaluation.whatYouDidWell,
            improveNext: improveNext.length > 0 ? improveNext : evaluation.improveNext,
            coachingStrengths: rawStrengths,
            coachingImprovements: rawImprovements,
            coachMessage: analysis.coach_message,
            recommendedFocus: analysis.recommended_focus,
            weaknessCandidates,
            analysisVersion: analysis.analysis_version || 'ai-v1',
            xpEarned: prog?.earned_xp || {
              base: input.challenge.xpReward || 30,
              dailyBonus: input.isDailyMission ? 20 : 0,
              weaknessBonus: isWeaknessTarget ? 10 : 0,
              personalBestBonus: 0,
              total: (input.challenge.xpReward || 30) + (input.isDailyMission ? 20 : 0),
            },
            recommendation,
            isDailyMission: input.isDailyMission,
          };
        }
      } catch (edgeCallErr) {
        console.warn('Edge function analyze-attempt fallback:', edgeCallErr);
      }

      // C. Fallback to persist_attempt_analysis_and_progression RPC
      try {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc(
          'persist_attempt_analysis_and_progression',
          {
            p_attempt_id: attemptId,
            p_scores: evaluation.scores as unknown as Json,
            p_metrics: input.metrics as unknown as Json,
            p_strengths: evaluation.whatYouDidWell as unknown as Json,
            p_improvements: evaluation.improveNext as unknown as Json,
            p_weakness_candidates: [] as unknown as Json,
            p_coach_message: `Solid effort on ${input.challenge.title}. Keep practicing daily!`,
            p_recommended_focus: input.challenge.targetSkill,
            p_analysis_version: 'deterministic-v1',
            p_is_daily_mission: Boolean(input.isDailyMission),
            p_is_weakness: isWeaknessTarget,
            p_is_personal_best: isPersonalBest,
          }
        );

        if (!rpcErr && rpcRes) {
          const res = rpcRes as unknown as RpcCompletionResult;
          const recommendation = challengeApi.getRecommendedNextChallenge(
            input.challenge.id,
            evaluation.scores,
            profile?.primaryGoal || undefined
          );

          return {
            id: attemptId,
            challengeId: input.challenge.id,
            userId,
            status: 'COMPLETED',
            startedAt: new Date(Date.now() - input.durationSeconds * 1000).toISOString(),
            completedAt: new Date().toISOString(),
            durationSeconds: input.durationSeconds,
            transcript: input.transcript,
            metrics: input.metrics,
            scores: evaluation.scores,
            whatYouDidWell: evaluation.whatYouDidWell,
            improveNext: evaluation.improveNext,
            coachMessage: `Solid effort on ${input.challenge.title}. Keep practicing daily!`,
            recommendedFocus: input.challenge.targetSkill,
            analysisVersion: 'deterministic-v1',
            xpEarned: res.earned_xp || {
              base: input.challenge.xpReward || 30,
              dailyBonus: input.isDailyMission ? 20 : 0,
              weaknessBonus: isWeaknessTarget ? 10 : 0,
              personalBestBonus: isPersonalBest ? 25 : 0,
              total: (input.challenge.xpReward || 30) + (input.isDailyMission ? 20 : 0),
            },
            recommendation,
            isDailyMission: input.isDailyMission,
          };
        }
      } catch (rpcCallErr) {
        console.warn('RPC persist_attempt_analysis_and_progression fallback to table writes:', rpcCallErr);
      }

      // 4. Client-side Table Writes Fallback (Direct Table Insertion)
      // A. Update challenge_attempts
      await supabase
        .from('challenge_attempts')
        .upsert({
          id: attemptId,
          user_id: userId,
          challenge_id: input.challenge.id,
          status: 'COMPLETED',
          duration_seconds: input.durationSeconds,
          transcript: input.transcript,
          word_count: input.metrics.wordCount,
          words_per_minute: input.metrics.wpm,
          completed_at: new Date().toISOString(),
        });

      // B. Insert speech_metrics
      await supabase.from('speech_metrics').upsert({
        attempt_id: attemptId,
        duration_seconds: input.durationSeconds,
        word_count: input.metrics.wordCount,
        words_per_minute: input.metrics.wpm,
        filler_count: input.metrics.fillerStats.total,
        repetition_count: input.metrics.repetitionStats.total,
        sentence_count: input.metrics.sentenceCount,
        average_sentence_length: input.metrics.averageSentenceLength,
        vocabulary_diversity: input.metrics.vocabularyDiversity,
      });

      // C. Insert attempt_analysis
      await supabase.from('attempt_analysis').upsert({
        attempt_id: attemptId,
        overall_score: evaluation.scores.overallScore,
        fluency_score: evaluation.scores.fluency,
        clarity_score: evaluation.scores.clarity,
        vocabulary_score: evaluation.scores.vocabulary,
        grammar_score: evaluation.scores.grammar,
        confidence_score: evaluation.scores.confidence,
        strengths: evaluation.whatYouDidWell as unknown as Json,
        improvements: evaluation.improveNext as unknown as Json,
        analysis_version: 'deterministic-v1',
      });

      // D. Idempotent XP Events
      const baseXp = input.challenge.xpReward || 30;
      const dailyBonus = input.isDailyMission ? 20 : 0;
      const weaknessBonus = isWeaknessTarget ? 10 : 0;
      const personalBestBonus = isPersonalBest ? 25 : 0;
      const totalEarnedXp = baseXp + dailyBonus + weaknessBonus + personalBestBonus;

      await supabase.from('xp_events').upsert({
        user_id: userId,
        event_type: 'challenge_completed',
        xp_amount: baseXp,
        attempt_id: attemptId,
        metadata: { challenge_id: input.challenge.id },
      });

      if (input.isDailyMission) {
        await supabase.from('xp_events').upsert({
          user_id: userId,
          event_type: 'daily_mission_completed',
          xp_amount: dailyBonus,
          attempt_id: attemptId,
          metadata: { mission_date: today },
        });

        await supabase
          .from('daily_missions')
          .update({ completed: true, completed_at: new Date().toISOString() })
          .eq('user_id', userId)
          .eq('mission_date', today);
      }

      // E. Update user_skills
      const skillsToUpdate = [
        { name: 'Fluency', score: evaluation.scores.fluency },
        { name: 'Clarity', score: evaluation.scores.clarity },
        { name: 'Vocabulary', score: evaluation.scores.vocabulary },
        { name: 'Grammar', score: evaluation.scores.grammar },
        { name: 'Confidence', score: evaluation.scores.confidence },
      ];

      for (const s of skillsToUpdate) {
        await supabase.from('user_skills').upsert({
          user_id: userId,
          skill_name: s.name,
          current_score: s.score,
          best_score: s.score,
          last_assessed_at: new Date().toISOString(),
        });
      }

      // F. Update user_streaks
      const { data: streakRow } = await supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      let currentStreak = streakRow?.current_streak || 1;
      const lastActivity = streakRow?.last_activity_date;

      if (!lastActivity || lastActivity < today) {
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        if (lastActivity === yesterday) {
          currentStreak = (streakRow?.current_streak || 0) + 1;
        } else if (lastActivity !== today) {
          currentStreak = 1;
        }
      }

      await supabase.from('user_streaks').upsert({
        user_id: userId,
        current_streak: currentStreak,
        longest_streak: Math.max(currentStreak, streakRow?.longest_streak || 1),
        last_activity_date: today,
        updated_at: new Date().toISOString(),
      });

      // G. Secondary legacy table write (speaking_sessions & user_progress)
      await supabase.from('speaking_sessions').insert({
        user_id: userId,
        topic: `Challenge: ${input.challenge.title}`,
        transcript: input.transcript,
        duration_seconds: input.durationSeconds,
        confidence_score: evaluation.scores.confidence,
        fluency_score: evaluation.scores.fluency,
        grammar_score: evaluation.scores.grammar,
        vocabulary_score: evaluation.scores.vocabulary,
        feedback: {
          attempt_id: attemptId,
          challenge_id: input.challenge.id,
          scores: evaluation.scores,
          metrics: input.metrics,
        },
      });

      const recommendation = challengeApi.getRecommendedNextChallenge(
        input.challenge.id,
        evaluation.scores,
        profile?.primaryGoal || undefined
      );

      return {
        id: attemptId,
        challengeId: input.challenge.id,
        userId,
        status: 'COMPLETED',
        startedAt: new Date(Date.now() - input.durationSeconds * 1000).toISOString(),
        completedAt: new Date().toISOString(),
        durationSeconds: input.durationSeconds,
        transcript: input.transcript,
        metrics: input.metrics,
        scores: evaluation.scores,
        whatYouDidWell: evaluation.whatYouDidWell,
        improveNext: evaluation.improveNext,
        xpEarned: {
          base: baseXp,
          dailyBonus,
          weaknessBonus,
          personalBestBonus,
          total: totalEarnedXp,
        },
        recommendation,
        isDailyMission: input.isDailyMission,
      };
    } catch (err) {
      console.error('Error submitting challenge attempt:', err);
      return null;
    }
  },

  /**
   * Reconstructs an attempt from authoritative V1 database tables on page refresh.
   */
  async getAttemptById(attemptId: string): Promise<ChallengeAttempt | null> {
    try {
      const { data: attemptRow, error: attemptErr } = await supabase
        .from('challenge_attempts')
        .select('*')
        .eq('id', attemptId)
        .maybeSingle();

      if (attemptErr || !attemptRow) return null;

      const challenge = await challengeApi.getChallengeById(attemptRow.challenge_id);
      if (!challenge) return null;

      // Fetch analysis & metrics
      const { data: analysisRow } = await supabase
        .from('attempt_analysis')
        .select('*')
        .eq('attempt_id', attemptId)
        .maybeSingle();

      const { data: metricsRow } = await supabase
        .from('speech_metrics')
        .select('*')
        .eq('attempt_id', attemptId)
        .maybeSingle();

      const { data: xpRows } = await supabase
        .from('xp_events')
        .select('*')
        .eq('attempt_id', attemptId);

      let totalXp = 0;
      let dailyBonus = 0;
      let weaknessBonus = 0;
      let personalBestBonus = 0;

      (xpRows || []).forEach((x) => {
        totalXp += x.xp_amount;
        if (x.event_type === 'daily_mission_completed') dailyBonus = x.xp_amount;
        if (x.event_type === 'weakness_bonus') weaknessBonus = x.xp_amount;
        if (x.event_type === 'personal_best') personalBestBonus = x.xp_amount;
      });

      const scores: ChallengeScoreBreakdown = analysisRow
        ? {
            overallScore: analysisRow.overall_score,
            fluency: analysisRow.fluency_score,
            clarity: analysisRow.clarity_score,
            vocabulary: analysisRow.vocabulary_score,
            grammar: analysisRow.grammar_score,
            confidence: analysisRow.confidence_score,
          }
        : {
            overallScore: 80,
            fluency: 80,
            clarity: 80,
            vocabulary: 80,
            grammar: 80,
            confidence: 80,
          };

      const rawStrengths = Array.isArray(analysisRow?.strengths) ? analysisRow.strengths : [];
      const rawImprovements = Array.isArray(analysisRow?.improvements) ? analysisRow.improvements : [];

      const whatYouDidWell: string[] = rawStrengths
        .map((s: unknown) =>
          typeof s === 'string'
            ? s
            : (s as { detail?: string; title?: string })?.detail || (s as { title?: string })?.title || ''
        )
        .filter(Boolean);

      const improveNext: string[] = rawImprovements
        .map((s: unknown) =>
          typeof s === 'string'
            ? s
            : (s as { action?: string; detail?: string; title?: string })?.action ||
              (s as { detail?: string })?.detail ||
              ''
        )
        .filter(Boolean);

      const weaknessCandidates = Array.isArray(analysisRow?.weakness_candidates)
        ? (analysisRow.weakness_candidates as unknown as WeaknessCandidate[])
        : [];
      const primaryWeakness = weaknessCandidates.length > 0 ? weaknessCandidates[0] : undefined;

      const recommendation = challengeApi.getRecommendedNextChallenge(
        challenge.id,
        scores,
        undefined,
        primaryWeakness
      );

      return {
        id: attemptId,
        challengeId: challenge.id,
        userId: attemptRow.user_id,
        status: (attemptRow.status || 'COMPLETED') as AttemptStatus,
        startedAt: attemptRow.started_at,
        completedAt: attemptRow.completed_at || undefined,
        durationSeconds: attemptRow.duration_seconds || 0,
        transcript: attemptRow.transcript || '',
        scores,
        whatYouDidWell: whatYouDidWell.length > 0 ? whatYouDidWell : ['Clear and consistent vocal delivery.'],
        improveNext: improveNext.length > 0 ? improveNext : ['Maintain daily practice to build conversational flow.'],
        coachingStrengths: rawStrengths,
        coachingImprovements: rawImprovements,
        coachMessage: analysisRow?.coach_message || undefined,
        recommendedFocus: analysisRow?.recommended_focus || undefined,
        weaknessCandidates,
        analysisVersion: analysisRow?.analysis_version || 'ai-v1',
        xpEarned: {
          base: challenge.xpReward || 30,
          dailyBonus,
          weaknessBonus,
          personalBestBonus,
          total: totalXp || challenge.xpReward || 30,
        },
        recommendation,
      };
    } catch (err) {
      console.error('Error fetching attempt by ID:', err);
      return null;
    }
  },

  /**
   * Fetches latest attempt for a given challenge.
   */
  async getLatestAttemptForChallenge(challengeId: string): Promise<ChallengeAttempt | null> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      if (!userId) return null;

      const { data, error } = await supabase
        .from('challenge_attempts')
        .select('id')
        .eq('user_id', userId)
        .eq('challenge_id', challengeId)
        .eq('status', 'COMPLETED')
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        return this.getAttemptById(data.id);
      }
    } catch (err) {
      console.error('Error fetching latest attempt:', err);
    }
    return null;
  },
};
