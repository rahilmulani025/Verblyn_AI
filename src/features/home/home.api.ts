import { supabase } from '@/integrations/supabase/client';
import { challengeApi } from '@/features/challenges/challenge.api';
import { profileApi } from '@/features/profile/profile.api';
import { GOAL_PRESETS } from '@/features/home/goals.api';
import { calculateLevelFromXp } from '@/features/gamification/gamification.types';
import { DayProgress, HomeLearningPayload } from './home.types';
import { TargetSkill } from '@/features/challenges/challenge.types';

export const homeApi = {
  /**
   * Fetches the compact learning payload using authoritative V1 tables:
   * daily_missions, xp_events, user_streaks, user_skills, user_goals.
   */
  async getLearningHomeData(): Promise<HomeLearningPayload> {
    const today = new Date().toISOString().split('T')[0];
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    const profile = await profileApi.getProfile();

    let currentStreak = 1;
    let bestStreak = 1;
    let lastActivityDate: string | null = null;
    let totalXp = 0;

    if (user) {
      // 1. Authoritative Streak from user_streaks table
      try {
        const { data: streakData } = await supabase
          .from('user_streaks')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (streakData) {
          currentStreak = streakData.current_streak || 1;
          bestStreak = Math.max(currentStreak, streakData.longest_streak || 1);
          lastActivityDate = streakData.last_activity_date;
        } else {
          // Fallback to user_progress
          const { data: prog } = await supabase
            .from('user_progress')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();
          if (prog) {
            currentStreak = prog.current_streak || 1;
            bestStreak = prog.current_streak || 1;
            lastActivityDate = prog.last_practice_date;
          }
        }
      } catch (err) {
        console.warn('Error reading user_streaks:', err);
      }

      // 2. Authoritative XP from xp_events table
      try {
        const { data: xpRows } = await supabase
          .from('xp_events')
          .select('xp_amount')
          .eq('user_id', user.id);

        if (xpRows && xpRows.length > 0) {
          totalXp = xpRows.reduce((sum, r) => sum + (r.xp_amount || 0), 0);
        } else {
          totalXp = Number(user.user_metadata?.total_xp) || 50;
        }
      } catch (err) {
        console.warn('Error reading xp_events:', err);
        totalXp = Number(user.user_metadata?.total_xp) || 50;
      }
    }

    const levelInfo = calculateLevelFromXp(totalXp);

    // 3. Authoritative Daily Mission from daily_missions table
    const missionData = await challengeApi.getDailyMission();

    // 4. Authoritative Focus Skill from user_skills
    let focusSkill: TargetSkill = (missionData?.challenge.targetSkill as TargetSkill) || 'Fluency';

    if (user) {
      try {
        const { data: skills } = await supabase
          .from('user_skills')
          .select('skill_name, current_score')
          .eq('user_id', user.id);

        if (skills && skills.length > 0) {
          // Find lowest scoring skill
          const sorted = [...skills].sort((a, b) => (a.current_score || 0) - (b.current_score || 0));
          if (sorted[0] && sorted[0].skill_name) {
            focusSkill = sorted[0].skill_name as TargetSkill;
          }
        }
      } catch (err) {
        console.warn('Error reading user_skills:', err);
      }
    }

    // 5. Goal mapping
    const matchedGoal = GOAL_PRESETS.find((g) => g.id === profile?.primaryGoal);
    const goalTitle = matchedGoal ? matchedGoal.title : 'Everyday Communication';

    const focusRationale =
      profile?.communicationStyleFocus?.[0]
        ? `Targeting ${profile.communicationStyleFocus[0].toLowerCase()} to accelerate your progress in ${goalTitle}.`
        : `Daily targeted drills to compound your speaking confidence.`;

    // 6. Weekly Activity Progress (last 7 days)
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

    // 7. Practice catalog from challenges table
    const catalog = await challengeApi.getChallenges();

    const hour = now.getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

    return {
      greeting,
      userName: profile?.fullName || user?.email?.split('@')[0] || 'Communicator',
      primaryGoalTitle: goalTitle,
      focusSkill,
      focusRationale,
      dailyMission: missionData,
      streak: {
        currentStreak,
        bestStreak,
        lastActivityDate,
        isActiveToday: lastActivityDate === today || missionData?.completed === true,
      },
      level: levelInfo,
      weeklyProgress,
      practiceCatalog: catalog,
    };
  },
};
