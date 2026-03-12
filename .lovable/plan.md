

## Diagnostic

The network requests reveal the root cause clearly. The `authorization` header sent to `enrich-exercises` contains the **anon key** (HS256 JWT starting with `eyJhbGciOiJIUzI1NiI`), NOT the user's session token (ES256 JWT starting with `eyJhbGciOiJFUzI1NiI`).

The `enrich-exercises` function uses `getClaims(token)` with an anon-key client, which fails because the anon key has no `sub` claim. Meanwhile, `check-subscription` works because it uses a **service role client** + `getUser(token)`, which can validate any token.

## Plan

### 1. Fix `enrich-exercises` auth (critical fix)

Switch from `getClaims()` with anon client to `getUser(token)` with **service role client** -- same pattern as the working `check-subscription` and `seed-exercises` functions:

```typescript
// Use service role client for auth validation
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});
const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);
if (authError || !userData.user) throw new Error("Non authentifié");
// Then check admin role with service role client
const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { 
  _user_id: userData.user.id, _role: "admin" 
});
```

### 2. Fix client-side token passing

In `AdminDashboard.tsx`, get a fresh session token before starting the enrichment loop and pass it explicitly via headers:

```typescript
const { data: { session } } = await supabase.auth.getSession();
if (!session?.access_token) { /* show error */ return; }

// Use fresh token in each invoke call
const { data, error } = await supabase.functions.invoke("enrich-exercises", {
  body: { offset, batchSize: 3, onlyEmpty: true },
  headers: { Authorization: `Bearer ${session.access_token}` },
});
```

### 3. Add `verify_jwt = false` for all functions in `config.toml`

Add entries for all 13 edge functions so the gateway doesn't reject ES256 tokens.

### 4. Migrate remaining functions to `getClaims()` pattern

Functions to update (those using anon client + `getUser`):
- `create-checkout` -- switch to service role client or getClaims
- `create-educator-checkout` -- switch to service role client or getClaims

Functions already working (service role + `getUser`): `check-subscription`, `customer-portal`, `create-educator`, `create-shelter`, `seed-exercises` -- just need config.toml entry.

Functions already using `getClaims()`: `chat`, `send-notification-email` -- just need config.toml entry.

Public/webhook functions (no user auth): `stripe-course-webhook`, `send-appointment-reminders` -- just need config.toml entry.

