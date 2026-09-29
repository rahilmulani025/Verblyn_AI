/**
 * Centralized AI Configuration
 * Manages model names, endpoints, and timeouts for Gemini integrations.
 */

export const GEMINI_MODELS = {
  // Primary coach model for structured reasoning, evaluation, and topic generation
  COACH: 'gemini-2.5-flash',
  // Audio transcription & understanding model
  TRANSCRIBE: 'gemini-2.5-flash',
  // Fallback / fast response model
  FAST: 'gemini-2.5-flash',
} as const;

export const AI_CONFIG = {
  MAX_AUDIO_DURATION_SECONDS: 180,
  MIN_AUDIO_DURATION_SECONDS: 3,
  MAX_INLINE_AUDIO_BYTES: 15 * 1024 * 1024, // 15MB safe inline limit
  DEFAULT_TEMPERATURE: 0.2, // Low temperature for consistent, strict, objective evaluation
  TOPIC_TEMPERATURE: 0.7, // Slightly higher for diverse, tailored speaking scenarios
} as const;
