import { TargetRole, ExperienceLevel, TargetDomain } from '@/features/personalization/personalization.types';

export type UserProfession =
  | 'student'
  | 'professional'
  | 'educator'
  | 'entrepreneur'
  | 'freelancer'
  | 'other';

export interface UserProfile {
  id: string;
  userId: string;
  fullName: string | null;
  avatarUrl: string | null;
  profession: UserProfession | null;
  institution: string | null;
  contactPhone: string | null;
  onboardingCompleted?: boolean;
  baselineCompleted?: boolean;
  dailyGoalMinutes?: number;
  primaryGoal?: string;
  targetRole?: TargetRole | null;
  customTargetRole?: string | null;
  experienceLevel?: ExperienceLevel | null;
  targetDomain?: TargetDomain | null;
  communicationStyleFocus?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileInput {
  fullName?: string;
  avatarUrl?: string;
  profession?: UserProfession;
  institution?: string;
  contactPhone?: string;
  onboardingCompleted?: boolean;
  baselineCompleted?: boolean;
  dailyGoalMinutes?: number;
  primaryGoal?: string;
  targetRole?: TargetRole;
  customTargetRole?: string;
  experienceLevel?: ExperienceLevel;
  targetDomain?: TargetDomain;
  communicationStyleFocus?: string[];
}
