export type UserGoal =
  | 'JOB_INTERVIEWS'
  | 'CAMPUS_PLACEMENTS'
  | 'PUBLIC_SPEAKING'
  | 'EVERYDAY_COMMUNICATION'
  | 'GROUP_DISCUSSIONS'
  | 'WORKPLACE_COMMUNICATION';

export type UserProfessionOption =
  | 'Student'
  | 'Recent Graduate'
  | 'Working Professional'
  | 'Other';

export interface OnboardingState {
  step: number;
  totalSteps: number;
  goal: UserGoal;
  dailyCommitmentMinutes: number;
  fullName: string;
  institution: string;
  profession: UserProfessionOption;
}

export interface OnboardingSubmission {
  goal: UserGoal;
  dailyCommitmentMinutes: number;
  fullName: string;
  institution?: string;
  profession: UserProfessionOption;
}
