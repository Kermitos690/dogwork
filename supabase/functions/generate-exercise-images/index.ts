import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Auth check: admin only
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const token = authHeader.replace("Bearer ", "");
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = await req.json().catch(() => ({}));
  const action = body.action || "enqueue";

  // ACTION: enqueue — find exercises without images and add them to queue
  if (action === "enqueue") {
    // Get exercises without cover images that are NOT already in queue
    const { data: exercises, error: fetchErr } = await supabase
      .from("exercises")
      .select("id, slug, name, objective")
      .is("cover_image", null)
      .order("name");

    if (fetchErr) {
      return new Response(JSON.stringify({ error: fetchErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!exercises || exercises.length === 0) {
      return new Response(JSON.stringify({ message: "Tous les exercices ont une illustration.", queued: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Remove existing pending/processing entries to avoid duplicates
    await supabase.from("image_generation_queue").delete().in("status", ["pending", "processing"]);

    const rows = exercises.map((ex) => ({
      exercise_id: ex.id,
      exercise_slug: ex.slug,
      exercise_name: ex.name,
      exercise_objective: ex.objective,
      status: "pending",
    }));

    const { error: insertErr } = await supabase.from("image_generation_queue").insert(rows);
    if (insertErr) {
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Trigger the worker (fire-and-forget)
    const workerUrl = `${SUPABASE_URL}/functions/v1/process-image-queue`;
    fetch(workerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
      body: JSON.stringify({ batch_size: 3 }),
    }).catch(() => {});

    return new Response(JSON.stringify({ queued: exercises.length, message: `${exercises.length} illustrations en file d'attente.` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ACTION: status — return current queue progress
  if (action === "status") {
    const { data: items } = await supabase.from("image_generation_queue").select("status");
    const total = items?.length || 0;
    const done = items?.filter((i: any) => i.status === "done").length || 0;
    const failed = items?.filter((i: any) => i.status === "failed").length || 0;
    const pending = items?.filter((i: any) => i.status === "pending").length || 0;
    const processing = items?.filter((i: any) => i.status === "processing").length || 0;

    return new Response(JSON.stringify({
      total, done, failed, pending, processing,
      finished: pending === 0 && processing === 0,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "Unknown action" }), {
    status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
