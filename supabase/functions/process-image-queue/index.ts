import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not set" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const body = await req.json().catch(() => ({}));
  const batchSize = body.batch_size || 3;

  let processed = 0;
  let successCount = 0;
  let failedCount = 0;

  // Process items one by one from the queue
  while (true) {
    // Pick next pending item
    const { data: items, error: pickErr } = await supabase
      .from("image_generation_queue")
      .select("*")
      .eq("status", "pending")
      .order("created_at")
      .limit(1);

    if (pickErr || !items || items.length === 0) break;
    const item = items[0];

    // Mark as processing
    await supabase.from("image_generation_queue")
      .update({ status: "processing", updated_at: new Date().toISOString() })
      .eq("id", item.id);

    try {
      const prompt = `Professional minimalist illustration for a dog training exercise card. Clean white background. Show a simple, elegant line-art style drawing of a person training a dog. The exercise is: "${item.exercise_name}" - ${item.exercise_objective || ""}. 
Style: Modern flat illustration with clean lines, soft muted colors (sage green, warm beige, soft blue accents), minimal details, professional quality like a premium app UI. The dog should look friendly and attentive. No text on the image. Aspect ratio 16:9, horizontal layout.`;

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3.1-flash-image-preview",
          messages: [{ role: "user", content: prompt }],
          modalities: ["image", "text"],
        }),
      });

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        console.error(`AI error for ${item.exercise_slug}: ${aiResponse.status} ${errText}`);
        await supabase.from("image_generation_queue")
          .update({ status: "failed", error_message: `AI ${aiResponse.status}`, updated_at: new Date().toISOString() })
          .eq("id", item.id);
        failedCount++;
        if (aiResponse.status === 429) await new Promise((r) => setTimeout(r, 15000));
        else await new Promise((r) => setTimeout(r, 2000));
        processed++;
        if (processed >= batchSize) break; // Process in batches, then re-trigger
        continue;
      }

      const aiData = await aiResponse.json();
      const imageUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (!imageUrl || !imageUrl.startsWith("data:image")) {
        await supabase.from("image_generation_queue")
          .update({ status: "failed", error_message: "No image in response", updated_at: new Date().toISOString() })
          .eq("id", item.id);
        failedCount++;
        processed++;
        if (processed >= batchSize) break;
        continue;
      }

      const base64Match = imageUrl.match(/^data:image\/(\w+);base64,(.+)$/);
      if (!base64Match) {
        await supabase.from("image_generation_queue")
          .update({ status: "failed", error_message: "Invalid base64", updated_at: new Date().toISOString() })
          .eq("id", item.id);
        failedCount++;
        processed++;
        if (processed >= batchSize) break;
        continue;
      }

      const ext = base64Match[1] === "jpeg" ? "jpg" : base64Match[1];
      const base64Data = base64Match[2];
      const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
      const filePath = `covers/${item.exercise_slug}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("exercise-images")
        .upload(filePath, binaryData, { contentType: `image/${base64Match[1]}`, upsert: true });

      if (uploadErr) {
        await supabase.from("image_generation_queue")
          .update({ status: "failed", error_message: uploadErr.message, updated_at: new Date().toISOString() })
          .eq("id", item.id);
        failedCount++;
        processed++;
        if (processed >= batchSize) break;
        continue;
      }

      const { data: urlData } = supabase.storage.from("exercise-images").getPublicUrl(filePath);

      const { error: updateErr } = await supabase
        .from("exercises")
        .update({ cover_image: urlData.publicUrl })
        .eq("id", item.exercise_id);

      if (updateErr) {
        await supabase.from("image_generation_queue")
          .update({ status: "failed", error_message: updateErr.message, updated_at: new Date().toISOString() })
          .eq("id", item.id);
        failedCount++;
      } else {
        await supabase.from("image_generation_queue")
          .update({ status: "done", updated_at: new Date().toISOString() })
          .eq("id", item.id);
        successCount++;
        console.log(`✓ Generated image for: ${item.exercise_name}`);
      }

      processed++;
      if (processed >= batchSize) break;
      await new Promise((r) => setTimeout(r, 3000)); // Rate limit spacing
    } catch (err) {
      console.error(`Error for ${item.exercise_slug}:`, err);
      await supabase.from("image_generation_queue")
        .update({ status: "failed", error_message: err instanceof Error ? err.message : "Unknown error", updated_at: new Date().toISOString() })
        .eq("id", item.id);
      failedCount++;
      processed++;
      if (processed >= batchSize) break;
    }
  }

  // Check if more pending items remain — if so, re-trigger self
  const { count: remainingCount } = await supabase
    .from("image_generation_queue")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  if (remainingCount && remainingCount > 0) {
    // Re-trigger self (fire and forget)
    fetch(`${SUPABASE_URL}/functions/v1/process-image-queue`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
      body: JSON.stringify({ batch_size: batchSize }),
    }).catch(() => {});
  }

  return new Response(JSON.stringify({ processed, success: successCount, failed: failedCount }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
