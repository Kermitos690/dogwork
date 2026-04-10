import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // This function syncs enriched exercise content from the catalog JSON in storage
    // It reads the catalog from storage and calls the sync RPC
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Auth: require admin JWT OR cron secret
    const cronSecret = req.headers.get("x-cron-secret");
    const expectedSecret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"); // reuse as secret for simplicity
    
    const authHeader = req.headers.get("Authorization");
    let isAuthorized = false;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        const { data: admin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
        if (admin) isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[cross-sync] Starting exercise sync...");

    // Try to fetch catalog from storage
    const catalogUrl = `${SUPABASE_URL}/storage/v1/object/public/exercise-images/data/exercise-catalog.json`;
    const catalogRes = await fetch(catalogUrl);
    
    if (!catalogRes.ok) {
      console.log("[cross-sync] No catalog JSON found in storage. Generating from DB...");
      
      // Build catalog from current DB
      const { data: categories, error: catErr } = await supabase
        .from("exercise_categories")
        .select("*")
        .order("sort_order");
      
      if (catErr) throw catErr;

      // Fetch all exercises in batches
      const allExercises: any[] = [];
      let offset = 0;
      const batchSize = 100;
      
      while (true) {
        const { data: batch, error: exErr } = await supabase
          .from("exercises")
          .select("*, exercise_categories!inner(slug)")
          .range(offset, offset + batchSize - 1)
          .order("slug");
        
        if (exErr) throw exErr;
        if (!batch || batch.length === 0) break;
        
        for (const ex of batch) {
          allExercises.push({
            ...ex,
            category_slug: ex.exercise_categories?.slug,
            exercise_categories: undefined,
          });
        }
        
        offset += batchSize;
        if (batch.length < batchSize) break;
      }

      console.log(`[cross-sync] Built catalog: ${categories?.length} categories, ${allExercises.length} exercises`);

      const catalog = {
        categories: categories?.map(c => ({
          slug: c.slug, name: c.name, icon: c.icon, color: c.color,
          description: c.description, sort_order: c.sort_order, is_professional: c.is_professional,
        })),
        exercises: allExercises.map(e => {
          const { id, category_id, created_at, ...rest } = e;
          return rest;
        }),
      };

      // Call the sync RPC
      const { data, error } = await supabase.rpc("sync_exercises_from_catalog_data", {
        _catalog: catalog,
      });

      if (error) {
        console.error("[cross-sync] RPC error:", error);
        throw error;
      }

      console.log("[cross-sync] Sync result:", JSON.stringify(data));

      return new Response(JSON.stringify({ success: true, result: data, source: "db" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use catalog from storage
    const catalog = await catalogRes.json();
    console.log(`[cross-sync] Catalog from storage: ${catalog.categories?.length} categories, ${catalog.exercises?.length} exercises`);

    const { data, error } = await supabase.rpc("sync_exercises_from_catalog_data", {
      _catalog: catalog,
    });

    if (error) {
      console.error("[cross-sync] RPC error:", error);
      throw error;
    }

    console.log("[cross-sync] Sync result:", JSON.stringify(data));

    return new Response(JSON.stringify({ success: true, result: data, source: "storage" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[cross-sync] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
