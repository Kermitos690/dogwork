import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TEST_PASSWORD = "testdev123456";

const TEST_ACCOUNTS: Record<string, { email: string; display_name: string; role: string }> = {
  owner: { email: "test-owner@pawplan.dev", display_name: "Test Propriétaire", role: "owner" },
  educator: { email: "test-educator@pawplan.dev", display_name: "Test Éducateur", role: "educator" },
  admin: { email: "test-admin@pawplan.dev", display_name: "Test Admin", role: "admin" },
  shelter: { email: "test-shelter@pawplan.dev", display_name: "Test Refuge", role: "shelter" },
};

const PROD_HOSTS = new Set([
  "dogwork-at-home.com",
  "www.dogwork-at-home.com",
]);

function extractHost(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return value.toLowerCase();
  }
}

function isProdHost(host: string | null): boolean {
  if (!host) return false;
  return PROD_HOSTS.has(host);
}

function isLovablePreviewHost(host: string | null): boolean {
  if (!host) return false;
  return host.endsWith(".lovable.app") || host === "lovable.app";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const environment = Deno.env.get("ENVIRONMENT") || "production";
  const originHost = extractHost(req.headers.get("origin"));
  const refererHost = extractHost(req.headers.get("referer"));
  const reqHost = extractHost(req.url) || req.headers.get("host");

  // Hard block: if any signal points to the real production domain, deny.
  if (isProdHost(originHost) || isProdHost(refererHost) || isProdHost(reqHost)) {
    console.log("dev-login denied: reason=production_domain");
    return new Response(
      JSON.stringify({ error: "Not available in this environment" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const isDev = environment === "development";
  const isPreview =
    isLovablePreviewHost(originHost) ||
    isLovablePreviewHost(refererHost) ||
    isLovablePreviewHost(reqHost);

  if (!isDev && !isPreview) {
    console.log("dev-login denied: reason=environment_production_without_preview");
    return new Response(
      JSON.stringify({ error: "Not available in this environment" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  console.log(
    `dev-login allowed: reason=${isDev ? "environment_development" : "lovable_preview"}`
  );

  try {
    const { role } = await req.json();
    const account = TEST_ACCOUNTS[role];
    if (!account) {
      return new Response(JSON.stringify({ error: "Invalid role" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    let user = (existingUsers?.users as any[] | undefined)?.find((u) => u.email === account.email);

    if (!user) {
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: account.email,
        password: TEST_PASSWORD,
        email_confirm: true,
        user_metadata: { display_name: account.display_name },
      });
      if (createErr) throw createErr;
      user = created.user;

      if (account.role !== "owner") {
        await supabaseAdmin.from("user_roles").insert({
          user_id: user.id,
          role: account.role,
        });
      }

      if (account.role === "shelter") {
        await supabaseAdmin.from("shelter_profiles").insert({
          user_id: user.id,
          name: "Refuge Test",
          description: "Compte refuge de test",
        });
      }

      if (account.role === "educator") {
        await supabaseAdmin.from("coach_profiles").insert({
          user_id: user.id,
          display_name: account.display_name,
          specialty: "Comportement canin",
        });
      }
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const { data: signInData, error: signInErr } = await anonClient.auth.signInWithPassword({
      email: account.email,
      password: TEST_PASSWORD,
    });

    if (signInErr) throw signInErr;

    return new Response(
      JSON.stringify({
        access_token: signInData.session?.access_token,
        refresh_token: signInData.session?.refresh_token,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
