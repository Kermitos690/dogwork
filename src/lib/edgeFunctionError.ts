/**
 * Parse the real error message from a Supabase Edge Function failure.
 *
 * `supabase.functions.invoke()` wraps non-2xx responses in a `FunctionsHttpError`
 * whose `.message` is always "Edge Function returned a non-2xx status code".
 * The actual JSON error body is hidden inside `error.context` (a `Response`).
 *
 * This helper extracts the real error message and HTTP status when possible.
 */

export interface ParsedEdgeError {
  status?: number;
  message: string;
  code?: string;
  raw?: unknown;
}

const STATUS_FALLBACKS: Record<number, string> = {
  400: "Requête invalide.",
  401: "Vous devez être connecté pour effectuer cette action.",
  403: "Vous n'avez pas les droits nécessaires.",
  404: "Cette ressource est introuvable.",
  409: "Action impossible dans l'état actuel.",
  422: "Certaines informations sont invalides.",
  429: "Trop de requêtes — réessayez dans un instant.",
  500: "Une erreur technique est survenue.",
};

export async function parseEdgeFunctionError(err: unknown): Promise<ParsedEdgeError> {
  // Direct Error with a custom message (data?.error thrown manually)
  if (err instanceof Error && err.message && !err.message.includes("non-2xx")) {
    return { message: err.message };
  }

  // FunctionsHttpError exposes the original Response in .context
  const ctx = (err as { context?: unknown })?.context;
  if (ctx && typeof ctx === "object" && "status" in ctx && "json" in ctx) {
    const res = ctx as Response;
    const status = res.status;
    try {
      const cloned = res.clone();
      const body = await cloned.json();
      const msg =
        (typeof body?.error === "string" && body.error) ||
        (typeof body?.message === "string" && body.message) ||
        STATUS_FALLBACKS[status] ||
        `Erreur ${status}`;
      return { status, message: msg, code: body?.code, raw: body };
    } catch {
      try {
        const text = await res.clone().text();
        return { status, message: text || STATUS_FALLBACKS[status] || `Erreur ${status}` };
      } catch {
        return { status, message: STATUS_FALLBACKS[status] || `Erreur ${status}` };
      }
    }
  }

  if (err instanceof Error) return { message: err.message };
  return { message: "Une erreur est survenue." };
}
