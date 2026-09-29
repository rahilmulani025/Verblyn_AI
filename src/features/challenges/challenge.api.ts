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
    activeWeakness?: { type: string; skill?: string; confidence?: number; evidence?: string }
  ): NextRecommendation {
    const current = CHALLENGE_CATALOG.find((c) => c.id === currentChallengeId);

    // 1. Priority 1 & 2: Active Weakness Match with Exercise Format Rotation
    if (activeWeakness && activeWeakness.type) {
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

        const weaknessLabel = activeWeakness.type.replace(/_/g, ' ');
        return {
          nextChallengeId: selectedMatch.id,
          nextChallengeTitle: selectedMatch.title,
          targetSkill: selectedMatch.targetSkill,
          targetedWeakness: activeWeakness.type,
          reason: `Your recent evidence detected "${weaknessLabel}". This targeted drill focuses on correcting that pattern.`,
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

    if (lowestScore < 75) {
      const skillMatches = CHALLENGE_CATALOG.filter(
        (c) => c.id !== currentChallengeId && c.targetSkill === lowestSkill
      );
      if (skillMatches.length > 0) {
        const differentFormat = skillMatches.find((c) => c.challengeType !== current?.challengeType);
        const selectedMatch = differentFormat || skillMatches[0];
        return {
          nextChallengeId: selectedMatch.id,
          nextChallengeTitle: selectedMatch.title,
          targetSkill: selectedMatch.targetSkill,
          reason: `Your ${lowestSkill.toLowerCase()} score (${lowestScore}%) was your lowest area. This drill directly targets ${lowestSkill.toLowerCase()} growth.`,
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
        return {
          nextChallengeId: selectedMatch.id,
          nextChallengeTitle: selectedMatch.title,
          targetSkill: selectedMatch.targetSkill,
          reason: `Tailored for your primary track in ${primaryGoal.replace(/_/g, ' ').toLowerCase()}.`,
        };
      }
    }

    // 4. Priority 5: Next Level in same skill
    if (current) {
      const nextLevelMatch = CHALLENGE_CATALOG.find(
        (c) =>
          c.id !== currentChallengeId &&
          c.targetSkill === current.targetSkill &&
          c.difficultyLevel >= current.difficultyLevel
      );
      if (nextLevelMatch) {
        return {
          nextChallengeId: nextLevelMatch.id,
          nextChallengeTitle: nextLevelMatch.title,
          targetSkill: nextLevelMatch.targetSkill,
          reason: `Great job on ${current.title}. Step up to ${nextLevelMatch.title} to lock in your ${current.targetSkill.toLowerCase()} gains.`,
        };
      }
    }

    // 5. Fallback Balanced Challenge
    const nextItem = CHALLENGE_CATALOG.find((c) => c.id !== currentChallengeId) || CHALLENGE_CATALOG[1];
    return {
      nextChallengeId: nextItem.id,
      nextChallengeTitle: nextItem.title,
      targetSkill: nextItem.targetSkill,
      reason: 'Continue building well-rounded conversational stamina with this drill.',
    };
  },
};
