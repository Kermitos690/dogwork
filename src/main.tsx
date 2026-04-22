import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "./components/ErrorBoundary";
import App from "./App.tsx";
import "./i18n";
import "./index.css";

const BUILD_FINGERPRINT = "2026-04-20T15:05Z";
const CHUNK_RELOAD_KEY = `dogwork:chunk-reload:${BUILD_FINGERPRINT}`;

function reloadOnceForStaleAssets(reason: unknown) {
  const message = reason instanceof Error ? reason.message : String(reason ?? "");
  const isStaleAssetError =
    message.includes("Importing a module script failed") ||
    message.includes("Failed to fetch dynamically imported module") ||
    message.includes("ChunkLoadError");

  if (!isStaleAssetError) return;
  if (sessionStorage.getItem(CHUNK_RELOAD_KEY) === "1") return;

  sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
  window.location.reload();
}

window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  const preloadEvent = event as Event & { payload?: unknown };
  reloadOnceForStaleAssets(preloadEvent.payload);
});

// Global unhandled error & rejection handlers for production monitoring
window.addEventListener("error", (event) => {
  console.error("[GLOBAL] Uncaught error:", event.error);
  reloadOnceForStaleAssets(event.error);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("[GLOBAL] Unhandled promise rejection:", event.reason);
  reloadOnceForStaleAssets(event.reason);
});

/**
 * Service worker registration — preview-safe (Phase 3A).
 *
 * The SW is intentionally NEVER registered when the app is:
 *   - inside an iframe (Lovable preview / embeds)
 *   - on a Lovable preview / project domain
 *   - in dev mode (vite serve)
 *
 * In those contexts we proactively unregister any pre-existing SW and clear
 * caches to keep the editor preview always fresh and avoid the well-known
 * "stale chunk" issue.
 */
function setupServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  const isInIframe = (() => {
    try { return window.self !== window.top; } catch { return true; }
  })();
  const host = window.location.hostname;
  const isPreviewHost =
    host.includes("id-preview--") ||
    host.includes("lovableproject.com") ||
    host.includes("lovable.app") ||
    host === "localhost" ||
    host === "127.0.0.1";
  const isDev = import.meta.env.DEV;

  if (isInIframe || isPreviewHost || isDev) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister().catch(() => undefined));
    }).catch(() => undefined);
    if ("caches" in window) {
      caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => undefined);
    }
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("[SW] registration failed", err);
    });
  });
}

setupServiceWorker();

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
