/**
 * Controlled Question Taxonomy and Personalization Engine Types for Verblyn AI
 */

import { TargetSkill } from '@/features/challenges/challenge.types';

export type PracticeContext = 'interview' | 'workplace' | 'public_speaking' | 'everyday';

export type StandardTargetRole =
  | 'Data Analyst'
  | 'Data Scientist'
  | 'Software Engineer'
  | 'Product Manager'
  | 'Business Analyst'
  | 'Consultant'
  | 'Other';

export const STANDARD_TARGET_ROLES: StandardTargetRole[] = [
  'Data Analyst',
  'Data Scientist',
  'Software Engineer',
  'Product Manager',
  'Business Analyst',
  'Consultant',
  'Other',
];

export type TargetRole = StandardTargetRole | string;

export type ExperienceLevel = 'fresher' | '0-2' | '2-5' | '5+';

export interface ExperienceLevelOption {
  id: ExperienceLevel;
  label: string;
  description: string;
}

export const EXPERIENCE_LEVEL_OPTIONS: ExperienceLevelOption[] = [
  { id: 'fresher', label: 'Student / Fresher', description: 'Projects, internships, fundamentals' },
  { id: '0-2', label: '0–2 Years', description: 'Project ownership & practical problem solving' },
  { id: '2-5', label: '2–5 Years', description: 'Cross-functional ownership & leadership' },
  { id: '5+', label: '5+ Years', description: 'Strategic leadership & complex decisions' },
];

export type StandardTargetDomain =
  | 'Technology'
  | 'Finance'
  | 'Healthcare'
  | 'Consulting'
  | 'Marketing'
  | 'E-commerce'
  | 'Other';

export const STANDARD_TARGET_DOMAINS: StandardTargetDomain[] = [
  'Technology',
  'Finance',
  'Healthcare',
  'Consulting',
  'Marketing',
  'E-commerce',
  'Other',
];

export type TargetDomain = StandardTargetDomain | string;

export type InterviewCategory =
  | 'hr'
  | 'behavioral'
  | 'role_specific'
  | 'resume'
  | 'situational'
  | 'technical_explanation'
  | 'project_deep_dive'
  | 'follow_up'
  | 'mock_interview';

export type WorkplaceCategory =
  | 'status_update'
  | 'explanation'
  | 'client_communication'
  | 'presentation'
  | 'disagreement'
  | 'feedback'
  | 'meeting';

export type PublicSpeakingCategory =
  | 'impromptu'
  | 'persuasive'
  | 'storytelling'
  | 'explanation'
  | 'presentation';

export type EverydayCategory =
  | 'conversation'
  | 'opinion'
  | 'experience'
  | 'explanation'
  | 'storytelling';

export type QuestionCategory =
  | InterviewCategory
  | WorkplaceCategory
  | PublicSpeakingCategory
  | EverydayCategory;

export interface UserPersonalizationState {
  userId: string;
  fullName?: string;
  profession?: string;
  institution?: string;
  primaryGoal?: string;
  targetRole?: TargetRole;
  customTargetRole?: string;
  experienceLevel?: ExperienceLevel;
  targetDomain?: TargetDomain;
  targetIndustry?: string;
  skills: Record<TargetSkill, number>;
  activeWeaknesses: Array<{
    type: string;
    label: string;
    skillName: string;
    severity?: 'low' | 'medium' | 'high';
    occurrenceCount?: number;
  }>;
  recentAttempts: Array<{
    challengeId: string;
    title: string;
    targetSkill: string;
    category?: string;
    completedAt?: string;
    score?: number;
  }>;
}

export interface TrainingPlan {
  practiceContext: PracticeContext;
  targetRole: string;
  experienceLevel: ExperienceLevel;
  experienceLevelLabel: string;
  targetDomain?: string;
  targetSkill: TargetSkill;
  targetWeakness?: string;
  questionCategory: QuestionCategory;
  trainingObjective: string;
  difficulty: number; // 1 to 5
  difficultyLabel: 'Beginner' | 'Intermediate' | 'Advanced';
  timeLimitSeconds: number;
  avoidRecentPrompts: string[];
  avoidRecentCategories: string[];
}

export interface PersonalizedTopicResult {
  title: string;
  question: string;
  category: QuestionCategory;
  practice_context: PracticeContext;
  target_role: string;
  experience_level?: string;
  target_domain?: string;
  difficulty: number;
  target_skill: TargetSkill;
  target_weakness?: string;
  training_objective: string;
  time_limit_seconds: number;
  why_this_question: string;
  success_criteria: string[];
  coach_tip_before_start?: string;
}
