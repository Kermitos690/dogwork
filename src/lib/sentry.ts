/**
 * Sentry initialization for the frontend (React).
 *
 * The DSN is a public, project-scoped identifier (safe to ship in client code).
 * We only enable Sentry on the production / published domains to avoid
 * polluting the project quota with noise from the Lovable preview iframe and
 * local development.
 *
 * Usage:
 *   import { initSentry } from "@/lib/sentry";
 *   initSentry();
 */
import * as Sentry from "@sentry/react";

const SENTRY_DSN_FRONTEND =
  "https://b0d90d6db6a63cb6d0812142ca5b8f8e@o4511288719769600.ingest.de.sentry.io/4511288745721936";

/**
 * Returns the runtime environment label used to tag Sentry events.
 * - "production"  -> custom domain (dogwork-at-home.com)
 * - "staging"     -> *.lovable.app published preview
 * - "preview"     -> Lovable in-editor preview iframe
 * - "development" -> vite dev / localhost
 */
function detectEnvironment(): "production" | "staging" | "preview" | "development" {
  if (typeof window === "undefined") return "development";
  const host = window.location.hostname;
  if (host.includes("dogwork-at-home.com")) return "production";
  if (host.includes("id-preview--") || host.includes("lovableproject.com")) return "preview";
  if (host.includes("lovable.app")) return "staging";
  return "development";
}

let initialized = false;

export function initSentry() {
  if (initialized) return;
  if (typeof window === "undefined") return;

  const environment = detectEnvironment();

  // Only enable on real domains (production + staging). Skip preview/dev.
  if (environment === "preview" || environment === "development") {
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN_FRONTEND,
    environment,
    // Performance: low sample rate to keep usage under control.
    tracesSampleRate: environment === "production" ? 0.1 : 0.5,
    // Session replay only on errors, never on every session.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    // Filter out noise we don't want to track.
    ignoreErrors: [
      // Stale chunk errors are auto-recovered by main.tsx — not actionable.
      "ChunkLoadError",
      "Loading chunk",
      "Importing a module script failed",
      "Failed to fetch dynamically imported module",
      // Browser extensions / network blips
      "ResizeObserver loop limit exceeded",
      "Non-Error promise rejection captured",
    ],
    // Tag all events with runtime so we can filter front vs edge in Sentry UI.
    initialScope: {
      tags: { runtime: "browser" },
    },
  });

  initialized = true;
}

/**
 * Set the current authenticated user on the Sentry scope.
 * Call after sign-in; pass `null` on sign-out.
 */
export function setSentryUser(user: { id: string; email?: string | null; role?: string | null } | null) {
  if (!initialized) return;
  if (!user) {
    Sentry.setUser(null);
    return;
  }
  Sentry.setUser({
    id: user.id,
    email: user.email ?? undefined,
    // Custom tag for filtering by role.
    segment: user.role ?? undefined,
  });
}

export { Sentry };
