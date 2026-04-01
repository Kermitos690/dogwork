import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
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

    // Fetch the enriched catalog from storage
    const catalogUrl = `${SUPABASE_URL}/storage/v1/object/public/exercise-images/data/exercise-catalog.json`;
    const catalogRes = await fetch(catalogUrl);
    if (!catalogRes.ok) throw new Error(`Failed to fetch catalog: ${catalogRes.status}`);
    const catalog = await catalogRes.json();

    const categories = catalog.categories || [];
    const exercises = catalog.exercises || [];

    // Step 1: Sync categories - upsert by slug
    let catSynced = 0;
    const catMap: Record<string, string> = {}; // slug -> live id

    for (const cat of categories) {
      const { id: _testId, ...catData } = cat;
      // Try to find existing by slug
      const { data: existing } = await supabase
        .from("exercise_categories")
        .select("id")
        .eq("slug", cat.slug)
        .maybeSingle();

      if (existing) {
        // Update existing
        await supabase.from("exercise_categories").update(catData).eq("id", existing.id);
        catMap[cat.slug] = existing.id;
      } else {
        // Insert new
        const { data: inserted } = await supabase
          .from("exercise_categories")
          .insert(catData)
          .select("id")
          .single();
        if (inserted) catMap[cat.slug] = inserted.id;
      }
      catSynced++;
    }

    // Step 2: Sync exercises - update by slug with enriched content
    let exUpdated = 0;
    let exFailed = 0;
    const errors: string[] = [];

    for (const ex of exercises) {
      try {
        // Resolve category_id from slug
        const liveCatId = catMap[ex.category_slug];
        if (!liveCatId) {
          errors.push(`${ex.slug}: catégorie '${ex.category_slug}' introuvable`);
          exFailed++;
          continue;
        }

        // Strip fields that shouldn't be copied
        const {
          id: _id,
          category_name: _cn,
          category_icon: _ci,
          category_slug: _cs,
          category_id: _oldCatId,
          ...updateData
        } = ex;

        // Set the correct live category_id
        const payload = {
          ...updateData,
          category_id: liveCatId,
        };

        const { error: updateErr } = await supabase
          .from("exercises")
          .update(payload)
          .eq("slug", ex.slug);

        if (updateErr) {
          errors.push(`${ex.slug}: ${updateErr.message}`);
          exFailed++;
        } else {
          exUpdated++;
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`${ex.slug}: ${msg}`);
        exFailed++;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      categories_synced: catSynced,
      exercises_updated: exUpdated,
      exercises_failed: exFailed,
      errors: errors.slice(0, 20),
      message: `${catSynced} catégories et ${exUpdated} exercices synchronisés. ${exFailed} erreurs.`,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});