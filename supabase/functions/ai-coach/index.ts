import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface GenerateTopicPayload {
  primary_goal?: string;
  user_goal?: string;
  practice_context?: string;
  target_role?: string;
  experience_level?: string;
  target_domain?: string;
  active_weakness?: string;
  target_skill?: string;
  weakest_skill?: string;
  question_category?: string;
  difficulty?: number;
  current_level?: number;
  template_type?: string;
  training_objective?: string;
  adaptive_state?: string;
  scaffolding_level?: string;
  reason_for_next_challenge?: string;
  time_limit_seconds?: number;
  recent_prompts?: string[];
  avoid_prompts?: string[];
  recent_categories?: string[];
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
  action: "test_connection" | "generate_topic" | "analyze_attempt" | "transcribe_audio";
  gemini_api_key?: string;
  payload?: GenerateTopicPayload | AnalyzeAttemptPayload | Record<string, unknown>;
}

const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-3.8-flash";

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
        type: code,
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

  // 1. Invalid API Key / Permissions
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

  // 2. Daily / Free-Tier Quota Exhaustion
  if (
    statusStr === "RESOURCE_EXHAUSTED" ||
    lowerMsg.includes("quota") ||
    lowerMsg.includes("generaterequestsperday") ||
    lowerMsg.includes("generate_content_free_tier") ||
    lowerMsg.includes("free tier") ||
    lowerMsg.includes("exceeded your current quota") ||
    lowerMsg.includes("daily quota") ||
    detailsStr.includes("quota")
  ) {
    return {
      code: "QUOTA_EXHAUSTED",
      message: "Your Gemini API free quota limit has been reached. You can enter a new API key or try again after your quota resets.",
    };
  }

  // 3. Short-term Rate Limiting (per-minute limits)
  if (status === 429 || lowerMsg.includes("rate limit") || lowerMsg.includes("too many requests")) {
    return {
      code: "RATE_LIMITED",
      message: "Gemini is temporarily rate limited. Please wait a moment and try again.",
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
      code: "SERVICE_UNAVAILABLE",
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

      const systemInstruction = `You are Verblyn's expert AI communication & vocal coach.
Generate a tailored, high-impact speaking challenge strictly driven by the authoritative training plan provided by Verblyn.

MANDATORY RULES:
1. THE TRAINING PLAN IS AUTHORITATIVE: Strictly adhere to the requested practice context, category, target role, experience level, target skill, weakness, and training objective.
2. DO NOT CHANGE THE CATEGORY: Generate a challenge that matches the requested "question_category" (e.g. project_deep_dive, behavioral, status_update, etc.).
3. GROUND IN TARGET ROLE: Ground the scenario in the realistic workplace or interview situations of the target role (e.g. Data Analyst, Software Engineer, Product Manager, Business Analyst, Consultant).
4. RESPECT EXPERIENCE LEVEL:
   - For "Student / Fresher": Focus on university/coursework projects, internships, academic collaborations, foundational problem-solving, and entry-level behavioral scenarios. NEVER assume enterprise management experience, cross-functional organization leadership, or years of industry history.
   - For "0–2 Years": Focus on individual project ownership, handling ambiguity, practical debugging/analysis, and peer collaboration.
   - For "2–5 Years": Focus on feature ownership, cross-functional alignment, and decision-making tradeoffs.
   - For "5+ Years": Focus on strategic leadership, architectural decisions, and executive stakeholder alignment.
5. DOMAIN ENRICHMENT: If a target domain is provided (e.g. E-commerce, Finance, Healthcare), naturally flavor the challenge with realistic domain context, without forcing unnatural jargon.
6. NO GENERIC CASUAL TOPICS FOR CAREER CONTEXTS: If the context is "interview" or "workplace", NEVER generate casual prompts like "Describe your favorite movie" or "Talk about your hobby".
7. RESPECT THE TRAINING OBJECTIVE: Structure the prompt and instructions so that successfully speaking requires fulfilling the "training_objective".
8. RESPECT DIFFICULTY: Calibrate scenario nuance, question depth, and time constraint to the specified difficulty level (1-5).
9. ANTI-REPETITION: Do NOT repeat, paraphrase, or closely mimic any prompt in "avoid_prompts" or recent categories in "recent_categories".
10. AUTHENTICITY & ZERO FABRICATION: Do not invent false personal achievements, company names, or resume facts for the user. Frame the prompt open-ended so the user speaks about their real experience.
11. ROLE-RELEVANT COMMUNICATION: If the target role is technical (e.g. Data Analyst or Software Engineer), focus on communicating impact, technical hurdles, and tradeoffs rather than writing code.
12. ACTIONABLE COACHING: Provide realistic success criteria, a concise explanation in "why_this_question", and a high-leverage "coach_tip_before_start".

Return STRICT JSON adhering to this schema:
{
  "challenge_title": string,
  "challenge_prompt": string,
  "challenge_type": string,
  "category": string,
  "practice_context": string,
  "target_role": string,
  "experience_level": string,
  "target_domain": string,
  "target_skill": "Fluency" | "Clarity" | "Vocabulary" | "Grammar" | "Confidence",
  "target_weakness": string,
  "difficulty": number,
  "time_limit_seconds": number,
  "training_objective": string,
  "adaptive_state": string,
  "scaffolding_level": string,
  "reason_for_next_challenge": string,
  "why_this_question": string,
  "why_this_challenge": string,
  "success_criteria": string[],
  "follow_up_question": string,
  "coach_tip_before_start": string
}`;

      const practiceContext = payload.practice_context || "interview";
      const targetRole = payload.target_role || "Student / Professional";
      const experienceLevel = payload.experience_level || "Student / Fresher";
      const targetDomain = payload.target_domain || "General";
      const targetSkill = payload.target_skill || payload.weakest_skill || "Clarity";
      const activeWeakness = payload.active_weakness || "unclear_structure";
      const questionCategory = payload.question_category || "project_deep_dive";
      const difficulty = payload.difficulty || payload.current_level || 2;
      const adaptiveState = payload.adaptive_state || "CONTINUE_REINFORCEMENT";
      const scaffoldingLevel = payload.scaffolding_level || "medium";
      const reasonForNextChallenge = payload.reason_for_next_challenge || "";
      const trainingObjective =
        payload.training_objective ||
        `Practice structured, concise communication tailored for ${targetRole}.`;
      const timeLimitSeconds = payload.time_limit_seconds || 60;
      const avoidPrompts = payload.avoid_prompts || payload.recent_prompts || [];
      const recentCategories = payload.recent_categories || [];

      const userContent = `AUTHORITATIVE TRAINING PLAN:
- User Goal: ${payload.user_goal || payload.primary_goal || "Campus Placements / Career Growth"}
- Practice Context: ${practiceContext}
- Target Role: ${targetRole}
- Experience Level: ${experienceLevel}
- Target Domain / Industry: ${targetDomain}
- Target Skill: ${targetSkill}
- Active Weakness: ${activeWeakness}
- Question Category: ${questionCategory}
- Difficulty Level: ${difficulty} / 5
- Adaptive State: ${adaptiveState}
- Scaffolding Level: ${scaffoldingLevel}
- Reason For Next Challenge: ${reasonForNextChallenge}
- Time Limit: ${timeLimitSeconds} seconds
- Training Objective: ${trainingObjective}
- Avoid Prompts (Do NOT repeat): ${JSON.stringify(avoidPrompts)}
- Avoid Recent Categories: ${JSON.stringify(recentCategories)}

Generate exactly ONE tailored speaking drill adhering strictly to this training plan.`;

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

      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        return buildErrorResponse("Failed to parse model output JSON", "INVALID_AI_RESPONSE", 500);
      }

      // Ensure fallback properties for guaranteed schema consistency
      if (!parsed.why_this_challenge && parsed.why_this_question) {
        parsed.why_this_challenge = parsed.why_this_question as string;
      } else if (!parsed.why_this_question && parsed.why_this_challenge) {
        parsed.why_this_question = parsed.why_this_challenge as string;
      }
      if (!parsed.practice_context) parsed.practice_context = practiceContext;
      if (!parsed.category) parsed.category = questionCategory;
      if (!parsed.target_skill) parsed.target_skill = targetSkill;
      if (!parsed.target_weakness) parsed.target_weakness = activeWeakness;
      if (!parsed.training_objective) parsed.training_objective = trainingObjective;
      if (!parsed.time_limit_seconds) parsed.time_limit_seconds = timeLimitSeconds;

      return buildSuccessResponse("generate_topic", parsed);
    }

    // 6. ACTION: ANALYZE_ATTEMPT
    if (action === "analyze_attempt") {
      const payload = (body.payload || {}) as AnalyzeAttemptPayload;

      if (!payload.challenge_title || !payload.challenge_prompt) {
        return buildErrorResponse("Missing challenge metadata in analyze_attempt payload", "INVALID_PAYLOAD", 400);
      }

      const systemInstruction = `You are Verblyn's strict, honest, evidence-backed AI vocal & communication coach. You are a professional coach, NOT a cheerleader.

MANDATORY EVALUATION PRINCIPLES:
1. THREE-TIER VALIDITY CLASSIFICATION:
   - "INVALID" (Non-Answer / Noise Only): If the speech is completely empty, silence, greeting-only (e.g. "hello", "hi", "testing 1 2 3"), filler-only ("um um uh"), or repetitive single-word noise.
     * For INVALID attempts: "overall_score" MUST be 0. "task_completion.score" MUST be 0. "task_completion.completed" MUST be false. "evaluation_validity" MUST be "INVALID". "is_valid_attempt" MUST be false. "strengths" MUST be an empty array [].
   - "PARTIAL" (Short or Incomplete or Off-Topic):
     * If the user attempts the question but gives a brief, concise, or incomplete answer (e.g., "I built a Power BI dashboard for sales analysis", "I worked on a website project", "I used Python"):
       - This IS a real speech attempt and MUST NOT be classified as "INVALID" or "no speech recorded".
       - Evaluate measurable skills (vocabulary, clarity, grammar) honestly.
       - "task_completion.score" should be 30-65 depending on depth. "evaluation_validity" MUST be "PARTIAL". "is_valid_attempt" MUST be true.
     * If the user spoke real English sentences but on an unrelated/off-topic subject (e.g., talking about sports/movies when asked about a project):
       - DO NOT call it "no speech recorded" or "INVALID". Set "evaluation_validity" to "PARTIAL".
       - "task_completion.score" should be 15-25. "overall_score" MUST be capped at 25-35. "is_valid_attempt" MUST be true.
       - Explicitly explain the topic mismatch in "improvements" and "coach_summary".
   - "VALID" (Substantive Relevant Answer):
     * If the user delivers a meaningful, substantive response addressing the prompt.
     * "task_completion.score" should be 70-100. "evaluation_validity" MUST be "VALID". "is_valid_attempt" MUST be true.
2. TASK COMPLETION GATING (CRITICAL):
   - First determine: "DID THE USER ACTUALLY ANSWER THE QUESTION?"
   - NEVER award a high score to an answer merely because the transcript contains fluent or grammatical English. Fluent off-topic speech is an UNSUCCESSFUL answer (overall_score <= 35).
   - "task_completion.score" is the master gating factor for "overall_score".
3. STRICT EVIDENCE REQUIREMENT (NO FAKE PRAISE):
   - DO NOT give automatic praise or generic flattery (e.g. "Great confidence", "Nice flow").
   - Every strength in "strengths" MUST quote exact phrases from the transcript. If the user did not demonstrate genuine strengths, return "strengths": [].
   - Every improvement MUST quote the exact problem and provide an actionable correction.
4. CONCISE BUT RELEVANT ANSWERS:
   - A short, high-density response that directly answers the question (e.g., "During my internship, I cleaned 30,000 records using Python and built a Power BI dashboard.") is a VALID attempt. Do not penalize brevity if the core question is answered.
5. VERBATIM TRANSCRIPTION:
   - If audio is provided, produce a 100% verbatim transcript in "transcription", preserving all filler words ("um", "uh", "like") without smoothing.

Return STRICT JSON with this schema:
{
  "transcription": string,
  "overall_score": number,
  "evaluation_validity": "VALID" | "PARTIAL" | "INVALID",
  "is_valid_attempt": boolean,
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
      "issue_type": "filler_dependency" | "slow_delivery" | "rushed_delivery" | "unclear_structure" | "overlong_answers" | "excessive_repetition" | "weak_vocabulary" | "grammar_errors" | "excessive_jargon" | "vague_explanation" | "weak_opening" | "weak_conclusion" | "insufficient_detail" | "incomplete_response" | "off_topic" | "no_meaningful_answer",
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

    // 7. ACTION: TRANSCRIBE_AUDIO
    if (action === "transcribe_audio") {
      const payload = (body.payload || {}) as { audio_base64?: string; audio_mime_type?: string };
      if (!payload.audio_base64) {
        return buildErrorResponse("Audio data is required for transcription", "INVALID_PAYLOAD", 400);
      }

      const systemInstruction = `You are a high-precision verbatim speech transcriptionist.
Transcribe the provided audio EXACTLY as spoken.
CRITICAL RULES:
1. Preserve all filler words (e.g. "um", "uh", "ah", "like", "you know", "actually", "basically").
2. Preserve all repetitions, false starts, and hesitations (e.g. "I think, I think that...").
3. DO NOT smooth, summarize, censor, or auto-correct grammatical errors.
4. Output STRICT JSON: { "transcript": string, "detected_language": string }`;

      const res = await fetch(geminiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType: payload.audio_mime_type || "audio/webm",
                    data: payload.audio_base64,
                  },
                },
                { text: "Transcribe this audio recording verbatim." },
              ],
            },
          ],
          generationConfig: {
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
        return buildErrorResponse("Gemini returned an empty transcription", "EMPTY_TRANSCRIPTION", 500);
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        return buildErrorResponse("Failed to parse transcription output JSON", "INVALID_AI_RESPONSE", 500);
      }

      return buildSuccessResponse("transcribe_audio", parsed);
    }

    return buildErrorResponse(`Unknown action: ${action}`, "INVALID_ACTION", 400);
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Internal server error";
    return buildErrorResponse(errorMsg, "INTERNAL_ERROR", 500);
  }
});
