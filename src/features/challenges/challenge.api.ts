import { supabase } from '@/integrations/supabase/client';
import { CHALLENGE_CATALOG } from './challenge.catalog';
import {
  Challenge,
  ChallengeDifficultyLabel,
  ChallengeScoreBreakdown,
  ChallengeType,
  NextRecommendation,
  TargetSkill,
} from './challenge.types';
import { profileApi } from '@/features/profile/profile.api';
import { trainingPolicy } from '@/features/personalization/trainingPolicy';

import { Tables } from '@/integrations/supabase/types';

export interface DailyMissionResult {
  challenge: Challenge;
  missionDate: string;
  completed: boolean;
  xpValue: number;
}

function mapDbRowToChallenge(row: Tables<'challenges'>): Challenge {
  return {
    id: row.id,
    title: row.title,
    shortDescription: row.short_description,
    whyItMatters: row.why_it_matters,
    targetSkill: row.target_skill as TargetSkill,
    challengeType: row.challenge_type as ChallengeType,
    difficultyLevel: row.difficulty_level,
    difficultyLabel: row.difficulty_label as ChallengeDifficultyLabel,
    durationSeconds: row.duration_seconds,
    prompt: row.prompt,
    instructions: Array.isArray(row.instructions) ? row.instructions : [],
    expectedBehavior: row.expected_behavior,
    xpReward: row.xp_reward,
    goalTags: row.goal_tags || [],
    targetWeakness: row.target_weakness || undefined,
  };
}

let cachedDbChallenges: Challenge[] | null = null;

