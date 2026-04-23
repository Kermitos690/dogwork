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

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

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
  let from = 0;

  while (true) {
    const { data, error } = await liveClient
      .schema("auth")
      .from("users")
      .select("id")
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(`Lecture auth.users impossible: ${error.message}`);

    const users = data ?? [];
    for (const user of users) {
      if (user?.id) validUserIds.add(user.id);
    }

    if (users.length < PAGE_SIZE) break;
    from += users.length;
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

function computeOrphans(
  wallets: WalletRow[],
  ledger: LedgerRow[],
  validUserIds: Set<string>,
) {
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

  return {
    invalidWalletIds: [...invalidWalletIds],
    ledgerMissingUserIds,
    ledgerMissingWalletIds,
    ledgerWithInvalidWalletOwnerIds,
    summary: {
      orphan_wallets: invalidWalletIds.size,
      orphan_ledger_missing_user: ledgerMissingUserIds.length,
      orphan_ledger_missing_wallet: ledgerMissingWalletIds.length,
      orphan_ledger_wallet_owner_missing_user: ledgerWithInvalidWalletOwnerIds.length,
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const liveServiceKey = Deno.env.get("LIVE_SERVICE_ROLE_KEY");

    if (!liveServiceKey) {
      return json({ error: "missing server configuration" }, 500);
    }

    const liveClient = createClient(LIVE_URL, liveServiceKey, {
      auth: { persistSession: false },
    });

    const validUserIds = await fetchAllUserIds(liveClient);
    const walletsBefore = await fetchAllRows<WalletRow>(liveClient, "ai_credit_wallets", "id,user_id");
    const ledgerBefore = await fetchAllRows<LedgerRow>(liveClient, "ai_credit_ledger", "id,user_id,wallet_id");

    const before = computeOrphans(walletsBefore, ledgerBefore, validUserIds);
    const ledgerDeleteIds = [...new Set([
      ...before.ledgerMissingUserIds,
      ...before.ledgerMissingWalletIds,
      ...before.ledgerWithInvalidWalletOwnerIds,
    ])];

    await deleteByIds(liveClient, "ai_credit_ledger", "id", ledgerDeleteIds);
    await deleteByIds(liveClient, "ai_credit_wallets", "id", before.invalidWalletIds);

    const walletsAfter = await fetchAllRows<WalletRow>(liveClient, "ai_credit_wallets", "id,user_id");
    const ledgerAfter = await fetchAllRows<LedgerRow>(liveClient, "ai_credit_ledger", "id,user_id,wallet_id");
    const after = computeOrphans(walletsAfter, ledgerAfter, validUserIds);

    return json({
      success: true,
      deleted: {
        ledger_total_deleted: ledgerDeleteIds.length,
        wallets_deleted: before.invalidWalletIds.length,
      },
      before: before.summary,
      after: after.summary,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal error";
    console.error("cleanup-live-ai-credit-orphans error:", message);
    return json({ error: message }, 500);
  }
});
