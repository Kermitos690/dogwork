
The user wants Preview and Production to look/behave identically. Two screenshots show different layouts of the Admin page — tablet (prod) vs Lovable preview (mobile after publish). Root cause: **they are looking at two different physical viewports** (tablet ~1024px vs phone ~414px), so the responsive grid simply renders differently. That is normal CSS behavior, not a sync bug.

But the deeper recurring complaint is: **"quand je publie depuis preview, la prod ne reflète pas mes changements"**. Two real causes here:

1. **Two separate Supabase instances** (Test `dcwbqsfeouvghcnvhrpj` vs Live `hdmmqwpypvhwohhhaqnf`). Lovable publishes the **frontend code** to Live, but data lives in two distinct DBs and never syncs. Manual credit adjustments done in `/admin/ai-economy` while on the **preview URL** write to the Test DB. The published app reads from Live DB → balance stays 0.
2. **The frontend `src/integrations/supabase/client.ts` is auto-generated and points to a single instance per environment.** That part is correct and untouchable. So we cannot "merge" databases — that would be unsafe (would wipe real user data).

What the user actually needs:
- A **single source of truth**: when working in Preview, all admin operations (manual credit, user creation, etc.) must target the **published Live DB** so the published app reflects them.
- Stop the misleading "Preview shows different data" experience for admin tooling specifically.

### Solution

Make admin economy/credit operations go through an **edge function that always writes to Live**, regardless of which environment the admin UI is hosted on. Edge functions can hold a Live service-role key as a secret (`LIVE_SERVICE_ROLE_KEY` + `LIVE_SUPABASE_URL`) and proxy the writes.

### Plan

1. **Add two new secrets to the Test project**: `LIVE_SUPABASE_URL`, `LIVE_SERVICE_ROLE_KEY` (user provides the Live service-role key once).
2. **Create edge function `admin-live-proxy`** (deployed in Test):
   - Verifies caller is admin (via Test JWT → check `user_roles` → admin).
   - Accepts actions: `credit_wallet`, `list_users`, `get_balance`, `create_user`.
   - Internally uses a Supabase client built with `LIVE_SUPABASE_URL` + `LIVE_SERVICE_ROLE_KEY` and executes the RPC/insert against **Live**.
3. **Refactor `src/pages/AdminAIEconomy.tsx`** to call this proxy when crediting wallets. Remove the "disabled in preview" lockout (no longer needed). Replace it with a clear toggle "Cible: Production (Live)" — always Live for credit operations.
4. **Same proxy pattern for user search** so the admin sees the actual Live user list when searching to credit a wallet.
5. **Remove obsolete `post-publish-sync` confusion**: keep the function but rename UI button to "Réinjecter le catalogue dans cet environnement" — clarify it's per-env, not cross-env.
6. **Document in memory**: cross-env admin proxy pattern → `mem://tech/infrastructure/admin-cross-env-proxy`.

### What stays untouched
- `src/integrations/supabase/client.ts` (auto-generated).
- Live database schema/data.
- Stripe webhooks.
- Auth flows.

### Why not "merge databases"
Merging would either delete real production user data or expose Live data to Preview testing — both unacceptable. The proxy approach gives the user exactly what they asked: "quand je travaille sur preview et publie, ça doit se publier réellement" → admin actions in Preview will hit Live directly.

### Required from user
The **Live service-role key** (from Lovable Cloud → Live project → API keys). I'll request it via the secrets tool when I switch to default mode.

### Visual difference (tablet vs phone)
That part is purely responsive CSS — same code, different viewport. Nothing to fix; the published app is identical to preview when viewed at the same screen size.
