import { profileApi } from '@/features/profile/profile.api';

export interface UserGoalOption {
  id: string;
  title: string;
  description: string;
  category: string;
  iconName: string;
}

export const GOAL_PRESETS: UserGoalOption[] = [
  {
    id: 'JOB_INTERVIEWS',
    title: 'Job Interviews',
    description: 'Structure answers with STAR method, avoid rambling, and project authority.',
    category: 'Career',
    iconName: 'Briefcase',
  },
  {
    id: 'CAMPUS_PLACEMENTS',
    title: 'Campus Placements',
    description: 'Crack technical & HR rounds, pitch projects crisply, and handle unexpected questions.',
    category: 'Placement',
    iconName: 'GraduationCap',
  },
  {
    id: 'PUBLIC_SPEAKING',
    title: 'Public Speaking',
    description: 'Hook audiences early, eliminate verbal fillers, and maintain vocal projection.',
    category: 'Presentations',
    iconName: 'Mic',
  },
  {
    id: 'EVERYDAY_COMMUNICATION',
    title: 'Everyday Communication',
    description: 'Think quickly on your feet, build conversational rapport, and communicate naturally.',
    category: 'Social Fluency',
    iconName: 'MessageSquare',
  },
  {
    id: 'GROUP_DISCUSSIONS',
    title: 'Group Discussions',
    description: 'Enter discussions assertively, articulate logical arguments, and moderate conversations.',
    category: 'Collaboration',
    iconName: 'Users',
  },
  {
    id: 'WORKPLACE_COMMUNICATION',
    title: 'Workplace Communication',
    description: 'Lead team syncs, deliver concise executive updates, and communicate with clarity.',
    category: 'Professional',
    iconName: 'Award',
  },
];

export const goalsApi = {
  getGoalOptions(): UserGoalOption[] {
    return GOAL_PRESETS;
  },

  async setUserGoal(goalId: string): Promise<boolean> {
    return profileApi.updateProfile({ primaryGoal: goalId });
  },
};
