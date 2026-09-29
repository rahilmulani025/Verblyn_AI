import { supabase } from '@/integrations/supabase/client';
import { Achievement } from './achievements.types';

export const achievementsApi = {
  async getAchievements(): Promise<Achievement[]> {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;

    let currentStreak = 0;
    let totalSessions = 0;

    if (userId) {
      const { data: progress } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (progress) {
        currentStreak = progress.current_streak || 0;
        totalSessions = progress.total_sessions || 0;
      }
    }

    const list: Achievement[] = [
      {
        id: 'first-drill',
        title: 'First Words',
        description: 'Complete your first speaking drill.',
        category: 'MILESTONE',
        icon: 'Sparkles',
        unlocked: totalSessions >= 1,
        progress: Math.min(100, (totalSessions / 1) * 100),
        targetValue: 1,
        currentValue: totalSessions,
      },
      {
        id: 'streak-3',
        title: 'Consistency Starter',
        description: 'Reach a 3-day practice streak.',
        category: 'STREAK',
        icon: 'Flame',
        unlocked: currentStreak >= 3,
        progress: Math.min(100, Math.round((currentStreak / 3) * 100)),
        targetValue: 3,
        currentValue: currentStreak,
      },
      {
        id: 'streak-7',
        title: 'Unstoppable Voice',
        description: 'Maintain a 7-day practice streak.',
        category: 'STREAK',
        icon: 'Zap',
        unlocked: currentStreak >= 7,
        progress: Math.min(100, Math.round((currentStreak / 7) * 100)),
        targetValue: 7,
        currentValue: currentStreak,
      },
      {
        id: 'sessions-10',
        title: 'Committed Orator',
        description: 'Complete 10 speaking challenge sessions.',
        category: 'MILESTONE',
        icon: 'Trophy',
        unlocked: totalSessions >= 10,
        progress: Math.min(100, Math.round((totalSessions / 10) * 100)),
        targetValue: 10,
        currentValue: totalSessions,
      },
    ];

    return list;
  },
};
