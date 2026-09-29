import { SpeechMetricsSummary } from '@/lib/metrics';

export type BaselineSpeakingState =
  | 'IDLE'
  | 'PERMISSION'
  | 'READY'
  | 'COUNTDOWN'
  | 'LISTENING'
  | 'PROCESSING'
  | 'COMPLETE';

export interface BaselineAssessmentPrompt {
  id: string;
  title: string;
  topic: string;
  prompt: string;
  instructions: string[];
  targetDurationSeconds: number;
}

export interface BaselineSkillBreakdown {
  overallScore: number;
  fluency: number;
  clarity: number;
  vocabulary: number;
  grammar: number;
  confidence: number;
}

export interface BaselineAssessmentResult {
  userId: string;
  transcript: string;
  durationSeconds: number;
  metrics: SpeechMetricsSummary;
  scores: BaselineSkillBreakdown;
  strengthObservation: string;
  firstFocusArea: string;
  recommendedDrillTitle: string;
  completedAt: string;
}
