/**
 * Client for interacting with the Supabase ai-coach Edge Function with direct BYOK Gemini fallback
 */
import { supabase } from '@/integrations/supabase/client';
import { GEMINI_MODELS } from '@/config/ai';
import {
  AICoachRequest,
  AICoachResponse,
  AIAnalysisResult,
  GeminiConnectionResult,
  GenerateTopicPayload,
  AnalyzeAttemptPayload,
  PersonalizedChallenge,
} from './gemini.types';

export class GeminiServiceError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = 'GeminiServiceError';
    this.code = code;
  }
}

/**
 * Maps raw provider errors to clear, safe user messages without exposing keys or sensitive data
 */
function mapProviderError(err: unknown): GeminiServiceError {
  if (err instanceof GeminiServiceError) {
    return err;
  }

  const rawMessage = err instanceof Error ? err.message : String(err);

  if (
    rawMessage.includes('API_KEY_INVALID') ||
    rawMessage.includes('API key not valid') ||
    rawMessage.includes('401')
  ) {
    return new GeminiServiceError(
      'Gemini rejected this API key. Please verify your key from Google AI Studio.',
      'INVALID_API_KEY'
    );
  }

  if (
    rawMessage.includes('RESOURCE_EXHAUSTED') ||
    rawMessage.includes('quota') ||
    rawMessage.includes('429')
  ) {
    return new GeminiServiceError(
      'Gemini API rate limit or quota exceeded. Please wait a moment before trying again.',
      'QUOTA_EXCEEDED'
    );
  }

  if (
    rawMessage.includes('Failed to fetch') ||
    rawMessage.includes('NetworkError') ||
    rawMessage.includes('network')
  ) {
    return new GeminiServiceError(
      'Network connection issue. Please check your internet connection.',
      'NETWORK_ERROR'
    );
  }

  return new GeminiServiceError(
    'Could not complete AI coaching request. Please try again.',
    'AI_SERVICE_ERROR'
  );
}

/**
 * Direct BYOK fallback invoking Google Gemini REST API directly from browser
 */
