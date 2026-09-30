import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface GenerateTopicPayload {
  primary_goal?: string;
  target_role?: string;
  active_weakness?: string;
  weakest_skill?: string;
  current_level?: number;
  template_type?: string;
  recent_prompts?: string[];
}

interface AnalyzeAttemptPayload {
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
  deterministic_metrics: {
    durationSeconds: number;
    wordCount: number;
    wordsPerMinute: number;
    fillerCount: number;
    repetitionCount: number;
    sentenceCount: number;
    averageSentenceLength: number;
    vocabularyDiversity: number;
    isComplete: boolean;
  };
}

interface RequestBody {
  action: "test_connection" | "generate_topic" | "analyze_attempt";
  gemini_api_key?: string;
  payload?: GenerateTopicPayload | AnalyzeAttemptPayload | Record<string, unknown>;
}

const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-1.5-flash";

function buildSuccessResponse(action: string, data: unknown) {
  return new Response(
    JSON.stringify({
      success: true,
      action,
      data,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

function buildErrorResponse(message: string, code = "AI_SERVICE_ERROR", status = 400) {
  return new Response(
    JSON.stringify({
      success: false,
      error: {
        code,
        message,
      },
      code,
    }),
    {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

async function parseGeminiError(res: Response): Promise<{ code: string; message: string }> {
  let errorJson: { error?: { code?: number; message?: string; status?: string; details?: unknown[] } } | null = null;
  try {
    errorJson = await res.json();
  } catch {
    // ignore
  }

  const status = res.status;
  const rawMsg = errorJson?.error?.message || "";
  const statusStr = errorJson?.error?.status || "";
  const lowerMsg = rawMsg.toLowerCase();
  const detailsStr = JSON.stringify(errorJson?.error?.details || "").toLowerCase();

  if (
    (status === 400 && (lowerMsg.includes("api key") || lowerMsg.includes("apikey") || detailsStr.includes("api_key"))) ||
    status === 401 ||
    (status === 403 && (lowerMsg.includes("key") || statusStr === "PERMISSION_DENIED" || detailsStr.includes("api_key")))
  ) {
    return {
      code: "INVALID_API_KEY",
      message: "Gemini rejected this API key. Please check your API key in Google AI Studio and ensure it has active permissions.",
    };
  }

  if (status === 429 || statusStr === "RESOURCE_EXHAUSTED" || lowerMsg.includes("quota") || lowerMsg.includes("rate limit")) {
    return {
      code: "QUOTA_EXCEEDED",
      message: "Your Gemini API quota limit has been reached. Please retry in a few moments or check your Google AI Studio quota.",
    };
  }

  if (status === 404 || statusStr === "NOT_FOUND") {
    return {
      code: "MODEL_UNAVAILABLE",
      message: `Gemini model ${GEMINI_MODEL} was not found or is unavailable in your region.`,
    };
  }

  if (status === 400) {
    return {
      code: "INVALID_REQUEST",
      message: rawMsg ? `Invalid AI request: ${rawMsg}` : "The request format was rejected by Gemini.",
    };
  }

  if (status >= 500) {
    return {
      code: "GEMINI_PROVIDER_ERROR",
      message: "Google Gemini service encountered a temporary error. Please try again in a few moments.",
    };
  }

  return {
    code: "GEMINI_SERVICE_ERROR",
    message: rawMsg || "Failed to communicate with AI provider.",
  };
}

serve(async (req: Request) => {
  // 1. Handle CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 2. Validate Authenticated Supabase User Context
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return buildErrorResponse("Unauthorized. Authentication token is required.", "UNAUTHORIZED", 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "https://omazwpvkdqtsiakeulru.supabase.co";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "sb_publishable_O6Qp_VU1ioECtOXRR-Z8GQ_OCyLV_o3";

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const {
      data: { user },
      error: userAuthError,
    } = await supabase.auth.getUser(token);

    if (userAuthError || !user) {
      return buildErrorResponse("Unauthorized. Invalid or expired authentication session. Please sign in again.", "UNAUTHORIZED", 401);
    }

    // 3. Parse & Validate Request Body
    const body: RequestBody = await req.json();
    const apiKey = body.gemini_api_key?.trim();

    if (!apiKey) {
      return buildErrorResponse(
        "Gemini API key is required. Please provide your API key in Settings -> AI Coach.",
        "MISSING_API_KEY",
        400
      );
    }

    const { action } = body;

    // Base URL for Gemini API (key is passed securely via x-goog-api-key header, NOT in URL query string)
    const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

    // 4. ACTION: TEST_CONNECTION
    if (action === "test_connection") {
      const startTime = Date.now();

      const res = await fetch(geminiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Respond with the single word 'READY' if you are active." }] }],
        }),
      });

      const latencyMs = Date.now() - startTime;

      if (!res.ok) {
        const mapped = await parseGeminiError(res);
        return buildErrorResponse(mapped.message, mapped.code, res.status);
      }

      return buildSuccessResponse("test_connection", {
        success: true,
        model: GEMINI_MODEL,
        latencyMs,
        message: "Gemini connected successfully",
      });
    }

    // 5. ACTION: GENERATE_TOPIC
    if (action === "generate_topic") {
      const payload = (body.payload || {}) as GenerateTopicPayload;

      const systemInstruction = `You are Verblyn's expert communication coach.
Generate a tailored, high-impact speaking challenge for a professional/student based on their profile.
DO NOT create a generic topic. Contextualize the prompt with realistic workplace or conversational constraints.
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
- Goal: ${payload.primary_goal || "Everyday Communication"}
- Target Role: ${payload.target_role || "Professional / Student"}
- Active Weakness: ${payload.active_weakness || "Filler words & hesitation"}
- Weakest Skill: ${payload.weakest_skill || "Fluency"}
- Current Level: ${payload.current_level || 1}
- Preferred Template/Archetype: ${payload.template_type || "Explain Simply"}
- Recent Prompts to avoid repeating: ${JSON.stringify(payload.recent_prompts || [])}

Generate one distinct, personalized speaking drill for this user.`;

      const res = await fetch(geminiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: [{ parts: [{ text: userContent }] }],
          generationConfig: {
            temperature: 0.7,
            responseMimeType: "application/json",
          },
        }),
      });

      if (!res.ok) {
        const mapped = await parseGeminiError(res);
        return buildErrorResponse(mapped.message, mapped.code, res.status);
      }

      const resData = await res.json();
      const rawText = resData?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        return buildErrorResponse("Gemini returned an empty response", "EMPTY_RESPONSE", 500);
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        return buildErrorResponse("Failed to parse model output JSON", "INVALID_AI_RESPONSE", 500);
      }

      return buildSuccessResponse("generate_topic", parsed);
    }

    // 6. ACTION: ANALYZE_ATTEMPT
    if (action === "analyze_attempt") {
      const payload = (body.payload || {}) as AnalyzeAttemptPayload;

      if (!payload.challenge_title || !payload.challenge_prompt) {
        return buildErrorResponse("Missing challenge metadata in analyze_attempt payload", "INVALID_PAYLOAD", 400);
      }

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

      // Optional inline audio part
      if (payload.audio_base64) {
        parts.push({
          inlineData: {
            mimeType: payload.audio_mime_type || "audio/webm",
            data: payload.audio_base64,
          },
        });
      }

      const promptContext = `CHALLENGE DETAILS:
- Title: ${payload.challenge_title}
- Prompt: "${payload.challenge_prompt}"
- Target Skill: ${payload.target_skill}
- Target Weakness: ${payload.target_weakness || "None"}
- Time Limit: ${payload.time_limit_seconds}s
- Success Criteria: ${JSON.stringify(payload.success_criteria || [])}
- User Goal: ${payload.user_goal || "Professional Speaking"}

DETERMINISTIC MEASUREMENTS:
- Word Count: ${payload.deterministic_metrics?.wordCount || 0}
- Duration: ${payload.deterministic_metrics?.durationSeconds || 0}s
- Pacing: ${payload.deterministic_metrics?.wordsPerMinute || 0} WPM
- Filler Count: ${payload.deterministic_metrics?.fillerCount || 0}
- Repetition Count: ${payload.deterministic_metrics?.repetitionCount || 0}
- Sentence Count: ${payload.deterministic_metrics?.sentenceCount || 0}
- Avg Sentence Length: ${payload.deterministic_metrics?.averageSentenceLength || 0} words
- Vocabulary Diversity: ${payload.deterministic_metrics?.vocabularyDiversity || 0}

TRANSCRIPT:
"${payload.transcript || ""}"

Evaluate the attempt rigorously according to the instructions.`;

      parts.push({ text: promptContext });

      const res = await fetch(geminiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
          },
        }),
      });

      if (!res.ok) {
        const mapped = await parseGeminiError(res);
        return buildErrorResponse(mapped.message, mapped.code, res.status);
      }

      const resData = await res.json();
      const rawText = resData?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        return buildErrorResponse("Gemini returned an empty evaluation", "EMPTY_EVALUATION", 500);
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        return buildErrorResponse("Failed to parse evaluation output JSON", "INVALID_AI_RESPONSE", 500);
      }

      return buildSuccessResponse("analyze_attempt", parsed);
    }

    return buildErrorResponse(`Unknown action: ${action}`, "INVALID_ACTION", 400);
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Internal server error";
    return buildErrorResponse(errorMsg, "INTERNAL_ERROR", 500);
  }
});
