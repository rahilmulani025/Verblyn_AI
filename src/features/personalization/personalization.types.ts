/**
 * Controlled Question Taxonomy and Personalization Engine Types for Verblyn AI
 */

import { TargetSkill } from '@/features/challenges/challenge.types';

export type PracticeContext = 'interview' | 'workplace' | 'public_speaking' | 'everyday';

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
  experienceLevel?: 'fresher' | 'mid' | 'senior' | 'executive';
  primaryGoal?: string;
  targetRole?: string;
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
  difficulty: number;
  target_skill: TargetSkill;
  target_weakness?: string;
  training_objective: string;
  time_limit_seconds: number;
  why_this_question: string;
  success_criteria: string[];
  coach_tip_before_start?: string;
}
