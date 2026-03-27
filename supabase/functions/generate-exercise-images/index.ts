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
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Strict auth check: admin only, no bypass
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const token = authHeader.replace("Bearer ", "");
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: isAdmin } = await supabase.rpc("has_role", {
    _user_id: user.id,
    _role: "admin",
  });
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = await req.json().catch(() => ({}));
  const batchSize = body.batch_size || 5;
  const offset = body.offset || 0;

  // Fetch exercises without cover images
  const { data: exercises, error: fetchErr } = await supabase
    .from("exercises")
    .select("id, slug, name, objective, description")
    .is("cover_image", null)
    .order("name")
    .range(offset, offset + batchSize - 1);

  if (fetchErr) {
    return new Response(JSON.stringify({ error: fetchErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!exercises || exercises.length === 0) {
    return new Response(
      JSON.stringify({ message: "No exercises need images", processed: 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const results: { slug: string; success: boolean; error?: string }[] = [];

  for (const exercise of exercises) {
    try {
      const prompt = `Professional minimalist illustration for a dog training exercise card. Clean white background. Show a simple, elegant line-art style drawing of a person training a dog. The exercise is: "${exercise.name}" - ${exercise.objective || exercise.description?.slice(0, 100) || ""}. 
Style: Modern flat illustration with clean lines, soft muted colors (sage green, warm beige, soft blue accents), minimal details, professional quality like a premium app UI. The dog should look friendly and attentive. No text on the image. Aspect ratio 16:9, horizontal layout.`;

      const aiResponse = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
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
        }
      );

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        console.error(`AI error for ${exercise.slug}: ${aiResponse.status} ${errText}`);
        results.push({ slug: exercise.slug, success: false, error: `AI ${aiResponse.status}` });
        if (aiResponse.status === 429) {
          await new Promise((r) => setTimeout(r, 15000));
        }
        continue;
      }

      const aiData = await aiResponse.json();
      const imageUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (!imageUrl || !imageUrl.startsWith("data:image")) {
        results.push({ slug: exercise.slug, success: false, error: "No image in response" });
        continue;
      }

      const base64Match = imageUrl.match(/^data:image\/(\w+);base64,(.+)$/);
      if (!base64Match) {
        results.push({ slug: exercise.slug, success: false, error: "Invalid base64" });
        continue;
      }

      const ext = base64Match[1] === "jpeg" ? "jpg" : base64Match[1];
      const base64Data = base64Match[2];
      const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

      const filePath = `covers/${exercise.slug}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("exercise-images")
        .upload(filePath, binaryData, {
          contentType: `image/${base64Match[1]}`,
          upsert: true,
        });

      if (uploadErr) {
        results.push({ slug: exercise.slug, success: false, error: uploadErr.message });
        continue;
      }

      const { data: urlData } = supabase.storage.from("exercise-images").getPublicUrl(filePath);

      const { error: updateErr } = await supabase
        .from("exercises")
        .update({ cover_image: urlData.publicUrl })
        .eq("id", exercise.id);

      if (updateErr) {
        results.push({ slug: exercise.slug, success: false, error: updateErr.message });
        continue;
      }

      results.push({ slug: exercise.slug, success: true });
      console.log(`✓ Generated image for: ${exercise.name}`);
      await new Promise((r) => setTimeout(r, 3000));
    } catch (err) {
      console.error(`Error for ${exercise.slug}:`, err);
      results.push({
        slug: exercise.slug,
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  const successCount = results.filter((r) => r.success).length;

  return new Response(
    JSON.stringify({
      processed: results.length,
      success: successCount,
      failed: results.length - successCount,
      results,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
