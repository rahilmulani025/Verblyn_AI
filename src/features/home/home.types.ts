import { Challenge, TargetSkill } from '@/features/challenges/challenge.types';
import { UserLevelInfo, UserStreakInfo } from '@/features/gamification/gamification.types';

export interface DailyMissionState {
  challenge: Challenge;
  missionDate: string;
  completed: boolean;
  xpValue: number;
}

export interface DayProgress {
  dayName: string; // 'Mon', 'Tue', etc.
  dateString: string;
  completed: boolean;
  isToday: boolean;
}

export interface HomeLearningPayload {
  greeting: string;
  userName: string;
  primaryGoalTitle: string;
  focusSkill: TargetSkill;
  focusRationale: string;
  dailyMission: DailyMissionState | null;
  streak: UserStreakInfo;
  level: UserLevelInfo;
  weeklyProgress: DayProgress[];
  practiceCatalog: Challenge[];
}
