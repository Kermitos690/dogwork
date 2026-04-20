import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // 1. Authenticate caller against the LOCAL (Test) instance
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Authentification requise" }, 401);
    const jwt = authHeader.replace("Bearer ", "");

    const localUrl = Deno.env.get("SUPABASE_URL")!;
    const localAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const localClient = createClient(localUrl, localAnon, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });

    const { data: userData, error: userErr } = await localClient.auth.getUser(jwt);
    if (userErr || !userData?.user) return json({ error: "Session invalide" }, 401);

    // 2. Verify admin role on local instance
    const { data: roles } = await localClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
    if (!isAdmin) return json({ error: "Réservé aux administrateurs" }, 403);

    // 3. Build LIVE service-role client
    const liveUrl = Deno.env.get("LIVE_SUPABASE_URL");
    const liveKey = Deno.env.get("LIVE_SERVICE_ROLE_KEY");
    if (!liveUrl || !liveKey) {
      return json({ error: "Configuration Live manquante (LIVE_SUPABASE_URL / LIVE_SERVICE_ROLE_KEY)" }, 500);
    }
    const live = createClient(liveUrl, liveKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const body = await req.json().catch(() => ({}));
    const action = body?.action as string;

    switch (action) {
      case "list_users": {
        const search = (body.search ?? "").toString().trim().toLowerCase();
        const { data: users, error } = await live.auth.admin.listUsers({ page: 1, perPage: 200 });
        if (error) throw error;
        let list = users.users.map((u) => ({
          user_id: u.id,
          email: u.email,
          display_name: (u.user_metadata as any)?.display_name ?? u.email?.split("@")[0],
          created_at: u.created_at,
        }));
        if (search) {
          list = list.filter(
            (u) =>
              (u.email ?? "").toLowerCase().includes(search) ||
              (u.display_name ?? "").toLowerCase().includes(search),
          );
        }
        // Attach wallet balances
        const ids = list.slice(0, 50).map((u) => u.user_id);
        const { data: wallets } = await live
          .from("ai_credit_wallets")
          .select("user_id, balance, lifetime_consumed, lifetime_purchased")
          .in("user_id", ids);
        const wmap = new Map((wallets ?? []).map((w: any) => [w.user_id, w]));
        return json({
          users: list.slice(0, 50).map((u) => ({ ...u, wallet: wmap.get(u.user_id) ?? null })),
        });
      }

      case "get_balance": {
        const userId = body.user_id as string;
        if (!userId) return json({ error: "user_id requis" }, 400);
        const { data, error } = await live.rpc("get_ai_balance", { _user_id: userId });
        if (error) throw error;
        return json({ balance: data });
      }

      case "credit_wallet": {
        const userId = body.user_id as string;
        const credits = parseInt(body.credits, 10);
        const description = (body.description ?? "Ajustement admin (cross-env)").toString();
        if (!userId || !Number.isFinite(credits) || credits === 0) {
          return json({ error: "user_id et credits (≠0) requis" }, 400);
        }
        const { data, error } = await live.rpc("credit_ai_wallet", {
          _user_id: userId,
          _credits: credits,
          _operation_type: "admin_adjustment",
          _description: description,
          _metadata: { source: "admin-live-proxy", admin_id: userData.user.id },
        });
        if (error) throw error;
        return json({ new_balance: data });
      }

      default:
        return json({ error: `Action inconnue: ${action}` }, 400);
    }
  } catch (err: any) {
    console.error("admin-live-proxy error:", err);
    return json({ error: err?.message ?? "Erreur serveur" }, 500);
  }
});
