import { supabase } from '@/integrations/supabase/client';
import { AICoachRequest, AICoachResponse, GeminiErrorInfo, GeminiErrorType } from './gemini.types';

export function classifyGeminiError(error: unknown): GeminiErrorInfo {
  if (error instanceof GeminiServiceError && error.errorType) {
    return {
      type: error.errorType,
      code: error.code || 'UNKNOWN_AI_ERROR',
      message: error.message,
      userFacingTitle: error.userFacingTitle,
      userFacingMessage: error.userFacingMessage,
      retryable: error.retryable,
      httpStatus: error.status,
    };
  }

  let rawMessage = '';
  let codeStr = '';
  let status: number | undefined;

  if (error instanceof Error) {
    rawMessage = error.message;
    if ('code' in error && typeof (error as { code?: unknown }).code === 'string') {
      codeStr = (error as { code: string }).code;
    }
    if ('status' in error) {
      status = Number((error as { status?: unknown }).status);
    }
  } else if (typeof error === 'string') {
    rawMessage = error;
  } else if (typeof error === 'object' && error !== null) {
    const errObj = error as { message?: unknown; error?: unknown; code?: unknown; status?: unknown };
    if (typeof errObj.message === 'string') {
      rawMessage = errObj.message;
    } else if (typeof errObj.error === 'string') {
      rawMessage = errObj.error;
    } else if (
      typeof errObj.error === 'object' &&
      errObj.error !== null &&
      typeof (errObj.error as { message?: unknown }).message === 'string'
    ) {
      rawMessage = (errObj.error as { message: string }).message;
    }
    if (typeof errObj.code === 'string') {
      codeStr = errObj.code;
    }
    if (typeof errObj.status === 'number' || typeof errObj.status === 'string') {
      status = Number(errObj.status);
    }
  }

  const lower = `${rawMessage} ${codeStr}`.toLowerCase();

  // 1. Quota Exhaustion (Google AI Studio Daily / Free-Tier Quota Limit)
  if (
    codeStr === 'QUOTA_EXHAUSTED' ||
    codeStr === 'QUOTA_EXCEEDED' ||
    lower.includes('resource_exhausted') ||
    lower.includes('quota_exhausted') ||
    lower.includes('quota_exceeded') ||
    lower.includes('generaterequestsperday') ||
    lower.includes('generate_content_free_tier') ||
    lower.includes('free tier') ||
    lower.includes('daily quota') ||
    lower.includes('current quota') ||
    lower.includes('exceeded your current quota') ||
    (lower.includes('quota') && (status === 429 || lower.includes('429')))
  ) {
    return {
      type: 'QUOTA_EXHAUSTED',
      code: 'QUOTA_EXHAUSTED',
      message: rawMessage || 'Gemini API free quota has been exhausted.',
      userFacingTitle: 'Gemini Free Quota Reached',
      userFacingMessage:
        'Your Gemini API free quota has been reached, so Verblyn could not analyze this response. Your speech was recorded, but AI evaluation is temporarily unavailable.',
      retryable: false,
      httpStatus: status || 429,
    };
  }

  // 2. Short-term Rate Limiting (per-minute or per-second bursts)
  if (
    codeStr === 'RATE_LIMITED' ||
    status === 429 ||
    lower.includes('rate limit') ||
    lower.includes('rate_limited') ||
    lower.includes('too many requests')
  ) {
    return {
      type: 'RATE_LIMITED',
      code: 'RATE_LIMITED',
      message: rawMessage || 'Gemini request was rate limited.',
      userFacingTitle: 'Gemini Rate Limit Reached',
      userFacingMessage: 'Gemini is temporarily rate limited. Please wait a moment and try again.',
      retryable: true,
      httpStatus: status || 429,
    };
  }

  // 3. Invalid API Key / Permissions
  if (
    codeStr === 'INVALID_API_KEY' ||
    status === 401 ||
    status === 403 ||
    lower.includes('invalid_api_key') ||
    lower.includes('api_key_invalid') ||
    lower.includes('permission_denied') ||
    lower.includes('api key not valid') ||
    lower.includes('api key') ||
    lower.includes('apikey')
  ) {
    return {
      type: 'INVALID_API_KEY',
      code: 'INVALID_API_KEY',
      message: rawMessage || 'Gemini API key is invalid or lacks permission.',
      userFacingTitle: 'Invalid Gemini API Key',
      userFacingMessage:
        'Your Gemini API key was rejected by Google. Please check your API key in Settings -> AI Coach or enter a new one.',
      retryable: false,
      httpStatus: status || 401,
    };
  }

  // 4. Server / Service Unavailable
  if (
    codeStr === 'SERVICE_UNAVAILABLE' ||
    status === 503 ||
    status === 502 ||
    status === 504 ||
    status === 500 ||
    lower.includes('service_unavailable') ||
    lower.includes('service unavailable') ||
    lower.includes('model_unavailable')
  ) {
    return {
      type: 'SERVICE_UNAVAILABLE',
      code: 'SERVICE_UNAVAILABLE',
      message: rawMessage || 'Gemini service is temporarily unavailable.',
      userFacingTitle: 'AI Service Temporarily Unavailable',
      userFacingMessage: 'Google Gemini service is temporarily unavailable. Please try again shortly.',
      retryable: true,
      httpStatus: status || 503,
    };
  }

  return {
    type: 'UNKNOWN_AI_ERROR',
    code: 'UNKNOWN_AI_ERROR',
    message: rawMessage || 'An unexpected error occurred during AI analysis.',
    userFacingTitle: 'AI Analysis Unavailable',
    userFacingMessage:
      'AI evaluation is temporarily unavailable. Your speech was recorded and has not been scored as a failed answer.',
    retryable: true,
    httpStatus: status,
  };
}

export class GeminiServiceError extends Error {
  code?: string;
  errorType: GeminiErrorType;
  status?: number;
  userFacingTitle: string;
  userFacingMessage: string;
  retryable: boolean;

  constructor(message: string, code = 'UNKNOWN_AI_ERROR', status?: number) {
    super(message);
    this.name = 'GeminiServiceError';
    this.code = code;
    this.status = status;

    const classified = classifyGeminiError({ message, code, status });
    this.errorType = classified.type;
    this.userFacingTitle = classified.userFacingTitle;
    this.userFacingMessage = classified.userFacingMessage;
    this.retryable = classified.retryable;
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
              code = (body.error as { code?: string }).code || (body.error as { type?: string }).type || code;
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

      if (httpStatus === 401 || code === 'UNAUTHORIZED') {
        throw new GeminiServiceError(
          message || 'Your session has expired. Please sign in again to use AI Coaching.',
          'UNAUTHORIZED',
          401
        );
      }

      throw new GeminiServiceError(
        message || error.message || 'Failed to communicate with AI Coach service.',
        code,
        httpStatus
      );
    }

    if (!data || !data.success) {
      let code = data?.code || 'AI_SERVICE_ERROR';
      let message = 'AI Coach service returned an error.';

      if (typeof data?.error === 'string') {
        message = data.error;
      } else if (data?.error && typeof data.error === 'object') {
        message = (data.error as { message?: string }).message || message;
        code = (data.error as { code?: string }).code || (data.error as { type?: string }).type || code;
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


