import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VALID_DIFFICULTIES = ["beginner", "intermediate", "advanced"];

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

    const body = await req.json().catch(() => ({}));
    
    // Input validation and sanitization
    let difficulty = "intermediate";
    if (typeof body.difficulty === "string" && VALID_DIFFICULTIES.includes(body.difficulty.toLowerCase())) {
      difficulty = body.difficulty.toLowerCase();
    }

    let category = "";
    if (typeof body.category === "string") {
      category = body.category.slice(0, 100).replace(/[<>]/g, "");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("Service configuration error");
    }

    const systemPrompt = `You are a speaking coach generating practice topics. Generate an engaging speaking topic for a ${difficulty} level speaker.
${category ? `Category preference: ${category}` : "Choose from diverse categories like technology, culture, personal development, current events, or philosophy."}

The topic should:
- Be thought-provoking but accessible
- Allow for personal opinions and experiences
- Have enough depth for 1-3 minutes of speaking
- Be appropriate for English language practice

Return the topic using the generate_topic function.`;

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
          { role: "user", content: "Generate a new speaking topic for me to practice." }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_topic",
              description: "Return a speaking topic with keywords and structure",
              parameters: {
                type: "object",
                properties: {
                  topic: { 
                    type: "string", 
                    description: "The main speaking topic as a clear question or statement"
                  },
                  description: { 
                    type: "string", 
                    description: "A brief 1-2 sentence description of what to talk about"
                  },
                  keywords: { 
                    type: "array", 
                    items: { type: "string" },
                    description: "5-7 keywords to try to incorporate in the response"
                  },
                  structure: {
                    type: "object",
                    properties: {
                      intro: { type: "string", description: "Suggested opening approach" },
                      main_points: { 
                        type: "array", 
                        items: { type: "string" },
                        description: "2-3 main points to cover"
                      },
                      conclusion: { type: "string", description: "Suggested way to wrap up" }
                    },
                    required: ["intro", "main_points", "conclusion"]
                  },
                  recommended_time: { 
                    type: "integer", 
                    description: "Recommended speaking time in seconds (60-180)"
                  },
                  difficulty: {
                    type: "string",
                    enum: ["beginner", "intermediate", "advanced"],
                    description: "Difficulty level of the topic"
                  },
                  category: {
                    type: "string",
                    description: "Category of the topic (e.g., Technology, Culture, Personal)"
                  }
                },
                required: ["topic", "description", "keywords", "structure", "recommended_time", "difficulty", "category"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_topic" } }
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
      throw new Error("Topic generation failed");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      throw new Error("Invalid AI response format");
    }

    const topicData = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(topicData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    // Log to server only, don't expose internal details
    console.error("generate-topic error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate topic. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