async function invokeDirectGemini<T>(request: AICoachRequest): Promise<T> {
  const apiKey = request.gemini_api_key.trim();
  const model = GEMINI_MODELS.COACH;

  if (request.action === 'test_connection') {
    const startTime = Date.now();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Respond with the single word 'READY' if you are active." }] }],
      }),
    });

    const latencyMs = Date.now() - startTime;

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      const rawErr = errJson?.error?.message || `HTTP ${res.status}`;
      throw mapProviderError(rawErr);
    }

    const result: GeminiConnectionResult = {
      success: true,
      model,
      latencyMs,
      message: 'Gemini connected successfully',
    };
    return result as unknown as T;
  }

  if (request.action === 'generate_topic') {
    const payload = request.payload as GenerateTopicPayload;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const systemInstruction = `You are Verblyn's expert communication coach.
Generate a tailored speaking challenge for a professional/student based on their profile.
Return STRICT JSON adhering to this schema:
{
  "challenge_title": string,
  "challenge_prompt": string,
  "challenge_type": string,
  "target_skill": "Fluency" | "Clarity" | "Vocabulary" | "Grammar" | "Confidence",
  "target_weakness": string,
  "difficulty": number,
  "time_limit_seconds": number,
  "success_criteria": string[],
  "why_this_challenge": string,
  "follow_up_question": string,
  "coach_tip_before_start": string
}`;

    const userContent = `User Profile:
- Goal: ${payload?.primary_goal || 'Everyday Communication'}
- Target Role: ${payload?.target_role || 'Professional / Student'}
- Active Weakness: ${payload?.active_weakness || 'Filler words & hesitation'}
- Weakest Skill: ${payload?.weakest_skill || 'Fluency'}
- Current Level: ${payload?.current_level || 1}
- Preferred Template/Archetype: ${payload?.template_type || 'Explain Simply'}
- Recent Prompts to avoid repeating: ${JSON.stringify(payload?.recent_prompts || [])}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ parts: [{ text: userContent }] }],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw mapProviderError(errJson?.error?.message || `HTTP ${res.status}`);
    }

    const resData = await res.json();
    const rawText = resData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      throw new GeminiServiceError('Gemini returned an empty response', 'EMPTY_RESPONSE');
    }

    const parsed: PersonalizedChallenge = JSON.parse(rawText);
    return parsed as unknown as T;
  }

  if (request.action === 'analyze_attempt') {
    const payload = request.payload as AnalyzeAttemptPayload;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const systemInstruction = `You are Verblyn's rigorous, honest AI vocal & communication coach.
EVALUATION PRINCIPLES:
1. DO NOT give automatic praise or generic flattery.
2. Base every score and feedback point strictly on concrete evidence in the spoken response.
3. If the user was off-topic, incomplete, vague, repetitive, or full of filler words, state it directly.
4. Each strength MUST quote or pinpoint exact words/structures used.
5. Each improvement MUST quote the exact problem and provide an actionable correction.
6. Return STRICT JSON with this schema:
{
  "overall_score": number,
  "task_completion": {
    "score": number,
    "completed": boolean,
    "explanation": string
  },
  "skills": {
    "fluency": number,
    "clarity": number,
    "structure": number,
    "vocabulary": number,
    "grammar": number,
    "confidence": number
  },
  "strengths": [
    {
      "title": string,
      "evidence": string,
      "impact": string
    }
  ],
  "improvements": [
    {
      "issue_type": "filler_dependency" | "slow_delivery" | "rushed_delivery" | "unclear_structure" | "overlong_answers" | "excessive_repetition" | "weak_vocabulary" | "grammar_errors" | "excessive_jargon" | "vague_explanation" | "weak_opening" | "weak_conclusion" | "insufficient_detail" | "incomplete_response" | "off_topic",
      "severity": "low" | "medium" | "high",
      "evidence": string,
      "explanation": string,
      "action": string
    }
  ],
  "coach_summary": string,
  "next_focus": string,
  "recommended_drill_type": string,
  "recommendation_reason": string,
  "confidence_in_evaluation": number
}`;

    const parts: Array<Record<string, unknown>> = [];

    if (payload?.audio_base64) {
      parts.push({
        inlineData: {
          mimeType: payload.audio_mime_type || 'audio/webm',
          data: payload.audio_base64,
        },
      });
    }

    const promptContext = `CHALLENGE DETAILS:
- Title: ${payload?.challenge_title}
- Prompt: "${payload?.challenge_prompt}"
- Target Skill: ${payload?.target_skill}
- Target Weakness: ${payload?.target_weakness || 'None'}
- Time Limit: ${payload?.time_limit_seconds}s
- Success Criteria: ${JSON.stringify(payload?.success_criteria || [])}
- User Goal: ${payload?.user_goal || 'Professional Speaking'}

DETERMINISTIC MEASUREMENTS:
- Word Count: ${payload?.deterministic_metrics?.wordCount}
- Duration: ${payload?.deterministic_metrics?.durationSeconds}s
- Pacing: ${payload?.deterministic_metrics?.wordsPerMinute} WPM
- Filler Count: ${payload?.deterministic_metrics?.fillerCount}
- Repetition Count: ${payload?.deterministic_metrics?.repetitionCount}
- Sentence Count: ${payload?.deterministic_metrics?.sentenceCount}
- Avg Sentence Length: ${payload?.deterministic_metrics?.averageSentenceLength} words
- Vocabulary Diversity: ${payload?.deterministic_metrics?.vocabularyDiversity}

TRANSCRIPT:
"${payload?.transcript || ''}"

Evaluate the attempt rigorously according to the instructions.`;

    parts.push({ text: promptContext });

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw mapProviderError(errJson?.error?.message || `HTTP ${res.status}`);
    }

    const resData = await res.json();
    const rawText = resData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      throw new GeminiServiceError('Gemini returned an empty evaluation', 'EMPTY_EVALUATION');
    }

    const parsed: AIAnalysisResult = JSON.parse(rawText);
    return parsed as unknown as T;
  }

  throw new GeminiServiceError(`Unknown action: ${request.action}`, 'INVALID_ACTION');
}

/**
 * Primary invoker: Tries Supabase Edge Function first, falls back seamlessly to direct client BYOK
 */
export async function invokeAiCoach<T>(request: AICoachRequest): Promise<T> {
  try {
    const { data, error } = await supabase.functions.invoke<AICoachResponse<T>>('ai-coach', {
      body: request,
    });

    if (!error && data && data.success && data.data) {
      return data.data;
    }

    if (error) {
      // If function returns 404 or connection error, fall back to direct Gemini BYOK
      if (process.env.NODE_ENV === 'development') {
        console.info('[AI Coach] Edge function unready or error; using direct BYOK Gemini connection.');
      }
      return await invokeDirectGemini<T>(request);
    }

    if (data && !data.success) {
      throw new GeminiServiceError(data.error || 'AI Coach request failed', data.code);
    }
  } catch (err: unknown) {
    if (err instanceof GeminiServiceError && err.code === 'INVALID_API_KEY') {
      throw err;
    }
    // Fallback to direct client invocation
    try {
      return await invokeDirectGemini<T>(request);
    } catch (directErr) {
      throw mapProviderError(directErr);
    }
  }

  return invokeDirectGemini<T>(request);
}
