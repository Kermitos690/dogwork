// ============================================================================
// Tests for the central email router.
// Run with:
//   deno test --allow-env --allow-net supabase/functions/_shared/email-router.test.ts
// ============================================================================

import { assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assertSingleProvider, getDefaultEmailProvider } from "./email-provider.ts";

// ----------------------------------------------------------------------------
// Provider selection — wired through getDefaultEmailProvider().
// These guarantee the router cannot silently fan out.
// ----------------------------------------------------------------------------

Deno.test("router default provider = resend when env unset", () => {
  Deno.env.delete("EMAIL_PROVIDER_DEFAULT");
  assertEquals(getDefaultEmailProvider(), "resend");
});

Deno.test("router selects ionos when EMAIL_PROVIDER_DEFAULT=ionos", () => {
  Deno.env.set("EMAIL_PROVIDER_DEFAULT", "ionos");
  assertEquals(getDefaultEmailProvider(), "ionos");
});

Deno.test("router selects google when EMAIL_PROVIDER_DEFAULT=google", () => {
  Deno.env.set("EMAIL_PROVIDER_DEFAULT", "google");
  assertEquals(getDefaultEmailProvider(), "google");
});

Deno.test("router refuses multi-provider fan-out", () => {
  assertThrows(
    () => assertSingleProvider(["resend", "ionos"]),
    Error,
    "Exactly one provider expected",
  );
});

Deno.test("router accepts single-provider list (including override)", () => {
  assertEquals(assertSingleProvider(["ionos"]), "ionos");
  assertEquals(assertSingleProvider(["resend", "resend"]), "resend");
});

// ----------------------------------------------------------------------------
// Module surface — guarantees the public contract does not regress.
// ----------------------------------------------------------------------------

Deno.test("router module exports expected symbols", async () => {
  const mod = await import("./email-router.ts");
  for (const fn of ["routeEmail", "dedupeKey", "getDefaultEmailProvider"]) {
    assertEquals(typeof (mod as Record<string, unknown>)[fn], "function", fn);
  }
});
