// E2E security test — reset-pin IDOR protections
// Verifies that the `reset-pin` action rejects:
//   1. Unauthenticated callers
//   2. Authenticated non-shelter / non-admin callers
//   3. Shelter A trying to reset an employee owned by Shelter B
//   4. Mismatched (employee_id, auth_user_id) pair (cannot target arbitrary auth users)
//
// Run with: deno test --allow-net --allow-env supabase/functions/create-shelter-employee/reset_pin_idor_test.ts
//
// Required env (loaded from project root `.env`):
//   VITE_SUPABASE_URL
//   VITE_SUPABASE_PUBLISHABLE_KEY
//
// Optional fixtures to enable the full cross-shelter IDOR test (test will SKIP if absent):
//   TEST_SHELTER_A_JWT        — access_token for an authenticated shelter user (Shelter A)
//   TEST_SHELTER_B_EMPLOYEE_ID — shelter_employees.id owned by Shelter B
//   TEST_SHELTER_B_AUTH_USER_ID — matching shelter_employees.auth_user_id for B
//   TEST_NON_SHELTER_JWT      — access_token of a user without shelter/admin role
//
// IMPORTANT: This is a read-only attack-surface test. It MUST NOT succeed in
// rotating any real PIN. Every assertion expects a 400 error response.

import { loadSync } from "https://deno.land/std@0.224.0/dotenv/mod.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

// Best-effort .env load; do not fail if example vars are missing.
try { loadSync({ export: true, examplePath: null, allowEmptyValues: true }); } catch { /* noop */ }

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const FN_URL = `${SUPABASE_URL}/functions/v1/create-shelter-employee`;

async function call(body: unknown, jwt?: string) {
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON_KEY,
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

Deno.test("reset-pin: rejects unauthenticated caller", async () => {
  const { status, json } = await call({
    action: "reset-pin",
    auth_user_id: "00000000-0000-0000-0000-000000000000",
    employee_id: "00000000-0000-0000-0000-000000000000",
  });
  assertEquals(status, 400);
  assertEquals(json.error, "Non autorisé");
});

Deno.test("reset-pin: rejects non-shelter / non-admin authenticated caller", async () => {
  const jwt = Deno.env.get("TEST_NON_SHELTER_JWT");
  if (!jwt) {
    console.warn("SKIP: TEST_NON_SHELTER_JWT not set");
    return;
  }
  const { status, json } = await call(
    {
      action: "reset-pin",
      auth_user_id: "00000000-0000-0000-0000-000000000000",
      employee_id: "00000000-0000-0000-0000-000000000000",
    },
    jwt,
  );
  assertEquals(status, 400);
  assertEquals(json.error, "Accès refusé");
});

Deno.test("reset-pin: shelter A cannot reset an employee owned by shelter B (cross-shelter IDOR)", async () => {
  const jwt = Deno.env.get("TEST_SHELTER_A_JWT");
  const empId = Deno.env.get("TEST_SHELTER_B_EMPLOYEE_ID");
  const empAuthId = Deno.env.get("TEST_SHELTER_B_AUTH_USER_ID");
  if (!jwt || !empId || !empAuthId) {
    console.warn("SKIP: TEST_SHELTER_A_JWT / TEST_SHELTER_B_EMPLOYEE_ID / TEST_SHELTER_B_AUTH_USER_ID not set");
    return;
  }
  const { status, json } = await call(
    { action: "reset-pin", auth_user_id: empAuthId, employee_id: empId },
    jwt,
  );
  assertEquals(status, 400);
  // Either ownership check fires (expected) or employee not visible — both block the IDOR.
  assert(
    json.error === "Accès refusé" || json.error === "Employé introuvable",
    `Expected ownership rejection, got: ${json.error}`,
  );
  assert(!("pin" in json), "Response must NOT contain a rotated pin");
});

Deno.test("reset-pin: mismatched auth_user_id for a legitimately-owned employee is rejected", async () => {
  const jwt = Deno.env.get("TEST_SHELTER_A_JWT");
  const ownEmpId = Deno.env.get("TEST_SHELTER_A_EMPLOYEE_ID");
  if (!jwt || !ownEmpId) {
    console.warn("SKIP: TEST_SHELTER_A_JWT / TEST_SHELTER_A_EMPLOYEE_ID not set");
    return;
  }
  // Send a clearly-bogus auth_user_id alongside a real (owned) employee_id.
  const { status, json } = await call(
    {
      action: "reset-pin",
      auth_user_id: "00000000-0000-0000-0000-000000000000",
      employee_id: ownEmpId,
    },
    jwt,
  );
  assertEquals(status, 400);
  assertEquals(json.error, "Identifiants employé incohérents");
  assert(!("pin" in json), "Response must NOT contain a rotated pin");
});

Deno.test("reset-pin: missing required fields → 400", async () => {
  const jwt = Deno.env.get("TEST_SHELTER_A_JWT");
  if (!jwt) {
    console.warn("SKIP: TEST_SHELTER_A_JWT not set");
    return;
  }
  const { status, json } = await call({ action: "reset-pin" }, jwt);
  assertEquals(status, 400);
  assertEquals(json.error, "auth_user_id et employee_id requis");
});
