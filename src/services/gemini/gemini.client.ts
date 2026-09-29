/**
 * Client for interacting with the Supabase ai-coach Edge Function
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

export async function invokeAiCoach<T>(
  request: AICoachRequest
): Promise<T> {
  const { data, error } = await supabase.functions.invoke<AICoachResponse<T>>('ai-coach', {
    body: request,
  });

  if (error) {
    throw new GeminiServiceError(
      error.message || 'Failed to communicate with AI Coach service.',
      'FUNCTION_INVOCATION_ERROR'
    );
  }

  if (!data || !data.success) {
    throw new GeminiServiceError(
      data?.error || 'AI Coach service returned an error.',
      data?.code || 'AI_SERVICE_ERROR'
    );
  }

  return data.data as T;
}
