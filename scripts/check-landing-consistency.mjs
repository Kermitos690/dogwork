#!/usr/bin/env node
/**
 * Landing ↔ Live consistency check
 * ================================
 * Lit src/lib/landingPromises.ts (ce qui est ANNONCÉ sur la landing)
 * et le compare aux valeurs réellement présentes en base PRODUCTION.
 *
 * Échoue (exit 1) si la moindre divergence est détectée.
 *
 * USAGE :
 *   node scripts/check-landing-consistency.mjs
 *
 * À EXÉCUTER OBLIGATOIREMENT AVANT CHAQUE PUBLISH (manuel ou CI).
 *
 * Variables d'env requises :
 *   VITE_SUPABASE_URL              (URL projet Live)
 *   VITE_SUPABASE_PUBLISHABLE_KEY  (clé anon Live)
 * Le .env du projet contient déjà ces variables.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// --- charge .env minimaliste ---
function loadDotEnv() {
  try {
    const raw = readFileSync(resolve(ROOT, ".env"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {}
}
loadDotEnv();

const URL = process.env.VITE_SUPABASE_URL;
const KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!URL || !KEY) {
  console.error("❌ VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY manquants.");
  process.exit(2);
}

// --- charge LANDING_PROMISES depuis le TS (parse simple) ---
function loadPromises() {
  const raw = readFileSync(resolve(ROOT, "src/lib/landingPromises.ts"), "utf8");
  // On évite la dépendance ts-node : on évalue en remplaçant l'export par un return.
  const body = raw
    .replace(/export\s+interface[\s\S]*?^}\s*$/m, "")
    .replace(/export\s+const\s+LANDING_PROMISES\s*:\s*LandingPromises\s*=\s*/, "return ")
    .replace(/^\s*\/\*\*[\s\S]*?\*\//gm, "");
  // eslint-disable-next-line no-new-func
  return new Function(body)();
}

const promises = loadPromises();
const supabase = createClient(URL, KEY);

const errors = [];
const ok = [];

function fail(msg) { errors.push(msg); }
function pass(msg) { ok.push(msg); }

// --- 1. PLANS ---
{
  const { data: plans, error: e1 } = await supabase
    .from("subscription_plans")
    .select("code,max_dogs,monthly_ai_credits,is_active");
  if (e1) { fail(`subscription_plans: ${e1.message}`); }

  const { data: prices, error: e2 } = await supabase
    .from("subscription_plan_prices")
    .select("plan_code,price_chf,billing_period,is_public");
  if (e2) { fail(`subscription_plan_prices: ${e2.message}`); }

  for (const p of promises.plans) {
    const live = (plans ?? []).find((x) => x.code === p.code && x.is_active);
    if (!live) { fail(`Plan "${p.code}" annoncé sur landing mais ABSENT (ou inactif) en Live.`); continue; }

    const liveMaxDogs = live.max_dogs >= 999999 ? "unlimited" : live.max_dogs;
    if (liveMaxDogs !== p.max_dogs) {
      fail(`Plan "${p.code}".max_dogs : landing=${p.max_dogs} ≠ Live=${liveMaxDogs}`);
    } else pass(`Plan "${p.code}".max_dogs OK (${p.max_dogs})`);

    if (Number(live.monthly_ai_credits) !== p.monthly_ai_credits) {
      fail(`Plan "${p.code}".monthly_ai_credits : landing=${p.monthly_ai_credits} ≠ Live=${live.monthly_ai_credits}`);
    } else pass(`Plan "${p.code}".monthly_ai_credits OK (${p.monthly_ai_credits})`);

    const livePrice = (prices ?? []).find((x) => x.plan_code === p.code && x.is_public);
    if (!livePrice && p.price_chf > 0) {
      fail(`Plan "${p.code}" : aucun prix public trouvé en Live alors que landing annonce ${p.price_chf} CHF.`);
    } else if (livePrice && Number(livePrice.price_chf) !== p.price_chf) {
      fail(`Plan "${p.code}".price_chf : landing=${p.price_chf} ≠ Live=${livePrice.price_chf}`);
    } else pass(`Plan "${p.code}".price_chf OK (${p.price_chf} CHF)`);
  }
}

// --- 2. CREDIT PACKS ---
{
  const { data: packs, error } = await supabase
    .from("ai_credit_packs")
    .select("credits,price_chf,is_active")
    .eq("is_active", true);
  if (error) fail(`ai_credit_packs: ${error.message}`);

  for (const promised of promises.credit_packs) {
    const live = (packs ?? []).find((x) => x.credits === promised.credits);
    if (!live) {
      fail(`Pack ${promised.credits} crédits annoncé sur landing : ABSENT en Live.`);
      continue;
    }
    if (Number(live.price_chf) !== promised.price_chf) {
      fail(`Pack ${promised.credits} crédits : landing=${promised.price_chf} CHF ≠ Live=${live.price_chf} CHF`);
    } else pass(`Pack ${promised.credits} crédits OK (${promised.price_chf} CHF)`);
  }
}

// --- 3. AI FEATURE COSTS ---
{
  const { data: feats, error } = await supabase
    .from("ai_feature_catalog")
    .select("code,credits_cost,is_active")
    .eq("is_active", true);
  if (error) fail(`ai_feature_catalog: ${error.message}`);

  for (const promised of promises.ai_feature_costs) {
    const live = (feats ?? []).find((x) => x.code === promised.code);
    if (!live) {
      fail(`Feature IA "${promised.code}" annoncée sur landing : ABSENTE (ou inactive) en Live.`);
      continue;
    }
    if (Number(live.credits_cost) !== promised.credits_cost) {
      fail(`Feature "${promised.code}".credits_cost : landing=${promised.credits_cost} ≠ Live=${live.credits_cost}`);
    } else pass(`Feature "${promised.code}" OK (${promised.credits_cost} crédits)`);
  }
}

// --- RÉSULTAT ---
console.log(`\n✅ Vérifications réussies : ${ok.length}`);
for (const m of ok) console.log("   • " + m);

if (errors.length === 0) {
  console.log("\n🎉 Landing ↔ Live : 100 % cohérent. OK pour publish.\n");
  process.exit(0);
} else {
  console.error(`\n❌ Divergences détectées : ${errors.length}`);
  for (const m of errors) console.error("   • " + m);
  console.error("\n🛑 NE PAS PUBLISH avant correction (mettre à jour landingPromises.ts, la landing, ou la base Live).\n");
  process.exit(1);
}