export const challengeApi = {
  /**
   * Retrieves challenges from V1 challenges table, with memory caching and catalog fallback.
   */
  async getChallenges(): Promise<Challenge[]> {
    if (cachedDbChallenges && cachedDbChallenges.length > 0) {
      return [...cachedDbChallenges];
    }
    try {
      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('is_active', true)
        .order('difficulty_level', { ascending: true });

      if (!error && data && data.length > 0) {
        cachedDbChallenges = data.map(mapDbRowToChallenge);
        return [...cachedDbChallenges];
      }
    } catch (err) {
      console.warn('Could not read from challenges table, using catalog seed:', err);
    }
    return [...CHALLENGE_CATALOG];
  },

  /**
   * Lightweight method for Home and Quick Practice to obtain 2-3 tailored drills
   * without incurring full catalogue over-the-wire overhead.
   */
  async getRecommendedChallenges(
    limit: number = 3,
    options?: {
      excludeId?: string;
      focusSkill?: TargetSkill;
      primaryGoal?: string;
      targetWeakness?: string;
    }
  ): Promise<Challenge[]> {
    const source = cachedDbChallenges && cachedDbChallenges.length > 0
      ? cachedDbChallenges
      : CHALLENGE_CATALOG;

    const remaining = source.filter((c) => c.id !== options?.excludeId);
    const selected: Challenge[] = [];

    // 1. Weakness / Lowest Skill match
    if (options?.targetWeakness) {
      const wMatch = remaining.find(
        (c) =>
          c.targetWeakness?.toLowerCase() === options.targetWeakness?.toLowerCase() ||
          c.targetSkill.toLowerCase() === options.targetWeakness?.toLowerCase()
      );
      if (wMatch) selected.push(wMatch);
    } else if (options?.focusSkill) {
      const sMatch = remaining.find(
        (c) => c.targetSkill.toLowerCase() === options.focusSkill?.toLowerCase()
      );
      if (sMatch) selected.push(sMatch);
    }

    // 2. Goal match
    if (options?.primaryGoal) {
      const gMatch = remaining.find(
        (c) => c.goalTags.includes(options.primaryGoal!) && !selected.some((s) => s.id === c.id)
      );
      if (gMatch) selected.push(gMatch);
    }

    // 3. Variety in another skill
    const varietyMatch = remaining.find(
      (c) => !selected.some((s) => s.id === c.id) && c.targetSkill !== options?.focusSkill
    );
    if (varietyMatch) selected.push(varietyMatch);

    // 4. Fill to limit
    for (const c of remaining) {
      if (selected.length >= limit) break;
      if (!selected.some((s) => s.id === c.id)) {
        selected.push(c);
      }
    }

    return selected.slice(0, limit);
  },

  /**
   * Retrieves a challenge by ID.
   */
  async getChallengeById(id: string): Promise<Challenge | null> {
    try {
      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        return mapDbRowToChallenge(data);
      }
    } catch (err) {
      console.warn('Error fetching challenge by ID:', err);
    }
    const found = CHALLENGE_CATALOG.find((c) => c.id === id);
    return found || null;
  },

  /**
   * Authoritative daily mission from daily_missions table (UNIQUE per user/date).
   */
  async getDailyMission(): Promise<DailyMissionResult | null> {
    const today = new Date().toISOString().split('T')[0];
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;

    if (!user) {
      return {
        challenge: CHALLENGE_CATALOG[0],
        missionDate: today,
        completed: false,
        xpValue: 50,
      };
    }

    const profile = await profileApi.getProfile();
    const preferred = this.selectMissionForUser(profile);

    try {
      // 1. Try atomic server RPC
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'get_or_create_daily_mission',
        {
          p_mission_date: today,
          p_preferred_challenge_id: preferred.id,
          p_focus_skill: preferred.targetSkill,
        }
      );

      if (!rpcError && rpcData) {
        const missionRow = rpcData as unknown as Tables<'daily_missions'>;
        const challenge = (await this.getChallengeById(missionRow.challenge_id)) || preferred;
        return {
          challenge,
          missionDate: missionRow.mission_date || today,
          completed: Boolean(missionRow.completed),
          xpValue: Number(missionRow.reward_xp) || 50,
        };
      }

      // 2. Direct table fallback if RPC not installed yet
      const { data: existingMission } = await supabase
        .from('daily_missions')
        .select('*')
        .eq('user_id', user.id)
        .eq('mission_date', today)
        .maybeSingle();

      if (existingMission) {
        const challenge = (await this.getChallengeById(existingMission.challenge_id)) || preferred;
        return {
          challenge,
          missionDate: existingMission.mission_date,
          completed: Boolean(existingMission.completed),
          xpValue: existingMission.reward_xp || 50,
        };
      }

      // Insert new daily mission
      const { data: newMission } = await supabase
        .from('daily_missions')
        .insert({
          user_id: user.id,
          mission_date: today,
          challenge_id: preferred.id,
          focus_skill: preferred.targetSkill,
          reward_xp: preferred.xpReward + 20,
        })
        .select('*')
        .single();

      if (newMission) {
        return {
          challenge: preferred,
          missionDate: newMission.mission_date,
          completed: false,
          xpValue: newMission.reward_xp || 50,
        };
      }
    } catch (err) {
      console.error('Error fetching authoritative daily mission:', err);
    }

    return {
      challenge: preferred,
      missionDate: today,
      completed: false,
      xpValue: 50,
    };
  },

  /**
   * Deterministic selection rule:
   * 1. Active weakness from baseline / profile
   * 2. Primary user goal
   * 3. Balanced catalog challenge
   */
  selectMissionForUser(profile: { primaryGoal?: string | null; communicationStyleFocus?: string[] } | null): Challenge {
    const weakness = profile?.communicationStyleFocus?.[0];
    const goal = profile?.primaryGoal;

    if (weakness) {
      const match = CHALLENGE_CATALOG.find((c) => c.targetWeakness === weakness);
      if (match) return match;
    }

    if (goal) {
      const match = CHALLENGE_CATALOG.find((c) => c.goalTags.includes(goal));
      if (match) return match;
    }

    return CHALLENGE_CATALOG[0];
  },

  /**
   * Generates the personalized next challenge recommendation following adaptive priority:
   * 1. Active high/medium confidence weakness
   * 2. Lowest current skill
   * 3. Primary goal alignment
   * 4. Stepped difficulty in same skill
   * 5. Balanced challenge
   */
  getRecommendedNextChallenge(
    currentChallengeId: string,
    scores?: ChallengeScoreBreakdown,
    primaryGoal?: string,
    activeWeakness?: { type: string; skill?: string; confidence?: number; evidence?: string; status?: 'ACTIVE' | 'IMPROVING' | 'RESOLVED'; occurrenceCount?: number },
    experienceLevel: import('@/features/personalization/personalization.types').ExperienceLevel = '0-2'
  ): NextRecommendation {
    const current = CHALLENGE_CATALOG.find((c) => c.id === currentChallengeId);

    // Derive deterministic adaptive state from attempt scores
    const overallScore = typeof scores?.overallScore === 'number' ? scores.overallScore : 75;
    const currentSkillScores: Record<TargetSkill, number> = {
      Fluency: typeof scores?.fluency === 'number' ? scores.fluency : 70,
      Clarity: typeof scores?.clarity === 'number' ? scores.clarity : 70,
      Vocabulary: typeof scores?.vocabulary === 'number' ? scores.vocabulary : 70,
      Grammar: typeof scores?.grammar === 'number' ? scores.grammar : 70,
      Confidence: typeof scores?.confidence === 'number' ? scores.confidence : 70,
    };

    let targetSkill: TargetSkill = 'Clarity';
    const targetWeakness: string | undefined = activeWeakness?.type;

    if (activeWeakness?.skill) {
      targetSkill = activeWeakness.skill as TargetSkill;
    } else if (scores) {
      let lowestScore = 100;
      for (const [s, val] of Object.entries(currentSkillScores) as Array<[TargetSkill, number]>) {
        if (val < lowestScore) {
          lowestScore = val;
          targetSkill = s;
        }
      }
    }

    const pseudoState = {
      userId: 'active_recommendation',
      primaryGoal,
      skills: currentSkillScores,
      activeWeaknesses: activeWeakness ? [{
        type: activeWeakness.type,
        label: activeWeakness.type.replace(/_/g, ' '),
        skillName: targetSkill,
        occurrenceCount: activeWeakness.occurrenceCount || 1,
        status: activeWeakness.status || 'ACTIVE',
      }] : [],
      recentAttempts: [{
        challengeId: currentChallengeId,
        title: current?.title || 'Current Challenge',
        targetSkill,
        score: overallScore,
        category: current?.challengeType,
      }],
    };

    const adaptiveState = trainingPolicy.determineAdaptiveState(pseudoState, targetSkill, activeWeakness ? {
      type: activeWeakness.type,
      status: activeWeakness.status || 'ACTIVE',
      occurrenceCount: activeWeakness.occurrenceCount || 1,
    } : undefined);

    const baseDiff = current?.difficultyLevel || 2;
    const { difficulty } = trainingPolicy.adjustDifficulty(baseDiff, adaptiveState, experienceLevel);
    const scaffoldingLevel = trainingPolicy.calculateScaffolding(adaptiveState, difficulty, experienceLevel, overallScore);

    // 1. Priority 1 & 2: Active Weakness Match with Exercise Format Rotation
    if (activeWeakness && activeWeakness.type && adaptiveState !== 'MASTERED') {
      const normalizedWeakness = activeWeakness.type.toLowerCase().trim();
      const weaknessMatches = CHALLENGE_CATALOG.filter(
        (c) =>
          c.id !== currentChallengeId &&
          (c.targetWeakness?.toLowerCase() === normalizedWeakness ||
            c.targetWeakness?.toLowerCase().includes(normalizedWeakness.replace(/_/g, ' ')) ||
            normalizedWeakness.includes(c.targetWeakness?.toLowerCase() || '') ||
            (c.targetSkill && activeWeakness.skill && c.targetSkill.toLowerCase() === activeWeakness.skill.toLowerCase()))
      );

      if (weaknessMatches.length > 0) {
        // Prefer a different challenge type/exercise format than the current one for variety
        const differentFormat = weaknessMatches.find((c) => c.challengeType !== current?.challengeType);
        const selectedMatch = differentFormat || weaknessMatches[0];

        const whyThisNext = trainingPolicy.synthesizeWhyThisNext(
          adaptiveState,
          selectedMatch.targetSkill,
          activeWeakness.type,
          undefined,
          overallScore,
          scaffoldingLevel,
          difficulty
        );

        return {
          nextChallengeId: selectedMatch.id,
          nextChallengeTitle: selectedMatch.title,
          targetSkill: selectedMatch.targetSkill,
          targetedWeakness: activeWeakness.type,
          adaptiveState,
          difficulty,
          scaffoldingLevel,
          whyThisNext,
          category: selectedMatch.challengeType,
          reason: whyThisNext,
        };
      }
    }

    // 2. Priority 3: Lowest current skill with Exercise Format Variety
    let lowestSkill: TargetSkill = 'Clarity';
    let lowestScore = 100;

    if (scores) {
      const skillMap: Array<{ skill: TargetSkill; score: number }> = [
        { skill: 'Fluency', score: scores.fluency },
        { skill: 'Clarity', score: scores.clarity },
        { skill: 'Vocabulary', score: scores.vocabulary },
        { skill: 'Grammar', score: scores.grammar },
        { skill: 'Confidence', score: scores.confidence },
      ];

      for (const item of skillMap) {
        if (item.score < lowestScore) {
          lowestScore = item.score;
          lowestSkill = item.skill;
        }
      }
    }

    if (lowestScore < 75 || adaptiveState === 'MASTERED' || adaptiveState === 'PROGRESS') {
      const skillMatches = CHALLENGE_CATALOG.filter(
        (c) => c.id !== currentChallengeId && c.targetSkill === lowestSkill
      );
      if (skillMatches.length > 0) {
        const differentFormat = skillMatches.find((c) => c.challengeType !== current?.challengeType);
        const selectedMatch = differentFormat || skillMatches[0];

        const whyThisNext = trainingPolicy.synthesizeWhyThisNext(
          adaptiveState,
          lowestSkill,
          undefined,
          undefined,
          overallScore,
          scaffoldingLevel,
          difficulty
        );

        return {
          nextChallengeId: selectedMatch.id,
          nextChallengeTitle: selectedMatch.title,
          targetSkill: selectedMatch.targetSkill,
          adaptiveState,
          difficulty,
          scaffoldingLevel,
          whyThisNext,
          category: selectedMatch.challengeType,
          reason: whyThisNext,
        };
      }
    }

    // 3. Priority 4: Primary Goal Alignment
    if (primaryGoal) {
      const goalMatches = CHALLENGE_CATALOG.filter(
        (c) => c.id !== currentChallengeId && c.goalTags.includes(primaryGoal)
      );
      if (goalMatches.length > 0) {
        const differentFormat = goalMatches.find((c) => c.challengeType !== current?.challengeType);
        const selectedMatch = differentFormat || goalMatches[0];

        const whyThisNext = trainingPolicy.synthesizeWhyThisNext(
          adaptiveState,
          selectedMatch.targetSkill,
          undefined,
          undefined,
          overallScore,
          scaffoldingLevel,
          difficulty
        );

        return {
          nextChallengeId: selectedMatch.id,
          nextChallengeTitle: selectedMatch.title,
          targetSkill: selectedMatch.targetSkill,
          adaptiveState,
          difficulty,
          scaffoldingLevel,
          whyThisNext,
          category: selectedMatch.challengeType,
          reason: whyThisNext,
        };
      }
    }

    // 4. Priority 5: Next Level in same skill
    if (current) {
      const nextLevelMatch = CHALLENGE_CATALOG.find(
        (c) =>
          c.id !== currentChallengeId &&
          c.targetSkill === current.targetSkill &&
          c.difficultyLevel >= difficulty
      );
      if (nextLevelMatch) {
        const whyThisNext = trainingPolicy.synthesizeWhyThisNext(
          adaptiveState,
          nextLevelMatch.targetSkill,
          undefined,
          undefined,
          overallScore,
          scaffoldingLevel,
          difficulty
        );

        return {
          nextChallengeId: nextLevelMatch.id,
          nextChallengeTitle: nextLevelMatch.title,
          targetSkill: nextLevelMatch.targetSkill,
          adaptiveState,
          difficulty,
          scaffoldingLevel,
          whyThisNext,
          category: nextLevelMatch.challengeType,
          reason: whyThisNext,
        };
      }
    }

    // 5. Fallback Balanced Challenge
    const nextItem = CHALLENGE_CATALOG.find((c) => c.id !== currentChallengeId) || CHALLENGE_CATALOG[1];
    const fallbackWhy = trainingPolicy.synthesizeWhyThisNext(
      adaptiveState,
      nextItem.targetSkill,
      undefined,
      undefined,
      overallScore,
      scaffoldingLevel,
      difficulty
    );

    return {
      nextChallengeId: nextItem.id,
      nextChallengeTitle: nextItem.title,
      targetSkill: nextItem.targetSkill,
      adaptiveState,
      difficulty,
      scaffoldingLevel,
      whyThisNext: fallbackWhy,
      category: nextItem.challengeType,
      reason: fallbackWhy,
    };
  },
};

