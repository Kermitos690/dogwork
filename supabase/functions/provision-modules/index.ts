import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProvisionBody {
  user_id?: string;
  organization_id?: string | null;
  plan_slug?: string;
  module_slugs?: string[];
  source?: "subscription" | "addon" | "trial" | "admin";
  expires_at?: string | null;
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
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data: u } = await userClient.auth.getUser();
    if (!u.user) {
      return new Response(JSON.stringify({ error: "Session invalide" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdminRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", u.user.id)
      .eq("role", "admin")
      .maybeSingle();
    const isAdmin = !!isAdminRow;

    const body = (await req.json()) as ProvisionBody;
    const targetUserId = isAdmin && body.user_id ? body.user_id : u.user.id;
    const orgId = body.organization_id ?? null;
    const source = body.source ?? "subscription";
    const expiresAt = body.expires_at ?? null;

    // Resolve modules: from plan_slug or explicit list
    let moduleSlugs: string[] = [];
    if (body.plan_slug) {
      const { data: pm } = await admin
        .from("plan_modules")
        .select("module_slug, included")
        .eq("plan_slug", body.plan_slug)
        .eq("included", true);
      moduleSlugs = (pm ?? []).map((r) => r.module_slug);
    }
    if (Array.isArray(body.module_slugs)) {
      moduleSlugs = Array.from(new Set([...moduleSlugs, ...body.module_slugs]));
    }

    if (moduleSlugs.length === 0) {
      return new Response(JSON.stringify({ error: "Aucun module à provisionner" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const provisioned: string[] = [];

    for (const slug of moduleSlugs) {
      if (orgId) {
        const { error } = await admin.from("organization_modules").upsert(
          {
            organization_id: orgId,
            module_slug: slug,
            status: "active",
            source,
            expires_at: expiresAt,
            activated_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "organization_id,module_slug" },
        );
        if (!error) provisioned.push(slug);
      } else {
        const { error } = await admin.from("user_modules").upsert(
          {
            user_id: targetUserId,
            module_slug: slug,
            status: "active",
            source,
            expires_at: expiresAt,
            activated_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,module_slug" },
        );
        if (!error) provisioned.push(slug);
      }
    }

    // Credit included credits if plan provided
    let creditsGranted = 0;
    if (body.plan_slug) {
      const { data: plan } = await admin
        .from("plans")
        .select("included_credits")
        .eq("slug", body.plan_slug)
        .maybeSingle();
      if (plan?.included_credits && plan.included_credits > 0) {
        await admin.rpc("credit_ai_wallet", {
          _user_id: targetUserId,
          _credits: plan.included_credits,
          _operation_type: "monthly_grant",
          _description: `Crédits inclus plan ${body.plan_slug}`,
          _stripe_payment_id: null,
          _public_price_chf: null,
          _metadata: { plan_slug: body.plan_slug, source },
        });
        creditsGranted = plan.included_credits;
      }
    }

    return new Response(
      JSON.stringify({ success: true, provisioned, credits_granted: creditsGranted }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
