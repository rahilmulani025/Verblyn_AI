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
      let message = '';
      let code = 'FUNCTION_INVOCATION_ERROR';
      let httpStatus: number | undefined;

      // Extract response context from FunctionsHttpError if available
      if ('context' in error && error.context) {
        const ctx = error.context as Response;
        httpStatus = ctx.status;
        try {
          const body = await ctx.clone().json();
          if (body) {
            if (typeof body.error === 'string') {
              message = body.error;
            } else if (body.error && typeof body.error === 'object') {
              message = (body.error as { message?: string }).message || (body.error as { code?: string }).code || '';
              code = (body.error as { code?: string }).code || code;
            }
            if (body.code) {
              code = body.code;
            }
          }
        } catch {
          try {
            const rawText = await ctx.clone().text();
            if (rawText && rawText.length < 300) {
              message = rawText;
            }
          } catch {
            // ignore
          }
        }
      }

      // Map Supabase gateway / invocation errors to clear, safe user messages
      if (httpStatus === 401 || code === 'UNAUTHORIZED') {
        throw new GeminiServiceError(
          message || 'Your session has expired. Please sign in again to use AI Coaching.',
          'UNAUTHORIZED'
        );
      }
      if (httpStatus === 404 || code === 'SERVICE_UNAVAILABLE') {
        throw new GeminiServiceError(
          message || 'AI Coach service is currently being updated. Please try again shortly.',
          'SERVICE_UNAVAILABLE'
        );
      }

      throw new GeminiServiceError(
        message || error.message || 'Failed to communicate with AI Coach service.',
        code
      );
    }

    if (!data || !data.success) {
      let code = data?.code || 'AI_SERVICE_ERROR';
      let message = 'AI Coach service returned an error.';

      if (typeof data?.error === 'string') {
        message = data.error;
      } else if (data?.error && typeof data.error === 'object') {
        message = (data.error as { message?: string }).message || message;
        code = (data.error as { code?: string }).code || code;
      }

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

