// ============================================================================
// Centralized email provider configuration for DogWork.
// Purpose: ensure a SINGLE default provider routes every outgoing email,
// avoid double-sends across providers (Resend / IONOS / Google SMTP),
// and expose an idempotency helper to prevent duplicate sends.
// ----------------------------------------------------------------------------
// Source of truth: env var EMAIL_PROVIDER_DEFAULT ∈ { "resend", "ionos", "google" }
// Fallback: "resend" (legacy default).
// ============================================================================

import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2.57.2";

export type EmailProvider = "resend" | "ionos" | "google";

const VALID_PROVIDERS: ReadonlyArray<EmailProvider> = ["resend", "ionos", "google"];

/**
 * Returns the single default provider for outgoing emails.
 * Any caller MUST route through this — never select a provider ad-hoc.
 */
export function getDefaultEmailProvider(): EmailProvider {
  const raw = (Deno.env.get("EMAIL_PROVIDER_DEFAULT") ?? "resend").toLowerCase().trim();
  if ((VALID_PROVIDERS as ReadonlyArray<string>).includes(raw)) {
    return raw as EmailProvider;
  }
  console.warn(
    `[email-provider] Invalid EMAIL_PROVIDER_DEFAULT="${raw}", falling back to "resend".`,
  );
  return "resend";
}

/**
 * Asserts that only ONE provider is selected for a given send.
 * Throws if the caller tries to fan out across multiple providers
 * (which would cause the recipient to receive the same email twice).
 */
export function assertSingleProvider(providers: ReadonlyArray<EmailProvider>): EmailProvider {
  const unique = Array.from(new Set(providers));
  if (unique.length !== 1) {
    throw new Error(
      `[email-provider] Exactly one provider expected, got ${unique.length}: ${unique.join(", ")}`,
    );
  }
  return unique[0];
}

// ----------------------------------------------------------------------------
// Deduplication: prevent the same logical email from being sent twice.
// Uses email_send_log.message_id as the idempotency key.
// ----------------------------------------------------------------------------

/**
 * Build a stable idempotency key for a logical send event.
 * Example: dedupeKey("booking-confirm", bookingId) -> "booking-confirm:abc-123"
 */
export function dedupeKey(scope: string, ...parts: ReadonlyArray<string>): string {
  return [scope, ...parts.filter(Boolean)].join(":");
}

/**
 * Returns true if an email with this idempotency key was already
 * successfully sent (status in 'sent' or 'pending' within the lookback window).
 * Caller should skip the send if true.
 */
export async function alreadySent(
  supabase: SupabaseClient,
  messageId: string,
  lookbackMinutes = 60,
): Promise<boolean> {
  if (!messageId) return false;
  const since = new Date(Date.now() - lookbackMinutes * 60_000).toISOString();
  const { data, error } = await supabase
    .from("email_send_log")
    .select("id, status")
    .eq("message_id", messageId)
    .gte("created_at", since)
    .in("status", ["sent", "pending"])
    .limit(1);

  if (error) {
    console.warn("[email-provider] alreadySent lookup failed (non-blocking):", error.message);
    return false;
  }
  return (data?.length ?? 0) > 0;
}

/**
 * Convenience: build an admin Supabase client using the service-role key.
 * Kept here so callers don't duplicate the boilerplate.
 */
export function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );
}
