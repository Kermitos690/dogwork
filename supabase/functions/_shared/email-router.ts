// ============================================================================
// DogWork — Central email router.
//
// Single entry point for business-side outgoing emails (notifications,
// alerts, ad-hoc transactional sends that do NOT go through the React Email
// templates + pgmq queue).
//
// Responsibilities:
//  - Resolve the active provider via getDefaultEmailProvider().
//  - Refuse multi-provider fan-out (assertSingleProvider).
//  - Idempotency: skip if alreadySent() within the lookback window.
//  - Suppression: refuse to send to addresses on suppressed_emails.
//  - Logging: writes `pending` BEFORE the send and `sent` / `failed` after.
//  - Never leaks secret values into logs.
//
// IMPORTANT — boundaries:
//  - The Lovable-managed transactional pipeline (send-transactional-email
//    → pgmq → process-email-queue → Lovable Email API) is a SEPARATE
//    channel and is intentionally NOT routed here. It already has its
//    own idempotency + suppression + token handling. The router below
//    targets the three explicit providers {resend, ionos, google}.
//  - send-via-ionos and send-via-google remain low-level admin functions.
//    The router calls them with the service-role JWT, never the caller's.
// ============================================================================

import {
  adminClient,
  alreadySent,
  assertSingleProvider,
  dedupeKey,
  EmailProvider,
  getDefaultEmailProvider,
} from "./email-provider.ts";

export type RouterStatus =
  | "sent"
  | "skipped_duplicate"
  | "skipped_suppressed"
  | "skipped_unsubscribed"
  | "failed";

export interface RouterPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  fromName?: string;
  replyTo?: string;
  /** Stable business event id used to derive the idempotency key. */
  eventId: string;
  /** Logical scope, e.g. "notification", "course_approved", "support_ticket". */
  eventType: string;
  /** Optional category — used for suppression-respecting logic. */
  category?: "transactional" | "notification" | "marketing" | "auth";
  /** Pre-computed idempotency key. If omitted, derived from eventType+eventId+to. */
  idempotencyKey?: string;
  /** Force provider — ONLY for explicit admin diagnostics. */
  providerOverride?: EmailProvider;
}

export interface RouterResult {
  status: RouterStatus;
  provider: EmailProvider;
  messageId: string;
  error?: string;
  latencyMs?: number;
}

const TRANSIENT_BLOCKING_STATUSES: Array<"sent" | "pending"> = ["sent", "pending"];

function buildIdempotencyKey(p: RouterPayload): string {
  return p.idempotencyKey ?? dedupeKey(p.eventType, p.eventId, p.to.toLowerCase());
}

// ----------------------------------------------------------------------------
// Provider implementations — each returns a normalized result.
// They MUST NOT log secret values; only redacted markers.
// ----------------------------------------------------------------------------

async function sendViaResend(p: RouterPayload, messageId: string): Promise<{ ok: boolean; error?: string }> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY not configured" };
  const from = Deno.env.get("RESEND_FROM_EMAIL")
    || `${p.fromName ?? "DogWork"} <noreply@notify.dogwork-at-home.com>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from,
      to: [p.to],
      subject: p.subject,
      html: p.html,
      text: p.text,
      reply_to: p.replyTo,
      headers: { "X-Entity-Ref-ID": messageId },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    // Truncate to avoid leaking large bodies; do not include API key.
    return { ok: false, error: `Resend ${res.status}: ${errText.slice(0, 300)}` };
  }
  return { ok: true };
}

async function sendViaInternalProvider(
  funcName: "send-via-ionos" | "send-via-google",
  p: RouterPayload,
  messageId: string,
): Promise<{ ok: boolean; error?: string }> {
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/${funcName}`;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  // Note: send-via-ionos / send-via-google require an admin JWT. The
  // service_role JWT satisfies their auth.getUser() + has_role check
  // (service_role implicitly bypasses RLS but they re-check role; in
  // practice service_role calls are accepted because supabase.auth.getUser
  // with a service_role token returns no user, so we cannot rely on that
  // path. The recommended route is to call the *low-level send* directly,
  // not via HTTP — but to keep blast radius minimal we keep HTTP for now
  // and rely on the admin diagnostic UI to drive these manually.)
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
    },
    body: JSON.stringify({
      to: p.to,
      subject: p.subject,
      html: p.html,
      text: p.text,
      fromName: p.fromName ?? "DogWork",
      replyTo: p.replyTo,
      idempotencyKey: messageId,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.ok === false || data?.success === false) {
    return { ok: false, error: data?.errorMessage || data?.error || `HTTP ${res.status}` };
  }
  return { ok: true };
}

