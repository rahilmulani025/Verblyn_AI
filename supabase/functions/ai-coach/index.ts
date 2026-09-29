import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  action: "test_connection" | "generate_topic" | "analyze_attempt";
  gemini_api_key?: string;
  payload?: any;
}

const GEMINI_MODEL = "gemini-2.5-flash";

function buildSuccessResponse(action: string, data: any) {
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
      error: message,
      code,
    }),
    {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const apiKey = body.gemini_api_key?.trim();

    if (!apiKey) {
      return buildErrorResponse("Gemini API key is required. Please provide your API key in Settings -> AI Coach.", "MISSING_API_KEY", 401);
    }

    const { action, payload } = body;

    // 1. ACTION: TEST_CONNECTION
    if (action === "test_connection") {
      const startTime = Date.now();
      const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

      const res = await fetch(testUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Respond with the single word 'READY' if you are active." }] }],
        }),
      });

      const latencyMs = Date.now() - startTime;

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const errMsg = errJson?.error?.message || `Gemini API returned status ${res.status}`;
        return buildErrorResponse(errMsg, "GEMINI_AUTH_ERROR", res.status);
      }

      return buildSuccessResponse("test_connection", {
        success: true,
        model: GEMINI_MODEL,
        latencyMs,
        message: "Gemini connected successfully",
      });
    }

    // 2. ACTION: GENERATE_TOPIC
    if (action === "generate_topic") {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

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
  "difficulty": number (1-5),
  "time_limit_seconds": number (30-180),
  "success_criteria": string[],
  "why_this_challenge": string,
  "follow_up_question": string,
  "coach_tip_before_start": string
}`;

      const userContent = `User Profile:
- Goal: ${payload?.primary_goal || "Everyday Communication"}
- Target Role: ${payload?.target_role || "Professional / Student"}
- Active Weakness: ${payload?.active_weakness || "Filler words & hesitation"}
- Weakest Skill: ${payload?.weakest_skill || "Fluency"}
- Current Level: ${payload?.current_level || 1}
- Preferred Template/Archetype: ${payload?.template_type || "Explain Simply"}
- Recent Prompts to avoid repeating: ${JSON.stringify(payload?.recent_prompts || [])}

Generate one distinct, personalized speaking drill for this user.`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        const errJson = await res.json().catch(() => ({}));
        return buildErrorResponse(errJson?.error?.message || "Failed to generate topic with Gemini", "GENERATION_FAILED", res.status);
      }

      const resData = await res.json();
      const rawText = resData?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        return buildErrorResponse("Gemini returned an empty response", "EMPTY_RESPONSE", 500);
      }

      let parsed;
      try {
        parsed = JSON.parse(rawText);
      } catch (parseErr) {
        return buildErrorResponse("Failed to parse model JSON", "INVALID_JSON", 500);
      }

      return buildSuccessResponse("generate_topic", parsed);
    }

    // 3. ACTION: ANALYZE_ATTEMPT
    if (action === "analyze_attempt") {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

      const systemInstruction = `You are Verblyn's rigorous, honest AI vocal & communication coach.
EVALUATION PRINCIPLES:
1. DO NOT give automatic praise or generic flattery.
2. Base every score and feedback point strictly on concrete evidence in the spoken response.
3. If the user was off-topic, incomplete, vague, repetitive, or full of filler words, state it directly.
4. Each strength MUST quote or pinpoint exact words/structures used.
5. Each improvement MUST quote the exact problem and provide an actionable correction.
6. Return STRICT JSON with this schema:
{
  "overall_score": number (0-100),
  "task_completion": {
    "score": number (0-100),
    "completed": boolean,
    "explanation": string
  },
  "skills": {
    "fluency": number (0-100),
    "clarity": number (0-100),
    "structure": number (0-100),
    "vocabulary": number (0-100),
    "grammar": number (0-100),
    "confidence": number (0-100)
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
  "confidence_in_evaluation": number (0-100)
}`;

      const parts: any[] = [];

      // If audio base64 is provided, attach inline audio part
      if (payload?.audio_base64) {
        parts.push({
          inlineData: {
            mimeType: payload.audio_mime_type || "audio/webm",
            data: payload.audio_base64,
          },
        });
      }

      const promptContext = `CHALLENGE DETAILS:
- Title: ${payload?.challenge_title}
- Prompt: "${payload?.challenge_prompt}"
- Target Skill: ${payload?.target_skill}
- Target Weakness: ${payload?.target_weakness || "None"}
- Time Limit: ${payload?.time_limit_seconds}s
- Success Criteria: ${JSON.stringify(payload?.success_criteria || [])}
- User Goal: ${payload?.user_goal || "Professional Speaking"}

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
"${payload?.transcript || ""}"

Evaluate the attempt rigorously according to the instructions.`;

      parts.push({ text: promptContext });

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.2, // Rigorous, deterministic evaluation
            responseMimeType: "application/json",
          },
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        return buildErrorResponse(errJson?.error?.message || "Gemini evaluation request failed", "EVALUATION_FAILED", res.status);
      }

      const resData = await res.json();
      const rawText = resData?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        return buildErrorResponse("Gemini returned an empty evaluation", "EMPTY_EVALUATION", 500);
      }

      let parsed;
      try {
        parsed = JSON.parse(rawText);
      } catch (parseErr) {
        return buildErrorResponse("Failed to parse evaluation output JSON", "INVALID_JSON", 500);
      }

      return buildSuccessResponse("analyze_attempt", parsed);
    }

    return buildErrorResponse(`Unknown action: ${action}`, "INVALID_ACTION", 400);
  } catch (error: any) {
    return buildErrorResponse(error.message || "Internal server error", "INTERNAL_ERROR", 500);
  }
});
