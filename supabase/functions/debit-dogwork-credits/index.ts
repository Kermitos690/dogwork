import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface DebitBody {
  feature_key: string;
  module_slug?: string | null;
  organization_id?: string | null;
  reference_id?: string | null;
  metadata?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Session invalide" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userData.user;

    const body = (await req.json()) as DebitBody;
    if (!body?.feature_key || typeof body.feature_key !== "string") {
      return new Response(JSON.stringify({ error: "feature_key requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) Lookup cost
    const { data: cost, error: costErr } = await adminClient
      .from("feature_credit_costs")
      .select("feature_key,credit_cost,module_slug,is_active,label")
      .eq("feature_key", body.feature_key)
      .maybeSingle();

    if (costErr || !cost || !cost.is_active) {
      return new Response(
        JSON.stringify({ error: "Fonctionnalité inconnue ou désactivée" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const requiredModule = body.module_slug ?? cost.module_slug ?? null;

    // 2) Module access (admin bypass via has_module)
    if (requiredModule) {
      const { data: hasMod, error: modErr } = await adminClient.rpc("has_module", {
        _user_id: user.id,
        _organization_id: body.organization_id ?? null,
        _module_slug: requiredModule,
      });
      if (modErr) {
        return new Response(JSON.stringify({ error: modErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!hasMod) {
        return new Response(
          JSON.stringify({
            error: "module_required",
            message: `Module « ${requiredModule} » non actif pour cet utilisateur.`,
            module_slug: requiredModule,
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // 3) Debit via RPC
    const { data: result, error: debitErr } = await adminClient.rpc("debit_dogwork_credits", {
      _user_id: user.id,
      _organization_id: body.organization_id ?? null,
      _feature_key: body.feature_key,
      _module_slug: requiredModule,
      _reference_id: body.reference_id ?? null,
    });

    if (debitErr) {
      return new Response(JSON.stringify({ error: debitErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
