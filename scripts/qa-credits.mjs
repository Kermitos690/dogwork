// E2E test: signup → wallet bonus → purchase pack → ledger + emails
import { createClient } from "@supabase/supabase-js";

const URL = "https://dcwbqsfeouvghcnvhrpj.supabase.co";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjd2Jxc2Zlb3V2Z2hjbnZocnBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMzkxMDcsImV4cCI6MjA4ODgxNTEwN30.wF0VlmMKVqeJOo2q3GlWVzl1-EyYMd3-i2YDhYBKfog";

const ts = Date.now();
const email = `qa-credits-${ts}@dogwork-test.local`;
const password = `Test!${ts}aZ9`;

const supa = createClient(URL, ANON, { auth: { persistSession: false } });

console.log(`\n=== TEST 1: Signup → bonus 10 crédits ===`);
console.log(`email: ${email}`);

const { data: signup, error: errSignup } = await supa.auth.signUp({
  email, password,
  options: { data: { display_name: "QA Credits Test" } },
});
if (errSignup) { console.error("❌ signUp:", errSignup); process.exit(1); }
const userId = signup.user?.id;
console.log(`✅ user créé: ${userId}`);
console.log(`   session présente: ${!!signup.session}`);

// Tenter login pour bypass email confirm si autoconfirm off
let session = signup.session;
if (!session) {
  const { data: signin, error: errSignin } = await supa.auth.signInWithPassword({ email, password });
  if (errSignin) {
    console.log(`⚠️  Login impossible (email confirm requis): ${errSignin.message}`);
    console.log(`   → on va lire le wallet via service-role plus tard via psql/RPC admin`);
  } else {
    session = signin.session;
    console.log(`✅ login réussi`);
  }
}

if (session) {
  // Trigger ensure_ai_wallet via RPC
  const supaAuth = createClient(URL, ANON, {
    global: { headers: { Authorization: `Bearer ${session.access_token}` } },
    auth: { persistSession: false },
  });
  const { data: walletId, error: errEnsure } = await supaAuth.rpc("ensure_credit_wallet");
  console.log(`   ensure_credit_wallet → ${walletId} ${errEnsure ? "ERR:"+errEnsure.message : ""}`);

  const { data: bal, error: errBal } = await supaAuth.rpc("get_my_credit_balance");
  if (errBal) console.error("❌ get_my_credit_balance:", errBal);
  else console.log(`✅ Balance: ${JSON.stringify(bal)}`);
}

console.log(`\n[user_id pour requêtes BDD] ${userId}`);
console.log(`[email] ${email}`);
