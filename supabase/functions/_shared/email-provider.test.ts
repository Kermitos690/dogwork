// ============================================================================
// Tests for the centralized email provider config + dedup helpers.
// Run with: deno test --allow-env supabase/functions/_shared/email-provider.test.ts
// ============================================================================

import { assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  alreadySent,
  assertSingleProvider,
  dedupeKey,
  getDefaultEmailProvider,
} from "./email-provider.ts";

// ----------------------------------------------------------------------------
// getDefaultEmailProvider
// ----------------------------------------------------------------------------

Deno.test("default provider falls back to resend when env unset", () => {
  Deno.env.delete("EMAIL_PROVIDER_DEFAULT");
  assertEquals(getDefaultEmailProvider(), "resend");
});

Deno.test("default provider honors EMAIL_PROVIDER_DEFAULT", () => {
  for (const p of ["resend", "ionos", "google"] as const) {
    Deno.env.set("EMAIL_PROVIDER_DEFAULT", p);
    assertEquals(getDefaultEmailProvider(), p);
  }
});

Deno.test("default provider normalizes case and whitespace", () => {
  Deno.env.set("EMAIL_PROVIDER_DEFAULT", "  IONOS  ");
  assertEquals(getDefaultEmailProvider(), "ionos");
});

Deno.test("default provider rejects unknown values and falls back", () => {
  Deno.env.set("EMAIL_PROVIDER_DEFAULT", "mailgun");
  assertEquals(getDefaultEmailProvider(), "resend");
});

// ----------------------------------------------------------------------------
// assertSingleProvider — guarantees no double-send across providers
// ----------------------------------------------------------------------------

Deno.test("assertSingleProvider accepts a single provider", () => {
  assertEquals(assertSingleProvider(["resend"]), "resend");
});

Deno.test("assertSingleProvider accepts duplicates of the same provider", () => {
  assertEquals(assertSingleProvider(["ionos", "ionos"]), "ionos");
});

Deno.test("assertSingleProvider throws on multi-provider fan-out", () => {
  assertThrows(
    () => assertSingleProvider(["resend", "ionos"]),
    Error,
    "Exactly one provider expected",
  );
});

Deno.test("assertSingleProvider throws on empty input", () => {
  assertThrows(() => assertSingleProvider([]), Error, "Exactly one provider expected");
});

// ----------------------------------------------------------------------------
// dedupeKey
// ----------------------------------------------------------------------------

Deno.test("dedupeKey joins scope and parts deterministically", () => {
  assertEquals(dedupeKey("welcome", "user-1"), "welcome:user-1");
  assertEquals(
    dedupeKey("booking-confirm", "booking-42", "v1"),
    "booking-confirm:booking-42:v1",
  );
});

Deno.test("dedupeKey ignores empty parts", () => {
  assertEquals(dedupeKey("scope", "", "x"), "scope:x");
});

// ----------------------------------------------------------------------------
// alreadySent — non-doublon test against a stubbed Supabase client
// ----------------------------------------------------------------------------

type Row = { id: string; status: string };

function makeStubClient(rows: Row[]) {
  // Minimal chainable stub mimicking the Supabase query builder surface used.
  const builder = {
    _rows: rows,
    select() { return this; },
    eq() { return this; },
    gte() { return this; },
    in() { return this; },
    limit() {
      return Promise.resolve({ data: this._rows, error: null });
    },
  };
  return {
    from() { return builder; },
  } as unknown as Parameters<typeof alreadySent>[0];
}

Deno.test("alreadySent returns false when no prior send exists", async () => {
  const supabase = makeStubClient([]);
  assertEquals(await alreadySent(supabase, "welcome:user-1"), false);
});

Deno.test("alreadySent returns true when a sent row exists (no doublon)", async () => {
  const supabase = makeStubClient([{ id: "1", status: "sent" }]);
  assertEquals(await alreadySent(supabase, "welcome:user-1"), true);
});

Deno.test("alreadySent returns true when a pending row exists (in-flight, no doublon)", async () => {
  const supabase = makeStubClient([{ id: "2", status: "pending" }]);
  assertEquals(await alreadySent(supabase, "booking-confirm:42"), true);
});

Deno.test("alreadySent returns false for empty messageId", async () => {
  const supabase = makeStubClient([{ id: "x", status: "sent" }]);
  assertEquals(await alreadySent(supabase, ""), false);
});
