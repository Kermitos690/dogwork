import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-sync-key",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Auth: compare x-sync-key header with last 20 chars of service role key
    const syncKey = req.headers.get("x-sync-key") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const expectedKey = serviceRoleKey.slice(-20);
    
    // Debug log
    console.log(`syncKey length: ${syncKey.length}, expected length: ${expectedKey.length}`);
    console.log(`syncKey last5: ${syncKey.slice(-5)}, expected last5: ${expectedKey.slice(-5)}`);
    
    if (!syncKey || syncKey !== expectedKey) {
      return new Response(JSON.stringify({ error: "Unauthorized", debug: `got=${syncKey.length}chars expected=${expectedKey.length}chars` }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      serviceRoleKey
    );

    const { exercises } = await req.json();
    if (!Array.isArray(exercises)) {
      return new Response(JSON.stringify({ error: "exercises must be an array" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const ex of exercises) {
      const { id, created_at, ...updateData } = ex;
      
      const { error } = await supabase
        .from("exercises")
        .update(updateData)
        .eq("id", id);

      if (error) {
        errors.push(`${ex.slug}: ${error.message}`);
        failed++;
      } else {
        success++;
      }
    }

    return new Response(JSON.stringify({ success, failed, total: exercises.length, errors: errors.slice(0, 5) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
