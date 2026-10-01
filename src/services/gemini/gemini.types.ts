/**
 * Strict TypeScript types for Gemini AI Coach BYOK API & Evaluation
 */

import { TargetSkill } from '@/features/challenges/challenge.types';

export type ControlledWeaknessType =
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
  | 'insufficient_detail'
  | 'incomplete_response'
  | 'off_topic';

export interface GeminiConnectionResult {
  success: boolean;
  model: string;
  latencyMs: number;
  message: string;
}

export interface PersonalizedChallenge {
  challenge_title: string;
  challenge_prompt: string;
  challenge_type: string;
  target_skill: TargetSkill;
  target_weakness?: string;
  difficulty: number; // 1-5
  time_limit_seconds: number; // 30-180
  success_criteria: string[];
  why_this_challenge: string;
  category?: string;
  practice_context?: string;
  training_objective?: string;
  why_this_question?: string;
  adaptive_state?: string;
  scaffolding_level?: string;
  reason_for_next_challenge?: string;
  follow_up_question?: string;
  coach_tip_before_start: string;
}

export interface SpeakingMetrics {
  durationSeconds: number;
  wordCount: number;
  wordsPerMinute: number;
  fillerCount: number;
  repetitionCount: number;
  sentenceCount: number;
  averageSentenceLength: number;
  vocabularyDiversity: number;
  pauseCount?: number;
  isComplete: boolean;
}

export interface TranscriptResult {
  transcript: string;
  language?: string;
  duration_seconds?: number;
  confidence?: number;
}

export interface AIStrength {
  title: string;
  evidence: string;
  impact: string;
}

export interface AIImprovement {
  issue_type: ControlledWeaknessType | string;
  severity: 'low' | 'medium' | 'high';
  evidence: string;
  explanation: string;
  action: string;
}

export interface AITaskCompletion {
  score: number; // 0-100
  completed: boolean;
  explanation: string;
}

export interface AISkillBreakdown {
  fluency: number;
  clarity: number;
  structure: number;
  vocabulary: number;
  grammar: number;
  confidence: number;
}

export interface AIAnalysisResult {
  transcription?: string; // Authoritative verbatim transcription generated directly from spoken audio
  overall_score: number;
  evaluation_validity?: 'VALID' | 'PARTIAL' | 'INVALID';
  is_valid_attempt?: boolean;
  task_completion: AITaskCompletion;
  skills: AISkillBreakdown;
  strengths: AIStrength[];
  improvements: AIImprovement[];
  coach_summary: string;
  next_focus: string;
  recommended_drill_type: string;
  recommendation_reason: string;
  confidence_in_evaluation: number;
}

export interface TranscribeAudioPayload {
  audio_base64: string;
  audio_mime_type?: string;
}

export interface TranscribeAudioResult {
  transcript: string;
  detected_language?: string;
}

export interface GenerateTopicPayload {
  user_goal?: string;
  primary_goal?: string;
  practice_context?: string;
  target_role?: string;
  experience_level?: string;
  target_domain?: string;
  target_skill?: TargetSkill | string;
  weakest_skill?: string;
  active_weakness?: string;
  question_category?: string;
  difficulty?: number;
  current_level?: number;
  template_type?: string;
  training_objective?: string;
  adaptive_state?: string;
  scaffolding_level?: string;
  reason_for_next_challenge?: string;
  time_limit_seconds?: number;
  recent_prompts?: string[];
  avoid_prompts?: string[];
  recent_categories?: string[];
}

export interface AnalyzeAttemptPayload {
  challenge_title: string;
  challenge_prompt: string;
  target_skill: string;
  target_weakness?: string;
  time_limit_seconds: number;
  success_criteria?: string[];
  user_goal?: string;
  transcript: string;
  audio_base64?: string;
  audio_mime_type?: string;
  deterministic_metrics: SpeakingMetrics;
}

export type AICoachAction =
  | 'test_connection'
  | 'generate_topic'
  | 'analyze_attempt'
  | 'transcribe_audio';

export interface AICoachRequest {
  action: AICoachAction;
  gemini_api_key: string;
  payload?:
    | GenerateTopicPayload
    | AnalyzeAttemptPayload
    | TranscribeAudioPayload
    | Record<string, unknown>;
}

export interface AICoachResponse<T = unknown> {
  success: boolean;
  action: AICoachAction;
  data?: T;
  error?: string | { code?: string; message?: string };
  code?: string;
}


