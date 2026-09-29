import { supabase } from '@/integrations/supabase/client';
import { challengeApi } from '@/features/challenges/challenge.api';
import { profileApi } from '@/features/profile/profile.api';
import { progressApi } from '@/features/progress/progress.api';
import { GOAL_PRESETS } from '@/features/home/goals.api';
import { calculateLevelFromXp } from '@/features/gamification/gamification.types';
import { DayProgress, HomeLearningPayload } from './home.types';
import { Challenge, TargetSkill } from '@/features/challenges/challenge.types';

export const homeApi = {
  /**
   * Fast, parallelized Home learning payload fetcher.
   * Returns today's mission, streak, level, weekly momentum, and 2-3 tailored drills.
   */
  async getLearningHomeData(): Promise<HomeLearningPayload> {
    const today = new Date().toISOString().split('T')[0];

    // 1. Fetch Auth User, Profile, Mission, Progress, and Catalog concurrently
    const [authData, profile, missionData, progressData, fullCatalog] = await Promise.all([
      supabase.auth.getUser(),
      profileApi.getProfile(),
      challengeApi.getDailyMission(),
      progressApi.getProgress(),
      challengeApi.getChallenges(),
    ]);

    const user = authData.data.user;

    // 2. Compute Streak & XP
    let currentStreak = progressData.currentStreak || 1;
    let bestStreak = Math.max(currentStreak, progressData.bestStreak || 1);
    let lastActivityDate: string | null = null;
    let totalXp = 0;

    if (user) {
      // Parallelize streak and XP lookups
      const [streakRes, xpRes] = await Promise.all([
        supabase
          .from('user_streaks')
          .select('current_streak, longest_streak, last_activity_date')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('xp_events')
          .select('xp_amount')
          .eq('user_id', user.id),
      ]);

      if (streakRes.data) {
        currentStreak = streakRes.data.current_streak || 1;
        bestStreak = Math.max(currentStreak, streakRes.data.longest_streak || 1);
        lastActivityDate = streakRes.data.last_activity_date;
      }

      if (xpRes.data && xpRes.data.length > 0) {
        totalXp = xpRes.data.reduce((sum, r) => sum + (r.xp_amount || 0), 0);
      } else {
        totalXp = Number(user.user_metadata?.total_xp) || 50;
      }
    }

    const levelInfo = calculateLevelFromXp(totalXp);

    // 3. Determine Focus Skill
    let focusSkill: TargetSkill = (missionData?.challenge.targetSkill as TargetSkill) || 'Fluency';
    if (progressData.skills && progressData.skills.length > 0) {
      const sortedSkills = [...progressData.skills].sort((a, b) => a.currentScore - b.currentScore);
      if (sortedSkills[0]?.skillName) {
        focusSkill = sortedSkills[0].skillName as TargetSkill;
      }
    }

    // 4. Goal mapping
    const matchedGoal = GOAL_PRESETS.find((g) => g.id === profile?.primaryGoal);
    const goalTitle = matchedGoal ? matchedGoal.title : 'Everyday Communication';

    const focusRationale =
      profile?.communicationStyleFocus?.[0]
        ? `Targeting ${profile.communicationStyleFocus[0].toLowerCase()} to accelerate your progress in ${goalTitle}.`
        : `Daily targeted drills to compound your speaking confidence.`;

    // 5. Weekly Activity Progress (last 7 days)
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyProgress: DayProgress[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const dStr = d.toISOString().split('T')[0];
      const dayName = dayNames[d.getDay()];
      const isToday = dStr === today;
      const isCompleted = isToday
        ? lastActivityDate === today || missionData?.completed === true
        : i < currentStreak;

      weeklyProgress.push({
        dayName,
        dateString: dStr,
        completed: Boolean(isCompleted),
        isToday,
      });
    }

    // 6. Select exactly 2-3 "For You" targeted drills (NO massive 38-card scroll on Home)
    const activeWeakness = progressData.activeWeaknesses?.[0];
    const missionId = missionData?.challenge.id;

    const forYouDrills: Challenge[] = [];
    const remainingCatalog = fullCatalog.filter((c) => c.id !== missionId);

    // Pick 1: Aligned with weakness / lowest skill
    if (activeWeakness) {
      const weaknessMatch = remainingCatalog.find(
        (c) =>
          c.targetWeakness?.toLowerCase() === activeWeakness.type.toLowerCase() ||
          c.targetSkill.toLowerCase() === activeWeakness.skillName.toLowerCase()
      );
      if (weaknessMatch) forYouDrills.push(weaknessMatch);
    } else {
      const skillMatch = remainingCatalog.find(
        (c) => c.targetSkill.toLowerCase() === focusSkill.toLowerCase()
      );
      if (skillMatch) forYouDrills.push(skillMatch);
    }

    // Pick 2: Goal alignment
    if (profile?.primaryGoal) {
      const goalMatch = remainingCatalog.find(
        (c) => c.goalTags.includes(profile.primaryGoal!) && !forYouDrills.some((d) => d.id === c.id)
      );
      if (goalMatch) forYouDrills.push(goalMatch);
    }

    // Pick 3: Variety in another skill
    const varietyMatch = remainingCatalog.find(
      (c) => !forYouDrills.some((d) => d.id === c.id) && c.targetSkill !== focusSkill
    );
    if (varietyMatch) forYouDrills.push(varietyMatch);

    // Fallback if needed to ensure 3 drills
    while (forYouDrills.length < 3 && remainingCatalog.length > forYouDrills.length) {
      const nextCandidate = remainingCatalog.find((c) => !forYouDrills.some((d) => d.id === c.id));
      if (nextCandidate) forYouDrills.push(nextCandidate);
      else break;
    }

    // Next recommended challenge for completed mission state
    const nextRecommendedDrill = forYouDrills[0] || remainingCatalog[0];

    const hour = now.getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

    return {
      greeting,
      userName: profile?.fullName || user?.email?.split('@')[0] || 'Communicator',
      primaryGoalTitle: goalTitle,
      focusSkill,
      focusRationale,
      dailyMission: missionData,
      nextRecommendedDrill,
      streak: {
        currentStreak,
        bestStreak,
        lastActivityDate,
        isActiveToday: lastActivityDate === today || missionData?.completed === true,
      },
      level: levelInfo,
      weeklyProgress,
      forYouDrills,
      practiceCatalog: forYouDrills,
    };
  },
};
