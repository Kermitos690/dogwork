/**
 * Lightweight Sentry reporter for Supabase Edge Functions (Deno runtime).
 *
 * We do NOT use the official @sentry/deno package because it adds a heavy
 * dependency tree and slows cold starts on every function. Instead we send
 * events directly to the Sentry "store" endpoint via fetch — same wire format,
 * minimal overhead, fire-and-forget.
 *
 * Usage inside an Edge Function:
 *
 *   import { reportEdgeError } from "../_shared/sentry.ts";
 *
 *   try {
 *     // ... business logic
 *   } catch (err) {
 *     await reportEdgeError(err, {
 *       function_name: "stripe-webhook",
 *       user_id: userId,
 *       extra: { stripe_event_id: event.id },
 *     });
 *     throw err;
 *   }
 *
 * The DSN is read from the SENTRY_DSN_EDGE secret. If absent, the helper is
 * a no-op (so local / preview functions never fail because of monitoring).
 */

interface ReportContext {
  function_name: string;
  user_id?: string | null;
  request_id?: string | null;
  extra?: Record<string, unknown>;
  level?: "error" | "warning" | "fatal" | "info";
}

interface ParsedDsn {
  publicKey: string;
  host: string;
  projectId: string;
  protocol: string;
}

function parseDsn(dsn: string): ParsedDsn | null {
  // Format: https://<publicKey>@<host>/<projectId>
  try {
    const url = new URL(dsn);
    const publicKey = url.username;
    const projectId = url.pathname.replace(/^\//, "");
    if (!publicKey || !projectId) return null;
    return {
      publicKey,
      host: url.host,
      projectId,
      protocol: url.protocol.replace(":", ""),
    };
  } catch {
    return null;
  }
}

function buildEnvelope(
  parsed: ParsedDsn,
  err: unknown,
  ctx: ReportContext,
): { url: string; body: string; headers: Record<string, string> } {
  const eventId = crypto.randomUUID().replace(/-/g, "");
  const timestamp = new Date().toISOString();

  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  const name = err instanceof Error ? err.name : "EdgeFunctionError";

  // Detect environment from project URL (Live vs Test).
  const projectUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const environment = projectUrl.includes("hdmmqwpypvhwohhhaqnf")
    ? "production"
    : "test";

  const event = {
    event_id: eventId,
    timestamp,
    platform: "javascript",
    level: ctx.level ?? "error",
    environment,
    server_name: ctx.function_name,
    transaction: `edge:${ctx.function_name}`,
    tags: {
      runtime: "edge",
      function_name: ctx.function_name,
      ...(ctx.request_id ? { request_id: ctx.request_id } : {}),
    },
    user: ctx.user_id ? { id: ctx.user_id } : undefined,
    extra: ctx.extra,
    exception: {
      values: [
        {
          type: name,
          value: message,
          stacktrace: stack
            ? {
                frames: stack
                  .split("\n")
                  .slice(1)
                  .map((line) => ({ filename: line.trim() }))
                  .reverse(),
              }
            : undefined,
        },
      ],
    },
  };

  const envelopeHeader = JSON.stringify({
    event_id: eventId,
    sent_at: timestamp,
    dsn: `${parsed.protocol}://${parsed.publicKey}@${parsed.host}/${parsed.projectId}`,
  });
  const itemHeader = JSON.stringify({ type: "event" });
  const body = `${envelopeHeader}\n${itemHeader}\n${JSON.stringify(event)}`;

  const url = `${parsed.protocol}://${parsed.host}/api/${parsed.projectId}/envelope/`;

  return {
    url,
    body,
    headers: {
      "Content-Type": "application/x-sentry-envelope",
      "X-Sentry-Auth": [
        "Sentry sentry_version=7",
        `sentry_client=dogwork-edge/1.0`,
        `sentry_key=${parsed.publicKey}`,
      ].join(", "),
    },
  };
}

/**
 * Report an error to Sentry. Never throws — monitoring failures must not
 * break the calling function.
 */
export async function reportEdgeError(
  err: unknown,
  ctx: ReportContext,
): Promise<void> {
  try {
    const dsn = Deno.env.get("SENTRY_DSN_EDGE");
    if (!dsn) {
      // No DSN configured — log only.
      console.error(`[sentry-edge:${ctx.function_name}] (no DSN)`, err);
      return;
    }
    const parsed = parseDsn(dsn);
    if (!parsed) {
      console.error(`[sentry-edge:${ctx.function_name}] invalid DSN`);
      return;
    }
    const { url, body, headers } = buildEnvelope(parsed, err, ctx);
    // Fire and forget with a short timeout to avoid hanging the function.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    try {
      await fetch(url, {
        method: "POST",
        headers,
        body,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  } catch (sentryErr) {
    // Never let Sentry break the caller.
    console.error(
      `[sentry-edge:${ctx.function_name}] reporter failed`,
      sentryErr,
    );
  }
}
