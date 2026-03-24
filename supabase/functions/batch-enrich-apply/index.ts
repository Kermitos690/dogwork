import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { updates } = await req.json();
    if (!Array.isArray(updates)) throw new Error("updates must be an array");

    let success = 0;
    let failed = 0;

    for (const u of updates) {
      const { error } = await supabaseAdmin
        .from("exercises")
        .update({
          description: u.description || undefined,
          tutorial_steps: u.tutorial_steps || undefined,
          voice_commands: u.voice_commands || undefined,
          body_positioning: u.body_positioning || undefined,
          troubleshooting: u.troubleshooting || undefined,
          validation_protocol: u.validation_protocol || undefined,
          success_criteria: u.success_criteria || undefined,
          stop_criteria: u.stop_criteria || undefined,
        })
        .eq("id", u.id);

      if (error) {
        console.error(`Failed ${u.id}:`, error.message);
        failed++;
      } else {
        success++;
      }
    }

    return new Response(JSON.stringify({ success, failed, total: updates.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
