import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (s: string, d?: unknown) => console.log(`[INVITATIONS] ${s}`, d ? JSON.stringify(d) : "");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: auth } } }
    );

    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify educator role
    const { data: roles } = await userClient.from("user_roles").select("role").eq("user_id", u.user.id);
    const isEducator = (roles ?? []).some((r: { role: string }) => r.role === "educator" || r.role === "admin");
    if (!isEducator) {
      return new Response(JSON.stringify({ error: "Réservé aux éducateurs" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "list");

    if (action === "list") {
      const { data, error } = await admin
        .from("educator_invitations")
        .select("*")
        .eq("educator_user_id", u.user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify({ invitations: data ?? [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "create") {
      const label = String(body.label ?? "").slice(0, 80);
      const notes = String(body.notes ?? "").slice(0, 500);
      const max_uses = body.max_uses ? Number(body.max_uses) : null;
      const expires_at = body.expires_at ?? null;

      // Generate unique code
      const { data: codeData, error: codeErr } = await admin.rpc("generate_unique_invitation_code");
      if (codeErr) throw codeErr;
      const code = String(codeData);

      const { data, error } = await admin
        .from("educator_invitations")
        .insert({
          educator_user_id: u.user.id,
          code,
          label,
          notes,
          max_uses,
          expires_at,
        })
        .select()
        .single();
      if (error) throw error;
      log("Invitation created", { code, label });
      return new Response(JSON.stringify({ invitation: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "toggle") {
      const id = String(body.id ?? "");
      const is_active = Boolean(body.is_active);
      const { data, error } = await admin
        .from("educator_invitations")
        .update({ is_active })
        .eq("id", id)
        .eq("educator_user_id", u.user.id)
        .select()
        .single();
      if (error) throw error;
      return new Response(JSON.stringify({ invitation: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      const id = String(body.id ?? "");
      const { error } = await admin
        .from("educator_invitations")
        .delete()
        .eq("id", id)
        .eq("educator_user_id", u.user.id);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Action inconnue" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const m = e instanceof Error ? e.message : "Erreur";
    log("ERROR", { m });
    return new Response(JSON.stringify({ error: m }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
