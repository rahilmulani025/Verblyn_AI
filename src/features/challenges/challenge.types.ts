import { SpeechMetricsSummary } from '@/lib/metrics';

export type ChallengeType =
  | 'timed_speaking'
  | 'rapid_response'
  | 'explain_simply'
  | 'concise_answer'
  | 'storytelling'
  | 'interview_answer'
  | 'retry';

export type TargetSkill =
  | 'Fluency'
  | 'Clarity'
  | 'Vocabulary'
  | 'Grammar'
  | 'Confidence';

export type ChallengeDifficultyLabel = 'Beginner' | 'Intermediate' | 'Advanced';

export type AttemptStatus =
  | 'STARTED'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'ANALYZING'
  | 'COMPLETED'
  | 'FAILED'
  | 'ABANDONED';

export type WeaknessType =
  | 'filler_dependency'
  | 'slow_delivery'
  | 'rushed_delivery'
  | 'unclear_structure'
  | 'overlong_answers'
  | 'excessive_repetition'
  | 'weak_vocabulary'
  | 'grammar_errors'
  | 'excessive_jargon'
  | 'vague_explanation'
  | 'weak_opening'
  | 'weak_conclusion'
  | 'insufficient_detail';

export interface WeaknessCandidate {
  type: WeaknessType | string;
  skill: TargetSkill | string;
  confidence: number;
  evidence: string;
}

export interface CoachingFeedbackItem {
  title: string;
  detail: string;
  action?: string;
}

export interface TrackedWeakness {
  id: string;
  userId: string;
  weaknessLabel: string;
  weaknessType: WeaknessType | string;
  skillName: TargetSkill | string;
  status: 'ACTIVE' | 'IMPROVING' | 'RESOLVED';
  occurrenceCount: number;
  confidenceLevel: number;
  evidenceSummary?: string;
  firstDetectedAt: string;
  lastDetectedAt: string;
  resolvedAt?: string;
}

export interface Challenge {
  id: string;
  title: string;
  shortDescription: string;
  whyItMatters: string;
  targetSkill: TargetSkill;
  challengeType: ChallengeType;
  difficultyLevel: number; // 1 to 5
  difficultyLabel: ChallengeDifficultyLabel;
  durationSeconds: number;
  prompt: string;
  instructions: string[];
  expectedBehavior: string;
  xpReward: number;
  goalTags: string[];
  targetWeakness?: string;
}

export interface ChallengeScoreBreakdown {
  overallScore: number;
  fluency: number;
  clarity: number;
  vocabulary: number;
  grammar: number;
  confidence: number;
}

export interface XpBreakdown {
  base: number;
  dailyBonus: number;
  weaknessBonus: number;
  personalBestBonus: number;
  total: number;
}

export interface NextRecommendation {
  nextChallengeId: string;
  nextChallengeTitle: string;
  targetSkill: TargetSkill;
  reason: string;
  targetedWeakness?: string;
}

export interface ChallengeAttempt {
  id: string;
  challengeId: string;
  userId: string;
  status: AttemptStatus;
  startedAt: string;
  completedAt?: string;
  durationSeconds: number;
  transcript: string;
  metrics?: SpeechMetricsSummary;
  scores?: ChallengeScoreBreakdown;
  whatYouDidWell: string[];
  improveNext: string[];
  coachingStrengths?: CoachingFeedbackItem[];
  coachingImprovements?: CoachingFeedbackItem[];
  coachMessage?: string;
  recommendedFocus?: string;
  weaknessCandidates?: WeaknessCandidate[];
  analysisVersion?: string;
  xpEarned: XpBreakdown;
  recommendation?: NextRecommendation;
  isDailyMission?: boolean;
}

