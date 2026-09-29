/**
 * Client for interacting exclusively with the authenticated Supabase ai-coach Edge Function.
 * Direct browser calls to Google Gemini API are strictly forbidden for security.
 */
import { supabase } from '@/integrations/supabase/client';
import { AICoachRequest, AICoachResponse } from './gemini.types';

export class GeminiServiceError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = 'GeminiServiceError';
    this.code = code;
  }
}

/**
 * Invokes the backend Supabase Edge Function 'ai-coach' over HTTPS with authenticated JWT.
 */
export async function invokeAiCoach<T>(request: AICoachRequest): Promise<T> {
  try {
    const { data, error } = await supabase.functions.invoke<AICoachResponse<T>>('ai-coach', {
      body: request,
    });

    if (error) {
      // Map Supabase gateway / invocation errors to clear, safe user messages
      const status = (error as unknown as { status?: number })?.status;
      if (status === 401) {
        throw new GeminiServiceError(
          'Your session has expired. Please sign in again to use AI Coaching.',
          'UNAUTHORIZED'
        );
      }
      if (status === 404) {
        throw new GeminiServiceError(
          'AI Coach service is currently being updated. Please try again shortly.',
          'SERVICE_UNAVAILABLE'
        );
      }

      throw new GeminiServiceError(
        error.message || 'Failed to communicate with AI Coach service.',
        'FUNCTION_INVOCATION_ERROR'
      );
    }

    if (!data || !data.success) {
      const code = data?.code || 'AI_SERVICE_ERROR';
      const message = data?.error || 'AI Coach service returned an error.';
      throw new GeminiServiceError(message, code);
    }

    return data.data as T;
  } catch (err: unknown) {
    if (err instanceof GeminiServiceError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : 'Unknown error during AI Coach request';
    throw new GeminiServiceError(message, 'UNEXPECTED_ERROR');
  }
}