// ----------------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------------

export async function routeEmail(p: RouterPayload): Promise<RouterResult> {
  const supabase = adminClient();
  const messageId = buildIdempotencyKey(p);
  const provider = assertSingleProvider([
    p.providerOverride ?? getDefaultEmailProvider(),
  ]);

  // 1. Idempotency.
  if (await alreadySent(supabase, messageId)) {
    return { status: "skipped_duplicate", provider, messageId };
  }

  // 2. Suppression list (hard block).
  const recipient = p.to.toLowerCase();
  const { data: suppressed } = await supabase
    .from("suppressed_emails")
    .select("id")
    .eq("email", recipient)
    .maybeSingle();
  if (suppressed) {
    await supabase.from("email_send_log").insert({
      message_id: messageId,
      template_name: p.eventType,
      recipient_email: p.to,
      status: "suppressed",
      metadata: { provider, router: true, event_type: p.eventType },
    });
    return { status: "skipped_suppressed", provider, messageId };
  }

  // 3. Unsubscribe respected only for non-critical categories.
  if (p.category === "notification" || p.category === "marketing") {
    const { data: unsub } = await supabase
      .from("email_unsubscribe_tokens")
      .select("used_at")
      .eq("email", recipient)
      .maybeSingle();
    if (unsub?.used_at) {
      await supabase.from("email_send_log").insert({
        message_id: messageId,
        template_name: p.eventType,
        recipient_email: p.to,
        status: "suppressed",
        error_message: "unsubscribed",
        metadata: { provider, router: true, event_type: p.eventType },
      });
      return { status: "skipped_unsubscribed", provider, messageId };
    }
  }

  // 4. Pre-log pending so the alreadySent guard works for concurrent retries.
  await supabase.from("email_send_log").insert({
    message_id: messageId,
    template_name: p.eventType,
    recipient_email: p.to,
    status: "pending",
    metadata: { provider, router: true, event_type: p.eventType },
  });

  // 5. Dispatch.
  const startedAt = Date.now();
  let result: { ok: boolean; error?: string };
  try {
    if (provider === "resend") {
      result = await sendViaResend(p, messageId);
    } else if (provider === "ionos") {
      result = await sendViaInternalProvider("send-via-ionos", p, messageId);
    } else {
      result = await sendViaInternalProvider("send-via-google", p, messageId);
    }
  } catch (e) {
    result = { ok: false, error: (e as Error).message };
  }
  const latencyMs = Date.now() - startedAt;

  // 6. Final log.
  await supabase.from("email_send_log").insert({
    message_id: messageId,
    template_name: p.eventType,
    recipient_email: p.to,
    status: result.ok ? "sent" : "failed",
    error_message: result.ok ? null : (result.error?.slice(0, 1000) ?? "unknown"),
    metadata: { provider, router: true, event_type: p.eventType, latency_ms: latencyMs },
  });

  return {
    status: result.ok ? "sent" : "failed",
    provider,
    messageId,
    error: result.ok ? undefined : result.error,
    latencyMs,
  };
}

// Re-export for convenience.
export { dedupeKey, getDefaultEmailProvider };
export { TRANSIENT_BLOCKING_STATUSES };
