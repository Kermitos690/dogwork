import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

type WalletRow = {
  id: string;
  user_id: string;
};

type LedgerRow = {
  id: string;
  user_id: string;
  wallet_id: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LIVE_URL = "https://hdmmqwpypvhwohhhaqnf.supabase.co";
const PAGE_SIZE = 1000;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function fetchAllRows<T>(
  client: ReturnType<typeof createClient>,
  table: string,
  columns: string,
): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await client
      .from(table)
      .select(columns)
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(`Lecture ${table} impossible: ${error.message}`);
    if (!data || data.length === 0) break;

    rows.push(...(data as T[]));
    if (data.length < PAGE_SIZE) break;
    from += data.length;
  }

  return rows;
}

async function fetchAllUserIds(liveClient: ReturnType<typeof createClient>): Promise<Set<string>> {
  const validUserIds = new Set<string>();
  let page = 1;

  while (true) {
    const { data, error } = await liveClient.auth.admin.listUsers({
      page,
      perPage: PAGE_SIZE,
    });

    if (error) throw new Error(`Lecture auth.users impossible: ${error.message}`);

    const users = data?.users ?? [];
    for (const user of users) {
      if (user?.id) validUserIds.add(user.id);
    }

    if (users.length < PAGE_SIZE) break;
    page += 1;
  }

  return validUserIds;
}

async function deleteByIds(
  client: ReturnType<typeof createClient>,
  table: string,
  column: string,
  ids: string[],
) {
  if (ids.length === 0) return;

  for (let i = 0; i < ids.length; i += PAGE_SIZE) {
    const batch = ids.slice(i, i + PAGE_SIZE);
    const { error } = await client.from(table).delete().in(column, batch);
    if (error) throw new Error(`Suppression ${table} impossible: ${error.message}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "missing auth" }, 401);

    const currentUrl = Deno.env.get("SUPABASE_URL");
    const currentServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const liveServiceKey = Deno.env.get("LIVE_SERVICE_ROLE_KEY");

    if (!currentUrl || !currentServiceKey || !liveServiceKey) {
      return json({ error: "missing server configuration" }, 500);
    }

    const currentAdmin = createClient(currentUrl, currentServiceKey, {
      auth: { persistSession: false },
    });

    const jwt = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await currentAdmin.auth.getUser(jwt);
    if (userError || !userData.user) return json({ error: "invalid token" }, 401);

    const { data: roles, error: roleError } = await currentAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);

    if (roleError) return json({ error: `role check failed: ${roleError.message}` }, 500);
    if (!roles?.some((row: { role: string }) => row.role === "admin")) {
      return json({ error: "admin required" }, 403);
    }

    const liveClient = createClient(LIVE_URL, liveServiceKey, {
      auth: { persistSession: false },
    });

    const [wallets, ledger, validUserIds] = await Promise.all([
      fetchAllRows<WalletRow>(liveClient, "ai_credit_wallets", "id,user_id"),
      fetchAllRows<LedgerRow>(liveClient, "ai_credit_ledger", "id,user_id,wallet_id"),
      fetchAllUserIds(liveClient),
    ]);

    const walletIds = new Set(wallets.map((wallet) => wallet.id));
    const invalidWalletIds = new Set(
      wallets.filter((wallet) => !validUserIds.has(wallet.user_id)).map((wallet) => wallet.id),
    );

    const ledgerMissingUserIds = ledger
      .filter((entry) => !validUserIds.has(entry.user_id))
      .map((entry) => entry.id);

    const ledgerMissingWalletIds = ledger
      .filter((entry) => !walletIds.has(entry.wallet_id))
      .map((entry) => entry.id);

    const ledgerWithInvalidWalletOwnerIds = ledger
      .filter((entry) => invalidWalletIds.has(entry.wallet_id))
      .map((entry) => entry.id);

    const uniqueLedgerDeleteIds = [...new Set([
      ...ledgerMissingUserIds,
      ...ledgerMissingWalletIds,
      ...ledgerWithInvalidWalletOwnerIds,
    ])];

    const invalidWalletDeleteIds = [...invalidWalletIds];

    await deleteByIds(liveClient, "ai_credit_ledger", "id", uniqueLedgerDeleteIds);
    await deleteByIds(liveClient, "ai_credit_wallets", "id", invalidWalletDeleteIds);

    const [remainingWallets, remainingLedgerMissingUser, remainingLedgerMissingWallet, remainingLedgerInvalidWalletOwner] = await Promise.all([
      liveClient.from("ai_credit_wallets").select("id", { count: "exact", head: true }).not("user_id", "in", `(${[...validUserIds].slice(0, 1).map(() => "null").join(",")})`),
      liveClient.from("ai_credit_ledger").select("id,user_id,wallet_id"),
      liveClient.from("ai_credit_wallets").select("id,user_id"),
      Promise.resolve(null),
    ]);

    const refreshedWalletRows = (remainingLedgerMissingWallet.data as WalletRow[] | null) ?? [];
    const refreshedWalletIds = new Set(refreshedWalletRows.map((wallet) => wallet.id));
    const refreshedInvalidWalletIds = new Set(
      refreshedWalletRows.filter((wallet) => !validUserIds.has(wallet.user_id)).map((wallet) => wallet.id),
    );
    const refreshedLedgerRows = (remainingLedgerMissingUser.data as LedgerRow[] | null) ?? [];

    const postCheck = {
      orphan_wallets: refreshedWalletRows.filter((wallet) => !validUserIds.has(wallet.user_id)).length,
      orphan_ledger_missing_user: refreshedLedgerRows.filter((entry) => !validUserIds.has(entry.user_id)).length,
      orphan_ledger_missing_wallet: refreshedLedgerRows.filter((entry) => !refreshedWalletIds.has(entry.wallet_id)).length,
      orphan_ledger_wallet_owner_missing_user: refreshedLedgerRows.filter((entry) => refreshedInvalidWalletIds.has(entry.wallet_id)).length,
    };

    return json({
      success: true,
      deleted: {
        ledger_missing_user: ledgerMissingUserIds.length,
        ledger_missing_wallet: ledgerMissingWalletIds.length,
        ledger_invalid_wallet_owner: ledgerWithInvalidWalletOwnerIds.length,
        ledger_total_deleted: uniqueLedgerDeleteIds.length,
        wallets_deleted: invalidWalletDeleteIds.length,
      },
      remaining: postCheck,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal error";
    console.error("cleanup-live-ai-credit-orphans error:", message);
    return json({ error: message }, 500);
  }
});
