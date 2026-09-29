import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_TRANSCRIPT_LENGTH = 10000;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { transcript, topic, keywords } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("Service configuration error");
    }

    // Input validation
    if (!transcript || typeof transcript !== "string" || transcript.trim().length === 0) {
      return new Response(
        JSON.stringify({ 
          error: "No transcript provided",
          grammar_score: 0,
          fluency_score: 0,
          vocabulary_score: 0,
          confidence_score: 0,
          feedback: {
            overall: "No speech was detected. Please try recording again.",
            grammar: [],
            fluency: [],
            vocabulary: [],
            confidence: [],
            tips: ["Speak clearly into your microphone", "Make sure your browser has microphone permissions"]
          }
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate transcript length
    if (transcript.length > MAX_TRANSCRIPT_LENGTH) {
      return new Response(
        JSON.stringify({ error: "Transcript too long. Maximum length is 10,000 characters." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate topic and keywords if provided
    const sanitizedTopic = typeof topic === "string" ? topic.slice(0, 500) : "General speaking practice";
    const sanitizedKeywords = Array.isArray(keywords) 
      ? keywords.filter(k => typeof k === "string").slice(0, 10).map(k => k.slice(0, 50))
      : [];

    const systemPrompt = `You are an expert speaking coach analyzing speech transcripts. Analyze the following speech and provide detailed feedback.

Topic: ${sanitizedTopic}
Keywords to include: ${sanitizedKeywords.join(", ") || "None specified"}

Analyze the transcript for:
1. Grammar (sentence structure, tense usage, subject-verb agreement)
2. Fluency (flow, filler words like "um", "uh", "like", hesitations, repetitions)
3. Vocabulary (word variety, topic relevance, sophistication)
4. Confidence (assertive language, hedging words, sentence completion)

Return your analysis using the analyze_speech function.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze this speech transcript:\n\n"${transcript}"` }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_speech",
              description: "Return the speech analysis with scores and feedback",
              parameters: {
                type: "object",
                properties: {
                  grammar_score: { 
                    type: "integer", 
                    description: "Grammar score from 0-100",
                    minimum: 0,
                    maximum: 100
                  },
                  fluency_score: { 
                    type: "integer", 
                    description: "Fluency score from 0-100",
                    minimum: 0,
                    maximum: 100
                  },
                  vocabulary_score: { 
                    type: "integer", 
                    description: "Vocabulary score from 0-100",
                    minimum: 0,
                    maximum: 100
                  },
                  confidence_score: { 
                    type: "integer", 
                    description: "Confidence score from 0-100",
                    minimum: 0,
                    maximum: 100
                  },
                  feedback: {
                    type: "object",
                    properties: {
                      overall: { type: "string", description: "2-3 sentence overall summary" },
                      grammar: { 
                        type: "array", 
                        items: { type: "string" },
                        description: "List of specific grammar observations"
                      },
                      fluency: { 
                        type: "array", 
                        items: { type: "string" },
                        description: "List of fluency observations"
                      },
                      vocabulary: { 
                        type: "array", 
                        items: { type: "string" },
                        description: "List of vocabulary observations"
                      },
                      confidence: { 
                        type: "array", 
                        items: { type: "string" },
                        description: "List of confidence observations"
                      },
                      tips: { 
                        type: "array", 
                        items: { type: "string" },
                        description: "3-5 actionable tips for improvement"
                      }
                    },
                    required: ["overall", "grammar", "fluency", "vocabulary", "confidence", "tips"]
                  }
                },
                required: ["grammar_score", "fluency_score", "vocabulary_score", "confidence_score", "feedback"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "analyze_speech" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service quota exceeded. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("AI analysis failed");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      throw new Error("Invalid AI response format");
    }

    const analysis = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    // Log to server only, don't expose internal details
    console.error("analyze-speech error:", error);
    return new Response(
      JSON.stringify({ 
        error: "An error occurred during analysis. Please try again.",
        grammar_score: 0,
        fluency_score: 0,
        vocabulary_score: 0,
        confidence_score: 0,
        feedback: {
          overall: "An error occurred during analysis. Please try again.",
          grammar: [],
          fluency: [],
          vocabulary: [],
          confidence: [],
          tips: []
        }
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
