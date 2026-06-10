import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type OpenAiResponse = {
  id?: string;
  output_text?: string;
  output?: Array<{ content?: Array<{ text?: string }> }>;
};

function extractResponseText(json: OpenAiResponse) {
  if (json.output_text) return json.output_text;

  return (json.output || [])
    .flatMap((item) => item.content || [])
    .map((content) => content.text || "")
    .filter(Boolean)
    .join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { healthData } = await req.json();
    const openAiApiKey = Deno.env.get("OPENAI_API_KEY");
    const openAiProjectId = Deno.env.get("OPENAI_PROJECT_ID");

    if (!openAiApiKey) {
      throw new Error("Missing OPENAI_API_KEY secret");
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiApiKey}`,
        "Content-Type": "application/json",
        ...(openAiProjectId ? { "OpenAI-Project": openAiProjectId } : {}),
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        max_output_tokens: 300,
        input: [
          {
            role: "system",
            content:
              "You are a concise Korean fitness coach. Summarize the received health data safely and practically.",
          },
          {
            role: "user",
            content: JSON.stringify(healthData ?? {}, null, 2),
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
    }

    const result = (await response.json()) as OpenAiResponse;
    const aiSummary = extractResponseText(result);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    let dbRecordId: string | null = null;

    if (supabaseUrl && supabaseKey && healthData) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data, error } = await supabase
        .from("health_data")
        .insert({
          steps_data: healthData.steps,
          exercise_data: healthData.exercise,
          running_data: healthData.running,
          sleep_data: healthData.sleep,
          body_composition_data: healthData.bodyComposition,
          nutrition_data: healthData.nutrition,
          synced_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (error) {
        console.error("Failed to save health_data:", error);
      } else {
        dbRecordId = data?.id ?? null;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        responseId: result.id,
        aiSummary,
        dbRecordId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in send-health-data function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
