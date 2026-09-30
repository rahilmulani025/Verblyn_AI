/**
 * Typed API operations for Gemini BYOK AI Coach
 */

import { invokeAiCoach } from './gemini.client';
import {
  AIAnalysisResult,
  AnalyzeAttemptPayload,
  GeminiConnectionResult,
  GenerateTopicPayload,
  PersonalizedChallenge,
  TranscribeAudioPayload,
  TranscribeAudioResult,
} from './gemini.types';

export const geminiApi = {
  /**
   * Tests Gemini API key validity and latency with a minimal prompt
   */
  async testConnection(apiKey: string): Promise<GeminiConnectionResult> {
    return invokeAiCoach<GeminiConnectionResult>({
      action: 'test_connection',
      gemini_api_key: apiKey,
    });
  },

  /**
   * Transcribes audio directly to verbatim text via Gemini
   */
  async transcribeAudio(
    apiKey: string,
    payload: TranscribeAudioPayload
  ): Promise<TranscribeAudioResult> {
    return invokeAiCoach<TranscribeAudioResult>({
      action: 'transcribe_audio',
      gemini_api_key: apiKey,
      payload,
    });
  },

  /**
   * Generates a fully personalized speaking challenge based on user weaknesses, goal, and archetype
   */
  async generateTopic(
    apiKey: string,
    payload: GenerateTopicPayload
  ): Promise<PersonalizedChallenge> {
    return invokeAiCoach<PersonalizedChallenge>({
      action: 'generate_topic',
      gemini_api_key: apiKey,
      payload,
    });
  },

  /**
   * Performs real multimodal audio/transcript evaluation against challenge criteria
   */
  async analyzeAttempt(
    apiKey: string,
    payload: AnalyzeAttemptPayload
  ): Promise<AIAnalysisResult> {
    return invokeAiCoach<AIAnalysisResult>({
      action: 'analyze_attempt',
      gemini_api_key: apiKey,
      payload,
    });
  },
};

