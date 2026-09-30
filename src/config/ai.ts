/**
 * Centralized AI Configuration
 * Manages model names, endpoints, and timeouts for Gemini integrations.
 */

export const GEMINI_MODELS = {
  // Primary coach model for structured reasoning, evaluation, and topic generation
  COACH: 'gemini-3.8-flash',
  // Audio transcription & understanding model
  TRANSCRIBE: 'gemini-3.8-flash',
  // Fallback / fast response model
  FAST: 'gemini-3.8-flash',
} as const;

export const AI_CONFIG = {
  MAX_AUDIO_DURATION_SECONDS: 180,
  MIN_AUDIO_DURATION_SECONDS: 3,
  MAX_INLINE_AUDIO_BYTES: 15 * 1024 * 1024, // 15MB safe inline limit
} as const;

