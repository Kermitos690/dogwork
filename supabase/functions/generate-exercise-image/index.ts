import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Non authentifié");

    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    const userId = userData?.user?.id;
    if (authError || !userId) throw new Error("Non authentifié");

    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Accès refusé : admin requis");

    const body = await req.json().catch(() => ({}));
    const exerciseId = body.exerciseId;
    if (!exerciseId) throw new Error("exerciseId requis");

    // Fetch exercise
    const { data: exercise, error: exErr } = await supabase
      .from("exercises")
      .select("id, name, description, objective, level, exercise_type")
      .eq("id", exerciseId)
      .single();
    if (exErr || !exercise) throw new Error("Exercice introuvable");

    // Skip if already has image
    if (body.force !== true) {
      const { data: existing } = await supabase
        .from("exercises")
        .select("cover_image")
        .eq("id", exerciseId)
        .single();
      if (existing?.cover_image) {
        return new Response(JSON.stringify({ skipped: true, message: "Image déjà présente" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const imagePrompt = `Create a clear, simple instructional illustration for a dog training exercise called "${exercise.name}".
The illustration should show:
- A person standing with correct posture, demonstrating the exercise with a dog
- Clean line-art style, flat colors, white background
- Educational diagram style, like a textbook illustration
- Show the human's body position clearly (hands, posture, leash)
- Show the dog's expected position/behavior
- NO text overlaid on the image
- NO watermarks
- Professional, friendly, and approachable style
- The dog should be a medium-sized generic breed

Exercise context: ${exercise.objective || exercise.description || exercise.name}
Level: ${exercise.level || "beginner"}`;

    const imageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image-preview",
        messages: [{ role: "user", content: imagePrompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!imageResponse.ok) {
      const errText = await imageResponse.text();
      if (imageResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, réessayez plus tard" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI image error ${imageResponse.status}: ${errText}`);
    }

    const imageResult = await imageResponse.json();
    const imageData = imageResult.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!imageData) throw new Error("Pas d'image générée par l'IA");

    // Extract base64 data
    const base64Match = imageData.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
    if (!base64Match) throw new Error("Format d'image invalide");
    
    const mimeType = `image/${base64Match[1]}`;
    const base64Data = base64Match[2];
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    const fileName = `${exercise.id}.${base64Match[1] === "jpeg" ? "jpg" : base64Match[1]}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("exercise-images")
      .upload(fileName, binaryData, {
        contentType: mimeType,
        upsert: true,
      });
    if (uploadError) throw new Error(`Upload error: ${uploadError.message}`);

    // Get public URL
    const { data: urlData } = supabase.storage.from("exercise-images").getPublicUrl(fileName);
    const publicUrl = urlData.publicUrl;

    // Update exercise
    const { error: updateError } = await supabase
      .from("exercises")
      .update({ cover_image: publicUrl })
      .eq("id", exerciseId);
    if (updateError) throw new Error(`Update error: ${updateError.message}`);

    return new Response(JSON.stringify({ success: true, url: publicUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("generate-exercise-image error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: e.message.includes("Rate limited") ? 429 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
